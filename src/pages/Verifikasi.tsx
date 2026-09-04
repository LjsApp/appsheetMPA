import React, { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePurchaseOrders, useInvoices, useInternalLetters, useSavePurchaseOrder, useSaveInvoice, useSaveInternalLetter, useSaveNotification, usePoIns, useUsers, useVendors, useUploadFile, useNotifications } from '@/hooks/useData';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/ui';
import { Loader2, Check, X, FileText, ShoppingCart, Receipt, Mail, Upload, Banknote } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { PurchaseOrder, Invoice, InternalLetter } from '@/types';

export default function Verifikasi() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: purchaseOrders = [], isLoading: poLoading } = usePurchaseOrders();
  const { data: invoices = [], isLoading: invLoading } = useInvoices();
  const { data: letters = [], isLoading: ilLoading } = useInternalLetters();
  const savePO = useSavePurchaseOrder();
  const saveInvoice = useSaveInvoice();
  const saveIL = useSaveInternalLetter();
  const saveNotification = useSaveNotification();
  const uploadFile = useUploadFile();
  const { data: poIns = [] } = usePoIns();
  const { data: users = [] } = useUsers();
  const { data: vendors = [] } = useVendors();
  const { data: notifications = [] } = useNotifications();

  const initialTab = (searchParams.get('tab') as 'po' | 'invoice' | 'il') || 'po';
  const [activeTab, setActiveTab] = useState<'po' | 'invoice' | 'il'>(initialTab);
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean, type: 'po' | 'invoice', id: string, docNumber: string }>({ isOpen: false, type: 'po', id: '', docNumber: '' });
  const [rejectReason, setRejectReason] = useState('');

  // IL approve modal state
  const [ilApproveModal, setIlApproveModal] = useState<{ isOpen: boolean; letter: InternalLetter | null }>({ isOpen: false, letter: null });
  const [ilRejectModal, setIlRejectModal] = useState<{ isOpen: boolean; letter: InternalLetter | null }>({ isOpen: false, letter: null });
  const [ilRejectReason, setIlRejectReason] = useState('');
  const [ilVerifNote, setIlVerifNote] = useState('');
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [buktiUrl, setBuktiUrl] = useState<string | null>(null);
  const [isUploadingBukti, setIsUploadingBukti] = useState(false);
  const [isProcessingIL, setIsProcessingIL] = useState(false);
  const buktiInputRef = useRef<HTMLInputElement>(null);

  // Pending items
  const pendingPOs = purchaseOrders.filter(p => p.verification_status === 'Menunggu Verifikasi').sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
  const pendingInvoices = invoices.filter(i => i.verification_status === 'Menunggu Verifikasi').sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
  const pendingILs = letters.filter(l => l.verification_status === 'Menunggu Verifikasi').sort((a, b) => new Date(b.created_date || '').getTime() - new Date(a.created_date || '').getTime());

  const groupedPOs = React.useMemo(() => {
    const groups = new Map<string, PurchaseOrder[]>();
    pendingPOs.forEach(po => {
      const key = po.quotation_id || po.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(po);
    });
    return Array.from(groups.values());
  }, [pendingPOs]);

  const getCreatorName = (created_by?: string) => {
    if (!created_by) return '-';
    if (created_by.startsWith('USR-')) {
      const u = users.find(u => u.id === created_by);
      if (u) return u.name;
    }
    return created_by;
  };

  const handleApprove = async (type: 'po' | 'invoice', item: PurchaseOrder | Invoice) => {
    if (!window.confirm(`Setujui ${type === 'po' ? 'PO' : 'Invoice'} ${type === 'po' ? (item as PurchaseOrder).po_number : (item as Invoice).invoice_number}?`)) return;
    
    try {
      const docNum = type === 'po' ? (item as PurchaseOrder).po_number : (item as Invoice).invoice_number;
      
      if (type === 'po') {
        await savePO.mutateAsync({
          ...item,
          verification_status: 'Terverifikasi',
          verified_by: user?.name,
          verified_date: new Date().toISOString()
        });
      } else {
        await saveInvoice.mutateAsync({
          ...item,
          verification_status: 'Terverifikasi',
          verified_by: user?.name,
          verified_date: new Date().toISOString()
        });
      }

      // Find target user ID
      let targetUserId = 'staff';
      const reqNotifs = notifications.filter(n => n.ref_id === item.id && n.type === 'verification_request');
      if (reqNotifs.length > 0) {
        reqNotifs.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
        targetUserId = reqNotifs[0].from_user_id;
      } else if (item.created_by) {
        const creator = users.find(u => u.name === item.created_by || u.id === item.created_by);
        if (creator) targetUserId = creator.id;
      }

      await saveNotification.mutateAsync({
        id: Date.now().toString(),
        from_user_id: user?.id || 'system',
        from_user_name: user?.name || 'System',
        to_user_id: targetUserId,
        type: 'verification_result',
        ref_type: type,
        ref_id: item.id,
        ref_number: docNum,
        message: `✅ ${type === 'po' ? 'PO' : 'Invoice'} ${docNum} telah disetujui oleh Pimpinan.`,
        is_read: false,
        created_date: new Date().toISOString()
      });
    } catch (e) {
      console.error('Error approving document:', e);
      alert('Gagal menyetujui dokumen.');
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) { alert('Alasan penolakan harus diisi!'); return; }
    
    try {
      const type = rejectModal.type;
      const id = rejectModal.id;
      const docNum = rejectModal.docNumber;
      
      // Find target user ID
      let targetUserId = 'staff';
      const reqNotifs = notifications.filter(n => n.ref_id === id && n.type === 'verification_request');
      if (reqNotifs.length > 0) {
        reqNotifs.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
        targetUserId = reqNotifs[0].from_user_id;
      }

      if (type === 'po') {
        const po = purchaseOrders.find(p => p.id === id);
        if (po) {
          if (targetUserId === 'staff' && po.created_by) {
            const creator = users.find(u => u.name === po.created_by || u.id === po.created_by);
            if (creator) targetUserId = creator.id;
          }
          await savePO.mutateAsync({ ...po, verification_status: 'Ditolak', verification_note: rejectReason, verified_by: user?.name, verified_date: new Date().toISOString() });
          await saveNotification.mutateAsync({ id: Date.now().toString(), from_user_id: user?.id || 'system', from_user_name: user?.name || 'System', to_user_id: targetUserId, type: 'verification_result', ref_type: 'po', ref_id: id, ref_number: docNum, message: `❌ PO ${docNum} ditolak oleh Pimpinan. Catatan: ${rejectReason}`, is_read: false, created_date: new Date().toISOString() });
        }
      } else {
        const inv = invoices.find(i => i.id === id);
        if (inv) {
          if (targetUserId === 'staff' && inv.created_by) {
            const creator = users.find(u => u.name === inv.created_by || u.id === inv.created_by);
            if (creator) targetUserId = creator.id;
          }
          await saveInvoice.mutateAsync({ ...inv, verification_status: 'Ditolak', verification_note: rejectReason, verified_by: user?.name, verified_date: new Date().toISOString() });
          await saveNotification.mutateAsync({ id: Date.now().toString(), from_user_id: user?.id || 'system', from_user_name: user?.name || 'System', to_user_id: targetUserId, type: 'verification_result', ref_type: 'invoice', ref_id: id, ref_number: docNum, message: `❌ Invoice ${docNum} ditolak oleh Pimpinan. Catatan: ${rejectReason}`, is_read: false, created_date: new Date().toISOString() });
        }
      }
      
      setRejectModal({ isOpen: false, type: 'po', id: '', docNumber: '' });
      setRejectReason('');
    } catch (e) {
      console.error('Error rejecting document:', e);
      alert('Gagal menolak dokumen.');
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
      setBuktiUrl(typeof url === 'string' ? url : (url as any)?.url);
    } catch { alert('Gagal mengupload bukti transfer'); }
    finally { setIsUploadingBukti(false); }
  };

  const handleILApprove = async () => {
    const letter = ilApproveModal.letter;
    if (!letter || !buktiUrl) return;
    setIsProcessingIL(true);
    try {
      // Find target user ID
      let targetUserId = 'staff';
      const reqNotifs = notifications.filter(n => n.ref_id === letter.id && n.type === 'verification_request');
      if (reqNotifs.length > 0) {
        reqNotifs.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
        targetUserId = reqNotifs[0].from_user_id;
      } else if (letter.created_by) {
        const creator = users.find(u => u.name === letter.created_by || u.id === letter.created_by);
        if (creator) targetUserId = creator.id;
      }

      await saveIL.mutateAsync({
        ...letter,
        verification_status: 'Terverifikasi',
        verification_note: ilVerifNote,
        verified_by: user?.name || 'Pimpinan',
        verified_date: new Date().toISOString(),
        bukti_tf_url: buktiUrl,
        updated_date: new Date().toISOString()
      });
      try {
        await saveNotification.mutateAsync({
          id: Date.now().toString(),
          from_user_id: user?.id || 'system',
          from_user_name: user?.name || 'System',
          to_user_id: targetUserId,
          type: 'verification_result',
          ref_type: 'internal_letter',
          ref_id: letter.id,
          ref_number: letter.internal_letter_number,
          message: `✅ Internal Letter ${letter.internal_letter_number} telah disetujui oleh ${user?.name || 'Pimpinan'}.`,
          is_read: false,
          created_date: new Date().toISOString()
        });
      } catch { /* notifikasi opsional */ }
      setIlApproveModal({ isOpen: false, letter: null });
      setBuktiFile(null); setBuktiUrl(null); setIlVerifNote('');
    } catch { alert('Gagal menyimpan verifikasi IL'); }
    finally { setIsProcessingIL(false); }
  };

  const handleILReject = async (e: React.FormEvent) => {
    e.preventDefault();
    const letter = ilRejectModal.letter;
    if (!letter || !ilRejectReason.trim()) { alert('Alasan penolakan harus diisi!'); return; }
    setIsProcessingIL(true);
    try {
      // Find target user ID
      let targetUserId = 'staff';
      const reqNotifs = notifications.filter(n => n.ref_id === letter.id && n.type === 'verification_request');
      if (reqNotifs.length > 0) {
        reqNotifs.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
        targetUserId = reqNotifs[0].from_user_id;
      } else if (letter.created_by) {
        const creator = users.find(u => u.name === letter.created_by || u.id === letter.created_by);
        if (creator) targetUserId = creator.id;
      }

      await saveIL.mutateAsync({
        ...letter,
        verification_status: 'Ditolak',
        verification_note: ilRejectReason,
        verified_by: user?.name || 'Pimpinan',
        verified_date: new Date().toISOString(),
        updated_date: new Date().toISOString()
      });
      try {
        await saveNotification.mutateAsync({
          id: Date.now().toString(),
          from_user_id: user?.id || 'system',
          from_user_name: user?.name || 'System',
          to_user_id: targetUserId,
          type: 'verification_result',
          ref_type: 'internal_letter',
          ref_id: letter.id,
          ref_number: letter.internal_letter_number,
          message: `❌ Internal Letter ${letter.internal_letter_number} ditolak. Catatan: ${ilRejectReason}`,
          is_read: false,
          created_date: new Date().toISOString()
        });
      } catch { /* notifikasi opsional */ }
      setIlRejectModal({ isOpen: false, letter: null });
      setIlRejectReason('');
    } catch { alert('Gagal menolak IL'); }
    finally { setIsProcessingIL(false); }
  };

  const openDoc = (type: string, id: string) => { navigate(`/${type}/${id}`); };

  if (poLoading || invLoading || ilLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Verifikasi Dokumen" 
        subtitle="Verifikasi PO Out, Invoice, dan Internal Letter yang menunggu persetujuan." 
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center border-b border-gray-100">
          <button
            onClick={() => setActiveTab('po')}
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors relative ${activeTab === 'po' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <ShoppingCart className="w-4 h-4" />
            PO Out
            {pendingPOs.length > 0 && <span className="bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs ml-1">{pendingPOs.length}</span>}
            {activeTab === 'po' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors relative ${activeTab === 'invoice' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <Receipt className="w-4 h-4" />
            Invoice
            {pendingInvoices.length > 0 && <span className="bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs ml-1">{pendingInvoices.length}</span>}
            {activeTab === 'invoice' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
          </button>
          <button
            onClick={() => setActiveTab('il')}
            className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors relative ${activeTab === 'il' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            <Mail className="w-4 h-4" />
            Internal Letter
            {pendingILs.length > 0 && <span className="bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs ml-1">{pendingILs.length}</span>}
            {activeTab === 'il' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
          </button>
        </div>

        <div className="p-0 overflow-x-auto">
          {/* ─── PO Out Tab ─── */}
          {activeTab === 'po' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">No. PO</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nilai</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dibuat Oleh</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groupedPOs.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400"><Check className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p>Tidak ada PO Out yang menunggu verifikasi.</p></td></tr>
                ) : (
                  groupedPOs.map((group) =>
                    group.map((po, index) => {
                      const poIn = poIns.find(p => p.quotation_id === po.quotation_id);
                      return (
                        <tr key={po.id} className="hover:bg-gray-50/50">
                          {index === 0 && (
                            <td rowSpan={group.length} className="px-5 py-4 align-top border-r border-gray-100 bg-white">
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900">{poIn?.customer_name || '—'}</span>
                                <span className="text-xs text-gray-500 font-medium truncate max-w-[150px]" title={poIn?.judul}>{poIn?.judul || '—'}</span>
                                <span className="text-[11px] text-gray-400 font-mono mt-0.5">{poIn?.po_in_number || '—'}</span>
                              </div>
                            </td>
                          )}
                          <td className="px-5 py-4 text-sm font-semibold text-blue-700">
                            <div className="flex items-center gap-2">
                              <span>{po.po_number}</span>
                              {po.type && po.type !== 'Full' && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${po.type === 'DP' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{po.type}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-900">{po.vendor_name}</td>
                          <td className="px-5 py-4 text-sm font-medium text-gray-900">{formatCurrency(po.total_nilai)}</td>
                          <td className="px-5 py-4 text-sm text-gray-500 italic">{getCreatorName(po.created_by)}</td>
                          <td className="px-5 py-4 text-sm text-gray-500">{formatDate(po.created_date)}</td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openDoc('po', po.id)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Lihat</button>
                              <button onClick={() => handleApprove('po', po)} disabled={savePO.isPending} className="px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-1 disabled:opacity-50"><Check className="w-3.5 h-3.5" /> Setuju</button>
                              <button onClick={() => setRejectModal({ isOpen: true, type: 'po', id: po.id, docNumber: po.po_number })} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Tolak</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )
                )}
              </tbody>
            </table>
          )}

          {/* ─── Invoice Tab ─── */}
          {activeTab === 'invoice' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">No. Invoice</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal Inv</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dibuat Oleh</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dibuat Tgl</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingInvoices.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400"><Check className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p>Tidak ada Invoice yang menunggu verifikasi.</p></td></tr>
                ) : (
                  pendingInvoices.map(inv => {
                    const poIn = poIns.find(p => p.id === inv.po_in_id);
                    const custName = poIn?.customer_name || inv.customer_id;
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-4 text-sm font-semibold text-violet-700">{inv.invoice_number}</td>
                        <td className="px-5 py-4 text-sm text-gray-900">{custName}</td>
                        <td className="px-5 py-4 text-sm text-gray-900">{formatDate(inv.invoice_date)}</td>
                        <td className="px-5 py-4 text-sm text-gray-500 italic">{getCreatorName(inv.created_by)}</td>
                        <td className="px-5 py-4 text-sm text-gray-500">{formatDate(inv.created_date)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openDoc('invoices', inv.id)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Lihat</button>
                            <button onClick={() => handleApprove('invoice', inv)} disabled={saveInvoice.isPending} className="px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-1 disabled:opacity-50"><Check className="w-3.5 h-3.5" /> Setuju</button>
                            <button onClick={() => setRejectModal({ isOpen: true, type: 'invoice', id: inv.id, docNumber: inv.invoice_number })} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Tolak</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* ─── Internal Letter Tab ─── */}
          {activeTab === 'il' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">No. IL</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Nilai</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dibuat Oleh</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingILs.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400"><Check className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p>Tidak ada Internal Letter yang menunggu verifikasi.</p></td></tr>
                ) : (
                  pendingILs.map(letter => {
                    const vendor = vendors.find(v => v.id === letter.vendor_id);
                    return (
                      <tr key={letter.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-4 text-sm">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{letter.customer_name || '—'}</span>
                            <span className="text-[11px] text-gray-400 font-mono">{letter.perihal || ''}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-violet-700">
                          <div className="flex items-center gap-1.5">
                            <span>{letter.internal_letter_number}</span>
                            {letter.type && letter.type !== 'Full' && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${letter.type === 'DP' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{letter.type}</span>
                            )}
                          </div>
                          {letter.tanggal && <div className="text-[11px] text-gray-400 font-sans mt-0.5">{formatDate(letter.tanggal)}</div>}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span>{letter.vendor_name}</span>
                            {vendor?.bank_name && <span className="text-[11px] text-gray-400">{vendor.bank_name} · {vendor.bank_account_number}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">{formatCurrency(Number(letter.total_nilai))}</td>
                        <td className="px-5 py-4 text-sm text-gray-500 italic">{getCreatorName(letter.created_by)}</td>
                        <td className="px-5 py-4 text-sm text-gray-500">{letter.created_date ? formatDate(letter.created_date) : '—'}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openDoc('internal-letters', letter.id)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Lihat</button>
                            <button
                              onClick={() => { setBuktiFile(null); setBuktiUrl(null); setIlVerifNote(''); setIlApproveModal({ isOpen: true, letter }); }}
                              className="px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Setuju
                            </button>
                            <button
                              onClick={() => { setIlRejectReason(''); setIlRejectModal({ isOpen: true, letter }); }}
                              className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Tolak
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── PO/Invoice Reject Modal ─── */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Tolak Dokumen</h2>
              <button onClick={() => setRejectModal({ isOpen: false, type: 'po', id: '', docNumber: '' })} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleReject} className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-2">Anda menolak <span className="font-semibold">{rejectModal.docNumber}</span>. Berikan alasan penolakan:</p>
              <textarea required value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-none" placeholder="Misal: Harga vendor salah, mohon revisi..." />
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setRejectModal({ isOpen: false, type: 'po', id: '', docNumber: '' })} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Batal</button>
                <button type="submit" disabled={savePO.isPending || saveInvoice.isPending} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50">Tolak Dokumen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── IL Approve Modal (dengan upload bukti transfer) ─── */}
      {ilApproveModal.isOpen && ilApproveModal.letter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2"><Banknote className="w-5 h-5 text-emerald-600" /> Konfirmasi Persetujuan IL</h2>
              <button onClick={() => setIlApproveModal({ isOpen: false, letter: null })} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Vendor bank info */}
              {(() => {
                const vendor = vendors.find(v => v.id === ilApproveModal.letter?.vendor_id);
                return vendor ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Info Rekening Vendor</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-500">Vendor</div><div className="font-medium text-gray-900">{vendor.vendor_name}</div>
                      <div className="text-gray-500">Bank</div><div className="font-medium text-gray-900">{vendor.bank_name || '-'}</div>
                      <div className="text-gray-500">No. Rekening</div><div className="font-medium text-gray-900 font-mono">{vendor.bank_account_number || '-'}</div>
                      <div className="text-gray-500">Atas Nama</div><div className="font-medium text-gray-900">{vendor.bank_account_name || '-'}</div>
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs text-amber-700 font-medium">Total yang ditransfer: <span className="text-base font-bold">{formatCurrency(Number(ilApproveModal.letter?.total_nilai))}</span></p>
              </div>
              {/* Upload bukti */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bukti Transfer <span className="text-red-500">*</span></label>
                <input ref={buktiInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) { setBuktiFile(e.target.files[0]); handleBuktiUpload(e.target.files[0]); }}} />
                {!buktiFile ? (
                  <button onClick={() => buktiInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors flex flex-col items-center gap-1">
                    <Upload className="w-5 h-5" />
                    <span>Klik untuk unggah bukti transfer</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-sm text-emerald-700 truncate">{isUploadingBukti ? 'Mengupload...' : (buktiUrl ? '✅ ' : '') + buktiFile.name}</span>
                    {isUploadingBukti && <Loader2 className="w-4 h-4 animate-spin text-emerald-600 flex-shrink-0" />}
                    {!isUploadingBukti && <button onClick={() => { setBuktiFile(null); setBuktiUrl(null); }} className="text-gray-400 hover:text-red-500 flex-shrink-0"><X className="w-4 h-4" /></button>}
                  </div>
                )}
              </div>
              {/* Optional note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
                <textarea value={ilVerifNote} onChange={e => setIlVerifNote(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm resize-none" rows={2} placeholder="Tambahkan catatan jika ada..." />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button onClick={() => setIlApproveModal({ isOpen: false, letter: null })} disabled={isProcessingIL || isUploadingBukti} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Batal</button>
              <button onClick={handleILApprove} disabled={isProcessingIL || isUploadingBukti || !buktiUrl} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {isProcessingIL ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Konfirmasi & Setujui
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── IL Reject Modal ─── */}
      {ilRejectModal.isOpen && ilRejectModal.letter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2"><X className="w-5 h-5 text-red-500" /> Tolak Internal Letter</h2>
              <button onClick={() => setIlRejectModal({ isOpen: false, letter: null })} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <form onSubmit={handleILReject} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">Anda menolak <span className="font-semibold">{ilRejectModal.letter.internal_letter_number}</span>. Berikan alasan penolakan:</p>
              <textarea required value={ilRejectReason} onChange={e => setIlRejectReason(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent min-h-[100px] resize-none text-sm" placeholder="Misal: Harga tidak sesuai, mohon revisi..." />
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIlRejectModal({ isOpen: false, letter: null })} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Batal</button>
                <button type="submit" disabled={isProcessingIL} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50">
                  {isProcessingIL ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Tolak IL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
