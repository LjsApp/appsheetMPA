import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, RotateCcw, Loader2, MapPin, Phone, Mail, AtSign } from "lucide-react";
import { PageHeader, Button } from "@/components/ui";
import { useInternalLetters, useVendors, usePoIns, usePurchaseOrders, useCompany, useVendorDiscounts, useNeracaItems } from "@/hooks/useData";
import { formatCurrency, formatDate, getDriveImageUrl, formatDeliveryTime } from "@/lib/utils";

export default function InternalLetterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: letters = [], isLoading: isLoadingIL } = useInternalLetters();
  const { data: vendors = [] } = useVendors();
  const { data: poIns = [] } = usePoIns();
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const { data: company, isLoading: isLoadingCompany } = useCompany();

  const letter = letters.find((l) => l.id === id);
  const vendor = vendors.find((v) => v.id === letter?.vendor_id);
  const poIn = poIns.find((p) => p.id === letter?.po_in_id);
  const poOut = purchaseOrders.find((po) => po.id === letter?.po_out_id) ||
    purchaseOrders.find((po) => po.quotation_id === letter?.quotation_id && po.vendor_id === letter?.vendor_id && po.type !== "DP");

  const { data: vds = [] } = useVendorDiscounts(letter?.neraca_id || "");

  const vd = vds.find((d) => d.vendor_id === letter?.vendor_id);

  // Find DP IL if this is a Sisa IL
  const dpIl = letter?.type === 'Sisa' && letter?.dp_reference_id
    ? letters.find((l) => l.id === letter.dp_reference_id)
    : null;

  const companyName = company?.name || "PT. Morgan Powerindo Amerta";

  const { data: allItems = [] } = useNeracaItems(letter?.neraca_id || "");
  const items = useMemo(() => allItems.filter(i => i.vendor_id === letter?.vendor_id), [allItems, letter?.vendor_id]);

  const itemRows = useMemo(() => {
    return items.map((item) => {
      const hb = Number(item.harga_beli) || 0;
      const qty = Number(item.qty) || 1;
      return { ...item, unitPrice: hb, totalBeli: hb * qty };
    });
  }, [items]);

  const totalBeli = itemRows.reduce((s, i) => s + i.totalBeli, 0);

  // Discount
  let totalDiscVal = 0;
  const discPct = vd?.discount_pct || 0;
  if (vd) {
    if ((vd.discount_pct || 0) > 0) totalDiscVal = totalBeli * ((vd.discount_pct || 0) / 100);
    else if ((vd.discount_cash || 0) > 0) totalDiscVal = vd.discount_cash || 0;
  }
  const totalAfterDisc = totalBeli - totalDiscVal;

  // DP info
  const dpPct = vd?.dp_pct || 0;
  const dpNominal = vd?.dp_nominal || 0;
  const dpLabel = dpPct > 0 ? `${dpPct}%` : dpNominal > 0 ? `Rp ${formatCurrency(dpNominal)}` : '';

  // PPN
  const ppnPct = vd?.ppn_pct || 0;
  const ppnVal = totalAfterDisc * (ppnPct / 100);
  const grandTotalWithPpn = totalAfterDisc + ppnVal;

  const letterDate = letter?.tanggal ? formatDate(letter.tanggal) : formatDate(new Date().toISOString());

  useEffect(() => {
    if (letter && company) {
      document.title = `${companyName}_${letter.internal_letter_number}`;
      return () => { document.title = "Vite + React + TS"; };
    }
  }, [letter?.internal_letter_number, company?.name]);

  if (isLoadingIL || isLoadingCompany) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!letter) {
    return <div className="p-8 text-center text-red-600 font-medium">Internal Letter tidak ditemukan.</div>;
  }

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
          #il-doc { background:transparent !important; box-shadow:none !important; border:none !important; border-radius:0 !important; max-width:100% !important; margin:0 !important; position:relative; z-index:1; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; }
          .print-wm-tl { position:fixed !important; opacity:0.35 !important; z-index:-1 !important; }
          .print-wm-br { position:fixed !important; opacity:0.35 !important; z-index:-1 !important; }
          .print-page-footer { display:flex !important; position:fixed !important; bottom:0; left:0; right:0; background:white !important; z-index:100 !important; padding:10px 40px; justify-content:space-between; align-items:center; }
        }
        .print-wm-tl { position:absolute; top:0; left:0; width:320px; opacity:0.15; transform:translate(-20%, -20%); z-index:-1; pointer-events:none; }
        .print-wm-br { position:absolute; bottom:0; right:0; width:360px; opacity:0.15; transform:translate(20%, 20%); z-index:-1; pointer-events:none; }
        .print-page-footer { position:absolute; bottom:0; left:0; right:0; padding:10px 40px; display:flex; justify-content:space-between; align-items:center; background:transparent; z-index:0; pointer-events:none; }
      `}</style>

      <div className="no-print">
        <PageHeader
          title={`Internal Letter ${letter.internal_letter_number}`}
          subtitle={`${letter.vendor_name} — ${letter.customer_name}`}
          action={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => navigate(-1)}><RotateCcw className="w-4 h-4" /> Kembali</Button>
              <Button variant="secondary" onClick={() => window.print()}><Download className="w-4 h-4" /> Export PDF</Button>
            </div>
          }
        />
      </div>

      {/* Document */}
      <div className="bg-white max-w-[860px] mx-auto text-[12pt] relative overflow-hidden z-0" id="il-doc">

        {/* Watermark & footer */}
        <img className="print-wm-tl" src="/watermark.png" alt="" />
        <img className="print-wm-br" src="/watermark.png" alt="" />
        <div className="print-page-footer">
          <img src="/watermark2.png" alt="Logo" style={{ height: "28px", opacity: 0.85 }} />
          <div className="text-right text-[7.5pt] text-gray-700 leading-tight flex flex-col gap-0.5">
            <div className="flex items-center justify-end gap-1.5">
              <span>HO: Citra Grand City - Tropical Valley - SB06/11 - Palembang - Sumatera Selatan</span>
              <MapPin className="w-3 h-3 text-red-500" />
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span>RO: Jl. Bratang Gede I No. 8 - Surabaya - Jawa Timur</span>
              <MapPin className="w-3 h-3 text-red-500" />
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span>+62-823-3587-8789, +62-857-3292-9919</span>
              <Phone className="w-3 h-3 text-green-600" />
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span>morganpowerindo@gmail.com</span>
              <Mail className="w-3 h-3 text-blue-500" />
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span>morgan_powerindo</span>
              <AtSign className="w-3 h-3 text-pink-600" />
            </div>
          </div>
        </div>

        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          {/* THEAD: Kop surat */}
          <thead>
            <tr>
              <td style={{ padding: 0 }}>
                <div className="px-10 pt-8 pb-4">
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
                      <span className="inline-block bg-blue-800 text-white font-bold text-[8pt] uppercase tracking-widest px-3 py-1.5 rounded">
                        INTERNAL LETTER{letter.type && letter.type !== 'Full' ? ` (${letter.type.toUpperCase()})` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </thead>

          {/* TBODY */}
          <tbody>
            <tr>
              <td style={{ padding: 0 }}>
                <div className="px-10 py-6">

                  {/* Title block */}
                  <div className="text-center mb-6">
                    <p className="font-bold text-[13pt] underline text-gray-900">PENGAJUAN RENCANA ANGGARAN BIAYA (RAB)</p>
                    <p className="font-bold text-[12pt] underline text-gray-900">BELANJA PROJECT</p>
                    <p className="italic text-gray-600 text-[11pt] mt-1">{letter.internal_letter_number?.replace(/\s*\(DP\)\s*$/i, '').replace(/\s*\(SISA\)\s*$/i, '')}</p>
                  </div>

                  {/* Perihal / Customer / Rincian */}
                  <div className="mb-5 text-[12pt]">
                    <div className="grid grid-cols-[16px_120px_10px_1fr] gap-y-1 text-gray-800">
                      <div>A.</div>
                      <div className="font-medium">Perihal</div>
                      <div>:</div>
                      <div>{letter.perihal || "-"}</div>
                      <div>B.</div>
                      <div className="font-medium">Customer</div>
                      <div>:</div>
                      <div>{letter.customer_name}</div>
                      <div>C.</div>
                      <div className="font-medium">Rincian Project</div>
                      <div />
                      <div />
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="mb-6 text-[12pt]">
                    <table className="w-full border-collapse border border-black">
                      <thead className="bg-blue-900 text-white">
                        <tr>
                          <th className="py-2.5 px-3 text-center font-semibold border-x border-black" style={{ width: "5%" }}>No.</th>
                          <th className="py-2.5 px-3 text-left font-semibold border-x border-black" style={{ width: "42%" }}>Spesifikasi</th>
                          <th className="py-2.5 px-3 text-left font-semibold border-x border-black" style={{ width: "14%" }}>Delivery</th>
                          <th className="py-2.5 px-3 text-right font-semibold border-x border-black" style={{ width: "6%" }}>Qty</th>
                          <th className="py-2.5 px-3 text-right font-semibold border-x border-black" style={{ width: "16%" }}>Unit Price</th>
                          <th className="py-2.5 px-3 text-right font-semibold border-x border-black" style={{ width: "17%" }}>Total Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {itemRows.length === 0 ? (
                          <tr><td colSpan={6} className="py-6 text-center text-gray-400">Tidak ada item.</td></tr>
                        ) : itemRows.map((item, idx) => (
                          <tr key={item.id || idx} className="break-inside-avoid bg-white">
                            <td className="py-3 px-3 text-center text-gray-600 align-top border-x border-black">{idx + 1}</td>
                            <td className="py-3 px-3 align-top text-justify border-x border-black">
                              <div className="text-gray-900">{item.item_vendor}</div>
                            </td>
                            <td className="py-3 px-3 text-gray-700 align-top border-x border-black">{formatDeliveryTime(item.dt_vk) || "-"}</td>
                            <td className="py-3 px-3 text-right text-gray-800 align-top border-x border-black">{item.qty}</td>
                            <td className="py-3 px-3 text-right text-gray-800 align-top border-x border-black">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-900 align-top border-x border-black">{formatCurrency(item.totalBeli)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tbody className="border-t border-black break-inside-avoid">
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

                        {letter.type === 'DP' ? (
                          <>
                            {ppnPct > 0 && (
                              <tr className="border-t border-black">
                                <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">PPN ({ppnPct}%)</td>
                                <td className="py-1 px-3 text-right font-semibold text-gray-800 border-x border-black">{formatCurrency(ppnVal)}</td>
                              </tr>
                            )}
                            <tr className="border-t border-black">
                              <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">Total (Sebelum DP)</td>
                              <td className="py-1 px-3 text-right font-semibold text-gray-800 border-x border-black">{formatCurrency(grandTotalWithPpn)}</td>
                            </tr>
                            <tr className="border-t border-black">
                              <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">
                                Down Payment{dpLabel ? ` (${dpLabel})` : ''}
                              </td>
                              <td className="py-1 px-3 text-right font-semibold text-gray-800 border-x border-black">{formatCurrency(letter.total_nilai)}</td>
                            </tr>
                            <tr className="border-t border-black">
                              <td colSpan={5} className="py-1.5 px-3 text-right font-bold text-gray-900 border-x border-black">Grand Total</td>
                              <td className="py-1.5 px-3 text-right font-bold text-gray-900 border-x border-black">{formatCurrency(letter.total_nilai)}</td>
                            </tr>
                          </>
                        ) : letter.type === 'Sisa' ? (
                          <>
                            {ppnPct > 0 && (
                              <tr className="border-t border-black">
                                <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">PPN ({ppnPct}%)</td>
                                <td className="py-1 px-3 text-right font-semibold text-gray-800 border-x border-black">{formatCurrency(ppnVal)}</td>
                              </tr>
                            )}
                            <tr className="border-t border-black">
                              <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">Total</td>
                              <td className="py-1 px-3 text-right font-semibold text-gray-800 border-x border-black">{formatCurrency(grandTotalWithPpn)}</td>
                            </tr>
                            {dpIl && (
                              <tr className="border-t border-black">
                                <td colSpan={5} className="py-1.5 px-3 text-right text-gray-600 border-x border-black italic">
                                  Less DP (No IL: {dpIl.internal_letter_number}, Tanggal: {formatDate(dpIl.tanggal)})
                                </td>
                                <td className="py-1.5 px-3 text-right font-semibold text-red-600 border-x border-black">-{formatCurrency(dpIl.total_nilai)}</td>
                              </tr>
                            )}
                            <tr className="border-t border-black">
                              <td colSpan={5} className="py-1.5 px-3 text-right font-bold text-gray-900 border-x border-black">Grand Total (Sisa)</td>
                              <td className="py-1.5 px-3 text-right font-bold text-gray-900 border-x border-black">{formatCurrency(letter.total_nilai)}</td>
                            </tr>
                          </>
                        ) : (
                          <>
                            {ppnPct > 0 && (
                              <tr className="border-t border-black">
                                <td colSpan={5} className="py-1 px-3 text-right text-gray-600 border-x border-black">PPN ({ppnPct}%)</td>
                                <td className="py-1 px-3 text-right font-semibold text-gray-800 border-x border-black">{formatCurrency(ppnVal)}</td>
                              </tr>
                            )}
                            <tr className="border-t border-black">
                              <td colSpan={5} className="py-1.5 px-3 text-right font-bold text-gray-900 border-x border-black">Grand Total</td>
                              <td className="py-1.5 px-3 text-right font-bold text-gray-900 border-x border-black">{formatCurrency(grandTotalWithPpn)}</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Info below table */}
                  <div className="mb-8 text-[12pt]">
                    <div className="grid grid-cols-[130px_10px_1fr] gap-y-1 text-gray-800">
                      <div className="font-medium">No. PO In</div><div>:</div><div>{poIn?.po_in_number || "-"}</div>
                      <div className="font-medium">PO Out</div><div>:</div><div>{poOut?.po_number || "-"}</div>
                      <div className="font-medium">Vendor</div><div>:</div><div>{vendor?.vendor_name || letter.vendor_name}</div>
                      <div className="font-medium">Bank</div><div>:</div><div>{vendor?.bank_name || "-"}</div>
                      <div className="font-medium">No. Rekening</div><div>:</div><div>{vendor?.bank_account_number || "-"}</div>
                      <div className="font-medium">Atas Nama</div><div>:</div><div>{vendor?.bank_account_name || "-"}</div>
                      <div className="font-medium">Franco</div><div>:</div><div>{letter.franco || "-"}</div>
                    </div>
                  </div>

                  {/* Signature section */}
                  <div className="break-inside-avoid">
                    <div className="flex justify-end mb-6">
                      <p className="text-gray-900 font-medium">Surabaya, {letterDate}</p>
                    </div>
                    <div className="flex justify-between items-end text-[12pt]">
                      <div className="text-gray-800">
                        <p>Menyetujui</p>
                        <div style={{ height: "80px" }} />
                        <p className="font-bold underline">{company?.leader_name || "Erick PM"}</p>
                        <p className="italic">{company?.admin_position || "Direktur"}</p>
                      </div>
                      <div className="text-gray-800">
                        <p>Mengetahui</p>
                        <div style={{ height: "80px" }} />
                        <p className="font-semibold">Sakti</p>
                      </div>
                    </div>
                  </div>

                </div>
              </td>
            </tr>
          </tbody>
          {/* TFOOT spacer */}
          <tfoot>
            <tr>
              <td>
                <div style={{ height: "90px" }}></div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}