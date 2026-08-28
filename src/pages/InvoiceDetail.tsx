import { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, RotateCcw, Loader2 } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import { useInvoices, usePoIns, useCompany, useCustomers, useNeracaItems, useNeracaDetail } from '@/hooks/useData';
import { formatCurrency, formatDate, getDriveImageUrl } from '@/lib/utils';
import type { NeracaDetail, NeracaItem } from '@/types';

// ─── calculation helpers (same as QuotationDetail) ───────────────────────────
function getDifficultyValue(detail: Partial<NeracaDetail>, difficulty: string): number {
  if (difficulty === 'Easy') return Number(detail.difficulty_easy) || 0;
  if (difficulty === 'Medium') return Number(detail.difficulty_medium) || 0;
  if (difficulty === 'Hard') return Number(detail.difficulty_hard) || 0;
  if (difficulty === 'Rare') return Number(detail.difficulty_rare) || 0;
  return 0;
}
function getOngkirVK(detail: Partial<NeracaDetail>, cat: string): number {
  if (cat === 'A') return Number(detail.ongkir_a) || 0;
  if (cat === 'B') return Number(detail.ongkir_b) || 0;
  if (cat === 'C') return Number(detail.ongkir_c) || 0;
  if (cat === 'D') return Number(detail.ongkir_d) || 0;
  if (cat === 'E') return Number(detail.ongkir_e) || 0;
  return 0;
}
function getOngkirKC(detail: Partial<NeracaDetail>, cat: string): number {
  if (cat === 'X') return Number(detail.ongkir_x) || 0;
  if (cat === 'Y') return Number(detail.ongkir_y) || 0;
  if (cat === 'Z') return Number(detail.ongkir_z) || 0;
  return 0;
}
function calcBaseHargaJual(item: NeracaItem, items: NeracaItem[], detail: Partial<NeracaDetail>): number {
  const hb = Number(item.harga_beli) || 0;
  const qty = Number(item.qty) || 1;
  const sameVK = items.filter(i => i.category_vk === item.category_vk).length || 1;
  const sameKC = items.filter(i => i.category_kc === item.category_kc).length || 1;
  const sameDiff = items.filter(i => i.difficulty === item.difficulty).length || 1;
  const ongkirVKPerItem = getOngkirVK(detail, item.category_vk) / sameVK;
  const ongkirKCPerItem = getOngkirKC(detail, item.category_kc) / sameKC;
  const difficultyPct = getDifficultyValue(detail, item.difficulty);
  const difficultyPerItem = (hb * (difficultyPct / 100)) / sameDiff;
  const hjSatuan = hb + ongkirVKPerItem + ongkirKCPerItem + difficultyPerItem;
  return hjSatuan * qty;
}

function terbilang(n: number): string {
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
    'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas', 'Enam Belas',
    'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'];
  if (n < 20) return satuan[n];
  if (n < 100) return satuan[Math.floor(n / 10) === 1 ? 10 + (n % 10) : Math.floor(n / 10)].replace('Satu Puluh', 'Sepuluh') + (n % 10 !== 0 ? ' ' + satuan[n % 10] : '') + (Math.floor(n / 10) > 1 ? ' Puluh' : '');
  if (n < 100) return Math.floor(n / 10) + ' Puluh' + (n % 10 !== 0 ? ' ' + satuan[n % 10] : '');
  if (n < 200) return 'Seratus' + (n - 100 !== 0 ? ' ' + terbilang(n - 100) : '');
  if (n < 1000) return satuan[Math.floor(n / 100)] + ' Ratus' + (n % 100 !== 0 ? ' ' + terbilang(n % 100) : '');
  if (n < 2000) return 'Seribu' + (n - 1000 !== 0 ? ' ' + terbilang(n - 1000) : '');
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 !== 0 ? ' ' + terbilang(n % 1000) : '');
  if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 !== 0 ? ' ' + terbilang(n % 1000000) : '');
  if (n < 1000000000000) return terbilang(Math.floor(n / 1000000000)) + ' Miliar' + (n % 1000000000 !== 0 ? ' ' + terbilang(n % 1000000000) : '');
  return String(n);
}

function numberToWords(n: number): string {
  if (n === 0) return 'Nol Rupiah';
  return terbilang(Math.round(n)) + ' Rupiah';
}

