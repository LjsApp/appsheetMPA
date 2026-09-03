import { useState, useMemo, useCallback } from 'react';
import { Plus, Edit2, Trash2, Loader2, FileText, Upload, X, Bell, AlertTriangle } from 'lucide-react';
import { PageHeader, Button, FormField, Input } from '@/components/ui';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import TableToolbar from '@/components/TableToolbar';
import type { Inquiry } from '@/types';
import { useForm } from 'react-hook-form';
import { useInquiries, useSaveInquiry, useDeleteInquiry, useCustomers, usePics, useUploadFile, useNeracas, useNeracaQuotations, usePurchaseOrders, useInvoices } from '@/hooks/useData';
import { useAuthStore } from '@/store/authStore';

const INQUIRY_STATUSES: Inquiry['status'][] = ['Jalan', 'Batal', 'Telat'];

// Helpers
// Color mapping for effective status tabs
function getStatusColor(status: string) {
  if (status === 'Jalan') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Telat') return 'bg-red-100 text-red-700';
  if (status === 'Batal') return 'bg-gray-100 text-gray-500';
  if (status === 'Neraca') return 'bg-blue-100 text-blue-700';
  if (status === 'Quotation') return 'bg-indigo-100 text-indigo-700';
  if (status === 'PO') return 'bg-purple-100 text-purple-700';
  if (status === 'Invoice') return 'bg-orange-100 text-orange-700';
  if (status === 'Selesai') return 'bg-teal-100 text-teal-700';
  return 'bg-gray-100 text-gray-500';
}

function isDeadlineSoon(deadline: string): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  const today = new Date();
  const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 3;
}

function isDeadlinePassed(deadline: string): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface UploadedDoc { name: string; url: string; }

