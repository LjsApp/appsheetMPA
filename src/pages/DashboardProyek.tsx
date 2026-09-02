import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Briefcase, FileText, CheckCircle2, TrendingUp, Loader2 } from 'lucide-react';
import { StatCard, PageHeader } from '@/components/ui';
import { usePoIns, useInvoices, usePurchaseOrders, useInternalLetters, useNeracas } from '@/hooks/useData';

export default function DashboardProyek() {
  const { data: poIns = [], isLoading: loadPoIn } = usePoIns();
  const { data: invoices = [], isLoading: loadInv } = useInvoices();
  const { data: pos = [], isLoading: loadPoOut } = usePurchaseOrders();
  const { data: ils = [], isLoading: loadIl } = useInternalLetters();
  const { data: neracas = [], isLoading: loadNeraca } = useNeracas();

  const isLoading = loadPoIn || loadInv || loadPoOut || loadIl || loadNeraca;

  const data = useMemo(() => {
    if (isLoading) return null;

    let totalPendapatan = 0;
    let totalPengeluaran = 0;

    const proyekStats = poIns.map(po => {
      // Pendapatan from Neraca
      const n = neracas.find(n => n.id === po.neraca_id);
      const pendapatan = n ? (Number(n.grand_total) || 0) : 0;

      // Pengeluaran from PO Out & IL
      let pengeluaran = 0;
      
      const poOuts = pos.filter(p => p.po_in_id === po.id);
      poOuts.forEach(poOut => {
        pengeluaran += Number(poOut.total_nilai) || 0;
      });

      const poIls = ils.filter(il => il.po_in_id === po.id);
      poIls.forEach(il => {
        pengeluaran += Number(il.amount) || 0;
      });

      totalPendapatan += pendapatan;
      totalPengeluaran += pengeluaran;

      const margin = pendapatan - pengeluaran;
      const marginPct = pendapatan > 0 ? (margin / pendapatan) * 100 : 0;

      const invs = invoices.filter(i => i.po_in_id === po.id);
      const isLunas = invs.length > 0 && invs.every(i => i.payment_status === 'Lunas');

      return {
        id: po.id,
        no_po: po.po_in_number,
        judul: po.judul,
        customer: po.customer_name,
        pendapatan,
        pengeluaran,
        margin,
        marginPct,
        status_bayar: isLunas ? 'Lunas' : 'Belum Lunas'
      };
    }).sort((a, b) => b.pendapatan - a.pendapatan);

    const pendingInvoices = invoices.filter(i => i.verification_status === 'Terverifikasi' && i.payment_status !== 'Lunas');

    return {
      proyekStats,
      totalProyek: poIns.length,
      totalPendapatan,
      totalPengeluaran,
      pendingInvoices
    };
  }, [poIns, invoices, pos, ils, neracas, isLoading]);

  if (isLoading || !data) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Proyek & Invoice" subtitle="Analisis finansial per proyek dan status pembayaran" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Proyek" value={data.totalProyek.toString()} sub="Berdasarkan PO In" color="blue" icon={<Briefcase className="w-6 h-6" />} />
        <StatCard label="Total Pendapatan" value={`Rp ${data.totalPendapatan.toLocaleString('id-ID')}`} sub="Omzet keseluruhan" color="green" icon={<TrendingUp className="w-6 h-6" />} />
        <StatCard label="Total Pengeluaran" value={`Rp ${data.totalPengeluaran.toLocaleString('id-ID')}`} sub="PO Out + IL" color="red" icon={<FileText className="w-6 h-6" />} />
        <StatCard label="Invoice Menunggu Pembayaran" value={data.pendingInvoices.length.toString()} sub="Terverifikasi tapi belum lunas" color="amber" icon={<CheckCircle2 className="w-6 h-6" />} />
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Pendapatan vs Pengeluaran per Proyek</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.proyekStats.slice(0, 10)} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="no_po" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `${v / 1000000}Jt`} tick={{fontSize: 11}} tickLine={false} axisLine={false} />
              <Tooltip formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="pendapatan" name="Pendapatan" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Analisis Margin Per Proyek</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">No PO In / Judul</th>
                <th className="px-5 py-3 text-right">Pendapatan</th>
                <th className="px-5 py-3 text-right">Pengeluaran</th>
                <th className="px-5 py-3 text-right">Estimasi Margin</th>
                <th className="px-5 py-3 text-center">Status Pembayaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.proyekStats.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-900">{p.no_po}</div>
                    <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">{p.judul} - {p.customer}</div>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-emerald-600">Rp {p.pendapatan.toLocaleString('id-ID')}</td>
                  <td className="px-5 py-3 text-right font-mono text-rose-600">Rp {p.pengeluaran.toLocaleString('id-ID')}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="font-mono text-blue-600 font-medium">Rp {p.margin.toLocaleString('id-ID')}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{p.marginPct.toFixed(1)}%</div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {p.status_bayar === 'Lunas' ? (
                      <span className="inline-flex px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Lunas</span>
                    ) : (
                      <span className="inline-flex px-2 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">Belum Lunas</span>
                    )}
                  </td>
                </tr>
              ))}
              {data.proyekStats.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400">Belum ada proyek</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
