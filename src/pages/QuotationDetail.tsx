import { useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Send, RotateCcw, Loader2 } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';
import { useNeracaQuotations, useSaveNeracaQuotation, useNeracaItems, useNeracaDetail, useCompany, useInquiries, useCustomers, usePics } from '@/hooks/useData';
import { formatCurrency, formatDate, getDriveImageUrl } from '@/lib/utils';
import type { NeracaItem, NeracaDetail } from '@/types';

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

  const hbDiskon = hb;

  const sameVK = items.filter(i => i.category_vk === item.category_vk).length || 1;
  const sameKC = items.filter(i => i.category_kc === item.category_kc).length || 1;
  const sameDiff = items.filter(i => i.difficulty === item.difficulty).length || 1;

  const ongkirVKPerItem = getOngkirVK(detail, item.category_vk) / sameVK;
  const ongkirKCPerItem = getOngkirKC(detail, item.category_kc) / sameKC;
  
  const difficultyPct = getDifficultyValue(detail, item.difficulty);
  const difficultyPerItem = (hbDiskon * (difficultyPct / 100)) / sameDiff;

  const hjSatuan = hbDiskon + ongkirVKPerItem + ongkirKCPerItem + difficultyPerItem;
  return hjSatuan * qty;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'pagi';
  if (hour >= 12 && hour < 18) return 'siang';
  return 'malam';
}

function getDeliveryWeeks(dt: string) {
  if (!dt) return 0;
  const match = dt.match(/\d+/g);
  if (match && match.length > 0) {
    return Math.max(...match.map(Number));
  }
  return 0;
}

const DEFAULT_DETAIL = {
  disc: 0,
  ppn: 11,
  un_cost: 0,
  shipping_cost: 0,
  profit: 0
};

