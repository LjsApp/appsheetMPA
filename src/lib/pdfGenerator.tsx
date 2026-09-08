import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuotationDetail from '@/pages/QuotationDetail';
import PODetail from '@/pages/PODetail';
import SuratJalanDetail from '@/pages/SuratJalanDetail';
import InvoiceDetail from '@/pages/InvoiceDetail';
import InternalLetterDetail from '@/pages/InternalLetterDetail';

// Separate QueryClient for the hidden render — fresh data, no cache conflicts
const pdfQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  },
});

export type PdfDocumentType = 'quotation' | 'po_out' | 'surat_jalan' | 'invoice' | 'internal_letter';

interface GeneratePdfOptions {
  type: PdfDocumentType;
  id: string;
  filename: string;
  uploadFileMutateAsync: (vars: any) => Promise<any>;
  module: string;
  entityName: string;
  docReference: string;
}

/**
 * Collects all CSS text from document.styleSheets so we can include it in the
 * HTML page sent to Puppeteer. Same-origin sheets are inlined; cross-origin
 * sheets are referenced via <link> so Puppeteer can fetch them.
 */
function collectPageCss(): { inline: string; links: string[] } {
  const inline: string[] = [];
  const links: string[] = [];

  Array.from(document.styleSheets).forEach(sheet => {
    try {
      // Same-origin: inline the CSS text
      const rules = Array.from(sheet.cssRules);
      inline.push(rules.map(r => r.cssText).join('\n'));
    } catch {
      // Cross-origin (e.g. Google Fonts CDN): add as <link> so Puppeteer fetches it
      if (sheet.href) {
        links.push(sheet.href);
      }
    }
  });

  return { inline: inline.join('\n'), links };
}

/**
 * Builds a complete standalone HTML page from a DOM element.
 * Includes all page CSS so Puppeteer renders it identically to the browser.
 */
function buildHtmlPage(element: HTMLElement): string {
  const { inline, links } = collectPageCss();
  const origin = window.location.origin; // e.g. https://app.vercel.app

  const linkTags = links
    .map(href => `<link rel="stylesheet" href="${href}">`)
    .join('\n');

  // Fix relative /src paths → absolute so Puppeteer (on a different host) can fetch images/fonts
  let elementHtml = element.outerHTML
    .replace(/\bsrc="\/([^"]+)"/g, `src="${origin}/$1"`)
    .replace(/\bhref="\/([^"]+)"/g, `href="${origin}/$1"`);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="${origin}/">
  ${linkTags}
  <style>
    /* Page setup for Puppeteer PDF */
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; background: white; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* ─── CRITICAL: force repeating header/footer on every PDF page ─── */
    /* Outer table thead (kop surat) must repeat on every page */
    #quotation-doc > table > thead,
    #po-doc > table > thead,
    #surat-jalan-doc > table > thead,
    #sj-doc > table > thead,
    #il-doc > table > thead,
    #invoice-doc table > thead { display: table-header-group !important; }

    /* Outer table tfoot (spacer) must stay at bottom of every page */
    #quotation-doc > table > tfoot,
    #po-doc > table > tfoot,
    #surat-jalan-doc > table > tfoot,
    #sj-doc > table > tfoot,
    #il-doc > table > tfoot,
    #invoice-doc table > tfoot { display: table-footer-group !important; }

    /* Page footer fixed at bottom — appears on EVERY page */
    .print-page-footer {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      display: flex !important;
      background: white !important;
      z-index: 100 !important;
      padding: 10px 40px !important;
      justify-content: space-between !important;
      align-items: center !important;
    }

    /* Prevent table rows from splitting across pages */
    tr { page-break-inside: avoid; }

    /* Inlined app CSS (includes Tailwind + all component styles) */
    ${inline}
  </style>
</head>
<body style="margin:0;padding:0;">
  ${elementHtml}
