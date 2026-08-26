import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Loader2, Building2, Users } from 'lucide-react';
import { PageHeader, Button, Input, FormField } from '@/components/ui';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import TableToolbar from '@/components/TableToolbar';
import type { Vendor, PicVendor } from '@/types';
import { useForm } from 'react-hook-form';
import { useVendors, useSaveVendor, useDeleteVendor, usePicVendors, useSavePicVendor, useDeletePicVendor, useUploadFile } from '@/hooks/useData';

export default function Vendors() {
  const [activeTab, setActiveTab] = useState<'vendors' | 'pics'>('vendors');
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Vendor state
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [selectedNpwpFile, setSelectedNpwpFile] = useState<File | null>(null);
  
  // PIC state
  const [isPicModalOpen, setIsPicModalOpen] = useState(false);
  const [editingPicId, setEditingPicId] = useState<string | null>(null);

  const { data: vendors = [], isLoading: isLoadingVendors, isError: isErrorVendors } = useVendors();
  const saveVendor = useSaveVendor();
  const deleteVendor = useDeleteVendor();
  const uploadFile = useUploadFile();

  const { data: pics = [], isLoading: isLoadingPics, isError: isErrorPics } = usePicVendors();
  const savePic = useSavePicVendor();
  const deletePic = useDeletePicVendor();

  const vendorForm = useForm<Vendor>();
  const picForm = useForm<PicVendor>();

  const filteredVendors = useMemo(() => vendors.filter(v =>
    (v.vendor_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.code || '').toLowerCase().includes(search.toLowerCase())
  ), [vendors, search]);

  const filteredPics = useMemo(() => pics.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (vendors.find(v => v.id === p.vendor_id)?.vendor_name || '').toLowerCase().includes(search.toLowerCase())
  ), [pics, vendors, search]);

  const totalPages = Math.max(1, Math.ceil((activeTab === 'vendors' ? filteredVendors.length : filteredPics.length) / rowsPerPage));
  const paginatedVendors = filteredVendors.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const paginatedPics = filteredPics.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // --- Vendor Actions ---
  const openCreateVendor = () => {
    vendorForm.reset({ npwp: '' });
    setSelectedNpwpFile(null);
    setEditingVendorId(null);
    setIsVendorModalOpen(true);
  };

  const openEditVendor = (vendor: Vendor) => {
    vendorForm.reset(vendor);
    setSelectedNpwpFile(null);
    setEditingVendorId(vendor.id);
    setIsVendorModalOpen(true);
  };

  const onVendorSubmit = async (data: Vendor) => {
    // Validasi keunikan kode vendor
    const isDuplicate = vendors.some(v => v.code.toLowerCase() === data.code.toLowerCase() && v.id !== editingVendorId);
    if (isDuplicate) {
      vendorForm.setError('code', { type: 'manual', message: 'Kode vendor sudah digunakan' });
      return;
    }

    let payload = { ...data };

    // Handle NPWP file upload if a new file is selected
    if (selectedNpwpFile) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedNpwpFile);
          reader.onload = () => {
            const result = reader.result as string;
            // Get only the base64 part
            resolve(result.split(',')[1]);
          };
          reader.onerror = error => reject(error);
        });

        const uploadedUrl = await uploadFile.mutateAsync({
          filename: selectedNpwpFile.name,
          mimeType: selectedNpwpFile.type,
          base64: base64,
        });

        payload.npwp = uploadedUrl;
      } catch (error) {
        alert("Gagal mengunggah file NPWP. Silakan coba lagi.");
        return;
      }
    }

    if (!editingVendorId) {
      payload = {
        ...payload,
        id: `VEN-ID-${Date.now()}`,
        status: 'Active',
        created_date: new Date().toISOString().split('T')[0],
        updated_date: new Date().toISOString().split('T')[0],
      };
    } else {
      payload.updated_date = new Date().toISOString().split('T')[0];
    }
    
    saveVendor.mutate(payload, {
      onSuccess: () => {
        setIsVendorModalOpen(false);
      }
    });
  };

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'vendor' | 'pic'; id: string | null; title: string; desc: string }>({ isOpen: false, type: 'vendor', id: null, title: '', desc: '' });

  const handleDeleteVendor = (id: string) => {
    const relatedPics = pics.filter(p => p.vendor_id === id);
    if (relatedPics.length > 0) {
      setDeleteModal({ isOpen: true, type: 'vendor', id, title: 'Hapus Vendor', desc: `Peringatan: Terdapat ${relatedPics.length} PIC yang terhubung dengan vendor ini.\n\nMenghapus vendor akan menghapus PIC tersebut juga. Anda yakin?` });
    } else {
      setDeleteModal({ isOpen: true, type: 'vendor', id, title: 'Hapus Vendor', desc: 'Yakin ingin menghapus vendor ini?' });
    }
  };

  const executeDelete = () => {
    if (!deleteModal.id) return;
    if (deleteModal.type === 'vendor') {
      const relatedPics = pics.filter(p => p.vendor_id === deleteModal.id);
      relatedPics.forEach(pic => deletePic.mutate(pic.id));
      deleteVendor.mutate(deleteModal.id, { onSuccess: () => setDeleteModal(prev => ({ ...prev, isOpen: false })) });
    } else if (deleteModal.type === 'pic') {
      deletePic.mutate(deleteModal.id, { onSuccess: () => setDeleteModal(prev => ({ ...prev, isOpen: false })) });
    }
  };

  // --- PIC Actions ---
  const openCreatePic = () => {
    picForm.reset({});
    setEditingPicId(null);
    setIsPicModalOpen(true);
  };

  const openEditPic = (pic: PicVendor) => {
    picForm.reset(pic);
    setEditingPicId(pic.id);
    setIsPicModalOpen(true);
  };

  const onPicSubmit = (data: PicVendor) => {
    const selectedVendor = vendors.find(v => v.id === data.vendor_id);
    let payload: PicVendor = {
      ...data,
      vendor_name: selectedVendor?.vendor_name || data.vendor_id,
    };
    if (!editingPicId) {
      payload = {
        ...payload,
        id: `PIC-VEN-${Date.now()}`,
      };
    }
    
    savePic.mutate(payload, {
      onSuccess: () => {
        setIsPicModalOpen(false);
      }
    });
  };

  const handleDeletePic = (id: string) => {
    setDeleteModal({ isOpen: true, type: 'pic', id, title: 'Hapus PIC', desc: 'Yakin ingin menghapus PIC ini?' });
  };

  const vendorColumns = [
    { key: 'code', label: 'Kode', width: 'w-24' },
    { key: 'vendor_name', label: 'Perusahaan' },
    { key: 'npwp', label: 'NPWP', render: (v: unknown) => v ? <a href={String(v)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Lihat Dokumen</a> : '-' },
    { key: 'address', label: 'Alamat' },
    { key: 'products', label: 'Produk', render: (v: unknown) => <div className="max-w-xs truncate" title={String(v || '')}>{String(v || '-')}</div> },
    { key: 'bank_name', label: 'Info Rekening', render: (_: unknown, row: any) => (
      row.bank_name || row.bank_account_name || row.bank_account_number ? (
        <div className="text-sm leading-snug">
          {row.bank_name && <div className="font-medium text-gray-700">{row.bank_name}</div>}
          {row.bank_account_name && <div className="text-gray-600">{row.bank_account_name}</div>}
          {row.bank_account_number && <div className="text-gray-500 font-mono">{row.bank_account_number}</div>}
        </div>
      ) : <span className="text-gray-400">-</span>
    )},
    { key: 'status', label: 'Status', render: (v: unknown) => <StatusBadge label={String(v || 'Inactive')} /> },
    { key: 'actions', label: '', render: (_: unknown, row: any) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); openEditVendor(row); }}
          className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleDeleteVendor(row.id); }}
          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
          disabled={deleteVendor.isPending}
        >
          {deleteVendor.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    )},
  ];

  const picColumns = [
    { key: 'name', label: 'Nama PIC' },
    { key: 'vendor_id', label: 'Perusahaan', render: (_v: unknown, row: any) => {
        if (row.vendor_name) return row.vendor_name;
        const v = vendors.find(x => String(x.id).trim() === String(_v).trim());
        return v ? v.vendor_name : String(_v || '-');
    }},
    { key: 'position', label: 'Jabatan' },
    { key: 'phone', label: 'No HP' },
    { key: 'email', label: 'Email' },
    { key: 'actions', label: '', render: (_: unknown, row: any) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); openEditPic(row); }}
          className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleDeletePic(row.id); }}
          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
          disabled={deletePic.isPending}
        >
          {deletePic.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendors & PICs"
        subtitle={`${vendors.length} vendor, ${pics.length} PIC terdaftar`}
        action={
          <Button onClick={activeTab === 'vendors' ? openCreateVendor : openCreatePic}>
            <Plus className="w-4 h-4" /> Tambah {activeTab === 'vendors' ? 'Vendor' : 'PIC'}
          </Button>
        }
      />

      {/* Tabs & Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm overflow-x-auto w-full sm:w-fit">
          <button
            onClick={() => { setActiveTab('vendors'); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'vendors' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Building2 className="w-4 h-4" /> Vendors
          </button>
          <button
            onClick={() => { setActiveTab('pics'); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'pics' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" /> PICs
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <TableToolbar
            search={search}
            onSearchChange={v => { setSearch(v); setCurrentPage(1); }}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={v => { setRowsPerPage(v); setCurrentPage(1); }}
            totalRows={activeTab === 'vendors' ? filteredVendors.length : filteredPics.length}
            searchPlaceholder={activeTab === 'vendors' ? 'Cari vendor...' : 'Cari PIC...'}
          />

          {/* Data Table */}
          {activeTab === 'vendors' ? (
            isLoadingVendors ? (
              <div className="flex justify-center p-12 text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : isErrorVendors ? (
              <div className="text-red-500 text-center p-4">Gagal memuat data vendor.</div>
            ) : (
              <DataTable columns={vendorColumns as any} data={paginatedVendors as any} />
            )
          ) : (
            isLoadingPics ? (
              <div className="flex justify-center p-12 text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : isErrorPics ? (
              <div className="text-red-500 text-center p-4">Gagal memuat data PIC vendor.</div>
            ) : (
              <DataTable columns={picColumns as any} data={paginatedPics as any} />
            )
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 text-sm bg-white">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">←</button>
              <span className="text-gray-500">Hal {currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">→</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Form Vendor */}
      <Modal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        title={editingVendorId ? 'Edit Vendor' : 'Tambah Vendor'}
      >
        <form onSubmit={vendorForm.handleSubmit(onVendorSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Kode Vendor" required error={vendorForm.formState.errors.code?.message}>
              <Input {...vendorForm.register('code', { required: 'Wajib diisi' })} placeholder="Contoh: VEN-123" error={!!vendorForm.formState.errors.code} />
            </FormField>
            <FormField label="Nama Vendor" required error={vendorForm.formState.errors.vendor_name?.message}>
              <Input {...vendorForm.register('vendor_name', { required: 'Wajib diisi' })} placeholder="PT. ABC" error={!!vendorForm.formState.errors.vendor_name} />
            </FormField>
          </div>
          
          <FormField label="NPWP" error={vendorForm.formState.errors.npwp?.message}>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedNpwpFile(file);
                    vendorForm.setValue('npwp', file.name);
                  }
                }}
                className={`w-full px-3 py-1.5 rounded-lg border text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${vendorForm.formState.errors.npwp ? 'border-red-300' : 'border-gray-200'}`}
              />
              {!selectedNpwpFile && editingVendorId && vendorForm.getValues('npwp') && (
                <p className="text-xs text-gray-500">
                  File saat ini: <a href={vendorForm.getValues('npwp')} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Lihat Dokumen</a>
                </p>
              )}
            </div>
          </FormField>

          <FormField label="Alamat" required error={vendorForm.formState.errors.address?.message}>
            <textarea
              {...vendorForm.register('address', { required: 'Wajib diisi' })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${vendorForm.formState.errors.address ? 'border-red-300' : 'border-gray-200'}`}
              rows={2}
              placeholder="Alamat lengkap perusahaan"
            />
          </FormField>
          
          <FormField label="Produk" required error={vendorForm.formState.errors.products?.message}>
            <textarea
              {...vendorForm.register('products', { required: 'Wajib diisi' })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${vendorForm.formState.errors.products ? 'border-red-300' : 'border-gray-200'}`}
              rows={3}
              placeholder="Deskripsikan produk yang disediakan..."
            />
          </FormField>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Info Rekening</p>
            <div className="grid grid-cols-1 gap-3">
              <FormField label="Nama Bank">
                <input
                  {...vendorForm.register('bank_name')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="BCA / Mandiri / BNI ..."
                />
              </FormField>
              <FormField label="Nama Pemilik Rekening">
                <input
                  {...vendorForm.register('bank_account_name')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Sesuai nama di buku tabungan"
                />
              </FormField>
              <FormField label="Nomor Rekening">
                <input
                  {...vendorForm.register('bank_account_number')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="1234567890"
                />
              </FormField>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsVendorModalOpen(false)} disabled={saveVendor.isPending || uploadFile.isPending}>Batal</Button>
            <Button type="submit" loading={saveVendor.isPending || uploadFile.isPending}>
              {editingVendorId ? 'Simpan Perubahan' : 'Tambah Vendor'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Form PIC Vendor */}
      <Modal
        isOpen={isPicModalOpen}
        onClose={() => setIsPicModalOpen(false)}
        title={editingPicId ? 'Edit PIC' : 'Tambah PIC'}
      >
        <form onSubmit={picForm.handleSubmit(onPicSubmit)} className="space-y-4">
          <FormField label="Nama PIC" required error={picForm.formState.errors.name?.message}>
            <Input {...picForm.register('name', { required: 'Wajib diisi' })} placeholder="Nama Lengkap" error={!!picForm.formState.errors.name} />
          </FormField>
          <FormField label="Perusahaan" required error={picForm.formState.errors.vendor_id?.message}>
            <select 
              {...picForm.register('vendor_id', { required: 'Wajib diisi' })} 
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 bg-white ${picForm.formState.errors.vendor_id ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-100'}`}
            >
              <option value="">- Pilih Vendor -</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.vendor_name} ({v.code})</option>
              ))}
            </select>
          </FormField>
          <FormField label="Jabatan" required error={picForm.formState.errors.position?.message}>
            <Input {...picForm.register('position', { required: 'Wajib diisi' })} placeholder="Sales, Manager, dll" error={!!picForm.formState.errors.position} />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="No HP" required error={picForm.formState.errors.phone?.message}>
              <Input {...picForm.register('phone', { required: 'Wajib diisi' })} placeholder="08xxx" error={!!picForm.formState.errors.phone} />
            </FormField>
            <FormField label="Email" required error={picForm.formState.errors.email?.message}>
              <Input {...picForm.register('email', { required: 'Wajib diisi' })} type="email" placeholder="email@domain.com" error={!!picForm.formState.errors.email} />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsPicModalOpen(false)} disabled={savePic.isPending}>Batal</Button>
            <Button type="submit" loading={savePic.isPending}>
              {editingPicId ? 'Simpan Perubahan' : 'Tambah PIC'}
            </Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeDelete}
        title={deleteModal.title}
        description={deleteModal.desc}
        isLoading={deleteModal.type === 'vendor' ? deleteVendor.isPending : deletePic.isPending}
      />
    </div>
  );
}