// ─── Print-only header (logo + company name + address) ───────────────────────
function DocHeader({ logoUrl, name, address, rightLabel }: { logoUrl?: string; name: string; address?: string; rightLabel: string }) {
  return (
    <div className="flex justify-between items-center px-10 pt-6 pb-4">
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <div className="w-20 h-20 overflow-hidden flex items-center justify-center flex-shrink-0">
            <img src={getDriveImageUrl(logoUrl)} alt="Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-20 h-20 border border-gray-200 rounded flex items-center justify-center text-gray-300 text-xs flex-shrink-0">Logo</div>
        )}
        <div>
          <h1 className="text-blue-900 font-bold tracking-wide leading-tight text-[12pt]">{name}</h1>
          {address && <p className="text-gray-600 mt-0.5 text-[10pt]">{address}</p>}
        </div>
      </div>
      <div className="text-right">
        <span className="inline-block bg-blue-800 text-white font-bold tracking-widest text-[8pt] uppercase px-3 py-1.5 rounded">{rightLabel}</span>
      </div>
    </div>
  );
}

function DocHeaderKwitansi({ logoUrl, name, address, email, phone }: { logoUrl?: string; name: string; address?: string; email?: string; phone?: string }) {
  return (
    <div className="flex justify-between items-start pb-4">
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <div className="w-16 h-16 overflow-hidden flex items-center justify-center flex-shrink-0">
            <img src={getDriveImageUrl(logoUrl)} alt="Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-16 h-16 border border-gray-200 rounded flex items-center justify-center text-gray-300 text-xs flex-shrink-0">Logo</div>
        )}
        <div>
          <h1 className="text-blue-900 font-bold text-[11pt]">{name}</h1>
        </div>
      </div>
      <div className="text-right text-[9pt] text-gray-600 leading-relaxed">
        {email && <div>{email}</div>}
        {phone && <div>{phone}</div>}
        {address && <div className="max-w-[200px] text-right">{address}</div>}
      </div>
    </div>
  );
}

