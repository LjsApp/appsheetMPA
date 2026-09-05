import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Plus, X, Trash2, Printer, Edit2 } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import TableToolbar from '@/components/TableToolbar';
import { useSuratJalan, usePoIns, useSaveSuratJalan, useDeleteSuratJalan, fetchApi, useUploadFile, useCustomers } from '@/hooks/useData';
import type { POIn } from '@/types';
import { useAuthStore } from '@/store/authStore';

export default function SuratJalanList() {
  const navigate = useNavigate();
  const { data: suratJalanList = [], isLoading: loadingSJ } = useSuratJalan();
  const { data: poIns = [], isLoading: loadingPo } = usePoIns();
  const { data: customers = [] } = useCustomers();
  const saveSJ = useSaveSuratJalan();
  const uploadFile = useUploadFile();
  const deleteSJ = useDeleteSuratJalan();
  const user = useAuthStore(state => state.user);

  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; title: string }>({ isOpen: false, id: null, title: '' });

  const [editSjId, setEditSjId] = useState<string | null>(null);
  const [editSjNumber, setEditSjNumber] = useState('');
  const [editCreatedDate, setEditCreatedDate] = useState('');
  const [editDeliveryAddress, setEditDeliveryAddress] = useState('');
  const [addressOptions, setAddressOptions] = useState<{label: string, value: string}[]>([]);
  const [editResiList, setEditResiList] = useState<{id: string, no_resi: string, ekspedisi: string, url: string, file: File | null}[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const parseResiData = (sj: any) => {
    if (sj.resi_data) {
      try {
        return JSON.parse(sj.resi_data).map((r: any) => ({ ...r, id: r.id || Date.now().toString() + Math.random(), file: null }));
      } catch { return []; }
    }
    if (sj.no_resi || sj.ekspedisi || sj.upload_resi) {
      return [{ id: Date.now().toString(), no_resi: sj.no_resi || '', ekspedisi: sj.ekspedisi || '', url: sj.upload_resi || '', file: null }];
    }
    return [];
  };

  const isLoading = loadingSJ || loadingPo;

  const handleDelete = (id: string, sjNumber: string) => {
    setDeleteModal({ isOpen: true, id, title: `Hapus Surat Jalan ${sjNumber}` });
  };

  const executeDelete = () => {
    if (deleteModal.id) {
      deleteSJ.mutate(deleteModal.id, { onSuccess: () => setDeleteModal(prev => ({ ...prev, isOpen: false })) });
    }
  };

  // Set of PO In IDs that already have a surat jalan
  const usedPoIds = useMemo(
    () => new Set(suratJalanList.map(sj => sj.po_in_id).filter(Boolean)),
    [suratJalanList]
  );

  const dataWithDetails = useMemo(() => {
    return suratJalanList.map(sj => {
      const po = poIns.find(p => p.id === sj.po_in_id);
      return {
        ...sj,
        customer_name: po?.customer_name || '-',
        judul_po: po?.judul || '-',
        no_po: po?.po_in_number || '-',
      };
    }).filter(item => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.sj_number?.toLowerCase().includes(term) ||
        item.customer_name.toLowerCase().includes(term) ||
        item.judul_po.toLowerCase().includes(term) ||
        item.no_po.toLowerCase().includes(term)
      );
    });
  }, [suratJalanList, poIns, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(dataWithDetails.length / rowsPerPage));
  const paginatedData = dataWithDetails.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleCreateSJ = async () => {
    if (!selectedPoId) return;
    const poIn = poIns.find(p => p.id === selectedPoId) as POIn | undefined;
    if (!poIn) return;

    setIsCreating(true);
    try {
      const sjNumber = await fetchApi('getNextSuratJalanNumber');
      const data = {
        id: `SJ-${Date.now()}`,
        po_in_id: poIn.id,
        sj_number: sjNumber,
        ekspedisi: '',
        created_by: user?.name || '',
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };
      await saveSJ.mutateAsync(data);
      setShowModal(false);
      setSelectedPoId('');
      // navigate(`/surat-jalan/${saved?.id || data.id}`);
    } catch {
      alert('Gagal membuat Surat Jalan');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Surat Jalan"
        subtitle={`${suratJalanList.length} Delivery Order`}
        action={
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            Tambah SJ
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <TableToolbar
          search={searchTerm}
          onSearchChange={v => { setSearchTerm(v); setCurrentPage(1); }}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={v => { setRowsPerPage(v); setCurrentPage(1); }}
          totalRows={dataWithDetails.length}
          searchPlaceholder="Cari No SJ, Customer, PO..."
        />

        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : paginatedData.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500">
            <FileText className="w-12 h-12 text-gray-300 mb-3" />
            <p>Belum ada data Surat Jalan.</p>
            <p className="text-sm mt-1">Klik tombol "Tambah SJ" untuk membuat Surat Jalan baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">No. Surat Jalan</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Pengiriman / Resi</th>
                  {user?.is_super_admin && <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dikerjakan Oleh</th>}
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 align-middle border-r border-gray-100 bg-white">
                      <div className="font-semibold text-gray-900">{item.customer_name}</div>
                      <div className="font-mono text-xs text-gray-500 mt-0.5">{item.no_po}</div>
                      <div className="text-xs text-gray-400 max-w-[160px] truncate mt-0.5" title={item.judul_po}>{item.judul_po}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-blue-700">
                      <div>{item.sj_number}</div>
                      <div className="text-[11px] text-gray-400 font-sans mt-0.5">{new Date(item.created_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {(() => {
                        const resis = parseResiData(item);
                        if (resis.length === 0) return <span className="text-gray-400 italic">Belum ada info pengiriman</span>;
                        return (
                          <div className="space-y-2">
                            {resis.map((r: any, idx: number) => (
                              <div key={idx} className="bg-gray-50 p-2 rounded border border-gray-100 flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-gray-700">{r.ekspedisi || 'Ekspedisi -'}</div>
                                  <div className="text-gray-500 font-mono mt-0.5">{r.no_resi || 'No Resi -'}</div>
                                </div>
                                {r.url && (
                                  <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center justify-center shrink-0 w-8 h-8 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Lihat Foto Resi">
                                    <FileText className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    {user?.is_super_admin && <td className="px-5 py-4 text-xs italic text-gray-500">{item.created_by || '-'}</td>}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditSjId(item.id);
                            setEditSjNumber(item.sj_number || '');
                            setEditCreatedDate(item.created_date ? new Date(item.created_date).toISOString().split('T')[0] : '');
                            
                            // Find customer addresses
                            const po = poIns.find(p => p.id === item.po_in_id);
                            const cust = customers.find(c => c.id === po?.customer_id || c.company_name === po?.customer_name);
                            const opts: { label: string; value: string }[] = [];
                            if (cust?.office_address) opts.push({ label: 'Alamat Kantor', value: cust.office_address });
                            if (cust?.warehouse_address) opts.push({ label: 'Alamat Gudang', value: cust.warehouse_address });
                            setAddressOptions(opts);
                            
                            setEditDeliveryAddress((item.delivery_address as any) || opts[0]?.value || '');
                            setEditResiList(parseResiData(item));
                          }}
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                          title="Edit Surat Jalan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/surat-jalan/${item.id}`)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Cetak / Detail Surat Jalan"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.sj_number || 'Tanpa Nomor')}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Hapus Surat Jalan"
                        >
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
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 text-sm">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">←</button>
            <span className="text-gray-500">Hal {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">→</button>
          </div>
        )}
      </div>

      {/* Create SJ Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Tambah Surat Jalan</h2>
              <button onClick={() => { setShowModal(false); setSelectedPoId(''); }} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Pilih PO In</label>
                <select
                  value={selectedPoId}
                  onChange={e => setSelectedPoId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  <option value="">-- Pilih PO In --</option>
                  {poIns.map(po => {
                    const isUsed = usedPoIds.has(po.id);
                    return (
                      <option key={po.id} value={po.id} disabled={isUsed}>
                        {po.po_in_number || po.id} — {po.customer_name} — {po.judul}{isUsed ? ' (Sudah ada SJ)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              {selectedPoId && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                  {(() => {
                    const po = poIns.find(p => p.id === selectedPoId);
                    return po ? (
                      <div className="space-y-0.5">
                        <div><span className="font-medium">Customer:</span> {po.customer_name}</div>
                        <div><span className="font-medium">Judul:</span> {po.judul}</div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setShowModal(false); setSelectedPoId(''); }}>Batal</Button>
              <Button
                variant="primary"
                onClick={handleCreateSJ}
                disabled={!selectedPoId || isCreating}
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Buat Surat Jalan
              </Button>
            </div>
          </div>
        </div>
      )}

      {editSjId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Edit Surat Jalan</h2>
              <button onClick={() => setEditSjId(null)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">No Surat Jalan</label>
                  <input
                    type="text"
                    value={editSjNumber}
                    onChange={e => setEditSjNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    placeholder="SJ-XXXX/YY/ZZ"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Tanggal</label>
                  <input
                    type="date"
                    value={editCreatedDate}
                    onChange={e => setEditCreatedDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Alamat Pengiriman</label>
                  <select
                    value={editDeliveryAddress}
                    onChange={e => setEditDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    {addressOptions.length > 0 ? (
                      addressOptions.map(opt => (
                        <option key={opt.label} value={opt.value}>{opt.label}</option>
                      ))
                    ) : (
                      <option value="">- Tidak ada alamat -</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="border-l border-gray-100 pl-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-semibold text-gray-900">Informasi Pengiriman / Resi</label>
                  <Button variant="secondary" size="sm" onClick={() => setEditResiList([...editResiList, { id: Date.now().toString(), no_resi: '', ekspedisi: '', url: '', file: null }])}>
                    <Plus className="w-3 h-3 mr-1" /> Tambah
                  </Button>
                </div>
                {editResiList.length === 0 && (
                  <div className="text-xs text-gray-500 italic text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    Belum ada data resi. Klik "Tambah" untuk memasukkan info ekspedisi.
                  </div>
                )}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {editResiList.map((resi, idx) => (
                    <div key={resi.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 relative group">
                      <button 
                        onClick={() => setEditResiList(editResiList.filter(r => r.id !== resi.id))}
                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Hapus Resi ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Ekspedisi</label>
                          <select
                            value={resi.ekspedisi}
                            onChange={e => {
                              const newArr = [...editResiList];
                              newArr[idx].ekspedisi = e.target.value;
                              setEditResiList(newArr);
                            }}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                          >
                            <option value="">-- Pilih Ekspedisi --</option>
                            <option value="JNE">JNE</option>
                            <option value="J&T">J&T</option>
                            <option value="Papandayan">Papandayan</option>
                            <option value="Lainnya">Lainnya...</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">No Resi</label>
                          <input
                            type="text"
                            value={resi.no_resi}
                            onChange={e => {
                              const newArr = [...editResiList];
                              newArr[idx].no_resi = e.target.value;
                              setEditResiList(newArr);
                            }}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                            placeholder="Nomor resi pengiriman"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Foto Resi</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              onChange={e => {
                                const newArr = [...editResiList];
                                newArr[idx].file = e.target.files?.[0] || null;
                                setEditResiList(newArr);
                              }}
                              className="w-full text-[11px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              accept="image/*,.pdf"
                            />
                            {resi.url && !resi.file && (
                              <a href={resi.url} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] text-blue-600 hover:underline">Lihat Foto</a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditSjId(null)}>Batal</Button>
              <Button
                variant="primary"
                disabled={isSavingEdit}
                onClick={async () => {
                  const existingSj = suratJalanList.find(s => s.id === editSjId);
                  if (existingSj) {
                    setIsSavingEdit(true);
                    try {
                      const finalResiList = [];
                      for (const resi of editResiList) {
                        let finalUrl = resi.url;
                        if (resi.file) {
                          const base64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve((reader.result as string).split(',')[1]);
                            reader.readAsDataURL(resi.file!);
                          });
                          const res = await uploadFile.mutateAsync({ filename: resi.file.name, mimeType: resi.file.type, base64 });
                          finalUrl = typeof res === 'string' ? res : res?.url || '';
                        }
                        finalResiList.push({
                          id: resi.id,
                          no_resi: resi.no_resi,
                          ekspedisi: resi.ekspedisi,
                          url: finalUrl
                        });
                      }
                      
                      await saveSJ.mutateAsync({
                        ...existingSj,
                        sj_number: editSjNumber,
                        created_date: editCreatedDate ? new Date(editCreatedDate).toISOString() : existingSj.created_date,
                        resi_data: JSON.stringify(finalResiList),
                        delivery_address: editDeliveryAddress,
                        updated_date: new Date().toISOString()
                      });
                      setEditSjId(null);
                    } catch (e) {
                      alert('Gagal menyimpan Surat Jalan');
                    } finally {
                      setIsSavingEdit(false);
                    }
                  }
                }}
              >
                {isSavingEdit ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeDelete}
        title={deleteModal.title}
        description="Yakin ingin menghapus Surat Jalan ini? Aksi ini tidak dapat dibatalkan."
        isLoading={deleteSJ.isPending}
      />
    </div>
  );
}
