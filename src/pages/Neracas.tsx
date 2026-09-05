import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Loader2, ChevronDown, ChevronRight, ExternalLink, Edit2 } from 'lucide-react';
import { PageHeader, Button, FormField, Input } from '@/components/ui';
import Modal from '@/components/Modal';
import { useForm } from 'react-hook-form';
import { FileCheck2, Copy } from 'lucide-react';
import { useInquiries, useNeracas, useSaveNeraca, useDeleteNeraca, useDeleteInquiry, useInitNeracaSheets, useNeracaQuotations, useDuplicateNeraca, usePurchaseOrders, usePoIns, useInvoices } from '@/hooks/useData';
import TableToolbar from '@/components/TableToolbar';
import type { Neraca } from '@/types';
import { formatDate } from '@/lib/utils';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { useAuthStore } from '@/store/authStore';

export default function Neracas() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);
  const user = useAuthStore(state => state.user);

  const { data: allInquiries = [], isLoading: isLoadingInq } = useInquiries();
  const { data: neracas = [], isLoading: isLoadingNeracas } = useNeracas();
  const saveNeraca = useSaveNeraca();
  const deleteNeraca = useDeleteNeraca();
  const deleteInquiry = useDeleteInquiry();
  const initSheets = useInitNeracaSheets();
  const { data: allQuotations = [] } = useNeracaQuotations();
  const { data: allPos = [] } = usePurchaseOrders();
  const { data: allPoIns = [] } = usePoIns();
  const { data: allInvoices = [] } = useInvoices();
  const duplicateNeraca = useDuplicateNeraca();

  
  // For DeleteConfirmModal
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'inquiry' | 'neraca'; id: string | null; title: string }>({ isOpen: false, type: 'inquiry', id: null, title: '' });

  // For DuplicateModal
  const [duplicateModal, setDuplicateModal] = useState<{ isOpen: boolean; inquiryId: string | null }>({ isOpen: false, inquiryId: null });
  const [duplicateSourceId, setDuplicateSourceId] = useState<string>('');

  const handleInit = async () => {
    try {
      const res = await initSheets.mutateAsync();
      alert(res || 'Success');
    } catch(e: any) {
      alert(e.message);
    }
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Neraca>();

  const filteredInquiries = useMemo(() => {
    const s = search.toLowerCase();
    return allInquiries
      .filter(i => ['Neraca', 'Quotation', 'PO', 'Invoice', 'Selesai'].includes(i.status || ''))
      .filter(i =>
        !s ||
        (i.request_number || '').toLowerCase().includes(s) ||
        (i.request_title || '').toLowerCase().includes(s) ||
        (i.customer_name || '').toLowerCase().includes(s)
      );
  }, [allInquiries, search]);

  const totalPages = Math.max(1, Math.ceil(filteredInquiries.length / rowsPerPage));
  const paginatedInquiries = filteredInquiries.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreate = (inquiryId: string) => {
    reset({});
    setEditingId(null);
    setActiveInquiryId(inquiryId);
    setIsModalOpen(true);
  };

  const openEdit = (n: Neraca) => {
    reset(n);
    setEditingId(n.id);
    setActiveInquiryId(n.inquiry_id);
    setIsModalOpen(true);
  };

  const onSubmit = (data: Neraca) => {
    let payload = { ...data, inquiry_id: activeInquiryId! };
    if (!editingId) {
      payload = {
        ...payload,
        id: `NER-${Date.now()}`,
        created_by: user?.name || '',
        created_date: new Date().toISOString().split('T')[0],
        updated_date: new Date().toISOString().split('T')[0],
      };
    } else {
      payload.updated_date = new Date().toISOString().split('T')[0];
    }
    saveNeraca.mutate(payload, {
      onSuccess: () => setIsModalOpen(false),
    });
  };



  const handleDeleteInquiry = (id: string) => {
    setDeleteModal({ isOpen: true, type: 'inquiry', id, title: 'Hapus Permintaan' });
  };

  const executeDelete = () => {
    if (!deleteModal.id) return;
    if (deleteModal.type === 'inquiry') {
      deleteInquiry.mutate(deleteModal.id, { onSuccess: () => setDeleteModal(prev => ({ ...prev, isOpen: false })) });
    } else if (deleteModal.type === 'neraca') {
      deleteNeraca.mutate(deleteModal.id, { onSuccess: () => setDeleteModal(prev => ({ ...prev, isOpen: false })) });
    }
  };

  const handleDuplicate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicateSourceId) return;
    duplicateNeraca.mutate(duplicateSourceId, {
      onSuccess: () => {
        setDuplicateModal({ isOpen: false, inquiryId: null });
        setDuplicateSourceId('');
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <PageHeader title="Management Neraca" subtitle="Evaluasi dan perbandingan penawaran" />
        <Button variant="secondary" onClick={handleInit} loading={initSheets.isPending}>Init Database</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <TableToolbar
          search={search}
          onSearchChange={v => { setSearch(v); setCurrentPage(1); }}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={v => { setRowsPerPage(v); setCurrentPage(1); }}
          totalRows={filteredInquiries.length}
          searchPlaceholder="Cari no permintaan, judul, customer..."
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No. Permintaan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Judul Permintaan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tgl Permintaan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Neraca</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoadingInq ? (
                <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : paginatedInquiries.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Belum ada inquiry di tahap Neraca.</td></tr>
              ) : (
                paginatedInquiries.map(inq => {
                  const isExpanded = expandedRows[inq.id];
                  const inqNeracas = neracas.filter(n => n.inquiry_id === inq.id);
                  return (
                    <React.Fragment key={inq.id}>
                      <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleRow(inq.id)}>
                        <td className="px-4 py-3 text-gray-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td className="px-4 py-3 font-medium text-blue-600">{inq.request_number}</td>
                        <td className="px-4 py-3 text-gray-800">{inq.customer_name}</td>
                        <td className="px-4 py-3 text-gray-800">{inq.request_title}</td>
                        <td className="px-4 py-3 text-gray-800">{formatDate(inq.request_date)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                            {inqNeracas.length} Neraca
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteInquiry(inq.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            disabled={deleteInquiry.isPending}
                            title="Hapus Permintaan"
                          >
                            {deleteInquiry.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={7} className="p-0 border-b border-gray-100">
                            <div className="pl-14 pr-4 py-4 bg-gradient-to-r from-transparent to-blue-50/20">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Daftar Neraca</h4>
                                <div className="flex gap-2">
                                  {inqNeracas.length > 0 && (() => {
                                      const hasInvoice = inqNeracas.some(n => {
                                        const qt = allQuotations.find(q => q.neraca_id === n.id);
                                        if (!qt) return false;
                                        const poIn = allPoIns.find(p => p.neraca_id === n.id || p.quotation_id === qt.id);
                                        return poIn ? !!allInvoices.find(i => i.po_in_id === poIn.id) : false;
                                      });
                                      return (
                                        <Button size="sm" variant="secondary" disabled={hasInvoice} title={hasInvoice ? 'Tidak bisa menduplikat, sudah ada Invoice' : ''}
                                          onClick={() => { if (!hasInvoice) { setDuplicateModal({ isOpen: true, inquiryId: inq.id }); setDuplicateSourceId(inqNeracas[0].id); } }}>
                                          <Copy className="w-3.5 h-3.5" /> Duplikat
                                        </Button>
                                      );
                                    })()}
                                  {(() => {
                                    const hasPO = inqNeracas.some(n => allPos.some(po => po.neraca_id === n.id));
                                    return (
                                      <Button size="sm" variant="secondary" onClick={() => openCreate(inq.id)} disabled={hasPO} title={hasPO ? "Tidak bisa menambah neraca baru karena inquiry ini sudah memiliki PO" : ""}>
                                        <Plus className="w-3.5 h-3.5" /> Tambah Neraca
                                      </Button>
                                    );
                                  })()}
                                </div>
                              </div>

                              {isLoadingNeracas ? (
                                <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
                              ) : inqNeracas.length === 0 ? (
                                <div className="p-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-lg bg-white">
                                  Belum ada neraca. Klik Tambah Neraca untuk memulai.
                                </div>
                              ) : (
                                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Nama Neraca</th>
                                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Total Nilai</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                                        {user?.is_super_admin && <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Dikerjakan Oleh</th>}
                                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Aksi</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                      {inqNeracas.map((n, idx) => (
                                        <tr key={n.id} className="hover:bg-gray-50">
                                          <td className="px-4 py-2.5">
                                            {/* Link to detail page */}
                                            <button
                                              onClick={() => navigate(`/neraca/${inq.id}/${n.id}`)}
                                              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                            >
                                              <ExternalLink className="w-3.5 h-3.5" />
                                              {n.name || `Neraca ${idx + 1}`}
                                            </button>
                                            <div className="text-[11px] text-gray-400 mt-0.5">{formatDate(n.created_date)}</div>
                                          </td>
                                          <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-800">
                                            {(() => {
                                              const qt = allQuotations.find(q => q.neraca_id === n.id);
                                              return qt && Number(qt.nilai) > 0
                                                ? <span className="font-mono">{Number(qt.nilai).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}</span>
                                                : <span className="text-gray-300">-</span>;
                                            })()}
                                          </td>
                                          <td className="px-4 py-2.5">
                                            {(() => {
                                                const qt = allQuotations.find(q => q.neraca_id === n.id);
                                                if (!qt) return null;
                                                const poIn = allPoIns.find(p => p.neraca_id === n.id || p.quotation_id === qt.id);
                                                const inv = poIn ? allInvoices.find(i => i.po_in_id === poIn.id) : undefined;
                                                if (inv && inv.payment_status === 'Lunas') {
                                                  return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-teal-100 text-teal-700"><FileCheck2 className="w-3 h-3" /> Selesai</span>;
                                                }
                                                if (inv) {
                                                  return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-orange-100 text-orange-700"><FileCheck2 className="w-3 h-3" /> Invoice</span>;
                                                }
                                                if (poIn) {
                                                  return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700"><FileCheck2 className="w-3 h-3" /> PO</span>;
                                                }
                                                return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-700"><FileCheck2 className="w-3 h-3" /> Quotation</span>;
                                              })()}
                                          </td>
                                          {user?.is_super_admin && <td className="px-4 py-2.5 text-xs italic text-gray-500">{n.created_by || '-'}</td>}
                                          <td className="px-4 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              <button onClick={() => openEdit(n)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                                <Edit2 className="w-4 h-4" />
                                              </button>
                                              <button onClick={() => setDeleteModal({ isOpen: true, type: 'neraca', id: n.id, title: `Hapus Neraca` })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 text-sm bg-white">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">←</button>
            <span className="text-gray-500">Hal {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">→</button>
          </div>
        )}
      </div>

      {/* Modal — name only */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Neraca' : 'Tambah Neraca'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Nama Neraca" required error={errors.name?.message}>
            <Input {...register('name', { required: 'Wajib diisi' })} placeholder="Contoh: Neraca 1" error={!!errors.name} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)} disabled={saveNeraca.isPending}>Batal</Button>
            <Button type="submit" loading={saveNeraca.isPending}>
              {editingId ? 'Simpan Perubahan' : 'Simpan Neraca'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Duplikat */}
      <Modal isOpen={duplicateModal.isOpen} onClose={() => setDuplicateModal({ isOpen: false, inquiryId: null })} title="Duplikat Neraca">
        <form onSubmit={handleDuplicate} className="space-y-4">
          <FormField label="Pilih Neraca yang Ingin Diduplikat" required>
            <select
              value={duplicateSourceId}
              onChange={(e) => setDuplicateSourceId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-shadow bg-white text-gray-900"
              required
            >
              {duplicateModal.inquiryId && neracas.filter(n => n.inquiry_id === duplicateModal.inquiryId).map(n => (
                <option key={n.id} value={n.id}>{n.name || 'Neraca Tanpa Nama'}</option>
              ))}
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setDuplicateModal({ isOpen: false, inquiryId: null })} disabled={duplicateNeraca.isPending}>Batal</Button>
            <Button type="submit" loading={duplicateNeraca.isPending}>
              Proses Duplikat
            </Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeDelete}
        title={deleteModal.title}
        description={deleteModal.type === 'inquiry' ? 'Yakin ingin menghapus seluruh permintaan (inquiry) ini beserta semua neraca di dalamnya?' : 'Yakin ingin menghapus neraca ini beserta item dan detailnya?'}
        isLoading={deleteModal.type === 'inquiry' ? deleteInquiry.isPending : deleteNeraca.isPending}
      />
    </div>
  );
}
