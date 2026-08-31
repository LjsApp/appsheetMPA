import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, Loader2, Trash2, Plus, X, Printer, ShoppingCart, Edit2, Search, Calendar } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import type { NeracaQuotation } from '@/types';
import {
  useNeracaQuotations, useDeleteNeracaQuotation,
  useInquiries, usePurchaseOrders,
  useNeracas, useSaveNeracaQuotation, useGetNextQuotationNumber, fetchApi,
  useNeracaItems, useNeracaDetail
} from '@/hooks/useData';
import { calculateNeracaGrandTotal } from '@/lib/neracaUtils';
import { formatDate, formatCurrency } from '@/lib/utils';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { useAuthStore } from '@/store/authStore';
import TableToolbar from '@/components/TableToolbar';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Helper component to render a single neraca row in the modal
function NeracaSelectionRow({ 
  neraca, 
  isUsed, 
  isSelected, 
  onToggle 
}: { 
  neraca: any; 
  isUsed: boolean; 
  isSelected: boolean; 
  onToggle: (id: string) => void;
}) {
  const { data: items } = useNeracaItems(neraca.id);
  const { data: detail } = useNeracaDetail(neraca.id);
  
  const total = items ? calculateNeracaGrandTotal(items, detail || undefined) : 0;

  return (
    <tr className="bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
      <td className="px-4 py-2 border-b border-gray-100"></td>
      <td colSpan={3} className="px-4 py-2 border-b border-gray-100">
        <div className="flex items-center justify-between w-full">
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input 
              type="checkbox" 
              disabled={isUsed} 
              checked={isUsed || isSelected} 
              onChange={() => onToggle(neraca.id)} 
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <span className={`text-sm ${isUsed ? 'text-gray-400' : 'text-gray-700'}`}>
              {neraca.name || neraca.id}
            </span>
          </label>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-gray-700">
              {total > 0 ? formatCurrency(total) : '-'}
            </span>
            {isUsed && (
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">✓ Sudah Jadi Quotation</span>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// Helper: check if date is within this week
function isThisWeek(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
}

function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function Quotations() {
  const navigate = useNavigate();
  const { data: inquiries = [] } = useInquiries();
  const { data: quotations = [], isLoading } = useNeracaQuotations();
  const { data: purchaseOrders = [] } = usePurchaseOrders();


  const deleteQuotation = useDeleteNeracaQuotation();
  const { data: neracas = [] } = useNeracas();
  const { data: allQuotations } = useNeracaQuotations();
  const saveQuotation = useSaveNeracaQuotation();
  const getNextQtNumber = useGetNextQuotationNumber();

  const [showAddModal, setShowAddModal] = useState(false);
  const user = useAuthStore(state => state.user);
  const [selectedNeracaIds, setSelectedNeracaIds] = useState<Set<string>>(new Set());
  const [expandedInq, setExpandedInq] = useState<Record<string, boolean>>({});
  const [isCreatingQt, setIsCreatingQt] = useState(false);

  // Modal search + tab states
  const [modalSearch, setModalSearch] = useState('');
  const [modalTab, setModalTab] = useState<'all' | 'week' | 'today'>('all');

  // Edit quotation modal state
  const [editModal, setEditModal] = useState<{ isOpen: boolean; quotation: NeracaQuotation | null }>({ isOpen: false, quotation: null });
  const [editQtNumber, setEditQtNumber] = useState('');
  const [editQtDate, setEditQtDate] = useState('');
  const [editQtSubject, setEditQtSubject] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const toggleNeracaSelection = (id: string) => {
    setSelectedNeracaIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleInqExpand = (id: string) => {
    setExpandedInq(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // neraca IDs that already have a quotation
  const usedNeracaIds = useMemo(() => new Set((allQuotations || []).map(q => q.neraca_id).filter(Boolean)), [allQuotations]);

  const handleAddQuotation = async () => {
    if (selectedNeracaIds.size === 0) return;
    setIsCreatingQt(true);
    try {
      const baseQtNumber = await getNextQtNumber.mutateAsync();
      let counter = 0;

      for (const neracaId of Array.from(selectedNeracaIds)) {
        const neraca = neracas.find(n => n.id === neracaId);
        if (!neraca) continue;
        const inquiry = inquiries.find(i => i.id === neraca.inquiry_id);
        if (!inquiry) continue;

        const items = await fetchApi(`getNeracaItems&neraca_id=${neraca.id}`);
        const detail = await fetchApi(`getNeracaDetail&neraca_id=${neraca.id}`);
        const grandTotal = calculateNeracaGrandTotal(items || [], detail || undefined);
        
        let qtNum = baseQtNumber || `QT-${new Date().getFullYear()}-${Date.now()}`;
        if (counter > 0 && baseQtNumber) {
           const parts = String(baseQtNumber).split('/');
           if (parts.length > 1) {
             const num = parseInt(parts[0], 10) + counter;
             qtNum = `${num}/${parts.slice(1).join('/')}`;
           } else {
             qtNum = `${baseQtNumber}-${counter}`;
           }
        }

        const payload = {
          id: `QT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          quotation_number: qtNum,
          neraca_id: neraca.id,
          inquiry_id: inquiry.id,
          customer_name: inquiry.customer_name || '',
          request_title: inquiry.request_title || '',
          nilai: grandTotal,
          dokumen: '',
          status: 'Draft' as const,
          created_by: user?.name || '',
          created_date: new Date().toISOString().split('T')[0],
          updated_date: new Date().toISOString().split('T')[0],
        };
        await saveQuotation.mutateAsync(payload);
        counter++;
      }
      setShowAddModal(false);
      setSelectedNeracaIds(new Set());
      setModalSearch('');
      setModalTab('all');
    } catch (e: any) {
      alert('Gagal membuat quotation: ' + e.message);
    } finally {
      setIsCreatingQt(false);
    }
  };

  // Open edit modal
  const openEditModal = (q: NeracaQuotation) => {
    setEditModal({ isOpen: true, quotation: q });
    setEditQtNumber(q.quotation_number || '');
    // created_date to yyyy-MM-dd
    const d = q.created_date ? new Date(q.created_date) : null;
    if (d && !isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setEditQtDate(`${yyyy}-${mm}-${dd}`);
    } else {
      setEditQtDate('');
    }
    setEditQtSubject(q.request_title || '');
  };

  const handleSaveEdit = async () => {
    if (!editModal.quotation) return;
    setIsSavingEdit(true);
    try {
      await saveQuotation.mutateAsync({
        ...editModal.quotation,
        quotation_number: editQtNumber,
        created_date: editQtDate ? new Date(editQtDate).toISOString() : editModal.quotation.created_date,
        request_title: editQtSubject,
        updated_date: new Date().toISOString().split('T')[0],
      });
      setEditModal({ isOpen: false, quotation: null });
    } catch (e: any) {
      alert('Gagal menyimpan: ' + e.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Deduplicate: keep only one (latest) quotation per neraca_id
  const uniqueQuotations = useMemo(() => {
    const map = new Map<string, NeracaQuotation>();
    quotations.forEach(q => {
      const existing = map.get(q.neraca_id);
      if (!existing || q.created_date > existing.created_date) {
        map.set(q.neraca_id, q);
      }
    });
    return Array.from(map.values());
  }, [quotations]);

  const getInquiryDocument = (inquiryId: string) => {
    const inq = inquiries.find(i => i.id === inquiryId);
    if (!inq || !inq.documents) return null;
    try {
      const docs = JSON.parse(inq.documents);
      if (Array.isArray(docs) && docs.length > 0) return docs[0].url;
      return docs;
    } catch {
      return inq.documents;
    }
  };

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; title: string; quotation: NeracaQuotation | null }>({ isOpen: false, id: null, title: '', quotation: null });
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const handleDelete = (q: NeracaQuotation) => {
    setDeleteModal({ isOpen: true, id: q.id, title: `Hapus Quotation ${q.quotation_number}`, quotation: q });
  };

  const executeDelete = async () => {
    if (!deleteModal.quotation) return;
    const q = deleteModal.quotation;
    const dupes = quotations.filter(x => x.neraca_id === q.neraca_id);
    for (const dupe of dupes) {
      await deleteQuotation.mutateAsync(dupe.id);
    }
    setDeleteModal({ isOpen: false, id: null, title: '', quotation: null });
  };

  const filteredQuotations = useMemo(() => {
    if (!search) return uniqueQuotations;
    const s = search.toLowerCase();
    return uniqueQuotations.filter(q =>
      (q.quotation_number || '').toLowerCase().includes(s) ||
      (q.customer_name || '').toLowerCase().includes(s) ||
      (q.request_title || '').toLowerCase().includes(s)
    );
  }, [uniqueQuotations, search]);

  const totalPages = Math.max(1, Math.ceil(filteredQuotations.length / rowsPerPage));
  const paginatedQuotations = filteredQuotations.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Filtered inquiries for the modal
  const modalInquiries = useMemo(() => {
    let result = inquiries.filter(i => i.status === 'Neraca');
    if (modalTab === 'today') result = result.filter(i => isToday(i.created_date));
    else if (modalTab === 'week') result = result.filter(i => isThisWeek(i.created_date));
    if (modalSearch) {
      const s = modalSearch.toLowerCase();
      result = result.filter(i =>
        (i.request_number || '').toLowerCase().includes(s) ||
        (i.customer_name || '').toLowerCase().includes(s) ||
        (i.request_title || '').toLowerCase().includes(s)
      );
    }
    return result;
  }, [inquiries, modalSearch, modalTab]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer Quotations"
        subtitle={`${uniqueQuotations.length} quotation`}
        action={
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Tambah Quotation
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <TableToolbar
          search={search}
          onSearchChange={v => { setSearch(v); setCurrentPage(1); }}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={v => { setRowsPerPage(v); setCurrentPage(1); }}
          totalRows={filteredQuotations.length}
          searchPlaceholder="Cari customer, no. quotation..."
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">No. Quotation</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Nilai</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dokumen</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status PO</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                {user?.is_super_admin && <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dikerjakan Oleh</th>}
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : paginatedQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <FileCheck2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Belum ada quotation.</p>
                  </td>
                </tr>
              ) : (() => {
                // Group by inquiry_id
                const groups = new Map<string, NeracaQuotation[]>();
                paginatedQuotations.forEach(q => {
                  const key = q.inquiry_id || q.id;
                  if (!groups.has(key)) groups.set(key, []);
                  groups.get(key)!.push(q);
                });

                return Array.from(groups.values()).map(group => {
                  const inquiry = inquiries.find(i => i.id === group[0].inquiry_id);
                  return group.map((q, idx) => {
                    const activePOs = purchaseOrders.filter(p => p.quotation_id === q.id);
                    const hasPO = activePOs.length > 0;
                    const docUrl = getInquiryDocument(q.inquiry_id);
                    return (
                      <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                        {idx === 0 && (
                          <td rowSpan={group.length} className="px-5 py-4 align-top border-r border-gray-100 bg-white">
                            <div className="font-semibold text-gray-900">{q.customer_name}</div>
                            <div className="font-mono text-xs text-gray-500 mt-0.5">{inquiry?.request_number || '-'}</div>
                            <div className="text-xs text-gray-400 max-w-[160px] truncate mt-0.5" title={inquiry?.request_title}>{inquiry?.request_title || '-'}</div>
                          </td>
                        )}
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-blue-700">
                          <div>{q.quotation_number}</div>
                          {q.request_title && <div className="text-[11px] text-gray-400 font-sans mt-0.5 max-w-[160px] truncate" title={q.request_title}>{q.request_title}</div>}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-gray-900">
                          {Number(q.nilai) > 0 ? formatCurrency(Number(q.nilai)) : <span className="text-gray-400 font-normal text-xs">-</span>}
                        </td>
                        <td className="px-5 py-4">
                          {docUrl ? (
                            <a href={docUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800">Lihat Dok.</a>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {hasPO ? (
                            <button
                              onClick={() => navigate('/po')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              Sudah PO Out ({activePOs.length})
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 text-xs rounded-full bg-gray-100 text-gray-500">Belum PO</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500">{formatDate(q.created_date)}</td>
                        {user?.is_super_admin && <td className="px-5 py-4 text-xs italic text-gray-500">{q.created_by || '-'}</td>}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditModal(q)} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors" title="Edit Quotation">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(q)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => navigate(`/quotations/${q.id}`)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Cetak / Detail Quotation"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                });
              })()}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 text-sm">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">←</button>
            <span className="text-gray-500">Hal {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">→</button>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeDelete}
        title={deleteModal.title}
        description="Yakin ingin menghapus quotation ini?"
        isLoading={deleteQuotation.isPending}
      />

      {/* Edit Quotation Modal */}
      {editModal.isOpen && editModal.quotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-base font-semibold text-gray-900">Edit Quotation</h2>
              <button onClick={() => setEditModal({ isOpen: false, quotation: null })} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">No. Quotation</label>
                <input
                  value={editQtNumber}
                  onChange={e => setEditQtNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="No. Quotation"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Date</label>
                <input
                  type="date"
                  value={editQtDate}
                  onChange={e => setEditQtDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Judul Permintaan</label>
                <input
                  value={editQtSubject}
                  onChange={e => setEditQtSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Judul permintaan quotation"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-5">
              <Button variant="secondary" onClick={() => setEditModal({ isOpen: false, quotation: null })}>Batal</Button>
              <Button onClick={handleSaveEdit} loading={isSavingEdit}>Simpan</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Quotation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Tambah Quotation</h2>
              <button onClick={() => { setShowAddModal(false); setSelectedNeracaIds(new Set()); setModalSearch(''); setModalTab('all'); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {/* Search + Tabs */}
            <div className="px-5 pt-4 pb-0 shrink-0 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  placeholder="Cari no. permintaan, customer, judul..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              {/* Tabs */}
              <div className="flex gap-1">
                {([['all', 'Semua'], ['week', 'Minggu Ini'], ['today', 'Hari Ini']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setModalTab(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      modalTab === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {key !== 'all' && <Calendar className="w-3 h-3" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1 mt-3">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="w-10 px-4 py-3"></th>
                    <th className="px-4 py-3 font-semibold text-gray-600">No. Permintaan</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Customer</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Judul</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {modalInquiries.length === 0 && (
                     <tr><td colSpan={4} className="p-8 text-center text-gray-500">
                       {modalSearch || modalTab !== 'all' ? 'Tidak ada data yang sesuai filter.' : 'Belum ada inquiry di tahap Neraca.'}
                     </td></tr>
                  )}
                  {modalInquiries.map(inq => {
                    const inqNeracas = neracas.filter(n => n.inquiry_id === inq.id);
                    if (inqNeracas.length === 0) return null;
                    const isExpanded = expandedInq[inq.id];
                    return (
                      <React.Fragment key={inq.id}>
                        <tr className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => toggleInqExpand(inq.id)}>
                          <td className="px-4 py-3 text-gray-400">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="px-4 py-3 font-medium text-blue-600">{inq.request_number}</td>
                          <td className="px-4 py-3 text-gray-800">{inq.customer_name}</td>
                          <td className="px-4 py-3 text-gray-700 truncate max-w-[200px]" title={inq.request_title}>{inq.request_title}</td>
                        </tr>
                        {isExpanded && inqNeracas.map(n => (
                          <NeracaSelectionRow 
                            key={n.id}
                            neraca={n}
                            isUsed={usedNeracaIds.has(n.id)}
                            isSelected={selectedNeracaIds.has(n.id)}
                            onToggle={toggleNeracaSelection}
                          />
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center p-5 border-t bg-gray-50 rounded-b-2xl shrink-0">
              <span className="text-sm font-medium text-gray-600">{selectedNeracaIds.size} neraca dipilih</span>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => { setShowAddModal(false); setSelectedNeracaIds(new Set()); setModalSearch(''); setModalTab('all'); }}>Batal</Button>
                <Button onClick={handleAddQuotation} loading={isCreatingQt} disabled={selectedNeracaIds.size === 0}>
                  Buat Quotation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
