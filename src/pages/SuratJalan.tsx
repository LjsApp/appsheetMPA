import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, FileText, Plus, X } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import { useSuratJalan, usePoIns, useSaveSuratJalan, fetchApi } from '@/hooks/useData';
import type { POIn } from '@/types';

export default function SuratJalanList() {
  const navigate = useNavigate();
  const { data: suratJalanList = [], isLoading: loadingSJ } = useSuratJalan();
  const { data: poIns = [], isLoading: loadingPo } = usePoIns();
  const saveSJ = useSaveSuratJalan();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const isLoading = loadingSJ || loadingPo;

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
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };
      const saved = await saveSJ.mutateAsync(data);
      setShowModal(false);
      setSelectedPoId('');
      navigate(`/surat-jalan/${saved?.id || data.id}`);
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
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari No SJ, Customer, PO..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : dataWithDetails.length === 0 ? (
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
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dataWithDetails.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 align-top border-r border-gray-100 bg-white">
                      <div className="font-semibold text-gray-900">{item.customer_name}</div>
                      <div className="font-mono text-xs text-gray-500 mt-0.5">{item.no_po}</div>
                      <div className="text-xs text-gray-400 max-w-[160px] truncate mt-0.5" title={item.judul_po}>{item.judul_po}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-blue-700">{item.sj_number}</td>
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap text-xs">
                      {new Date(item.created_date).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/surat-jalan/${item.id}`)}>
                        Detail →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create SJ Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
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
                        <div><span className="font-medium">Alamat:</span> {po.alamat_pengiriman || '-'}</div>
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
    </div>
  );
}
