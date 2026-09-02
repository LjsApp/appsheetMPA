import { useState } from 'react';
import { PageHeader, Button } from '@/components/ui';
import { useRoles, useSaveRole, useDeleteRole } from '@/hooks/useData';
import { Loader2, Plus, Pencil, Trash2, Shield, X, CheckSquare, Square } from 'lucide-react';
import type { Role } from '@/types';

const ALL_PAGES = [
  { label: 'Dashboard', path: '/' },
  { label: 'Customers', path: '/customers' },
  { label: 'Vendors', path: '/vendors' },
  { label: 'Products', path: '/products' },
  { label: 'Inquiries', path: '/inquiries' },
  { label: 'Neraca', path: '/neraca' },
  { label: 'Quotation', path: '/quotations' },
  { label: 'PO In', path: '/po-in' },
  { label: 'PO Out', path: '/po' },
  { label: 'Internal Letter', path: '/internal-letters' },
  { label: 'Surat Jalan', path: '/surat-jalan' },
  { label: 'Invoice', path: '/invoices' },
  { label: 'Belanja Dapur', path: '/belanja-dapur' },
  { label: 'Belanja Proyek', path: '/belanja-proyek' },
  { label: 'Manajemen Perusahaan', path: '/settings/company' },
  { label: 'Manajemen Pegawai', path: '/settings/users' },
  { label: 'Hak Akses / Role', path: '/settings/roles' },
];

export default function Roles() {
  const { data: roles = [], isLoading } = useRoles();
  const saveRole = useSaveRole();
  const deleteRole = useDeleteRole();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [roleName, setRoleName] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const openNew = () => {
    setEditingRole(null);
    setRoleName('');
    setIsSuperAdmin(false);
    setSelectedPaths([]);
    setIsModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.role_name);
    setIsSuperAdmin(!!role.is_super_admin);
    try {
      setSelectedPaths(JSON.parse(role.permissions || '[]'));
    } catch {
      setSelectedPaths([]);
    }
    setIsModalOpen(true);
  };

  const togglePath = (path: string) => {
    setSelectedPaths(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleSave = async () => {
    if (!roleName.trim()) return;
    setIsSaving(true);
    try {
      const payload: Partial<Role> = {
        ...(editingRole?.id ? { id: editingRole.id } : { id: `ROLE-${Date.now()}`, created_date: new Date().toISOString() }),
        role_name: roleName.trim(),
        is_super_admin: isSuperAdmin,
        permissions: isSuperAdmin ? JSON.stringify(ALL_PAGES.map(p => p.path)) : JSON.stringify(selectedPaths),
      };
      await saveRole.mutateAsync(payload);
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus role ini?')) return;
    await deleteRole.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader title="Manajemen Role & Hak Akses" subtitle={`${roles.length} role terdaftar`} />
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Tambah Role
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : roles.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-gray-500">
            Belum ada role
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs uppercase tracking-wide">Nama Role</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wide">Tipe</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wide">Hak Akses</th>
                <th className="px-6 py-4 text-right text-xs uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.map(role => {
                let perms: string[] = [];
                try { perms = JSON.parse(role.permissions || '[]'); } catch {}
                return (
                  <tr key={role.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      {role.role_name}
                    </td>
                    <td className="px-6 py-4">
                      {role.is_super_admin ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Super Admin</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Terbatas</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {role.is_super_admin ? (
                        <span className="text-xs text-gray-500 italic">Semua halaman</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {perms.map(p => {
                            const page = ALL_PAGES.find(pg => pg.path === p);
                            return (
                              <span key={p} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                {page?.label || p}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(role)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(role.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">{editingRole ? 'Edit Role' : 'Tambah Role'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Nama Role</label>
                <input
                  value={roleName}
                  onChange={e => setRoleName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                  placeholder="contoh: Purchasing, Admin Gudang"
                />
              </div>

              <div>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={isSuperAdmin}
                    onChange={e => setIsSuperAdmin(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Super Admin (akses penuh)</div>
                    <div className="text-xs text-gray-500">Dapat mengakses semua halaman tanpa pembatasan</div>
                  </div>
                </label>
              </div>

              {!isSuperAdmin && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Pilih Akses Halaman</label>
                  <div className="space-y-1 border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                    {ALL_PAGES.map(page => {
                      const checked = selectedPaths.includes(page.path);
                      return (
                        <label key={page.path} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-gray-50 cursor-pointer">
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />
                          )}
                          <input type="checkbox" className="hidden" checked={checked} onChange={() => togglePath(page.path)} />
                          <span className="text-sm text-gray-700">{page.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
