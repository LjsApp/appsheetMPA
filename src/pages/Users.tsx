import { useState } from 'react';
import { PageHeader, Button } from '@/components/ui';
import { useUsers, useSaveUser, useDeleteUser, useRoles } from '@/hooks/useData';
import { Loader2, Plus, Pencil, Trash2, UserCircle, X } from 'lucide-react';
import type { AppUser } from '@/types';

export default function Users() {
  const { data: users = [], isLoading } = useUsers();
  const { data: roles = [] } = useRoles();
  const saveUser = useSaveUser();
  const deleteUser = useDeleteUser();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<AppUser> | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [isSaving, setIsSaving] = useState(false);

  const openNew = () => {
    setEditingUser(null);
    setName(''); setEmail(''); setPassword(''); setRoleId(''); setStatus('Active');
    setIsModalOpen(true);
  };

  const openEdit = (user: AppUser) => {
    setEditingUser(user);
    setName(user.name); setEmail(user.email); setPassword(''); setRoleId(user.role_id); setStatus(user.status);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || !roleId) return;
    setIsSaving(true);
    try {
      const selectedRole = roles.find(r => r.id === roleId);
      const payload: Partial<AppUser> = {
        ...(editingUser?.id ? { id: editingUser.id } : { id: `USR-${Date.now()}`, created_date: new Date().toISOString() }),
        name: name.trim(),
        email: email.trim(),
        role_id: roleId,
        role_name: selectedRole?.role_name || '',
        status,
      };
      // Only include password if it was filled in
      if (password.trim()) {
        payload.password = password.trim();
      } else if (editingUser?.id) {
        // Retain old password; the backend will only update fields provided
      } else {
        payload.password = password; // required for new user
      }
      await saveUser.mutateAsync(payload);
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pegawai ini?')) return;
    await deleteUser.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader title="Manajemen Pegawai" subtitle={`${users.length} pegawai terdaftar`} />
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Tambah Pegawai
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-gray-500">
            Belum ada pegawai
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs uppercase tracking-wide">Nama</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wide">Email</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wide">Role</th>
                <th className="px-6 py-4 text-xs uppercase tracking-wide">Status</th>
                <th className="px-6 py-4 text-right text-xs uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <UserCircle className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {user.role_name || roles.find(r => r.id === user.role_id)?.role_name || user.role_id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(user)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-900">{editingUser ? 'Edit Pegawai' : 'Tambah Pegawai'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Nama Lengkap</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400" placeholder="contoh: Ahmad Santoso" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email (untuk login)</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400" placeholder="ahmad@example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Password {editingUser ? <span className="text-gray-400 font-normal">(Kosongkan jika tidak diubah)</span> : <span className="text-red-500">*</span>}
                </label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Role</label>
                <select value={roleId} onChange={e => setRoleId(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="">-- Pilih Role --</option>
                  {roles.map(r => {
                    const isPimpinan = r.role_name?.toLowerCase() === 'pimpinan';
                    const isTaken = isPimpinan && users.some(u => u.role_id === r.id && u.id !== editingUser?.id);
                    return (
                      <option key={r.id} value={r.id} disabled={isTaken}>
                        {r.role_name} {isTaken ? '(Sudah dipakai)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as 'Active' | 'Inactive')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 bg-white">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
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
