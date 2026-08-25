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
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-blue-700">
                      {item.sj_number}
                    </td>
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
    </div>
  );
}