</body>
</html>`;
}

export async function generateAndUploadPdf({
  type,
  id,
  filename,
  uploadFileMutateAsync,
  module,
  entityName,
  docReference,
}: GeneratePdfOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. Create a hidden container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-99999px';
    container.style.left = '-99999px';
    container.style.width = '794px'; // A4 at 96dpi
    container.style.background = '#ffffff';
    document.body.appendChild(container);

    const root = createRoot(container);

    // 2. Listen for the ready event emitted by the component
    const handlePrintReady = async (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.id === id && customEvent.detail?.type === type) {
        window.removeEventListener('pdf-print-ready', handlePrintReady);

        try {
          // Find the document element to capture
          let elementId = '';
          if (type === 'quotation') elementId = 'quotation-doc';
          if (type === 'po_out') elementId = 'po-doc';
          if (type === 'surat_jalan') elementId = 'surat-jalan-doc';
          if (type === 'invoice') elementId = 'invoice-doc';
          if (type === 'internal_letter') elementId = 'il-doc';

          let element = container.querySelector(`#${elementId}`);
          if (!element && type === 'surat_jalan') {
            element = container.querySelector('#sj-doc');
          }
          if (!element) throw new Error(`Element #${elementId} not found`);

          // 3. Build a complete HTML page including all app CSS
          const fullHtml = buildHtmlPage(element as HTMLElement);

          // 4. Detect local dev environment — Puppeteer API only available on Vercel
          const isLocalDev = window.location.hostname === 'localhost' ||
                             window.location.hostname === '127.0.0.1';

          if (isLocalDev) {
            // On localhost, /api/generate-pdf doesn't exist (Vercel serverless only).
            // Skip PDF upload silently — it will work correctly in production.
            console.info(
              `[PDF] Skipping PDF upload on localhost — run "vercel dev" or deploy to Vercel to test PDF generation.\n` +
              `[PDF] You can still use the browser's Ctrl+P → Save as PDF to get the print preview.`
            );
            root.unmount();
            container.remove();
            resolve(''); // Return empty string; calling code handles this gracefully
            return;
          }

          // 5. Call Vercel serverless function (Puppeteer) to generate PDF
          const response = await fetch('/api/generate-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html: fullHtml }),
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`PDF API error: ${err.error || response.statusText}`);
          }

          // 6. Convert PDF blob to base64
          const pdfBlob = await response.blob();
          const base64 = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.readAsDataURL(pdfBlob);
            reader.onload = () => res((reader.result as string).split(',')[1]);
            reader.onerror = rej;
          });

          // 7. Upload to Google Drive
          const url = await uploadFileMutateAsync({
            filename,
            mimeType: 'application/pdf',
            base64,
            module,
            entityName,
            docReference,
          });

          // Cleanup
          root.unmount();
          container.remove();

          resolve(typeof url === 'string' ? url : url.url);
        } catch (error) {
          root.unmount();
          container.remove();
          reject(error);
        }
      }
    };

    window.addEventListener('pdf-print-ready', handlePrintReady);

    // 3. Render the component in MemoryRouter to trigger data loading
    let path = '';
    let routePath = '';
    let element = null;

    if (type === 'quotation') {
      path = `/quotations/${id}`;
      routePath = '/quotations/:quotationId';
      element = <QuotationDetail />;
    } else if (type === 'po_out') {
      path = `/purchase-orders/${id}`;
      routePath = '/purchase-orders/:poId';
      element = <PODetail />;
    } else if (type === 'surat_jalan') {
      path = `/surat-jalan/${id}`;
      routePath = '/surat-jalan/:id';
      element = <SuratJalanDetail />;
    } else if (type === 'invoice') {
      path = `/invoices/${id}`;
      routePath = '/invoices/:id';
      element = <InvoiceDetail />;
    } else if (type === 'internal_letter') {
      path = `/internal-letters/${id}`;
      routePath = '/internal-letters/:id';
      element = <InternalLetterDetail />;
    }

    root.render(
      <QueryClientProvider client={pdfQueryClient}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={routePath} element={element} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Failsafe: 45 second timeout
    setTimeout(() => {
      window.removeEventListener('pdf-print-ready', handlePrintReady);
      root.unmount();
      if (document.body.contains(container)) container.remove();
      reject(new Error(`PDF Generation timed out for ${type} ${id}`));
    }, 45000);
  });
}
