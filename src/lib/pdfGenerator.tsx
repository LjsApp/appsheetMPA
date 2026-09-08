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

          // Options for html2pdf
          const opt = {
            margin: 0,
            filename: filename,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
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
