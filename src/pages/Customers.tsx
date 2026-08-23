import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Building2, Users } from 'lucide-react';
import { PageHeader, Button, Input, FormField } from '@/components/ui';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import type { Customer, PIC } from '@/types';
import { useForm } from 'react-hook-form';
import { useCustomers, useSaveCustomer, useDeleteCustomer, usePics, useSavePic, useDeletePic, useUploadFile } from '@/hooks/useData';

export default function Customers() {
  const [activeTab, setActiveTab] = useState<'customers' | 'pics'>('customers');
  const [search, setSearch] = useState('');
  
  // Customer state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [selectedNpwpFile, setSelectedNpwpFile] = useState<File | null>(null);
  
  // PIC state
  const [isPicModalOpen, setIsPicModalOpen] = useState(false);
  const [editingPicId, setEditingPicId] = useState<string | null>(null);

  const { data: customers = [], isLoading: isLoadingCustomers, isError: isErrorCustomers } = useCustomers();
  const saveCustomer = useSaveCustomer();
  const deleteCustomer = useDeleteCustomer();
  const uploadFile = useUploadFile();

  const { data: pics = [], isLoading: isLoadingPics, isError: isErrorPics } = usePics();
  const savePic = useSavePic();
  const deletePic = useDeletePic();

  const customerForm = useForm<Customer>();
  const picForm = useForm<PIC>();



  const filteredCustomers = customers.filter(c =>
    (c.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.code || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredPics = pics.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (customers.find(c => c.id === p.customer_id)?.company_name || '').toLowerCase().includes(search.toLowerCase())
  );

  // --- Customer Actions ---
  const openCreateCustomer = () => {
    customerForm.reset({ npwp: '' });
    setSelectedNpwpFile(null);
    setEditingCustomerId(null);
    setIsCustomerModalOpen(true);
  };

  const openEditCustomer = (customer: Customer) => {
    customerForm.reset(customer);
    setSelectedNpwpFile(null);
    setEditingCustomerId(customer.id);
    setIsCustomerModalOpen(true);
  };

  const onCustomerSubmit = async (data: Customer) => {
    // Validasi keunikan kode customer
    const isDuplicate = customers.some(c => c.code.toLowerCase() === data.code.toLowerCase() && c.id !== editingCustomerId);
    if (isDuplicate) {
      customerForm.setError('code', { type: 'manual', message: 'Kode customer sudah digunakan' });
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
            // Get only the base64 part, remove data:image/png;base64,
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

    if (!editingCustomerId) {
      payload = {
        ...payload,                 // <-- pakai payload (sudah berisi npwp URL), bukan data
        id: `CUS-ID-${Date.now()}`,
        status: 'Active',
        created_date: new Date().toISOString().split('T')[0],
        updated_date: new Date().toISOString().split('T')[0],
      };
    } else {
      payload.updated_date = new Date().toISOString().split('T')[0];
    }
    
    saveCustomer.mutate(payload, {
      onSuccess: () => {
        setIsCustomerModalOpen(false);
      }
    });
  };

  const handleDeleteCustomer = (id: string) => {
    // Cari PIC yang terhubung dengan customer ini
    const relatedPics = pics.filter(p => p.customer_id === id);
    
    if (relatedPics.length > 0) {
      if (confirm(`Peringatan: Terdapat ${relatedPics.length} PIC yang terhubung dengan customer ini.\n\nMenghapus customer akan menghapus PIC tersebut juga. Anda yakin?`)) {
        // Hapus semua PIC yang terkait
        relatedPics.forEach(pic => {
          deletePic.mutate(pic.id);
        });
        // Hapus customernya
        deleteCustomer.mutate(id);
      }
    } else {
      if (confirm("Yakin ingin menghapus customer ini?")) {
        deleteCustomer.mutate(id);
      }
    }
  };

  // --- PIC Actions ---
  const openCreatePic = () => {
    picForm.reset({});
    setEditingPicId(null);
    setIsPicModalOpen(true);
  };

  const openEditPic = (pic: PIC) => {
    picForm.reset(pic);
    setEditingPicId(pic.id);
    setIsPicModalOpen(true);
  };

  const onPicSubmit = (data: PIC) => {
    // Denormalisasi: simpan nama perusahaan langsung agar tidak bergantung lookup
    const selectedCustomer = customers.find(c => c.id === data.customer_id);
    let payload: PIC = {
      ...data,
      customer_name: selectedCustomer?.company_name || data.customer_id,
    };
    if (!editingPicId) {
      payload = {
        ...payload,
        id: `PIC-${Date.now()}`,
      };
    }
    
    savePic.mutate(payload, {
      onSuccess: () => {
        setIsPicModalOpen(false);
      }
    });
  };

  const handleDeletePic = (id: string) => {
    if (confirm("Yakin ingin menghapus PIC ini?")) {
      deletePic.mutate(id);
    }
  };

  const customerColumns = [
    { key: 'code', label: 'Kode', width: 'w-24' },
    { key: 'company_name', label: 'Perusahaan' },
    { key: 'email', label: 'Email' },
    { key: 'npwp', label: 'NPWP', render: (v: unknown) => v ? <a href={String(v)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Lihat Dokumen</a> : '-' },
    { key: 'office_address', label: 'Alamat Kantor' },
    { key: 'warehouse_address', label: 'Alamat Gudang' },
    { key: 'status', label: 'Status', render: (v: unknown) => <StatusBadge label={String(v || 'Inactive')} /> },
    { key: 'actions', label: '', render: (_: unknown, row: Customer) => (
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); openEditCustomer(row); }}
          className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(row.id); }}
          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
          disabled={deleteCustomer.isPending}
        >
          {deleteCustomer.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    )},
  ];

  const picColumns = [
    { key: 'name', label: 'Nama PIC' },
    { key: 'customer_id', label: 'Perusahaan', render: (_v: unknown, row: PIC) => {
        // Utamakan customer_name yang sudah disimpan (denormalized)
        if (row.customer_name) return row.customer_name;
        // Fallback ke lookup by id
        const c = customers.find(x => String(x.id).trim() === String(_v).trim());
        return c ? c.company_name : String(_v || '-');
    }},
    { key: 'position', label: 'Jabatan' },
    { key: 'phone', label: 'No HP' },
    { key: 'email', label: 'Email' },
    { key: 'actions', label: '', render: (_: unknown, row: PIC) => (
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
        title="Customers & PICs"
        subtitle={`${customers.length} customer, ${pics.length} PIC terdaftar`}
        action={
          <Button onClick={activeTab === 'customers' ? openCreateCustomer : openCreatePic}>
            <Plus className="w-4 h-4" /> Tambah {activeTab === 'customers' ? 'Customer' : 'PIC'}
          </Button>
        }
      />

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'customers' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Building2 className="w-4 h-4" /> Customers
          </button>
          <button
            onClick={() => setActiveTab('pics')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'pics' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" /> PICs
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Cari ${activeTab === 'customers' ? 'customer' : 'PIC'}...`}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
        </div>
      </div>

      {/* Data Table */}
      {activeTab === 'customers' ? (
        isLoadingCustomers ? (
          <div className="flex justify-center p-12 text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : isErrorCustomers ? (
          <div className="text-red-500 text-center p-4">Gagal memuat data customer.</div>
        ) : (
          <DataTable columns={customerColumns as any} data={filteredCustomers as any} emptyMessage="Tidak ada customer ditemukan." />
        )
      ) : (
        isLoadingPics ? (
          <div className="flex justify-center p-12 text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : isErrorPics ? (
          <div className="text-red-500 text-center p-4">Gagal memuat data PIC.</div>
        ) : (
          <DataTable columns={picColumns as any} data={filteredPics as any} emptyMessage="Tidak ada PIC ditemukan." />
        )
      )}

      {/* Customer Modal Form */}
      <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title={editingCustomerId ? 'Edit Customer' : 'Tambah Customer'} size="lg">
        <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Kode Customer" required error={customerForm.formState.errors.code?.message}>
              <Input {...customerForm.register('code', { required: 'Wajib diisi' })} placeholder="CUS-..." error={!!customerForm.formState.errors.code} />
            </FormField>
            <FormField label="Nama Customer" required error={customerForm.formState.errors.company_name?.message}>
              <Input {...customerForm.register('company_name', { required: 'Wajib diisi' })} placeholder="PT ..." error={!!customerForm.formState.errors.company_name} />
            </FormField>
            <FormField label="Email" required error={customerForm.formState.errors.email?.message}>
              <Input {...customerForm.register('email', { required: 'Wajib diisi' })} placeholder="email@perusahaan.co.id" type="email" error={!!customerForm.formState.errors.email} />
            </FormField>
            <FormField label="NPWP" error={customerForm.formState.errors.npwp?.message}>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedNpwpFile(file);
                      customerForm.setValue('npwp', file.name); // Set visual value to bypass required if needed
                    }
                  }}
                  className={`w-full px-3 py-1.5 rounded-lg border text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${customerForm.formState.errors.npwp ? 'border-red-300' : 'border-gray-200'}`}
                />
                {!selectedNpwpFile && editingCustomerId && customerForm.getValues('npwp') && (
                  <p className="text-xs text-gray-500">
                    File saat ini: <a href={customerForm.getValues('npwp')} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Lihat Dokumen</a>
                  </p>
                )}
              </div>
            </FormField>
          </div>
          <FormField label="Alamat Kantor" required error={customerForm.formState.errors.office_address?.message}>
            <textarea
              {...customerForm.register('office_address', { required: 'Wajib diisi' })}
              rows={2}
              placeholder="Alamat lengkap kantor..."
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 resize-none ${customerForm.formState.errors.office_address ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-100'}`}
            />
          </FormField>
          <FormField label="Alamat Gudang" required error={customerForm.formState.errors.warehouse_address?.message}>
            <textarea
              {...customerForm.register('warehouse_address', { required: 'Wajib diisi' })}
              rows={2}
              placeholder="Alamat lengkap gudang pengiriman..."
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 resize-none ${customerForm.formState.errors.warehouse_address ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-100'}`}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsCustomerModalOpen(false)} disabled={saveCustomer.isPending || uploadFile.isPending}>Batal</Button>
            <Button type="submit" loading={saveCustomer.isPending || uploadFile.isPending}>
              {editingCustomerId ? 'Simpan Perubahan' : 'Tambah Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* PIC Modal Form */}
      <Modal isOpen={isPicModalOpen} onClose={() => setIsPicModalOpen(false)} title={editingPicId ? 'Edit PIC' : 'Tambah PIC'} size="lg">
        <form onSubmit={picForm.handleSubmit(onPicSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nama PIC" required error={picForm.formState.errors.name?.message}>
              <Input {...picForm.register('name', { required: 'Wajib diisi' })} placeholder="Nama lengkap PIC" error={!!picForm.formState.errors.name} />
            </FormField>
            <FormField label="Customer / Perusahaan" required error={picForm.formState.errors.customer_id?.message}>
              <select 
                {...picForm.register('customer_id', { required: 'Wajib diisi' })} 
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 bg-white ${picForm.formState.errors.customer_id ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-100'}`}
              >
                <option value="">- Pilih Customer -</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name} ({c.code})</option>
                ))}
              </select>
            </FormField>
            <FormField label="Jabatan">
              <Input {...picForm.register('position')} placeholder="Contoh: Procurement Manager" />
            </FormField>
            <FormField label="No HP" required error={picForm.formState.errors.phone?.message}>
              <Input {...picForm.register('phone', { required: 'Wajib diisi' })} placeholder="08xxxxxxxxxx" error={!!picForm.formState.errors.phone} />
            </FormField>
            <div className="col-span-2">
              <FormField label="Email" required error={picForm.formState.errors.email?.message}>
                <Input {...picForm.register('email', { required: 'Wajib diisi' })} placeholder="email@perusahaan.com" type="email" error={!!picForm.formState.errors.email} />
              </FormField>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsPicModalOpen(false)} disabled={savePic.isPending}>Batal</Button>
            <Button type="submit" loading={savePic.isPending}>
              {editingPicId ? 'Simpan Perubahan' : 'Tambah PIC'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
