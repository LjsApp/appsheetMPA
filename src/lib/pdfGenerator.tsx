import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import html2pdf from 'html2pdf.js';
import QuotationDetail from '@/pages/QuotationDetail';
import PODetail from '@/pages/PODetail';
import SuratJalanDetail from '@/pages/SuratJalanDetail';

// We need a separate query client for the hidden render to avoid messing with the main app's cache,
// or we can reuse the global one. Since we don't have easy access to the global one here, 
// we'll just create a new one. It will fetch the data fresh.
const pdfQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * html2canvas does not support oklch() CSS color function (used in modern Tailwind CSS).
 * This function walks all elements in the given subtree and replaces oklch computed
 * style values with safe RGB equivalents that html2canvas can parse.
 */
function oklchToRgbFallback(val: string): string {
  // Parse oklch(L C H) or oklch(L C H / A)
  const m = val.match(/oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/);
  if (!m) return '#000000';

  let L = parseFloat(m[1]);
  if (m[1].endsWith('%')) L = L / 100;
  // else L is 0-1 directly in oklch
  const C = parseFloat(m[2]);
  const H = parseFloat(m[3]) * (Math.PI / 180); // degrees to radians
  const alpha = m[4] !== undefined ? (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])) : 1;

  // Approx oklch → oklab
  const a = C * Math.cos(H);
  const b = C * Math.sin(H);

  // oklab → linear sRGB (simplified Bradford-adapted matrices)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  let r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  // Gamma correction (linear → sRGB)
  const toSrgb = (c: number) => {
    const cl = Math.max(0, Math.min(1, c));
    return cl <= 0.0031308 ? 12.92 * cl : 1.055 * Math.pow(cl, 1 / 2.4) - 0.055;
  };

  const ri = Math.round(toSrgb(r) * 255);
  const gi = Math.round(toSrgb(g) * 255);
  const bi = Math.round(toSrgb(bl) * 255);

  if (alpha < 1) {
    return `rgba(${ri},${gi},${bi},${alpha.toFixed(2)})`;
  }
  return `rgb(${ri},${gi},${bi})`;
}

function sanitizeOklchColors(root: HTMLElement) {
  const COLOR_PROPS: (keyof CSSStyleDeclaration)[] = [
    'color', 'backgroundColor', 'borderColor',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'outlineColor', 'textDecorationColor', 'caretColor', 'fill', 'stroke',
  ];

  const allEls = [root, ...Array.from(root.querySelectorAll('*'))] as HTMLElement[];
  allEls.forEach(el => {
    if (!('style' in el)) return;
    try {
      const computed = window.getComputedStyle(el);
      COLOR_PROPS.forEach(prop => {
        const val = computed[prop as any] as string | undefined;
        if (val && typeof val === 'string' && val.includes('oklch')) {
          (el.style as any)[prop] = oklchToRgbFallback(val);
        }
      });
    } catch {
      // Skip elements where getComputedStyle throws (e.g. SVG internals)
    }
  });
}


export type PdfDocumentType = 'quotation' | 'po_out' | 'surat_jalan';

interface GeneratePdfOptions {
  type: PdfDocumentType;
  id: string;
  filename: string;
  uploadFileMutateAsync: (vars: any) => Promise<any>;
  module: string;
  entityName: string;
  docReference: string;
}

export async function generateAndUploadPdf({
  type,
  id,
  filename,
  uploadFileMutateAsync,
  module,
  entityName,
  docReference
}: GeneratePdfOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. Create a hidden container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1200px'; // Wide enough to render without mobile layout
    document.body.appendChild(container);

    const root = createRoot(container);

    // 2. Listen for the ready event emitted by the component
    const handlePrintReady = async (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.id === id && customEvent.detail?.type === type) {
        window.removeEventListener('pdf-print-ready', handlePrintReady);

        try {
          // Find the actual document container to print
          let elementId = '';
          if (type === 'quotation') elementId = 'quotation-doc';
          if (type === 'po_out') elementId = 'po-doc';
          if (type === 'surat_jalan') elementId = 'surat-jalan-doc';

          const element = container.querySelector(`#${elementId}`);
          if (!element) {
            throw new Error(`Element #${elementId} not found`);
          }

          // Fix: html2canvas does not support oklch() CSS color function (used by Tailwind v3+).
          // Walk the DOM and replace any oklch computed values with safe fallbacks.
          sanitizeOklchColors(element as HTMLElement);

          // Options for html2pdf
          const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
          };

          // Generate PDF as base64 string
          const pdfBase64DataUri = await html2pdf().set(opt).from(element as HTMLElement).outputPdf('datauristring');
          // html2pdf returns: data:application/pdf;filename=generated.pdf;base64,JVBER...
          const base64 = pdfBase64DataUri.split(',')[1];

          // Upload
          const url = await uploadFileMutateAsync({
            filename,
            mimeType: 'application/pdf',
            base64,
            module,
            entityName,
            docReference
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

    // 3. Render the component in MemoryRouter
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
      routePath = '/surat-jalan/:sjId';
      element = <SuratJalanDetail />;
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

    // Failsafe timeout (30 seconds)
    setTimeout(() => {
      window.removeEventListener('pdf-print-ready', handlePrintReady);
      root.unmount();
      if (document.body.contains(container)) {
        container.remove();
      }
      reject(new Error(`PDF Generation timed out for ${type} ${id}`));
    }, 30000);
  });
}
