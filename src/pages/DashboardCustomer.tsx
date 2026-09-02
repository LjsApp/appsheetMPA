import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, FileText, CheckCircle2, DollarSign, Loader2 } from 'lucide-react';
import { StatCard, PageHeader } from '@/components/ui';
import { useCustomers, useInvoices, usePoIns, useNeracas } from '@/hooks/useData';

const COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#3b82f6'];

export default function DashboardCustomer() {
  const { data: customers = [], isLoading: loadCust } = useCustomers();
  const { data: invoices = [], isLoading: loadInv } = useInvoices();
  const { data: poIns = [], isLoading: loadPo } = usePoIns();
  const { data: neracas = [], isLoading: loadNeraca } = useNeracas();

  const isLoading = loadCust || loadInv || loadPo || loadNeraca;

  const data = useMemo(() => {
    if (isLoading) return null;

    let activeCustomersCount = 0;
    let totalNilaiLunas = 0;
    let totalNilaiInvoice = 0;

    const custStats = customers.map(cust => {
      // Find POs for this customer
      const custPos = poIns.filter(p => p.customer_id === cust.id);
      if (custPos.length > 0) activeCustomersCount++;

      // Find Neraca values for these POs
      let totalNilai = 0;
      custPos.forEach(po => {
        const n = neracas.find(n => n.id === po.neraca_id);
        if (n) totalNilai += Number(n.grand_total) || 0;
      });

      // Find Invoices for this customer
      const custInvs = invoices.filter(i => i.customer_id === cust.id);
      let paid = 0;
      custInvs.forEach(inv => {
        // If paid, add to paid sum. In this logic, we assume an invoice value = PO value, but let's approximate or just count status
        if (inv.payment_status === 'Lunas') {
          const po = custPos.find(p => p.id === inv.po_in_id);
          if (po) {
            const n = neracas.find(n => n.id === po.neraca_id);
            if (n) paid += Number(n.grand_total) || 0;
          }
        }
      });

      totalNilaiInvoice += totalNilai;
      totalNilaiLunas += paid;

      return {
        id: cust.id,
        name: cust.company_name,
        totalPo: custPos.length,
        totalInv: custInvs.length,
        totalNilai,
        paid,
        piutang: totalNilai - paid
      };
    }).filter(c => c.totalPo > 0).sort((a, b) => b.totalNilai - a.totalNilai);

    const pieData = [
      { name: 'Lunas', value: totalNilaiLunas },
      { name: 'Piutang', value: totalNilaiInvoice - totalNilaiLunas }
    ];

    return {
      custStats,
      activeCustomersCount,
      totalNilaiInvoice,
      totalNilaiLunas,
      pieData
    };
  }, [customers, invoices, poIns, neracas, isLoading]);

  if (isLoading || !data) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Customer" subtitle="Analisis performa dan piutang pelanggan" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Customer" value={customers.length.toString()} sub="Terdaftar di sistem" color="blue" icon={<Users className="w-6 h-6" />} />
        <StatCard label="Customer Aktif" value={data.activeCustomersCount.toString()} sub="Memiliki transaksi" color="amber" icon={<FileText className="w-6 h-6" />} />
        <StatCard label="Total Omzet (PO)" value={`Rp ${data.totalNilaiInvoice.toLocaleString('id-ID')}`} sub="Nilai seluruh proyek" color="purple" icon={<DollarSign className="w-6 h-6" />} />
        <StatCard label="Total Lunas" value={`Rp ${data.totalNilaiLunas.toLocaleString('id-ID')}`} sub="Invoice sudah dibayar" color="green" icon={<CheckCircle2 className="w-6 h-6" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Top 5 Customer (Omzet)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.custStats.slice(0, 5)} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 11}} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `${v / 1000000}Jt`} tick={{fontSize: 11}} tickLine={false} axisLine={false} />
                <Tooltip formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} />
                <Bar dataKey="totalNilai" name="Omzet" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Status Pembayaran Keseluruhan</h3>
          <div className="h-64 flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {data.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Lunas' ? '#10b981' : '#f43f5e'} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center inset-0 pointer-events-none text-center">
              <span className="text-xs text-gray-500 font-medium">Piutang</span>
              <span className="text-sm font-bold text-gray-800">{`${((data.pieData[1].value / (data.totalNilaiInvoice || 1)) * 100).toFixed(1)}%`}</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Lunas</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Piutang</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Detail Per Customer</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Nama Customer</th>
                <th className="px-5 py-3 text-center">Jml PO</th>
                <th className="px-5 py-3 text-center">Jml Invoice</th>
                <th className="px-5 py-3 text-right">Total Omzet</th>
                <th className="px-5 py-3 text-right">Terbayar</th>
                <th className="px-5 py-3 text-right">Piutang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.custStats.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-5 py-3 text-center text-gray-600">{c.totalPo}</td>
                  <td className="px-5 py-3 text-center text-gray-600">{c.totalInv}</td>
                  <td className="px-5 py-3 text-right font-mono text-gray-700">Rp {c.totalNilai.toLocaleString('id-ID')}</td>
                  <td className="px-5 py-3 text-right font-mono text-emerald-600">Rp {c.paid.toLocaleString('id-ID')}</td>
                  <td className="px-5 py-3 text-right font-mono text-rose-600">Rp {c.piutang.toLocaleString('id-ID')}</td>
                </tr>
              ))}
              {data.custStats.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-gray-400">Belum ada data customer aktif</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