const DEFAULT_DETAIL: Partial<NeracaDetail> = { disc: 0, ppn: 11, un_cost: 0 };

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: invoices = [], isLoading: loadingInv } = useInvoices();
  const { data: poIns = [], isLoading: loadingPo } = usePoIns();
  const { data: company, isLoading: loadingCo } = useCompany();
  const { data: customers = [] } = useCustomers();

  const invoice = invoices.find(inv => inv.id === id);
  const po = poIns.find(p => p.id === invoice?.po_in_id);
  const customer = customers.find(c => c.id === invoice?.customer_id);
  // neracaId from PO In for items lookup


  const neracaId = po?.neraca_id;
  const { data: items = [], isLoading: loadingItems } = useNeracaItems(neracaId!);
  const { data: detail = DEFAULT_DETAIL } = useNeracaDetail(neracaId!);

  const calculatedItems = useMemo(() => {
    const d = detail || DEFAULT_DETAIL;
    const baseJualTotal = items.reduce((sum, item) => sum + calcBaseHargaJual(item, items, d), 0);
    const unCostPct = Number(d.un_cost) || 0;
    const totalUnCost = baseJualTotal * (unCostPct / 100);
    const unCostPerItem = items.length > 0 ? totalUnCost / items.length : 0;
    return items.map(item => {
      const baseHj = calcBaseHargaJual(item, items, d);
      const totalHj = baseHj + unCostPerItem;
      const qty = Number(item.qty) || 1;
      const unitPrice = qty > 0 ? totalHj / qty : totalHj;
      return { ...item, hj: unitPrice, total: totalHj };
    });
  }, [items, detail]);

  const resume = useMemo(() => {
    const d = detail || DEFAULT_DETAIL;
    const subtotal = calculatedItems.reduce((sum, i) => sum + i.total, 0);
    const discPct = Number(d.disc) || 0;
    const jualAfterDisc = subtotal * (1 - discPct / 100);
    const ppn = Number(d.ppn) ?? 11;
    const tax_amount = jualAfterDisc * (ppn / 100);
    const grand_total = jualAfterDisc + tax_amount;
    const dpp = jualAfterDisc / 1.12; // DPP Nilai Lain approximation
    return { subtotal, discPct, jualAfterDisc, ppn, tax_amount, grand_total, dpp };
  }, [calculatedItems, detail]);

  useEffect(() => {
    if (invoice) document.title = `Invoice_${invoice.invoice_number}`;
    return () => { document.title = 'Vite + React + TS'; };
  }, [invoice?.invoice_number]);

  const isLoading = loadingInv || loadingPo || loadingCo || loadingItems;
  if (isLoading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!invoice) return <div className="p-8 text-center text-red-600 font-medium">Invoice tidak ditemukan.</div>;

  const companyName = company?.name || 'SourceQuo System';
  const companyAddress = company?.address || '';
  const bankName = company?.bank_name || '-';
  const bankAccount = company?.bank_account_number || '-';
  const bankAccountName = company?.bank_account_name || '-';

  // SPP number: replace INV with SPP
  const sppNumber = invoice.invoice_number?.replace('/INV/', '/SPP/') || invoice.invoice_number;

  const waMessage = `Halo, izin konfirmasi terkait Invoice ${invoice.invoice_number} yang telah kami kirimkan.`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`https://wa.me/6281328213968?text=${encodeURIComponent(waMessage)}`)}`;

  const Signature = () => (
    <div className="flex justify-between items-end mt-8 text-[12pt]">
      <div className="flex flex-col items-center gap-1">
        <div className="w-24 h-24 border border-gray-200 p-1 bg-white overflow-hidden">
          <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
        </div>
        <p className="text-[9pt] text-gray-400">Scan untuk verifikasi</p>
      </div>
      <div className="text-gray-800 text-center" style={{ minWidth: '200px' }}>
        <p>Hormat kami,</p>
        <p className="font-semibold text-gray-900 mt-0.5">{companyName}</p>
        <div style={{ height: '90px' }} />
        <p className="font-bold text-gray-900 underline">{company?.leader_name || 'Admin'}</p>
        <p className="text-gray-700 mt-0.5">{company?.admin_position || 'Direktur'}</p>
      </div>
    </div>
  );

  const Disclaimer = () => (
    <p className="text-[10pt] text-gray-600 italic leading-relaxed">
      Dokumen ini dikeluarkan oleh Sistem Integrasi Data <span className="font-semibold">{companyName}</span> dan dinyatakan Sah dan Otentik bila disertai QR Code dan tidak memerlukan tanda tangan basah. Silahkan melakukan verifikasi dengan scan QR Code.
    </p>
  );

  return (
    <div className="space-y-5 pb-20">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body, html, #root { margin:0; padding:0; background:white !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; height:auto !important; overflow:visible !important; }
          .overflow-hidden, .overflow-y-auto { overflow: visible !important; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; break-before: page; }
          .page-break-avoid { page-break-inside: avoid; break-inside: avoid; }
          .print-doc-card { background:transparent !important; box-shadow:none !important; border:none !important; border-radius:0 !important; max-width:100% !important; margin:0 !important; position:relative; z-index:1; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; }
          /* Fixed watermark and footer on every printed page */
          .print-wm-tl { display:block !important; position:fixed; top:0; left:0; width:320px; opacity:0.35; transform:translate(-20%, -20%); z-index:0; pointer-events:none; }
          .print-wm-br { display:block !important; position:fixed; bottom:0; right:0; width:360px; opacity:0.35; transform:translate(20%, 20%); z-index:0; pointer-events:none; }
          .print-page-footer { display:flex !important; position:fixed; bottom:0; left:0; right:0; background:white; z-index:100; padding:10px 40px; justify-content:flex-end; align-items:center; }
          /* Add margin bottom to body content so footer doesn't overlap */
          .space-y-8 > div:last-child { padding-bottom: 60px; }
        }
        /* Hidden in screen, visible in print */
        .print-wm-tl, .print-wm-br, .print-page-footer { display: none; }
      `}</style>

      <div className="no-print">
        <PageHeader
          title={`Invoice ${invoice.invoice_number}`}
          subtitle={`${po?.customer_name || '-'}`}
          action={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => navigate('/invoices')}><RotateCcw className="w-4 h-4" /> Kembali</Button>
              <Button variant="secondary" onClick={() => window.print()}><Download className="w-4 h-4" /> Export PDF</Button>
            </div>
          }
        />
      </div>

      <div className="space-y-8">

        {/* Fixed watermark & footer — appear on every printed page */}
        <img className="print-wm-tl" src="/watermark.png" alt="" />
        <img className="print-wm-br" src="/watermark.png" alt="" />
        <div className="print-page-footer">
          <div className="text-right text-[7.5pt] text-gray-500 leading-relaxed">
            {company?.address && <div>{company.address}</div>}
            <div className="flex justify-end gap-4">
              {company?.phone && <span>☎ {company.phone}</span>}
              {company?.email && <span>✉ {company.email}</span>}
            </div>
          </div>
        </div>

        {/* PAGE 1 — SURAT PERMOHONAN PEMBAYARAN (SPP) */}
        <div className="print-doc-card bg-white max-w-[860px] mx-auto text-[11pt] overflow-hidden relative">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr><td style={{ padding: 0 }}>
              <DocHeader
                logoUrl={company?.logo_url}
                name={companyName}
                address={companyAddress}
                rightLabel="Surat Permohonan Pembayaran"
              />
            </td></tr>
          </thead>
          <tbody>
            <tr><td style={{ padding: 0 }}>
              <div className="px-10 py-4">
                {/* Customer & SPP info */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-[11pt] leading-tight">
                  <div className="space-y-1">
                    <div className="flex items-start">
                      <span className="text-gray-700 w-24 shrink-0">Customer</span>
                      <span className="text-gray-700 mr-2">:</span>
                      <div>
                        <div className="font-semibold text-gray-900">{customer?.company_name || po?.customer_name || '-'}</div>
                        <div className="text-gray-600 text-[11pt]">{invoice.delivery_address || customer?.office_address || ''}</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex"><span className="text-gray-700 w-24 shrink-0">No</span><span className="text-gray-700 mr-2">:</span><span className="font-bold text-gray-900">{sppNumber}</span></div>
                    <div className="flex"><span className="text-gray-700 w-24 shrink-0">Date</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">{formatDate(invoice.invoice_date)}</span></div>
                    <div className="flex"><span className="text-gray-700 w-24 shrink-0">Ref</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">{po?.po_in_number || '-'}</span></div>
                    <div className="flex"><span className="text-gray-700 w-24 shrink-0">Ref Date</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">{formatDate(po?.tanggal || '')}</span></div>
                  </div>
                </div>

                {/* Greeting */}
                <p className="mb-3 text-gray-800">Dengan hormat,</p>
                <p className="mb-6 text-gray-800 text-justify">
                  Bersama ini kami menyampaikan Surat Permohonan Pembayaran atas penyelesaian permintaan pengadaan barang sebagai berikut:
                </p>

                {/* PO Info Table */}
                <div className="mb-4 grid grid-cols-[120px_10px_1fr] gap-y-1 text-[11pt] text-gray-800">
                  <div className="font-medium">Nomor PO</div><div>:</div><div>{po?.po_in_number || '-'}</div>
                  <div className="font-medium">Tanggal PO</div><div>:</div><div>{formatDate(po?.tanggal || '')}</div>
                  <div className="font-medium">Nilai Pengadaan</div><div>:</div>
                  <div className="font-bold italic">{formatCurrency(resume.grand_total)}</div>
                  <div className="font-medium">Terbilang</div><div>:</div>
                  <div className="font-bold italic">{numberToWords(resume.grand_total)}</div>
                </div>

                {/* Payment info */}
                <p className="mb-1 text-gray-800">Adapun untuk pembayaran, mohon ditransfer ke:</p>
                <div className="mb-4 grid grid-cols-[120px_10px_1fr] gap-y-1 text-[11pt] text-gray-800">
                  <div>Nama Bank</div><div>:</div><div>{bankName}</div>
                  <div>Nomor Rek.</div><div>:</div><div>{bankAccount}</div>
                  <div>Atas Nama</div><div>:</div><div>{bankAccountName}</div>
                </div>

                <div className="mb-4">
                  <Disclaimer />
                </div>

                <p className="mb-3 text-gray-800">Demikian permohonan ini kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terima kasih.</p>

                <Signature />
              </div>
            </td></tr>
          </tbody>
        </table>
        </div>

        {/* PAGE 2 — INVOICE DETAIL */}
        <div className="print-doc-card bg-white max-w-[860px] mx-auto text-[12pt] overflow-hidden page-break leading-snug">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr><td style={{ padding: 0 }}>
              <DocHeader
                logoUrl={company?.logo_url}
                name={companyName}
                address={companyAddress}
                rightLabel="Invoice"
              />
            </td></tr>
          </thead>
          <tbody>
            <tr><td style={{ padding: 0 }}>
              <div className="px-10 py-6">
                {/* Customer & Invoice info */}
                <div className="grid grid-cols-2 gap-6 mb-5 text-[12pt] leading-snug">
                  <div className="space-y-1">
                    <div className="flex items-start">
                      <span className="text-gray-700 w-24 shrink-0">Customer</span>
                      <span className="text-gray-700 mr-2">:</span>
                      <div>
                        <div className="font-semibold text-gray-900">{customer?.company_name || po?.customer_name || '-'}</div>
                        <div className="text-gray-600 text-[11pt]">{invoice.delivery_address || customer?.office_address || ''}</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex"><span className="text-gray-700 w-16 shrink-0">No</span><span className="text-gray-700 mr-2">:</span><span className="font-bold text-gray-900">{invoice.invoice_number}</span></div>
                    <div className="flex"><span className="text-gray-700 w-16 shrink-0">Date</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">{formatDate(invoice.invoice_date)}</span></div>
                    <div className="flex"><span className="text-gray-700 w-16 shrink-0">Ref</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">{po?.po_in_number || '-'}</span></div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <table className="w-full border-collapse border border-black text-[11pt]">
                    <thead className="bg-blue-900 text-white">
                      <tr>
                        <th className="py-2.5 px-3 text-center font-semibold border-x border-black" style={{ width: '5%' }}>No</th>
                        <th className="py-2.5 px-3 text-left font-semibold border-x border-black" style={{ width: '45%' }}>Item</th>
                        <th className="py-2.5 px-3 text-right font-semibold border-x border-black" style={{ width: '7%' }}>Qty</th>
                        <th className="py-2.5 px-3 text-left font-semibold border-x border-black" style={{ width: '8%' }}>Unit</th>
                        <th className="py-2.5 px-3 text-right font-semibold border-x border-black" style={{ width: '17%' }}>Unit Price<br />Rp.</th>
                        <th className="py-2.5 px-3 text-right font-semibold border-x border-black" style={{ width: '18%' }}>Total Price<br />Rp.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      {calculatedItems.length === 0 ? (
                        <tr><td colSpan={6} className="py-6 text-center text-gray-400">Tidak ada item.</td></tr>
                      ) : calculatedItems.map((item, idx) => (
                        <tr key={item.id} className="page-break-avoid bg-white">
                          <td className="py-3 px-3 text-center text-gray-600 align-middle border-x border-black">{idx + 1}</td>
                          <td className="py-3 px-3 align-middle text-justify border-x border-black text-gray-900">{item.item_customer}</td>
                          <td className="py-3 px-3 text-right text-gray-800 align-middle border-x border-black">{item.qty}</td>
                          <td className="py-3 px-3 text-left text-gray-700 align-middle border-x border-black">Pcs</td>
                          <td className="py-3 px-3 text-right text-gray-800 align-middle border-x border-black">{formatCurrency(item.hj).replace('Rp\u00a0', '').replace('Rp', '')}</td>
                          <td className="py-3 px-3 text-right font-semibold text-gray-900 align-middle border-x border-black">{formatCurrency(item.total).replace('Rp\u00a0', '').replace('Rp', '')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tbody className="border-t border-black break-inside-avoid">
                      <tr className="border-t border-black">
                        <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">Sub Total</td>
                        <td className="py-1 px-3 text-right font-semibold text-gray-800 border-x border-black">{formatCurrency(resume.subtotal).replace('Rp\u00a0', '').replace('Rp', '')}</td>
                      </tr>
                      {resume.discount > 0 && (
                        <tr className="border-t border-black">
                          <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">Discount</td>
                          <td className="py-1 px-3 text-right font-semibold text-red-600 border-x border-black">-{formatCurrency(resume.discount).replace('Rp\u00a0', '').replace('Rp', '')}</td>
                        </tr>
                      )}
                      <tr className="border-t border-black">
                        <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">Dpp Nilai Lain</td>
                        <td className="py-1 px-3 text-right font-semibold text-gray-800 border-x border-black">{formatCurrency(resume.dpp).replace('Rp\u00a0', '').replace('Rp', '')}</td>
                      </tr>
                      <tr className="border-t border-black">
                        <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">Vat {resume.ppn}%</td>
                        <td className="py-1 px-3 text-right font-semibold text-gray-800 border-x border-black">{formatCurrency(resume.tax_amount).replace('Rp\u00a0', '').replace('Rp', '')}</td>
                      </tr>
                      <tr className="border-t border-black">
                        <td colSpan={5} className="py-1.5 px-3 text-right font-bold text-gray-900 border-x border-black">Grand Total</td>
                        <td className="py-1.5 px-3 text-right font-bold text-gray-900 border-x border-black">{formatCurrency(resume.grand_total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Note & Bank */}
                <div className="mb-6 text-[11pt]">
                  <p className="font-bold mb-1">Note:</p>
                  <p className="mb-1">Pembayaran untuk Invoice ini mohon ditransfer ke rekening:</p>
                  <div className="grid grid-cols-[100px_10px_1fr] gap-y-0.5 text-gray-800">
                    <div>Nama Bank</div><div>:</div><div>{bankName}</div>
                    <div>Nomor Rek.</div><div>:</div><div>{bankAccount}</div>
                    <div>Atas Nama</div><div>:</div><div>{bankAccountName}</div>
                  </div>
                </div>

                <div className="break-inside-avoid">
                  <div className="mb-6">
                    <Disclaimer />
                  </div>

                  <Signature />
                </div>
              </div>
            </td></tr>
          </tbody>
          {/* TFOOT: empty spacer to prevent fixed footer from overlapping content */}
          <tfoot>
            <tr>
              <td>
                <div style={{ height: '50px' }}></div>
              </td>
            </tr>
          </tfoot>
        </table>
        </div>

        {/* PAGE 3 — KWITANSI */}
        <div className="print-doc-card bg-white max-w-[860px] mx-auto text-[12pt] overflow-hidden page-break leading-snug">
        {[0, 1].map(copy => (
          <div key={copy}>
            {copy === 1 && (
              <div className="border-t-2 border-dashed border-gray-400 my-0 mx-10 relative">
                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-gray-400">✂ Potong di sini</span>
              </div>
            )}
            <div className="px-10 py-6">
              {/* Kwitansi Header */}
              <DocHeaderKwitansi
                logoUrl={company?.logo_url}
                name={companyName}
                address={companyAddress}
                email={company?.email}
                phone={company?.phone}
              />

              {/* KWITANSI title */}
              <div className="text-center my-4">
                <h2 className="font-bold tracking-[0.3em] text-[16pt] underline uppercase">Kwitansi</h2>
              </div>

              {/* Kwitansi body */}
              <div className="text-[12pt] space-y-2 text-gray-800 mb-4">
                <div className="flex items-start gap-2">
                  <span className="w-36 shrink-0">Telah diterima dari</span>
                  <span className="shrink-0">:</span>
                  <span className="font-semibold">{customer?.company_name || po?.customer_name || '-'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-36 shrink-0">Uang Sejumlah</span>
                  <span className="shrink-0">:</span>
                  <span className="font-bold text-blue-800 border-b-2 border-blue-300 px-1">{formatCurrency(resume.grand_total)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-36 shrink-0">Terbilang</span>
                  <span className="shrink-0">:</span>
                  <span className="italic font-semibold bg-gray-100 px-2 py-0.5 rounded">{numberToWords(resume.grand_total)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-36 shrink-0">Untuk Pembayaran</span>
                  <span className="shrink-0">:</span>
                  <span className="text-justify">
                    Pembayaran Invoice No: {invoice.invoice_number} Tanggal {formatDate(invoice.invoice_date)} terkait Kontrak No. {po?.po_in_number || '-'} tanggal {formatDate(po?.tanggal || '')}
                  </span>
                </div>
              </div>

              {/* Bottom: Bank info left, Date + Signature right */}
              <div className="flex justify-between items-end mt-6 text-[11pt]">
                <div className="space-y-1 text-gray-800">
                  <div className="grid grid-cols-[90px_8px_1fr] gap-x-1 gap-y-0.5">
                    <div>Nama Bank</div><div>:</div><div>{bankName}</div>
                    <div>Nomor Rek.</div><div>:</div><div>{bankAccount}</div>
                    <div>Atas Nama</div><div>:</div><div>{bankAccountName}</div>
                  </div>
                  <div className="mt-2 w-16 h-16 border border-gray-200 p-0.5 bg-white overflow-hidden">
                    <img src={qrUrl} alt="QR" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="text-gray-800 text-center" style={{ minWidth: '180px' }}>
                  <p>{formatDate(invoice.invoice_date)}</p>
                  <div style={{ height: '70px' }} />
                  <p className="font-bold text-gray-900 underline">{company?.leader_name || 'Admin'}</p>
                  <p className="text-gray-700 text-[10pt]">{company?.admin_position || 'Direktur'}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
