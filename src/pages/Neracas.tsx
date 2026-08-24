import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Loader2, ChevronDown, ChevronRight, ExternalLink, Edit2 } from 'lucide-react';
import { PageHeader, Button, FormField, Input } from '@/components/ui';
import Modal from '@/components/Modal';
import { useForm } from 'react-hook-form';
import { FileCheck2 } from 'lucide-react';
import { useInquiries, useNeracas, useSaveNeraca, useDeleteNeraca, useDeleteInquiry, useInitNeracaSheets, useNeracaQuotations, useSaveNeracaQuotation, useGetNextQuotationNumber, fetchApi } from '@/hooks/useData';
import { calculateNeracaGrandTotal } from '@/lib/neracaUtils';
import type { Neraca } from '@/types';
import { formatDate } from '@/lib/utils';

export default function Neracas() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);

  const { data: allInquiries = [], isLoading: isLoadingInq } = useInquiries();
  const { data: neracas = [], isLoading: isLoadingNeracas } = useNeracas();
  const saveNeraca = useSaveNeraca();
  const deleteNeraca = useDeleteNeraca();
  const deleteInquiry = useDeleteInquiry();
  const initSheets = useInitNeracaSheets();
  const { data: allQuotations = [] } = useNeracaQuotations();
  const saveQuotation = useSaveNeracaQuotation();
  const getNextQtNumber = useGetNextQuotationNumber();

  const handleCreateQuotation = async (neraca: any, inq: any) => {
    // Check if quotation already exists for this neraca
    const existing = allQuotations.find(q => q.neraca_id === neraca.id);
    if (existing) {
      alert('Sudah jadi quotation!');
      return;
    }
    try {
      const qtNumber = await getNextQtNumber.mutateAsync();
      const items = await fetchApi(`getNeracaItems&neraca_id=${neraca.id}`);
      const detail = await fetchApi(`getNeracaDetail&neraca_id=${neraca.id}`);
      const grandTotal = calculateNeracaGrandTotal(items || [], detail || undefined);

      const payload = {
        id: `QT-${Date.now()}`,
        quotation_number: qtNumber || `QT-${new Date().getFullYear()}-${Date.now()}`,
        neraca_id: neraca.id,
        inquiry_id: inq.id,
        customer_id: inq.customer_id || '',
        customer_name: inq.customer_name || '',
        request_title: inq.request_title || inq.project_name || '',
        nilai: grandTotal,
        dokumen: '',
        status: 'Draft' as const,
        created_date: new Date().toISOString().split('T')[0],
        updated_date: new Date().toISOString().split('T')[0],
      };
      await saveQuotation.mutateAsync(payload);
    } catch (e: any) {
      alert('Gagal membuat quotation: ' + e.message);
    }
  };

  const handleInit = async () => {
    try {
      const res = await initSheets.mutateAsync();
      alert(res || 'Success');
    } catch(e: any) {
      alert(e.message);
    }
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Neraca>();

  const filteredInquiries = allInquiries
    .filter(i => i.status === 'Neraca')
    .filter(i =>
      (i.request_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.request_title || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.customer_name || '').toLowerCase().includes(search.toLowerCase())
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
    if (confirm('Yakin ingin menghapus seluruh inquiry ini beserta data di dalamnya?')) {
      deleteInquiry.mutate(id);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <PageHeader title="Management Neraca" subtitle="Evaluasi dan perbandingan penawaran" />
        <Button variant="secondary" onClick={handleInit} loading={initSheets.isPending}>Init Database</Button>
      </div>

      <div className="flex justify-end">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari inquiry..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
              ) : filteredInquiries.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Belum ada inquiry di tahap Neraca.</td></tr>
              ) : (
                filteredInquiries.map(inq => {
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
                                <Button size="sm" variant="secondary" onClick={() => openCreate(inq.id)}>
                                  <Plus className="w-3.5 h-3.5" /> Tambah Neraca
                                </Button>
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
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Tgl Dibuat</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Tgl Update</th>
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
                                          </td>
                                          <td className="px-4 py-2.5 text-xs text-gray-500">{formatDate(n.created_date)}</td>
                                          <td className="px-4 py-2.5 text-xs text-gray-500">{formatDate(n.updated_date)}</td>
                                          <td className="px-4 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              {(() => {
                                                const qt = allQuotations.find(q => q.neraca_id === n.id);
                                                return qt ? (
                                                  <button onClick={() => alert('Sudah jadi quotation!')} className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1.5 rounded-md font-medium transition-colors" title="Lihat Quotation">
                                                    <FileCheck2 className="w-3.5 h-3.5" /> Sudah Jadi Quotation
                                                  </button>
                                                ) : (
                                                  <button onClick={() => handleCreateQuotation(n, inq)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 px-2 py-1.5 rounded-md transition-colors" disabled={getNextQtNumber.isPending || saveQuotation.isPending}>
                                                    <FileCheck2 className="w-3.5 h-3.5" /> Buat Quotation
                                                  </button>
                                                );
                                              })()}
                                              <button onClick={() => openEdit(n)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                                <Edit2 className="w-4 h-4" />
                                              </button>
                                              <button onClick={() => deleteNeraca.mutate(n.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
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
    </div>
  );
}
