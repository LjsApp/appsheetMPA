import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, FileText } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import { useSuratJalan, usePoIns } from '@/hooks/useData';

export default function SuratJalanList() {
  const navigate = useNavigate();
  const { data: suratJalanList = [], isLoading: loadingSJ } = useSuratJalan();
  const { data: poIns = [], isLoading: loadingPo } = usePoIns();

  const [searchTerm, setSearchTerm] = useState('');

  const isLoading = loadingSJ || loadingPo;

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

  return (
    <div className="space-y-6">
      <PageHeader title="Surat Jalan" subtitle={`${suratJalanList.length} Delivery Order`} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
            <p className="text-sm mt-1">Surat Jalan dibuat dari halaman PO In.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">NO. SURAT JALAN</th>
                  <th className="px-6 py-4">TANGGAL</th>
                  <th className="px-6 py-4">CUSTOMER</th>
                  <th className="px-6 py-4 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dataWithDetails.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-blue-700">
                      {item.sj_number}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(item.created_date).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{item.customer_name}</span>
                        <span className="text-xs text-gray-500 truncate max-w-[200px]" title={item.judul_po}>{item.judul_po}</span>
                        <span className="text-[11px] text-gray-400 font-mono mt-0.5">{item.no_po}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="secondary" onClick={() => navigate(`/surat-jalan/${item.id}`)}>
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
    </div>
  );
}
