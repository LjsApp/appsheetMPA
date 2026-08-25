import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Search, Package, FileCheck2, TrendingUp, DollarSign, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { StatCard, PageHeader } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { useInquiries } from '@/hooks/useData';

const CHART_DATA = [
  { month: 'Mar', inquiries: 8, quotations: 6, won: 3 },
  { month: 'Apr', inquiries: 12, quotations: 10, won: 5 },
  { month: 'May', inquiries: 10, quotations: 8, won: 4 },
  { month: 'Jun', inquiries: 15, quotations: 13, won: 7 },
  { month: 'Jul', inquiries: 18, quotations: 14, won: 8 },
  { month: 'Aug', inquiries: 22, quotations: 17, won: 10 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: inquiries = [], isLoading: isLoadingInq } = useInquiries();

  const totalInquiries = inquiries.length;
  const inqActive = inquiries.filter(i => i.status === 'Jalan').length;
  const inqLost = inquiries.filter(i => i.status === 'Batal').length;
  const inqLate = inquiries.filter(i => i.status === 'Telat').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Ringkasan aktivitas sourcing & quotation" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Inquiry" value={isLoadingInq ? '...' : totalInquiries.toString()} sub="Semua waktu" color="blue"
          icon={<FileText className="w-6 h-6" />} />
        <StatCard label="Active Sourcing" value={isLoadingInq ? '...' : inqActive.toString()} sub="Sedang berjalan" color="amber"
          icon={<Search className="w-6 h-6" />} />
        <StatCard label="Batal" value={isLoadingInq ? '...' : inqLost.toString()} sub="Inquiry batal" color="red"
          icon={<FileCheck2 className="w-6 h-6" />} />
        <StatCard label="Telat" value={isLoadingInq ? '...' : inqLate.toString()} sub="Melewati deadline" color="green"
          icon={<CheckCircle2 className="w-6 h-6" />} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Aktif" value={inqActive.toString()} sub="Jalan" color="red"
          icon={<Package className="w-6 h-6" />} />
        <StatCard label="Pending Vendor" value="-" sub="Belum merespons" color="red"
          icon={<Clock className="w-6 h-6" />} />
        <StatCard label="Pipeline Value" value="-" sub="Potensi penjualan" color="purple"
          icon={<TrendingUp className="w-6 h-6" />} />
        <StatCard label="Est. Profit" value="-" sub="Margin: ~15%" color="blue"
          icon={<DollarSign className="w-6 h-6" />} />
      </div>

      {/* Chart & Recent Inquiry */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Chart */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Inquiry Trend (6 Bulan)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={CHART_DATA} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Bar dataKey="inquiries" name="Inquiry" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="quotations" name="Quotation" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="won" name="Won" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-gray-900">Recent Inquiries</h3>
            <button onClick={() => navigate('/inquiries')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
          </div>
          <div className="space-y-3">
            {isLoadingInq ? (
               <div className="flex justify-center p-6 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : inquiries.slice(0, 4).map((i, idx) => {
              return (
                <div key={idx} className="p-3 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => navigate('/inquiries')}>
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">{i.customer_name || 'Loading...'}</p>
                    <StatusBadge label={i.status} />
                  </div>
                  <p className="font-medium text-gray-900">{i.request_title || '-'}</p>
                  <p className="text-xs text-gray-500">{i.request_number || '-'} • {i.customer_name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">⚠ Notifikasi</h3>
        {[
          'Data pipeline dan profit sementara belum terintegrasi ke kalkulator pricing.',
          'Pastikan Anda membuat Customer di halaman Customers terlebih dahulu sebelum membuat Inquiry.',
        ].map((msg, i) => (
          <p key={i} className="text-sm text-amber-700">{msg}</p>
        ))}
      </div>
    </div>
  );
}
