import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, RotateCcw, Loader2 } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import { usePurchaseOrders, useVendors, useVendorDiscounts, useNeracaItems, useCompany } from '@/hooks/useData';
import { formatCurrency, formatDate, getDriveImageUrl } from '@/lib/utils';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'pagi';
  if (hour >= 12 && hour < 18) return 'siang';
  return 'malam';
}


export default function PODetail() {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();

  const { data: purchaseOrders = [], isLoading: isLoadingPo } = usePurchaseOrders();
  const { data: vendors = [] } = useVendors();
  const { data: company, isLoading: isLoadingCompany } = useCompany();

  const po = purchaseOrders.find(p => p.id === poId);
  const vendor = vendors.find(v => v.id === po?.vendor_id);

  const { data: items = [], isLoading: isLoadingItems } = useNeracaItems(po?.neraca_id || '');
  const { data: vds = [], isLoading: isLoadingVds } = useVendorDiscounts(po?.neraca_id || '');

  useEffect(() => {
    if (po && company) {
      const cName = company.name || 'SourceQuo System';
      document.title = `${cName}_${po.po_number}`;
      return () => { document.title = 'Vite + React + TS'; };
    }
  }, [company?.name, po?.po_number]);

  if (isLoadingPo || isLoadingCompany || isLoadingItems || isLoadingVds) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!po) {
    return <div className="p-8 text-center text-red-600 font-medium">PO Out tidak ditemukan.</div>;
  }

  // Get vendor discount for this vendor
  const vd = vds.find(d => d.vendor_id === po.vendor_id);
  
  // Get items for this vendor
  const vendorItems = items.filter(i => i.vendor_id === po.vendor_id);

  // Compute per-item total buy price
  const itemRows = vendorItems.map(item => {
    const hb = Number(item.harga_beli) || 0;
    const qty = Number(item.qty) || 1;
    const totalBeli = hb * qty;
    return { ...item, totalBeli, unitPrice: hb };
  });

  // Total before discount
  const totalBeli = itemRows.reduce((s, i) => s + i.totalBeli, 0);

  // Discount
  let totalDiscVal = 0;
  if (vd) {
    if ((vd.discount_pct || 0) > 0) totalDiscVal = totalBeli * ((vd.discount_pct || 0) / 100);
    else if ((vd.discount_cash || 0) > 0) totalDiscVal = vd.discount_cash || 0;
  }
  const totalAfterDisc = totalBeli - totalDiscVal;
  const discPct = vd?.discount_pct || 0;


  const companyName = company?.name || 'SourceQuo System';
  const waPhone = String(company?.phone || '6281328213968');
  const waMessage = `Halo selamat ${getGreeting()}, izin bertanya terkait Purchase Order ${po.po_number} kepada ${vendor?.vendor_name || ''}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://wa.me/${waPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage)}`)}`;

  // Letter date — from po.letter_date, fallback to created_date
  const letterDate = po.letter_date ? formatDate(po.letter_date) : formatDate(po.created_date);
  const subject = po.subject || '-';

  return (
    <div className="space-y-5 pb-20">
      <style>{`
      		@media print {
          @page { size: A4; margin: 0; }
          body, html, #root {
            margin: 0; padding: 0;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            height: auto !important;
            overflow: visible !important;
          }
          .overflow-hidden, .overflow-y-auto { overflow: visible !important; }
          .no-print { display: none !important; }
          #po-doc {
            box-shadow: none !important; border: none !important;
            border-radius: 0 !important; max-width: 100% !important; margin: 0 !important;
          }
          thead { display: table-header-group; }
          tfoot { display: table-row-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print">
        <PageHeader
          title={`PO Out ${po.po_number}`}
          subtitle={`${po.vendor_name}`}
          action={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => navigate(-1)}><RotateCcw className="w-4 h-4" /> Kembali</Button>
              <Button variant="secondary" onClick={() => window.print()}><Download className="w-4 h-4" /> Export PDF</Button>
            </div>
          }
        />
      </div>

      {/* PO Document */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg max-w-[860px] mx-auto text-[12pt] relative overflow-hidden" id="po-doc">
        {/* Watermark background */}
        <div aria-hidden="true" style={{
          position:'absolute', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden',
        }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{position:'absolute',inset:0}}>
            <defs>
              <pattern id="wm-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="1.2" fill="#1e3a8a" opacity="0.06" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wm-grid)" />
          </svg>
          {/* Corner accent top-right */}
          <div style={{position:'absolute',top:0,right:0,width:'180px',height:'180px',background:'radial-gradient(circle at top right, rgba(30,58,138,0.07), transparent 70%)'}} />
          {/* Corner accent bottom-left */}
          <div style={{position:'absolute',bottom:0,left:0,width:'180px',height:'180px',background:'radial-gradient(circle at bottom left, rgba(30,58,138,0.06), transparent 70%)'}} />
        </div>

        <table className="w-full" style={{borderCollapse:'collapse', position:'relative', zIndex:1}}>

          {/* ===== THEAD: kop surat - repeats on every printed page ===== */}
          <thead>
            <tr>
              <td style={{padding:0}}>
                {/* Word-style header — tight to top edge */}
                <div style={{background:'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%)'}} className="px-10 pt-4 pb-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {company?.logo_url ? (
                        <div className="w-16 h-16 overflow-hidden flex items-center justify-center bg-white/10 rounded">
                          <img src={getDriveImageUrl(company.logo_url)} alt="Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 border border-white/30 rounded flex items-center justify-center text-white/50 text-xs">Logo</div>
                      )}
                      <div>
                        <h1 className="text-white font-bold tracking-wide leading-tight text-[13pt]">{companyName}</h1>
                        {company?.address && <p className="text-blue-100 mt-0.5 text-[9pt] leading-tight max-w-xs">{company.address}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/80 text-[8pt] font-medium tracking-widest uppercase mb-0.5">Document</div>
                      <h2 className="text-white font-extrabold tracking-widest text-[18pt] leading-none">PURCHASE ORDER</h2>
                    </div>
                  </div>
                </div>
                {/* thin accent line */}
                <div className="h-1" style={{background:'linear-gradient(90deg,#f59e0b,#3b82f6,#6366f1)'}} />
              </td>
            </tr>
          </thead>

          {/* ===== TBODY: all body content ===== */}
          <tbody>
            <tr>
              <td style={{padding:0}}>
                <div className="px-10 py-6">

                  {/* Info Block — vendor on left, PO info on right */}
                  <div className="grid grid-cols-2 gap-6 mb-5 text-[12pt] leading-snug">
                    <div className="space-y-1">
                      <div className="flex items-start">
                        <span className="text-gray-700 w-24 shrink-0">To</span>
                        <span className="text-gray-700 mr-2">:</span>
                        <span className="font-semibold text-gray-900">{vendor?.vendor_name || po.vendor_name}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-gray-700 w-24 shrink-0">Address</span>
                        <span className="text-gray-700 mr-2">:</span>
                        <span className="text-gray-800">{vendor?.address || '-'}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-700 w-24 shrink-0">Attention</span>
                        <span className="text-gray-700 mr-2">:</span>
                        <span className="font-semibold text-gray-900">Bapak/Ibu</span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex"><span className="text-gray-700 w-24 shrink-0">Po No</span><span className="text-gray-700 mr-2">:</span><span className="font-bold text-gray-900">{po.po_number}</span></div>
                      <div className="flex"><span className="text-gray-700 w-24 shrink-0">Date</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">{letterDate}</span></div>
                      <div className="flex"><span className="text-gray-700 w-24 shrink-0">Subject</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">{subject}</span></div>
                      <div className="flex"><span className="text-gray-700 w-24 shrink-0">Ref</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">Wa / Email</span></div>
                      <div className="flex"><span className="text-gray-700 w-24 shrink-0">Ref Date</span><span className="text-gray-700 mr-2">:</span><span className="text-gray-800">{po.ref_date ? formatDate(po.ref_date) : '-'}</span></div>
                    </div>
                  </div>

                  {/* Greeting */}
                  <div className="mb-4 text-gray-800 text-[12pt]">
                    <p>Dear Sir/Madam,</p>
                    <p className="mt-1">Here we submit the PO Out for <span className="font-medium">{subject}</span> as per our agreement:</p>
                  </div>

                  {/* Items Table — from vendor discount data */}
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
                        {itemRows.length === 0 ? (
                          <tr><td colSpan={6} className="py-6 text-center text-gray-400">Tidak ada item untuk vendor ini.</td></tr>
                        ) : itemRows.map((item, idx) => (
                          <tr key={item.id} className="break-inside-avoid bg-white">
                            <td className="py-3 px-3 text-center text-gray-600 align-top border-x border-black">{idx + 1}</td>
                            <td className="py-3 px-3 align-top text-justify border-x border-black">
                              <div className="text-gray-900">{item.item_vendor}</div>
                            </td>
                            <td className="py-3 px-3 text-gray-700 align-top border-x border-black">{item.delivery_time_vk || '-'}</td>
                            <td className="py-3 px-3 text-right text-gray-800 align-top border-x border-black">{item.qty}</td>
                            <td className="py-3 px-3 text-right text-gray-800 align-top border-x border-black">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-900 align-top border-x border-black">{formatCurrency(item.totalBeli)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-black">
                        <tr className="border-t border-black">
                          <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">Sub Total</td>
                          <td className="py-1 px-3 text-right font-semibold text-gray-800 border-x border-black">{formatCurrency(totalBeli)}</td>
                        </tr>
                        {discPct > 0 && (
                          <tr className="border-t border-black">
                            <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">Discount ({discPct}%)</td>
                            <td className="py-1 px-3 text-right font-semibold text-red-600 border-x border-black">-{formatCurrency(totalDiscVal)}</td>
                          </tr>
                        )}
                        {!discPct && totalDiscVal > 0 && (
                          <tr className="border-t border-black">
                            <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">Discount (Cash)</td>
                            <td className="py-1 px-3 text-right font-semibold text-red-600 border-x border-black">-{formatCurrency(totalDiscVal)}</td>
                          </tr>
                        )}
                        <tr className="border-t border-black">
                          <td colSpan={5} className="py-1.5 px-3 text-right font-bold text-gray-900 border-x border-black">Grand Total</td>
                          <td className="py-1.5 px-3 text-right font-bold text-gray-900 border-x border-black">{formatCurrency(totalAfterDisc)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Term and Condition */}
                  <div className="break-inside-avoid mb-5 text-[12pt]">
                    <h3 className="font-bold text-gray-900 mb-2">Term and Condition</h3>
                    <div className="grid grid-cols-[120px_10px_1fr] gap-y-1 text-gray-800">
                      <div className="font-medium">Due Date</div><div>:</div><div>{po.po_date ? formatDate(po.po_date) : '-'}</div>
                      <div className="font-medium">Franco</div><div>:</div><div>-</div>
                      <div className="font-medium">Shipping Address</div><div>:</div><div>{company?.address || '-'}</div>
                      <div className="font-medium">Packaging</div><div>:</div><div>Package must be sure to be good, secure and safe, to prevent any damage.</div>
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

          {/* ===== TFOOT: footer repeats on every printed page ===== */}
          <tfoot>
            <tr>
              <td style={{padding:0}}>
                <div className="h-1" style={{background:'linear-gradient(90deg,#f59e0b,#3b82f6,#6366f1)'}} />
                <div style={{background:'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%)'}} className="px-10 py-2.5 flex justify-between items-center">
                  <div className="text-blue-200 text-[8pt]">{companyName}</div>
                  <div className="flex items-center gap-4 text-[8pt] text-blue-100">
                    {company?.email && <span>✉ {company.email}</span>}
                    {company?.phone && <span>☎ {company.phone}</span>}
                    {company?.address && <span className="max-w-[200px] text-right">📍 {company.address}</span>}
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
