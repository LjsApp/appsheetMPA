import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { html } = req.body as { html: string };
  if (!html) return res.status(400).json({ error: 'html is required' });

  let browser = null;
  try {
    // Dynamic imports — keeps the function cold-start fast
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = (await import('puppeteer-core')).default;

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1200, height: 900 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    // Set content and wait for all network requests (fonts, images) to complete
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });

    // Wait a bit extra for any async rendering
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // render background colors & images
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      preferCSSPageSize: false,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(Buffer.from(pdfBuffer));
  } catch (error: any) {
    console.error('[generate-pdf] Error:', error?.message || error);
    return res.status(500).json({ error: 'PDF generation failed', detail: error?.message });
  } finally {
    if (browser) {
      try { await (browser as any).close(); } catch {}
    }
  }
}