export default function QuotationDetail() {
  const { quotationId } = useParams<{ quotationId: string }>();
  const navigate = useNavigate();

  const { data: company, isLoading: isLoadingCompany } = useCompany();
  const { data: inquiries = [] } = useInquiries();
  const { data: customers = [] } = useCustomers();
  const { data: pics = [] } = usePics();

  const { data: quotations = [], isLoading: isLoadingQt } = useNeracaQuotations();
  const quotation = quotations.find(q => q.id === quotationId);

  const neracaId = quotation?.neraca_id;
  const { data: items = [], isLoading: isLoadingItems } = useNeracaItems(neracaId!);
  const { data: detail = {} as Partial<NeracaDetail> } = useNeracaDetail(neracaId!);
  const saveQuotation = useSaveNeracaQuotation();

  const inquiry = inquiries.find(i => i.id === quotation?.inquiry_id);
  const customer = customers.find(c => c.id === quotation?.customer_id);
  const pic = pics.find(p => p.id === inquiry?.pic_id);

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
    const subtotal = calculatedItems.reduce((sum, item) => sum + item.total, 0);
    const discPct = Number(d.disc) || 0;
    const jualAfterDisc = subtotal * (1 - discPct / 100);
    const ppn = Number(d.ppn) ?? 11;
    const tax_amount = jualAfterDisc * (ppn / 100);
    const grand_total = jualAfterDisc + tax_amount;
    return { subtotal, discPct, jualAfterDisc, ppn, tax_amount, grand_total };
  }, [calculatedItems, detail]);

  const { subtotal, discPct, jualAfterDisc, ppn, tax_amount, grand_total } = resume;

  const hasSaved = useRef(false);
  useEffect(() => {
    if (!hasSaved.current && quotation && grand_total > 0 && Math.abs((quotation.nilai || 0) - grand_total) > 1) {
      hasSaved.current = true;
      saveQuotation.mutate({ ...quotation, nilai: grand_total });
    }
  }, [grand_total]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (quotation) {
      const cName = company?.name || 'SourceQuo System';
      document.title = `${cName}_${quotation.quotation_number}`;
      return () => {
        document.title = 'Vite + React + TS'; // reset on unmount
      };
    }
  }, [company?.name, quotation?.quotation_number]);

  if (isLoadingQt || isLoadingItems || isLoadingCompany) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!quotation) {
    return <div className="p-8 text-center text-red-600 font-medium">Quotation tidak ditemukan.</div>;
  }

  let maxDeliveryText = 'Sesuai kesepakatan';
  let maxWeeks = 0;
  calculatedItems.forEach(item => {
    const w = getDeliveryWeeks(item.delivery_time || '');
    if (w > maxWeeks) {
      maxWeeks = w;
      maxDeliveryText = item.delivery_time || maxDeliveryText;
    }
  });

  const companyName = company?.name || 'SourceQuo System';
  const waMessage = `Halo selamat ${getGreeting()}, izin bertanya terkait quotation ${quotation.quotation_number}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://wa.me/6281328213968?text=${encodeURIComponent(waMessage)}`)}`;

  return (
    <div className="space-y-5 pb-20">
      {/* Print-only hide action bar */}
      <style>{`
        @media print {
          @page { size: A4; margin: 1cm; }

          body, html, #root {
            margin: 0;
            padding: 0;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            height: auto !important;
            overflow: visible !important;
          }

          .overflow-hidden, .overflow-y-auto { overflow: visible !important; }
          .no-print { display: none !important; }

          #quotation-doc {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
          }

          /* Items table: blue header repeats on every page */
          thead { display: table-header-group; }
          tfoot { display: table-row-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print">
        <PageHeader
          title={`Quotation ${quotation.quotation_number}`}
          subtitle={`${quotation.customer_name} · ${quotation.request_title}`}
          action={
            <div className="flex items-center gap-2">
              <StatusBadge label={quotation.status} />
              <Button variant="secondary" onClick={() => navigate('/quotations')}><RotateCcw className="w-4 h-4" /> Kembali</Button>
              <Button variant="secondary" onClick={() => window.print()}><Download className="w-4 h-4" /> Export PDF</Button>
              {quotation.status === 'Draft' && (
                <Button onClick={() => saveQuotation.mutate({ ...quotation, status: 'Send' })} loading={saveQuotation.isPending}>
                  <Send className="w-4 h-4" /> Kirim ke Customer
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Quotation Document — outer table makes kop surat repeat on every print page */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg max-w-[860px] mx-auto text-[12pt]" id="quotation-doc">
        <table className="w-full" style={{borderCollapse:'collapse'}}>

          {/* ===== THEAD: only compact kop surat — repeats on every printed page ===== */}
          <thead>
            <tr>
              <td style={{padding:0}}>
                <div className="px-10 pt-8 pb-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {company?.logo_url ? (
                        <div className="w-24 h-24 overflow-hidden flex items-center justify-center">
                          <img src={getDriveImageUrl(company.logo_url)} alt="Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 border border-gray-200 rounded flex items-center justify-center text-gray-300 text-xs font-medium">Logo</div>
                      )}
                      <div>
                        <h1 className="text-blue-900 font-bold tracking-wide leading-tight text-[12pt]">{companyName}</h1>
                        {company?.address && <p className="text-gray-600 mt-0.5 text-[10pt]">{company.address}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-blue-900 font-extrabold tracking-widest text-[16pt]">QUOTATION</h2>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </thead>

          {/* ===== TBODY: all body content — renders after header on every page ===== */}
          <tbody>
            <tr>
              <td style={{padding:0}}>
                <div className="px-10 py-6">

                  {/* Info Block — no section labels */}
                  <div className="grid grid-cols-2 gap-6 mb-5 text-[12pt] leading-snug">
                    <div className="space-y-1">
                      <div className="flex items-start">
                        <span className="text-gray-700 w-24 shrink-0">Customer</span>
                        <span className="text-gray-700 mr-2">:</span>
                        <div>
                          <div className="font-semibold text-gray-900">{customer?.company_name || quotation.customer_name}</div>
                          <div className="text-gray-600 text-[11pt]">{customer?.office_address || ''}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-700 w-24 shrink-0">Attention</span>
                        <span className="text-gray-700 mr-2">:</span>
                        <span className="font-semibold text-gray-900">{pic?.name || inquiry?.pic_name || '-'}</span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex"><span className="text-gray-700 w-24 shrink-0">Qtn No</span><span className="text-gray-700 mr-2">:</span><span className="font-bold text-gray-900">{quotation.quotation_number}</span></div>
                      <div className="flex"><span className="text-gray-700 w-24 shrink-0">Date</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">{formatDate(quotation.created_date)}</span></div>
                      <div className="flex"><span className="text-gray-700 w-24 shrink-0">Subject</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">{quotation.request_title}</span></div>
                      <div className="flex"><span className="text-gray-700 w-24 shrink-0">Ref</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">Wa / Email</span></div>
                      <div className="flex"><span className="text-gray-700 w-24 shrink-0">Ref Date</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">{inquiry?.request_date ? formatDate(inquiry.request_date) : '-'}</span></div>
                    </div>
                  </div>

                  {/* Greeting */}
                  <div className="mb-4 text-gray-800 text-[12pt]">
                    <p>Dear Sir/Madam,</p>
                    <p className="mt-1">Here we submit the quotation for <span className="font-medium">{quotation.request_title}</span> as you request:</p>
                  </div>

                  {/* Items Table */}
                  <div className="mb-6 text-[12pt]">
                    <table className="w-full border-collapse border border-black">
                      <thead className="bg-blue-900 text-white">
                        <tr>
                          <th className="py-2.5 px-3 text-center font-semibold border-x border-black" style={{width:'5%'}}>No.</th>
                          <th className="py-2.5 px-3 text-left font-semibold border-x border-black" style={{width:'42%'}}>Spesifikasi</th>
                          <th className="py-2.5 px-3 text-left font-semibold border-x border-black" style={{width:'14%'}}>Delivery</th>
                          <th className="py-2.5 px-3 text-right font-semibold border-x border-black" style={{width:'6%'}}>Qty</th>
                          <th className="py-2.5 px-3 text-right font-semibold border-x border-black" style={{width:'16%'}}>Unit Price</th>
                          <th className="py-2.5 px-3 text-right font-semibold border-x border-black" style={{width:'17%'}}>Total Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {calculatedItems.length === 0 ? (
                          <tr><td colSpan={6} className="py-6 text-center text-gray-400">Tidak ada item dalam quotation ini.</td></tr>
                        ) : calculatedItems.map((item, idx) => (
                          <tr key={item.id} className="break-inside-avoid bg-white">
                            <td className="py-3 px-3 text-center text-gray-600 align-top border-x border-black">{idx + 1}</td>
                            <td className="py-3 px-3 align-top text-justify border-x border-black">
                              <div className="text-gray-900">{item.item_customer}</div>
                              <div className="h-3"></div>
                              <div className="text-gray-900"><span className="font-bold">Offer to:</span><br/>{item.item_vendor}</div>
                            </td>
                            <td className="py-3 px-3 text-gray-700 align-top border-x border-black">{item.delivery_time || '-'}</td>
                            <td className="py-3 px-3 text-right text-gray-800 align-top border-x border-black">{item.qty}</td>
                            <td className="py-3 px-3 text-right text-gray-800 align-top border-x border-black">{formatCurrency(item.hj)}</td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-900 align-top border-x border-black">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-black">
                        <tr className="border-t border-black">
                          <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">Sub Total</td>
                          <td className="py-1 px-3 text-right font-semibold text-gray-800 border-x border-black">{formatCurrency(subtotal)}</td>
                        </tr>
                        {discPct > 0 && (
                          <tr className="border-t border-black">
                            <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">Discount ({discPct}%)</td>
                            <td className="py-1 px-3 text-right font-semibold text-red-600 border-x border-black">-{formatCurrency(subtotal - jualAfterDisc)}</td>
                          </tr>
                        )}
                        <tr className="border-t border-black">
                          <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">PPN {ppn}%</td>
                          <td className="py-1 px-3 text-right font-semibold text-gray-800 border-x border-black">{formatCurrency(tax_amount)}</td>
                        </tr>
                        <tr className="border-t border-black">
                          <td colSpan={5} className="py-1.5 px-3 text-right font-bold text-gray-900 border-x border-black">Grand Total</td>
                          <td className="py-1.5 px-3 text-right font-bold text-gray-900 border-x border-black">{formatCurrency(grand_total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Term and Condition */}
                  <div className="break-inside-avoid mb-5 text-[12pt]">
                    <h3 className="font-bold text-gray-900 mb-2">Term and Condition</h3>
                    <div className="grid grid-cols-[110px_10px_1fr] gap-y-1 text-gray-800">
                      <div className="font-medium">Note</div><div>:</div><div>Partial order need re-quotation</div>
                      <div className="font-medium">Franco</div><div>:</div><div>{customer?.warehouse_address || '-'}</div>
                      <div className="font-medium">Price Validity</div><div>:</div><div>{maxDeliveryText}</div>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="text-[10pt] text-gray-600 italic mb-8 break-inside-avoid leading-relaxed">
                    Dokumen ini dikeluarkan oleh sistem integrasi data <span className="font-semibold">{companyName}</span> dan dinyatakan sah dan otentik bila disertai QR Code dan tidak memerlukan tanda tangan basah. Silahkan melakukan verifikasi dengan scan QR Code.
                  </div>

                  {/* Signature & QR */}
                  <div className="flex justify-between items-end break-inside-avoid text-[12pt]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-28 h-28 border border-gray-200 p-1 bg-white overflow-hidden">
                        <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-[10pt] text-gray-400">Scan untuk verifikasi</p>
                    </div>

                    <div className="text-gray-800 text-center" style={{ minWidth: '200px' }}>
                      <p>Regards,</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{companyName}</p>
                      <div style={{ height: '110px' }}></div>
                      <p className="font-bold text-gray-900 underline">{company?.leader_name || 'Admin'}</p>
                      <p className="text-gray-700 mt-0.5">{company?.admin_position || 'Staff'}</p>
                    </div>
                  </div>

                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
