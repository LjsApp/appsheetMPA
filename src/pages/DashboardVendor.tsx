import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Building2, ShoppingCart, Loader2, CreditCard, ScrollText } from 'lucide-react';
import { StatCard, PageHeader } from '@/components/ui';
import { useVendors, usePurchaseOrders, useInternalLetters, useNeracaItems } from '@/hooks/useData';

export default function DashboardVendor() {
  const { data: vendors = [], isLoading: loadVen } = useVendors();
  const { data: pos = [], isLoading: loadPo } = usePurchaseOrders();
  const { data: ils = [], isLoading: loadIl } = useInternalLetters();
  const { data: items = [], isLoading: loadItems } = useNeracaItems('all'); // Assuming we can fetch all or just iterate what we have

  const isLoading = loadVen || loadPo || loadIl || loadItems;

  const data = useMemo(() => {
    if (isLoading) return null;

    let activeVendorsCount = 0;
    let totalNilaiPoOut = 0;
    let totalIlVerified = 0;

    const vendorStats = vendors.map(ven => {
      const vPos = pos.filter(p => p.vendor_id === ven.id);
      if (vPos.length > 0) activeVendorsCount++;

      let totalNilai = 0;
      vPos.forEach(po => {
        totalNilai += Number(po.total_nilai) || 0;
      });

      const vIls = ils.filter(il => il.vendor_id === ven.id);
      const verifiedIls = vIls.filter(il => il.verification_status === 'Terverifikasi').length;

      totalNilaiPoOut += totalNilai;
      totalIlVerified += verifiedIls;

      return {
        id: ven.id,
        name: ven.name,
        totalPo: vPos.length,
        totalNilai,
        totalIl: vIls.length,
        verifiedIls
      };
    }).filter(v => v.totalPo > 0 || v.totalIl > 0).sort((a, b) => b.totalNilai - a.totalNilai);

    return {
      vendorStats,
      activeVendorsCount,
      totalNilaiPoOut,
      totalIlVerified
    };
  }, [vendors, pos, ils, isLoading]);

  if (isLoading || !data) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Vendor" subtitle="Analisis performa dan pembelian ke vendor" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Vendor" value={vendors.length.toString()} sub="Terdaftar di sistem" color="blue" icon={<Building2 className="w-6 h-6" />} />
        <StatCard label="Vendor Aktif" value={data.activeVendorsCount.toString()} sub="Menerima PO Out" color="amber" icon={<ShoppingCart className="w-6 h-6" />} />
        <StatCard label="Total Nilai PO Out" value={`Rp ${data.totalNilaiPoOut.toLocaleString('id-ID')}`} sub="Keseluruhan belanja" color="purple" icon={<CreditCard className="w-6 h-6" />} />
        <StatCard label="IL Terverifikasi" value={data.totalIlVerified.toString()} sub="Internal Letter disetujui" color="green" icon={<ScrollText className="w-6 h-6" />} />
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Top 5 Vendor (Nilai Belanja)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.vendorStats.slice(0, 5)} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{fontSize: 11}} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `${v / 1000000}Jt`} tick={{fontSize: 11}} tickLine={false} axisLine={false} />
              <Tooltip formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} />
              <Bar dataKey="totalNilai" name="Total Belanja" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Detail Per Vendor</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Nama Vendor</th>
                <th className="px-5 py-3 text-center">Jml PO Out</th>
                <th className="px-5 py-3 text-right">Total Belanja (PO)</th>
                <th className="px-5 py-3 text-center">Jml IL</th>
                <th className="px-5 py-3 text-center">IL Terverifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.vendorStats.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{v.name}</td>
                  <td className="px-5 py-3 text-center text-gray-600">{v.totalPo}</td>
                  <td className="px-5 py-3 text-right font-mono text-purple-600">Rp {v.totalNilai.toLocaleString('id-ID')}</td>
                  <td className="px-5 py-3 text-center text-gray-600">{v.totalIl}</td>
                  <td className="px-5 py-3 text-center text-emerald-600 font-medium">{v.verifiedIls}</td>
                </tr>
              ))}
              {data.vendorStats.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400">Belum ada data vendor aktif</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
