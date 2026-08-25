import { useState } from 'react';
import { Trash2, Loader2, FileText, Package, Search, Plus, Download, Edit } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import AddPoInModal from '@/components/AddPoInModal';
import EditPoInModal from '@/components/EditPoInModal';
import { usePoIns, useDeletePoIn, useSuratJalan } from '@/hooks/useData';
import { formatDate } from '@/lib/utils';
import type { POIn } from '@/types';

export default function POInList() {
  const { data: poIns = [], isLoading, refetch } = usePoIns();
  const { data: suratJalanList = [] } = useSuratJalan();
  const usedPoIds = new Set(suratJalanList.map(sj => sj.po_in_id).filter(Boolean));
  
  const deletePoIn = useDeletePoIn();
  
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; title: string }>({ isOpen: false, id: null, title: '' });
  
  // Edit Modal State
  const [editModal, setEditModal] = useState<{ isOpen: boolean; poIn: POIn | null }>({ isOpen: false, poIn: null });

  const [showAddModal, setShowAddModal] = useState(false);
  const usedPoInQuotationIds = new Set(poIns.map(p => p.quotation_id).filter(Boolean));

  const handleDelete = (id: string, poInNumber: string) => {
    setDeleteModal({ isOpen: true, id, title: `Hapus PO In ${poInNumber}` });
  };

  const executeDelete = () => {
    if (deleteModal.id) {
      deletePoIn.mutate(deleteModal.id, { onSuccess: () => setDeleteModal(prev => ({ ...prev, isOpen: false })) });
    }
  };

  const handleEdit = (po: POIn) => {
    setEditModal({ isOpen: true, poIn: po });
  };

  const filtered = poIns.filter(p =>
    (p.po_in_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.judul || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.pic_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const getDocs = (p: POIn): { name: string; url: string }[] => {
    try {
      if (!p.dokumen) return [];
      const parsed = JSON.parse(String(p.dokumen));
      if (Array.isArray(parsed)) return parsed;
      // double-encoded
      if (typeof parsed === 'string') {
        const parsed2 = JSON.parse(parsed);
        return Array.isArray(parsed2) ? parsed2 : [];
      }
      return [];
    } catch { return []; }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="PO In"
          subtitle="Daftar Purchase Order dari Customer"
        />
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Tambah PO In
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total PO In</p>
            <p className="text-xl font-bold text-gray-900">{poIns.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Dengan Dokumen</p>
            <p className="text-xl font-bold text-gray-900">{poIns.filter(p => getDocs(p).length > 0).length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Bulan Ini</p>
            <p className="text-xl font-bold text-gray-900">
              {poIns.filter(p => {
                if (!p.tanggal) return false;
                const d = new Date(p.tanggal);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nomor PO, judul, customer, atau PIC..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">No. PO Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Judul PO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tanggal PO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Alamat Pengiriman</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Dokumen</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center">
                          <Download className="w-7 h-7 text-purple-300" />
                        </div>
                        <p className="text-gray-500 text-sm">{search ? 'Tidak ada hasil pencarian.' : 'Belum ada data PO In.'}</p>
                        <p className="text-gray-400 text-xs">PO In dibuat otomatis saat Anda membuat PO Out dari halaman Quotation.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => {
                    const docs = getDocs(p);
                    
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded font-semibold">{p.po_in_number || '—'}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate" title={p.judul}>{p.judul || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{p.customer_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{p.tanggal ? formatDate(p.tanggal) : '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate" title={p.alamat_pengiriman}>{p.alamat_pengiriman || '—'}</td>
                        <td className="px-4 py-3">
                          {docs.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {docs.map((d, i) => (
                                <a key={i} href={d.url} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-1.5 py-0.5 rounded">
                                  <FileText className="w-3 h-3" />
                                  {d.name.length > 12 ? d.name.substring(0, 12) + '…' : d.name}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {usedPoIds.has(p.id) ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full font-medium">
                              ✓ Sudah SJ
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(p)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit PO In"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id, p.po_in_number || 'Tanpa Nomor')}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Hapus PO In"
                              disabled={deletePoIn.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeDelete}
        title={deleteModal.title}
        description="Yakin ingin menghapus PO In ini? Aksi ini tidak dapat dibatalkan, dan SEMUA PO OUT yang terhubung juga akan dihapus!"
        isLoading={deletePoIn.isPending}
      />

      {/* Edit Modal */}
      <EditPoInModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, poIn: null })}
        onSuccess={() => { refetch(); setEditModal({ isOpen: false, poIn: null }); }}
        poIn={editModal.poIn}
        usedQuotationIds={usedPoInQuotationIds}
      />

      <AddPoInModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onSuccess={() => refetch()} 
        usedQuotationIds={usedPoInQuotationIds}
      />
    </div>
  );
}