export default function Inquiries() {
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'All' | Inquiry['status']>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  const { data: inquiries = [], isLoading, isError } = useInquiries();
  const { data: customers = [] } = useCustomers();
  const { data: pics = [] } = usePics();
  const { data: allNeracas = [] } = useNeracas();
  const { data: allQuotations = [] } = useNeracaQuotations();
  const { data: allPoIns = [] } = usePurchaseOrders();
  const { data: allInvoices = [] } = useInvoices();
  const saveInquiry = useSaveInquiry();
  const deleteInquiry = useDeleteInquiry();
  const uploadFile = useUploadFile();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<Inquiry>();
  const watchCustomerId = watch('customer_id');
  const user = useAuthStore(state => state.user);

  // Compute effective progress status for an inquiry
  const getEffectiveStatus = useCallback((inq: Inquiry): Inquiry['status'] => {
    // Jika status stored adalah Batal, tetap Batal
    if (inq.status === 'Batal') return 'Batal';
    // Cari neraca terkait
    const myNeracas = allNeracas.filter(n => n.inquiry_id === inq.id);
    if (myNeracas.length === 0) return inq.status; // Jalan / Telat
    // Cari quotation terkait (via neraca_id)
    const myNeracaIds = myNeracas.map(n => n.id);
    const myQuotations = allQuotations.filter(q => myNeracaIds.includes(q.neraca_id));
    if (myQuotations.length === 0) return 'Neraca';
    // Cari PO In terkait (via quotation_id)
    const myQtIds = myQuotations.map(q => q.id);
    const myPoIns = allPoIns.filter(p => myQtIds.includes(p.quotation_id));
    if (myPoIns.length === 0) return 'Quotation';
    // Cari Invoice terkait (via po_in_id)
    const myPoInIds = myPoIns.map(p => p.id);
    const myInvoices = allInvoices.filter(inv => myPoInIds.includes(inv.po_in_id));
    if (myInvoices.length === 0) return 'PO';
    // Cek apakah semua invoice sudah Lunas
    const hasLunas = myInvoices.some(inv => inv.payment_status === 'Lunas');
    if (hasLunas) return 'Selesai';
    return 'Invoice';
  }, [allNeracas, allQuotations, allPoIns, allInvoices]);

  // Filter PICs by selected customer
  const filteredPics = pics.filter(p => p.customer_id === watchCustomerId);

  // Auto-detect overdue inquiries and build notifications
  const notifications = useMemo(() => {
    return inquiries.filter(i =>
      i.status === 'Jalan' && isDeadlineSoon(i.offer_deadline)
    );
  }, [inquiries]);

  // Auto-set status to 'Telat' hanya saat BUAT BARU (bukan saat edit manual)
  const resolveStatus = useCallback((data: Inquiry, isEditing: boolean): Inquiry['status'] => {
    // Saat edit: hormati pilihan user sepenuhnya
    if (isEditing) return data.status || 'Jalan';
    // Saat buat baru: jika deadline sudah lewat, langsung Telat
    if (isDeadlinePassed(data.offer_deadline)) return 'Telat';
    return data.status || 'Jalan';
  }, []);

  const filtered = useMemo(() => {
    return inquiries
      .filter(i => {
        const effectiveStatus = getEffectiveStatus(i);
        const matchesSearch =
          (i.request_number || '').toLowerCase().includes(search.toLowerCase()) ||
          (i.request_title || '').toLowerCase().includes(search.toLowerCase()) ||
          (i.customer_name || '').toLowerCase().includes(search.toLowerCase());
        const matchesTab = activeTab === 'All' || effectiveStatus === activeTab;
        return matchesSearch && matchesTab;
      });
  }, [inquiries, search, activeTab, getEffectiveStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Normalize any date string to YYYY-MM-DD for <input type="date">
  const toInputDate = (d: string): string => {
    if (!d) return '';
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return '';
    return parsed.toISOString().split('T')[0];
  };

  const openCreate = () => {
    reset({});
    setSelectedFiles([]);
    setUploadedDocs([]);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = (i: Inquiry) => {
    reset({
      ...i,
      request_date: toInputDate(i.request_date),
      offer_deadline: toInputDate(i.offer_deadline),
    });
    setSelectedFiles([]);
    try {
      setUploadedDocs(i.documents ? JSON.parse(i.documents) : []);
    } catch { setUploadedDocs([]); }
    setEditingId(i.id);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeSelectedFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const removeUploadedDoc = (idx: number) => {
    setUploadedDocs(prev => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (data: Inquiry) => {
    setIsUploading(true);
    let currentDocs = [...uploadedDocs];

    // Upload new files
    for (const file of selectedFiles) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
        });
        const url = await uploadFile.mutateAsync({ filename: file.name, mimeType: file.type, base64 });
        currentDocs.push({ name: file.name, url });
      } catch {
        alert(`Gagal mengupload ${file.name}`);
      }
    }

    // Rename all documents contiguously (Lampiran 1, Lampiran 2, dst)
    currentDocs = currentDocs.map((doc, idx) => ({
      ...doc,
      name: `Lampiran ${idx + 1}`
    }));

    setIsUploading(false);

    const selectedCustomer = customers.find(c => c.id === data.customer_id);
    const selectedPic = pics.find(p => p.id === data.pic_id);

    let payload: Inquiry = {
      ...data,
      customer_name: selectedCustomer?.company_name || data.customer_id,
      pic_name: selectedPic?.name || data.pic_id,
      documents: JSON.stringify(currentDocs),
      status: resolveStatus(data, !!editingId),
    };

    if (!editingId) {
      payload = {
        ...payload,
        id: `INQ-${Date.now()}`,
        created_by: user?.name || '',
        created_date: new Date().toISOString().split('T')[0],
        updated_date: new Date().toISOString().split('T')[0],
      };
    } else {
      payload.updated_date = new Date().toISOString().split('T')[0];
    }

    saveInquiry.mutate(payload, {
      onSuccess: () => {
        setIsModalOpen(false);
        setSelectedFiles([]);
        setUploadedDocs([]);
      }
    });
  };

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'delete' | 'moveToNeraca'; id: string | null; title: string; desc: string }>({ isOpen: false, type: 'delete', id: null, title: '', desc: '' });

  const handleDelete = (id: string) => {
    setConfirmModal({ isOpen: true, type: 'delete', id, title: 'Hapus Permintaan', desc: 'Yakin ingin menghapus permintaan ini?' });
  };

  const handleMoveToNeraca = (i: Inquiry) => {
    setConfirmModal({ isOpen: true, type: 'moveToNeraca', id: i.id, title: 'Pindah ke Neraca', desc: 'Yakin ingin memproses permintaan ini ke tahap Neraca?\nData akan dipindahkan dari halaman ini.' });
  };

  const executeConfirm = () => {
    if (!confirmModal.id) return;
    if (confirmModal.type === 'delete') {
      deleteInquiry.mutate(confirmModal.id, { onSuccess: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) });
    } else if (confirmModal.type === 'moveToNeraca') {
      const i = inquiries.find(x => x.id === confirmModal.id);
      if (i) {
        saveInquiry.mutate({
          ...i,
          status: 'Neraca',
          updated_date: new Date().toISOString().split('T')[0],
        }, { onSuccess: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) });
      }
    }
  };

  const columns = [
    { key: 'request_number', label: 'No. Permintaan', width: 'w-36', render: (v: unknown) => <span className="font-medium text-blue-600">{String(v)}</span> },
    { key: 'request_date', label: 'Tgl Permintaan', render: (v: unknown) => formatDate(String(v)) },
    { key: 'customer_id', label: 'Customer', render: (_v: unknown, row: any) => row.customer_name || _v },
    { key: 'pic_id', label: 'PIC', render: (_v: unknown, row: any) => row.pic_name || _v },
    { key: 'request_title', label: 'Judul Permintaan' },
    { key: 'offer_deadline', label: 'Batas Penawaran', render: (v: unknown) => {
      const d = String(v || '');
      const passed = isDeadlinePassed(d);
      const soon = isDeadlineSoon(d);
      return (
        <div className="flex items-center gap-1.5">
          <span className={passed ? 'text-red-600 font-medium' : soon ? 'text-amber-600 font-medium' : ''}>{formatDate(d)}</span>
          {soon && !passed && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
          {passed && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
        </div>
      );
    }},
    { key: 'documents', label: 'Dokumen', render: (v: unknown) => {
      try {
        const docs: UploadedDoc[] = JSON.parse(String(v || '[]'));
        if (!docs.length) return <span className="text-gray-400 text-xs">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {docs.map((d, i) => (
              <a key={i} href={d.url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100">
                <FileText className="w-3 h-3" />{d.name}
              </a>
            ))}
          </div>
        );
      } catch { return '-'; }
    }},
    ...(user?.is_super_admin ? [{ key: 'created_by', label: 'Dikerjakan Oleh', render: (v: unknown) => <span className="text-gray-500 text-xs italic">{String(v || '-')}</span> }] : []),
    { key: 'status', label: 'Status', render: (_v: unknown, row: any) => {
      const effStatus = getEffectiveStatus(row as Inquiry);
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(effStatus)}`}>
          {effStatus}
        </span>
      );
    }},
    { key: 'actions', label: '', render: (_: unknown, row: any) => (
      <div className="flex items-center justify-end gap-2">
        {(() => {
          const effStatus = getEffectiveStatus(row as Inquiry);
          const canMoveToNeraca = effStatus === 'Jalan' || effStatus === 'Telat';
          return canMoveToNeraca ? (
            <button 
              onClick={e => { e.stopPropagation(); handleMoveToNeraca(row); }}
              className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors flex items-center gap-1 text-xs font-medium border border-transparent hover:border-emerald-200"
              title="Pindahkan ke Neraca"
              disabled={saveInquiry.isPending}
            >
              <span>Ke Neraca</span>
            </button>
          ) : null;
        })()}
        <button onClick={e => { e.stopPropagation(); openEdit(row); }}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"><Edit2 className="w-4 h-4" /></button>
        <button onClick={e => { e.stopPropagation(); handleDelete(row.id); }}
          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"
          disabled={deleteInquiry.isPending}>
          {deleteInquiry.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    )},
  ];

  const isBusy = saveInquiry.isPending || isUploading;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inquiries"
        subtitle="Daftar permintaan dari customer"
        action={
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            {notifications.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowNotif(v => !v)}
                  className="relative p-2 bg-amber-50 hover:bg-amber-100 rounded-lg text-amber-600 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {notifications.length}
                  </span>
                </button>
                {showNotif && (
                  <div className="absolute right-0 top-10 z-50 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Segera jatuh tempo</p>
                    {notifications.map(n => (
                      <div key={n.id} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{n.request_title}</p>
                          <p className="text-xs text-amber-600">Batas: {formatDate(n.offer_deadline)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Button onClick={openCreate}><Plus className="w-4 h-4" /> Buat Inquiry</Button>
          </div>
        }
      />

      {/* Tabs & Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm overflow-x-auto w-full sm:w-fit">
          {(['All', 'Jalan', 'Neraca', 'Quotation', 'PO', 'Invoice', 'Selesai', 'Batal', 'Telat'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab as any); setCurrentPage(1); }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === tab ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >{tab}</button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <TableToolbar
            search={search}
            onSearchChange={v => { setSearch(v); setCurrentPage(1); }}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={v => { setRowsPerPage(v); setCurrentPage(1); }}
            totalRows={filtered.length}
            searchPlaceholder="Cari inquiry..."
          />

          {isLoading ? (
            <div className="flex justify-center p-12 text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : isError ? (
            <div className="text-red-500 text-center p-4">Gagal memuat data dari Google Sheets.</div>
          ) : (
            <>
              <DataTable columns={columns as any} data={paginated as any} emptyMessage="Tidak ada inquiry ditemukan." />
              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 text-sm bg-white">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">←</button>
                  <span className="text-gray-500">Hal {currentPage} / {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">→</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Form */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Inquiry' : 'Buat Inquiry Baru'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Customer & PIC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Customer" required error={errors.customer_id?.message}>
              <select
                {...register('customer_id', { required: 'Wajib diisi' })}
                onChange={e => { setValue('customer_id', e.target.value); setValue('pic_id', ''); }}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 bg-white ${errors.customer_id ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-100 focus:border-blue-400'}`}
              >
                <option value="">- Pilih Customer -</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name} ({c.code})</option>)}
              </select>
            </FormField>
            <FormField label="PIC" required error={errors.pic_id?.message}>
              <select
                {...register('pic_id', { required: 'Wajib diisi' })}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 bg-white ${errors.pic_id ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-100 focus:border-blue-400'}`}
              >
                <option value="">- Pilih PIC -</option>
                {filteredPics.map(p => <option key={p.id} value={p.id}>{p.name} — {p.position}</option>)}
              </select>
            </FormField>
          </div>

          {/* Judul & No Permintaan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Judul Permintaan" required error={errors.request_title?.message}>
              <Input {...register('request_title', { required: 'Wajib diisi' })} placeholder="Pengadaan Material PLTU..." error={!!errors.request_title} />
            </FormField>
            <FormField label="No Permintaan" required error={errors.request_number?.message}>
              <Input {...register('request_number', { required: 'Wajib diisi' })} placeholder="REQ-2024-001" error={!!errors.request_number} />
            </FormField>
          </div>

          {/* Tanggal & Batas Penawaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Tanggal Permintaan" required error={errors.request_date?.message}>
              <Input {...register('request_date', { required: 'Wajib diisi' })} type="date" error={!!errors.request_date} />
            </FormField>
            <FormField label="Batas Penawaran" required error={errors.offer_deadline?.message}>
              <Input {...register('offer_deadline', { required: 'Wajib diisi' })} type="date" error={!!errors.offer_deadline} />
            </FormField>
          </div>

          {/* Status (selalu tampil, bisa edit manual) */}
          <FormField label="Status">
            <select
              {...register('status')}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
            >
              {INQUIRY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">* Status akan otomatis berubah ke <strong>Telat</strong> jika batas penawaran sudah lewat.</p>
          </FormField>

          {/* Upload Dokumen */}
          <FormField label="Upload Dokumen">
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer w-full px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Klik untuk pilih dokumen (bisa lebih dari satu)</span>
                <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden" onChange={handleFileChange} />
              </label>

              {/* File baru yang dipilih */}
              {selectedFiles.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-medium">File baru:</p>
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-blue-50 px-3 py-1.5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs text-blue-700 font-medium">Lampiran {uploadedDocs.length + i + 1}</span>
                        <span className="text-xs text-gray-400">({f.name})</span>
                      </div>
                      <button type="button" onClick={() => removeSelectedFile(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Dokumen yang sudah terupload */}
              {uploadedDocs.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-medium">Sudah terupload:</p>
                  {uploadedDocs.map((d, i) => (
                    <div key={i} className="flex items-center justify-between bg-emerald-50 px-3 py-1.5 rounded-lg">
                      <a href={d.url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 text-xs text-emerald-700 hover:underline">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="font-medium">Lampiran {i + 1}</span>
                      </a>
                      <button type="button" onClick={() => removeUploadedDoc(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          <FormField label="Catatan">
            <textarea {...register('notes')} rows={2} placeholder="Catatan tambahan..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)} disabled={isBusy}>Batal</Button>
            <Button type="submit" loading={isBusy}>
              {isUploading ? 'Mengupload...' : editingId ? 'Simpan Perubahan' : 'Buat Inquiry'}
            </Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeConfirm}
        title={confirmModal.title}
        description={confirmModal.desc}
        isLoading={confirmModal.type === 'delete' ? deleteInquiry.isPending : saveInquiry.isPending}
      />
    </div>
  );
}
