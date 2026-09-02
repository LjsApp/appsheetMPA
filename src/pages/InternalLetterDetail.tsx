import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, RotateCcw, Loader2, MapPin, Phone, Mail, AtSign, CheckCircle, XCircle, Clock, AlertCircle, Upload, X, Banknote } from "lucide-react";
import { PageHeader, Button } from "@/components/ui";
import { useInternalLetters, useSaveInternalLetter, useVendors, usePoIns, usePurchaseOrders, useCompany, useVendorDiscounts, useNeracaItems, useUploadFile, useSaveNotification, useNotifications, useUsers } from "@/hooks/useData";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency, formatDate, getDriveImageUrl, formatDeliveryTime } from "@/lib/utils";

export default function InternalLetterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  const { data: letters = [], isLoading: isLoadingIL } = useInternalLetters();
  const { data: vendors = [] } = useVendors();
  const { data: poIns = [] } = usePoIns();
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const { data: company, isLoading: isLoadingCompany } = useCompany();
  const saveIL = useSaveInternalLetter();
  const uploadFile = useUploadFile();
  const saveNotification = useSaveNotification();
  const { data: notifications = [] } = useNotifications();
  const { data: users = [] } = useUsers();

  // Verification state
  const [isRequestingVerif, setIsRequestingVerif] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [isProcessingVerif, setIsProcessingVerif] = useState(false);
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [uploadedBuktiUrl, setUploadedBuktiUrl] = useState<string | null>(null);
  const [isUploadingBukti, setIsUploadingBukti] = useState(false);
  const [verifNote, setVerifNote] = useState('');
  const buktiInputRef = useRef<HTMLInputElement>(null);

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

  // Reset modal state when letter changes
  useEffect(() => {
    setBuktiFile(null);
    setUploadedBuktiUrl(null);
    setVerifNote('');
    setRejectNote('');
  }, [id]);

  useEffect(() => {
    if (letter && company) {
      document.title = `${companyName}_${letter.internal_letter_number}`;
      return () => { document.title = "Vite + React + TS"; };
    }
  }, [letter?.internal_letter_number, company?.name]);

  const handleRequestVerification = async () => {
    if (!letter) return;
    if (!window.confirm(`Minta verifikasi pimpinan untuk IL: ${letter.internal_letter_number}?`)) return;
    setIsRequestingVerif(true);
    try {
      await saveIL.mutateAsync({
        ...letter,
        verification_status: 'Menunggu Verifikasi',
        updated_date: new Date().toISOString()
      });
      try {
        await saveNotification.mutateAsync({
          id: Date.now().toString(),
          from_user_id: user?.id || 'system',
          from_user_name: user?.name || 'System',
          to_user_id: 'pimpinan',
          type: 'verification_request',
          ref_type: 'internal_letter',
          ref_id: letter.id,
          ref_number: letter.internal_letter_number,
          message: `${user?.name || 'Staff'} meminta verifikasi Internal Letter: ${letter.internal_letter_number}`,
          is_read: false,
          created_date: new Date().toISOString()
        });
      } catch { /* notifikasi gagal, tapi status sudah berubah */ }
    } catch {
      alert('Gagal mengubah status IL');
    } finally {
      setIsRequestingVerif(false);
    }
  };

  const handleBuktiUpload = async (file: File) => {
    setIsUploadingBukti(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const url = await uploadFile.mutateAsync({ filename: file.name, mimeType: file.type, base64 });
      setUploadedBuktiUrl(typeof url === 'string' ? url : (url as any)?.url);
    } catch {
      alert('Gagal mengupload bukti transfer');
    } finally {
      setIsUploadingBukti(false);
    }
  };

  const handleApprove = async () => {
    if (!letter || !uploadedBuktiUrl) return;
    setIsProcessingVerif(true);
    try {
      await saveIL.mutateAsync({
        ...letter,
        verification_status: 'Terverifikasi',
        verification_note: verifNote,
        verified_by: user?.name || 'Pimpinan',
        verified_date: new Date().toISOString(),
        bukti_tf_url: uploadedBuktiUrl,
        updated_date: new Date().toISOString()
      });
      try {
        let targetUserId = 'staff';
        const reqNotifs = notifications.filter(n => n.ref_id === letter.id && n.type === 'verification_request');
        if (reqNotifs.length > 0) {
          reqNotifs.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
          targetUserId = reqNotifs[0].from_user_id;
        } else if (letter.created_by) {
          const creator = users.find(u => u.name === letter.created_by || u.id === letter.created_by);
          if (creator) targetUserId = creator.id;
        }

        await saveNotification.mutateAsync({
          id: Date.now().toString(),
          from_user_id: user?.id || 'pimpinan',
          from_user_name: user?.name || 'Pimpinan',
          to_user_id: targetUserId,
          type: 'verification_result',
          ref_type: 'internal_letter',
          ref_id: letter.id,
          ref_number: letter.internal_letter_number,
          message: `Internal Letter ${letter.internal_letter_number} telah disetujui oleh ${user?.name || 'Pimpinan'}`,
          is_read: false,
          created_date: new Date().toISOString()
        });
      } catch { /* notifikasi gagal, tidak kritis */ }
      setShowApproveModal(false);
    } catch {
      alert('Gagal menyimpan verifikasi');
    } finally {
      setIsProcessingVerif(false);
    }
  };

  const handleReject = async () => {
    if (!letter || !rejectNote.trim()) { alert('Mohon isi alasan penolakan.'); return; }
    setIsProcessingVerif(true);
    try {
      await saveIL.mutateAsync({
        ...letter,
        verification_status: 'Ditolak',
        verification_note: rejectNote,
        verified_by: user?.name || 'Pimpinan',
        verified_date: new Date().toISOString(),
        updated_date: new Date().toISOString()
      });
      try {
        let targetUserId = 'staff';
        const reqNotifs = notifications.filter(n => n.ref_id === letter.id && n.type === 'verification_request');
        if (reqNotifs.length > 0) {
          reqNotifs.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
          targetUserId = reqNotifs[0].from_user_id;
        } else if (letter.created_by) {
          const creator = users.find(u => u.name === letter.created_by || u.id === letter.created_by);
          if (creator) targetUserId = creator.id;
        }

        await saveNotification.mutateAsync({
          id: Date.now().toString(),
          from_user_id: user?.id || 'pimpinan',
          from_user_name: user?.name || 'Pimpinan',
          to_user_id: targetUserId,
          type: 'verification_result',
          ref_type: 'internal_letter',
          ref_id: letter.id,
          ref_number: letter.internal_letter_number,
          message: `Internal Letter ${letter.internal_letter_number} ditolak: ${rejectNote}`,
          is_read: false,
          created_date: new Date().toISOString()
        });
      } catch { /* notifikasi gagal, tidak kritis */ }
      setShowRejectModal(false);
      setRejectNote('');
    } catch {
      alert('Gagal menyimpan penolakan');
    } finally {
      setIsProcessingVerif(false);
    }
  };

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

        {/* Verification Status Banner */}
        <div className="max-w-[860px] mx-auto mb-4">
          {/* Badge Status */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              {letter.verification_status === 'Terverifikasi' ? (
                <><CheckCircle className="w-5 h-5 text-emerald-500" />
                <div>
                  <span className="text-sm font-semibold text-emerald-700">Terverifikasi</span>
                  {letter.verified_by && <p className="text-xs text-gray-500">oleh {letter.verified_by} · {letter.verified_date ? formatDate(letter.verified_date) : ''}</p>}
                  {letter.bukti_tf_url && <a href={letter.bukti_tf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">Lihat Bukti Transfer</a>}
                </div></>
              ) : letter.verification_status === 'Ditolak' ? (
                <><XCircle className="w-5 h-5 text-red-500" />
                <div>
                  <span className="text-sm font-semibold text-red-700">Ditolak</span>
                  {letter.verification_note && <p className="text-xs text-gray-500">Alasan: {letter.verification_note}</p>}
                </div></>
              ) : letter.verification_status === 'Menunggu Verifikasi' ? (
                <><Clock className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-semibold text-amber-700">Menunggu Verifikasi Pimpinan</span></>
              ) : (
                <><AlertCircle className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-semibold text-gray-600">Perlu Verifikasi</span></>
              )}
            </div>

            {/* Actions: Staff */}
            {!user?.is_super_admin && (letter.verification_status === 'Perlu Verifikasi' || letter.verification_status === 'Ditolak') && (
              <button
                onClick={handleRequestVerification}
                disabled={isRequestingVerif}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isRequestingVerif ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Minta Verifikasi
              </button>
            )}

            {/* Actions: Pimpinan */}
            {user?.is_super_admin && letter.verification_status === 'Menunggu Verifikasi' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Tolak
                </button>
                <button
                  onClick={() => { setUploadedBuktiUrl(null); setBuktiFile(null); setVerifNote(''); setShowApproveModal(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Setuju
                </button>
              </div>
            )}
          </div>
        </div>
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

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" /> Tolak Internal Letter
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Alasan Penolakan <span className="text-red-500">*</span></label>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm"
                rows={3}
                placeholder="Tulis alasan mengapa Internal Letter ini ditolak..."
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 bg-gray-50 border-t border-gray-100">
              <button onClick={() => setShowRejectModal(false)} disabled={isProcessingVerif} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Batal</button>
              <button onClick={handleReject} disabled={isProcessingVerif || !rejectNote.trim()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {isProcessingVerif ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-600" /> Konfirmasi Pembayaran
              </h3>
              <button onClick={() => setShowApproveModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">Informasi Transfer Vendor</h4>
                <div className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
                  <div className="text-blue-700">Vendor</div>
                  <div className="font-medium text-blue-950">{vendor?.vendor_name || letter.vendor_name}</div>
                  
                  <div className="text-blue-700">Bank</div>
                  <div className="font-medium text-blue-950">{vendor?.bank_name || "-"}</div>
                  
                  <div className="text-blue-700">Atas Nama</div>
                  <div className="font-medium text-blue-950">{vendor?.bank_account_name || "-"}</div>
                  
                  <div className="text-blue-700">No. Rekening</div>
                  <div className="font-mono font-medium text-blue-950 text-base">{vendor?.bank_account_number || "-"}</div>
                  
                  <div className="text-blue-700 pt-2 border-t border-blue-200 mt-1">Total Nilai</div>
                  <div className="font-bold text-blue-950 text-lg pt-2 border-t border-blue-200 mt-1">Rp {formatCurrency(letter.total_nilai)}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Upload Bukti Transfer <span className="text-red-500">*</span></label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    ref={buktiInputRef}
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        setBuktiFile(e.target.files[0]);
                        handleBuktiUpload(e.target.files[0]);
                      }
                    }}
                  />
                  {!uploadedBuktiUrl ? (
                    <button
                      onClick={() => buktiInputRef.current?.click()}
                      disabled={isUploadingBukti}
                      className="flex items-center justify-center gap-2 w-full py-6 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 hover:border-blue-400 transition-colors disabled:opacity-50"
                    >
                      {isUploadingBukti ? (
                        <><Loader2 className="w-5 h-5 text-gray-400 animate-spin" /><span className="text-sm text-gray-500">Mengupload...</span></>
                      ) : (
                        <><Upload className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-500">Klik untuk upload bukti transfer</span></>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <div className="text-sm">
                          <p className="font-medium text-emerald-800">{buktiFile?.name || 'Bukti Transfer'}</p>
                          <a href={uploadedBuktiUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline text-xs">Lihat File</a>
                        </div>
                      </div>
                      <button onClick={() => { setUploadedBuktiUrl(null); setBuktiFile(null); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Catatan Verifikasi (Opsional)</label>
                <textarea
                  value={verifNote}
                  onChange={e => setVerifNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                  rows={2}
                  placeholder="Tambahkan catatan jika ada..."
                />
              </div>

            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 bg-gray-50 border-t border-gray-100">
              <button onClick={() => setShowApproveModal(false)} disabled={isProcessingVerif || isUploadingBukti} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Batal</button>
              <button onClick={handleApprove} disabled={isProcessingVerif || isUploadingBukti || !uploadedBuktiUrl} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {isProcessingVerif ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Konfirmasi & Setujui
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}