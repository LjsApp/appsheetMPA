import { useState, useMemo } from 'react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Printer, Plus, Pencil, X, Upload, FileText, SendHorizonal } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import { usePurchaseOrders, usePoIns, useSavePurchaseOrder, useUploadFile, useSaveNotification } from '@/hooks/useData';
import type { PurchaseOrder, NeracaQuotation } from '@/types';
import { formatCurrency } from '@/lib/utils';
import AddPoOutModal from '@/components/AddPoOutModal';
import GeneratePoModal from '@/components/GeneratePoModal';
import TableToolbar from '@/components/TableToolbar';
import { useAuthStore } from '@/store/authStore';

export default function PurchaseOrders() {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const { data: purchaseOrders = [], isLoading: loadingPOs, refetch: refetchPOs } = usePurchaseOrders();
  const { data: poIns = [], isLoading: loadingPoIns } = usePoIns();
  
  
  const savePO = useSavePurchaseOrder();
  const saveNotification = useSaveNotification();
  const isLoading = loadingPOs || loadingPoIns;

  const [requestingVerificationId, setRequestingVerificationId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [generatingPoQt, setGeneratingPoQt] = useState<NeracaQuotation | null>(null);
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Edit modal state
  const [editModal, setEditModal] = useState<{ isOpen: boolean; po: PurchaseOrder | null }>({ isOpen: false, po: null });
  const [editPoNumber, setEditPoNumber] = useState('');
  const [editCreatedDate, setEditCreatedDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editRefDate, setEditRefDate] = useState('');
  const [editRef, setEditRef] = useState('');
  const [existingDocs, setExistingDocs] = useState<any[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const uploadFile = useUploadFile();

  const handleContinueAdd = (qt: NeracaQuotation) => {
    setShowAddModal(false);
    setGeneratingPoQt(qt);
  };

  // Helper: convert any date string to yyyy-MM-dd for input[type=date]
  const toDateInput = (dateStr?: string | null): string => {
    if (!dateStr || dateStr === '-' || dateStr === 'null' || dateStr === 'undefined') return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const openEdit = (po: PurchaseOrder) => {
    setEditPoNumber(po.po_number || '');
    setEditCreatedDate(toDateInput(po.created_date));
    setEditDueDate(po.due_date || '');
    setEditSubject(po.subject || '');
    setEditRefDate(po.ref_date || '');
    setEditRef(po.ref || '');
    let docs: any[] = [];
    if (po.dokumen) {
      try { docs = JSON.parse(po.dokumen); } catch {}
    }
    setExistingDocs(docs);
    setNewFiles([]);

    setEditModal({ isOpen: true, po });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
    }
  };

  const removeExistingDoc = (idx: number) => {
    setExistingDocs(prev => prev.filter((_, i) => i !== idx));
  };

  const removeNewFile = (idx: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveEdit = async () => {
    if (!editModal.po) return;
    setIsSaving(true);
    try {
      let finalDocs = [...existingDocs];
      if (newFiles.length > 0) {
        for (const file of newFiles) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
          });
          const res = await uploadFile.mutateAsync({ filename: file.name, mimeType: file.type, base64 });
          const fileUrl = typeof res === 'string' ? res : (res as any)?.url;
          if (fileUrl) finalDocs.push({ name: file.name, url: fileUrl });
        }
      }

      await savePO.mutateAsync({
        ...editModal.po,
        po_number: editPoNumber,
        created_date: editCreatedDate ? new Date(editCreatedDate).toISOString() : editModal.po.created_date,
        due_date: editDueDate || undefined,
        subject: editSubject,
        ref_date: editRefDate || undefined,
        ref: editRef,
        dokumen: JSON.stringify(finalDocs),
        updated_date: new Date().toISOString(),
      });

      setEditModal({ isOpen: false, po: null });
      setNewFiles([]);
    } catch {
      alert('Gagal menyimpan perubahan PO Out');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestVerification = async (po: PurchaseOrder) => {
    if (!window.confirm(`Minta verifikasi pimpinan untuk PO: ${po.po_number}?`)) return;
    setRequestingVerificationId(po.id);
    try {
      await savePO.mutateAsync({
        ...po,
        verification_status: 'Menunggu Verifikasi',
        updated_date: new Date().toISOString()
      });
    } catch (e) {
      alert('Gagal mengubah status PO');
      return;
    }

    try {
      await saveNotification.mutateAsync({
        id: Date.now().toString(),
        from_user_id: user?.id || 'system',
        from_user_name: user?.name || 'System',
        to_user_id: 'pimpinan',
        type: 'verification_request',
        ref_type: 'po',
        ref_id: po.id,
        ref_number: po.po_number,
        message: `User ${user?.name} meminta verifikasi PO: ${po.po_number}`,
        is_read: false,
        created_date: new Date().toISOString()
      });
    } catch (e) {
      // Notification failed but status already updated — not critical
      console.warn('Notifikasi gagal dikirim, tapi status PO sudah diubah:', e);
    } finally {
      setRequestingVerificationId(null);
    }
  };

  const groupedPOs = useMemo(() => {
    const groups = new Map<string, PurchaseOrder[]>();
    purchaseOrders.forEach(po => {
      const key = po.quotation_id || po.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(po);
    });
    return Array.from(groups.values());
  }, [purchaseOrders]);

  const filteredPoIns = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return groupedPOs;
    return groupedPOs.filter(group =>
      group.some(po =>
        (po.po_number || '').toLowerCase().includes(s) ||
        (po.vendor_name || '').toLowerCase().includes(s) ||
        (poIns.find(p => p.quotation_id === po.quotation_id)?.customer_name || '').toLowerCase().includes(s)
      )
    );
  }, [groupedPOs, search, poIns]);

  const totalPages = Math.max(1, Math.ceil(filteredPoIns.length / rowsPerPage));
  const paginatedGroups = filteredPoIns.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="PO Out"
          subtitle={`${purchaseOrders.length} PO Out`}
        />
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Tambah PO Out
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <TableToolbar
          search={search}
          onSearchChange={v => { setSearch(v); setCurrentPage(1); }}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={v => { setRowsPerPage(v); setCurrentPage(1); }}
          totalRows={filteredPoIns.reduce((acc, g) => acc + g.length, 0)}
          searchPlaceholder="Cari customer, vendor, no. PO..."
        />
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-gray-500">
            Belum ada data PO Out
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">CUSTOMER</th>
                  <th className="px-6 py-4">NO. PO OUT</th>
                  <th className="px-6 py-4">VENDOR</th>
                  <th className="px-6 py-4 text-center">JML ITEM</th>
                  <th className="px-6 py-4 text-right">TOTAL NILAI</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4">DOKUMEN</th>
                  {user?.is_super_admin && <th className="px-6 py-4">DIKERJAKAN OLEH</th>}
                  <th className="px-6 py-4 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedGroups.map((group) => {
                  return group.map((po, index) => {
                    let docs: any[] = [];
                    if (po.dokumen) {
                      try {
                        docs = JSON.parse(po.dokumen);
                      } catch {}
                    }

                    const poIn = poIns.find(p => p.quotation_id === po.quotation_id);

                    return (
                      <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                        {index === 0 && (
                          <td rowSpan={group.length} className="px-6 py-4 align-top border-r border-gray-100 bg-white">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">{poIn?.customer_name || '—'}</span>
                              <span className="text-xs text-gray-500 font-medium truncate max-w-[200px]" title={poIn?.judul}>{poIn?.judul || '—'}</span>
                              <span className="text-[11px] text-gray-400 font-mono mt-0.5">{poIn?.po_in_number || '—'}</span>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-violet-700">
                          <div className="flex items-center gap-2">
                            <span>{po.po_number}</span>
                            {po.type && po.type !== 'Full' && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${po.type === 'DP' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                {po.type}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                          {po.vendor_name}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-600">
                          {po.jumlah_item}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {formatCurrency(Number(po.total_nilai))}
                        </td>
                        <td className="px-6 py-4">
                          {po.verification_status === 'Terverifikasi' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              Terverifikasi
                            </span>
                          ) : po.verification_status === 'Ditolak' ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex w-max items-center px-2 py-1 rounded-md text-[11px] font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20" title={po.verification_note}>
                                Ditolak
                              </span>
                              <span className="text-[10px] text-gray-500 italic max-w-[120px] truncate" title={po.verification_note}>Note: {po.verification_note}</span>
                            </div>
                          ) : po.verification_status === 'Menunggu Verifikasi' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              Menunggu Verifikasi
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20">
                              Perlu Verifikasi
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {docs.length > 0 ? (
                            <div className="flex gap-2 flex-wrap">
                              {docs.map((d: any, idx: number) => (
                                <a
                                  key={`${po.id}-doc-${idx}`}
                                  href={d.url || d}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-1 rounded-md transition-colors"
                                >
                                  Dok.{idx + 1}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs italic">Tidak ada dokumen</span>
                          )}
                        </td>
                        {user?.is_super_admin && <td className="px-6 py-4 text-xs italic text-gray-500">{po.created_by || '-'}</td>}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {(po.verification_status === 'Perlu Verifikasi' || po.verification_status === 'Ditolak') && (
                              <button
                                onClick={() => handleRequestVerification(po)}
                                disabled={requestingVerificationId === po.id}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors whitespace-nowrap"
                                title="Minta Verifikasi"
                              >
                                {requestingVerificationId === po.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <SendHorizonal className="w-3 h-3" />}
                                Minta Verifikasi
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(po)}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                              title="Edit PO Out"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/po/${po.id}`)}
                              className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                              title="Cetak / Detail PO"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 text-sm">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">←</button>
            <span className="text-gray-500">Hal {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">→</button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModal.isOpen && editModal.po && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-semibold text-gray-900">Edit Dokumen Vendor</h2>
              <button onClick={() => setEditModal({ isOpen: false, po: null })} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm text-gray-600 mb-4">
                Vendor: <span className="font-semibold text-gray-800">{editModal.po.vendor_name}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Kolom Kiri */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">No. PO Out</label>
                    <input
                      value={editPoNumber}
                      onChange={e => setEditPoNumber(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                      placeholder="No. PO Out"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Date</label>
                    <input
                      type="date"
                      value={editCreatedDate}
                      onChange={e => setEditCreatedDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Due Date</label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={e => setEditDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Subject / Perihal</label>
                    <input
                      value={editSubject}
                      onChange={e => setEditSubject(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                      placeholder="Perihal pengadaan..."
                    />
                  </div>
                </div>

                {/* Kolom Kanan */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Ref Date</label>
                    <input
                      type="date"
                      value={editRefDate}
                      onChange={e => setEditRefDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Ref (No Dok Vendor)</label>
                    <input
                      value={editRef}
                      onChange={e => setEditRef(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                      placeholder="Ref"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Dokumen Vendor</label>
                  
                  {/* Existing docs */}
                  {existingDocs.length > 0 && (
                    <ul className="mb-2 space-y-1">
                      {existingDocs.map((d, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-blue-50 rounded px-2 py-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-blue-600 hover:underline">{d.name}</a>
                          <button type="button" onClick={() => removeExistingDoc(i)} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Upload zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Klik untuk unggah dokumen</p>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                  </div>

                  {/* New files list */}
                  {newFiles.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {newFiles.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded px-2 py-1.5">
                          <FileText className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                          <span className="flex-1 truncate">{f.name}</span>
                          <button type="button" onClick={() => removeNewFile(i)} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditModal({ isOpen: false, po: null })}>Batal</Button>
              <Button variant="primary" onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      <AddPoOutModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onContinue={handleContinueAdd}
      />

      <GeneratePoModal 
        quotation={generatingPoQt}
        skipPoInForm={true}
        onClose={() => setGeneratingPoQt(null)}
        onSuccess={() => {
          refetchPOs();
          setGeneratingPoQt(null);
        }}
      />
    </div>
  );
}
