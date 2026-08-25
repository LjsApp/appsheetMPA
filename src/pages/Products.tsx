import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2 } from 'lucide-react';
import { PageHeader, Button, FormField, Input, Select } from '@/components/ui';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import type { Product } from '@/types';
import { useForm } from 'react-hook-form';
import { useProducts, useSaveProduct, useDeleteProduct } from '@/hooks/useData';

const UOM_OPTIONS = [
  { value: 'PCS', label: 'PCS' },
  { value: 'MTR', label: 'Meter' },
  { value: 'KG', label: 'Kilogram' },
  { value: 'SET', label: 'Set' },
  { value: 'BTL', label: 'Bottle' },
  { value: 'BOX', label: 'Box' },
  { value: 'ROLL', label: 'Roll' },
];

export default function Products() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: products = [], isLoading, isError } = useProducts();
  const saveProduct = useSaveProduct();
  const deleteProduct = useDeleteProduct();

  const { register, handleSubmit, reset } = useForm<Product>();

  const filtered = products.filter(p =>
    (p.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.part_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { reset({}); setEditingId(null); setIsModalOpen(true); };
  const openEdit = (p: Product) => { reset(p); setEditingId(p.id); setIsModalOpen(true); };

  const onSubmit = (data: Product) => {
    let payload = { ...data };
    if (!editingId) {
      payload = {
        ...data,
        id: `PRD-${Date.now()}`,
        code: `PRD-${String(products.length + 1).padStart(4, '0')}`,
        status: 'Active',
      };
    }
    
    saveProduct.mutate(payload, {
      onSuccess: () => {
        setIsModalOpen(false);
      }
    });
  };

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; title: string }>({ isOpen: false, id: null, title: '' });

  const handleDelete = (id: string) => {
    setDeleteModal({ isOpen: true, id, title: 'Hapus Produk' });
  };

  const executeDelete = () => {
    if (deleteModal.id) {
      deleteProduct.mutate(deleteModal.id, { onSuccess: () => setDeleteModal(prev => ({ ...prev, isOpen: false })) });
    }
  };

  const columns = [
    { key: 'code', label: 'Kode', width: 'w-24' },
    { key: 'product_name', label: 'Produk', render: (_: unknown, row: Product) => (
      <div>
        <p className="font-medium text-gray-900">{row.product_name}</p>
        <p className="text-xs text-gray-400">PN: {row.part_number || '-'}</p>
      </div>
    )},
    { key: 'category', label: 'Kategori' },
    { key: 'brand', label: 'Merek' },
    { key: 'uom', label: 'UOM' },
    { key: 'weight_kg', label: 'Berat (kg)', render: (v: unknown) => v ? `${v} kg` : '-' },
    { key: 'dimension', label: 'Dimensi', render: (v: unknown) => String(v || '-') },
    { key: 'default_margin', label: 'Margin Def.', render: (v: unknown) => v ? `${v}%` : '-' },
    { key: 'status', label: 'Status', render: (v: unknown) => <StatusBadge label={String(v || 'Inactive')} /> },
    { key: 'actions', label: '', render: (_: unknown, row: Product) => (
      <div className="flex items-center gap-2">
        <button onClick={e => { e.stopPropagation(); openEdit(row); }}
          className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={e => { e.stopPropagation(); handleDelete(row.id); }}
          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"
          disabled={deleteProduct.isPending}
        >
          {deleteProduct.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products & Services"
        subtitle={`${products.length} master data produk`}
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Tambah Produk</Button>}
      />
      
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, PN, kategori..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-red-500 text-center p-4">Gagal memuat data dari Google Sheets.</div>
      ) : (
        <DataTable columns={columns as any} data={filtered as any} emptyMessage="Tidak ada produk ditemukan." />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Produk' : 'Tambah Produk'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="Nama Produk / Deskripsi Singkat" required>
                <Input {...register('product_name', { required: true })} placeholder='Contoh: Gate Valve 6" Class 150 Flanged' />
              </FormField>
            </div>
            <FormField label="Part Number (PN)">
              <Input {...register('part_number')} placeholder="Opsional" />
            </FormField>
            <FormField label="Kategori" required>
              <Input {...register('category', { required: true })} placeholder="Valve, Pipe, Instrument..." />
            </FormField>
            <FormField label="Merek / Brand">
              <Input {...register('brand')} placeholder="KITZ, Tomoe, Wika..." />
            </FormField>
            <FormField label="Satuan (UOM)" required>
              <Select {...register('uom', { required: true })} options={UOM_OPTIONS} />
            </FormField>
            
            <div className="col-span-2"><hr className="border-gray-100 my-2" /></div>
            
            <FormField label="Berat (Kg)">
              <Input {...register('weight_kg')} type="number" step="0.01" placeholder="0.00" />
            </FormField>
            <FormField label="Dimensi (PxLxT)">
              <Input {...register('dimension')} placeholder="Contoh: 20x20x30 cm" />
            </FormField>
            <FormField label="HS Code">
              <Input {...register('hs_code')} placeholder="Kode Harmonized System" />
            </FormField>
            <FormField label="Margin Default (%)">
              <Input {...register('default_margin')} type="number" step="0.1" placeholder="15" />
            </FormField>
          </div>
          <FormField label="Deskripsi Lengkap / Spesifikasi Teknis">
            <textarea {...register('specification')} rows={3} placeholder="Detail spesifikasi..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
          </FormField>
          
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)} disabled={saveProduct.isPending}>Batal</Button>
            <Button type="submit" loading={saveProduct.isPending}>{editingId ? 'Simpan' : 'Tambah Produk'}</Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeDelete}
        title={deleteModal.title}
        description="Yakin ingin menghapus produk ini?"
        isLoading={deleteProduct.isPending}
      />
    </div>
  );
}
