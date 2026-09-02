import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui';
import { 
  usePurchaseOrders, useInvoices, usePoIns, useNeracaQuotations,
  useBelanjaDapurIn, useBelanjaDapurOut, useBelanjaProyekIn, useBelanjaProyekOut
} from '@/hooks/useData';
import { formatCurrency } from '@/lib/utils';
import { 
  Wallet, ShoppingCart, TrendingUp,
  FileText, ArrowRight, X, Clock
} from 'lucide-react';

export default function Dashboard() {
  const { data: poOuts = [] } = usePurchaseOrders();
  const { data: invoices = [] } = useInvoices();
  const { data: poIns = [] } = usePoIns();
  const { data: quotations = [] } = useNeracaQuotations();
  const { data: dapurIn = [] } = useBelanjaDapurIn();
  const { data: dapurOut = [] } = useBelanjaDapurOut();
  const { data: proyekIn = [] } = useBelanjaProyekIn();
  const { data: proyekOut = [] } = useBelanjaProyekOut();

  // Modals state
  const [modalContent, setModalContent] = useState<{
    isOpen: boolean;
    title: string;
    type: 'belanja' | 'pembelian' | 'penjualan' | 'quotation' | 'poin' | 'cepat';
  }>({ isOpen: false, title: '', type: 'belanja' });

  // --- KEUANGAN ---
  // Belanja
  const totalDapurIn = dapurIn.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
  const totalDapurOut = dapurOut.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
  const totalProyekIn = proyekIn.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
  const totalProyekOut = proyekOut.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
  
  const totalBelanjaIn = totalDapurIn + totalProyekIn;
  const totalBelanjaOut = totalDapurOut + totalProyekOut;
  const sisaBelanja = totalBelanjaIn - totalBelanjaOut;

  // Pembelian (PO Out)
  const totalPembelian = poOuts.reduce((sum, po) => sum + (po.status !== 'Deleted' ? (Number(po.total_nilai) || 0) : 0), 0);
  
  const vendorPembelian = useMemo(() => {
    const map = new Map<string, number>();
    poOuts.filter(po => po.status !== 'Deleted').forEach(po => {
      const current = map.get(po.vendor_name) || 0;
      map.set(po.vendor_name, current + (Number(po.total_nilai) || 0));
    });
    return Array.from(map.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [poOuts]);

  // Penjualan (Invoice)
  const invoiceData = useMemo(() => {
    return invoices.map(inv => {
      const relatedPoIn = poIns.find(p => p.id === inv.po_in_id);
      const relatedQuot = quotations.find(q => q.neraca_id === relatedPoIn?.neraca_id || q.quotation_number === relatedPoIn?.quotation_id);
      const nilai = relatedQuot ? (Number(relatedQuot.nilai) || 0) : 0;
      return { ...inv, nilai, customer_name: relatedQuot?.customer_name || relatedPoIn?.customer_name || 'Unknown' };
    });
  }, [invoices, poIns, quotations]);

  const lunasInvoices = invoiceData.filter(i => i.payment_status === 'Lunas');
  const belumLunasInvoices = invoiceData.filter(i => i.payment_status !== 'Lunas');
  const totalLunas = lunasInvoices.reduce((sum, i) => sum + i.nilai, 0);
  const totalPiutang = belumLunasInvoices.reduce((sum, i) => sum + i.nilai, 0);
  const totalPenjualan = totalLunas + totalPiutang;

  // Keuntungan
  const keuntungan = totalPenjualan - totalPembelian;

  // --- PROYEK ---
  // Total Quotation
  const quotByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    quotations.forEach(q => {
      const current = map.get(q.customer_name) || 0;
      map.set(q.customer_name, current + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [quotations]);

  // Total PO In
  const poInByCustomer = useMemo(() => {
    const map = new Map<string, { count: number, total: number }>();
    poIns.forEach(p => {
      const relatedQuot = quotations.find(q => q.neraca_id === p.neraca_id || q.quotation_number === p.quotation_id);
      const nilai = relatedQuot ? (Number(relatedQuot.nilai) || 0) : 0;
      const current = map.get(p.customer_name) || { count: 0, total: 0 };
      map.set(p.customer_name, { count: current.count + 1, total: current.total + nilai });
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, count: data.count, total: data.total })).sort((a, b) => b.total - a.total);
  }, [poIns, quotations]);

  // Pembayaran Cepat
  const fastPayments = useMemo(() => {
    const paid = lunasInvoices.filter(i => i.invoice_date && i.payment_date);
    const withDays = paid.map(i => {
      const diffTime = Math.abs(new Date(i.payment_date!).getTime() - new Date(i.invoice_date).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...i, diffDays };
    });
    return withDays.sort((a, b) => a.diffDays - b.diffDays);
  }, [lunasInvoices]);

  const closeModal = () => setModalContent(prev => ({ ...prev, isOpen: false }));

  return (
    <div className="space-y-8 pb-10 max-w-7xl mx-auto pt-6">
      <PageHeader title="Dashboard Umum" subtitle="Ringkasan aktivitas keuangan dan proyek perusahaan" />
      
      {/* SECTION KEUANGAN */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-600" /> Keuangan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card Belanja */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-16 h-16 text-emerald-600" /></div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 z-10">Belanja</h3>
            <div className="grid grid-cols-2 gap-4 mb-6 z-10">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Total Pemasukan</p>
                <p className="text-base font-bold text-emerald-600">{formatCurrency(totalBelanjaIn)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Total Pengeluaran</p>
                <p className="text-base font-bold text-red-600">{formatCurrency(totalBelanjaOut)}</p>
              </div>
              <div className="col-span-2 bg-blue-50 rounded-lg p-3 border border-blue-100 flex justify-between items-center">
                <span className="text-sm font-semibold text-blue-800">Sisa Belanja</span>
                <span className="text-lg font-bold text-blue-700">{formatCurrency(sisaBelanja)}</span>
              </div>
            </div>
            <button 
              onClick={() => setModalContent({ isOpen: true, title: 'Detail Belanja', type: 'belanja' })}
              className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 rounded-lg transition-colors border border-gray-200 z-10"
            >
              Lihat Detail Belanja
            </button>
          </div>

          {/* Card Pembelian */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><ShoppingCart className="w-16 h-16 text-blue-600" /></div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 z-10">Pembelian (PO Out)</h3>
            <div className="mb-6 z-10 flex-1 flex flex-col justify-center">
              <p className="text-sm text-gray-500 mb-1">Total Pembelian Keseluruhan</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalPembelian)}</p>
            </div>
            <button 
              onClick={() => setModalContent({ isOpen: true, title: 'Detail Pembelian per Vendor', type: 'pembelian' })}
              className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 rounded-lg transition-colors border border-gray-200 z-10"
            >
              Lihat Pembelian
            </button>
          </div>

          {/* Card Penjualan */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-16 h-16 text-emerald-600" /></div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 z-10">Penjualan (Invoice)</h3>
            <div className="mb-4 z-10">
              <p className="text-sm text-gray-500 mb-1">Total Nominal Penjualan</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPenjualan)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6 z-10">
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                <p className="text-xs text-emerald-700 mb-1">Total Lunas</p>
                <p className="text-sm font-bold text-emerald-700">{formatCurrency(totalLunas)}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-amber-700 mb-1">Total Piutang</p>
                <p className="text-sm font-bold text-amber-700">{formatCurrency(totalPiutang)}</p>
              </div>
            </div>
            <button 
              onClick={() => setModalContent({ isOpen: true, title: 'Detail Penjualan (Invoice)', type: 'penjualan' })}
              className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 rounded-lg transition-colors border border-gray-200 z-10"
            >
              Lihat Detail Penjualan
            </button>
          </div>

          {/* Card Keuntungan */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden justify-center text-center">
            <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="w-24 h-24" /></div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 z-10">Keuntungan</h3>
            <p className="text-sm text-gray-500 mb-4 z-10">Penjualan (Total) - Pembelian (Total)</p>
            <div className="z-10">
              <span className={`inline-block px-4 py-2 rounded-xl text-3xl font-black ${keuntungan >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {keuntungan >= 0 ? '+' : '-'} {formatCurrency(Math.abs(keuntungan))}
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION PROYEK */}
      <section className="pt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" /> Proyek
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card Total Quotation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Total Quotation Keseluruhan</h3>
              <p className="text-3xl font-bold text-gray-900">{quotations.length}</p>
            </div>
            <div className="flex-1 mb-4">
              <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Top 5 Customer</p>
              <div className="space-y-2">
                {quotByCustomer.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm font-medium text-gray-700 truncate pr-2">{c.name}</span>
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <button 
              onClick={() => setModalContent({ isOpen: true, title: 'Semua Data Quotation Customer', type: 'quotation' })}
              className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 bg-blue-50 hover:bg-blue-100 text-sm font-semibold text-blue-700 rounded-lg transition-colors"
            >
              Lihat Selengkapnya <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card Total PO In */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Total PO In Keseluruhan</h3>
              <p className="text-3xl font-bold text-gray-900">{poIns.length}</p>
            </div>
            <div className="flex-1 mb-4">
              <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Top 5 Customer</p>
              <div className="space-y-2">
                {poInByCustomer.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex flex-col truncate pr-2">
                      <span className="text-sm font-medium text-gray-700 truncate">{c.name}</span>
                      <span className="text-xs text-gray-400">{c.count} PO In</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 shrink-0">{formatCurrency(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
            <button 
              onClick={() => setModalContent({ isOpen: true, title: 'Semua Data PO In Customer', type: 'poin' })}
              className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-sm font-semibold text-emerald-700 rounded-lg transition-colors"
            >
              Lihat Selengkapnya <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card Pembayaran Cepat */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Pembayaran Tercepat</h3>
              <p className="text-xs text-gray-400">Jarak Hari (Invoice &rarr; Lunas)</p>
            </div>
            <div className="flex-1 mb-4">
              <div className="space-y-2">
                {fastPayments.slice(0, 5).map((inv, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div className="flex flex-col truncate pr-2">
                      <span className="text-sm font-medium text-gray-700 truncate">{inv.customer_name}</span>
                      <span className="text-[11px] text-gray-400 font-mono">{inv.invoice_number}</span>
                    </div>
                    <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">{inv.diffDays} Hari</span>
                  </div>
                ))}
                {fastPayments.length === 0 && <p className="text-sm text-gray-500 italic py-4 text-center">Belum ada data pelunasan</p>}
              </div>
            </div>
            <button 
              onClick={() => setModalContent({ isOpen: true, title: 'Data Kecepatan Pembayaran', type: 'cepat' })}
              className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 bg-amber-50 hover:bg-amber-100 text-sm font-semibold text-amber-700 rounded-lg transition-colors"
            >
              Detail Waktu Pelunasan <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* MODALS */}
      {modalContent.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{modalContent.title}</h2>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              
              {/* MODAL: BELANJA */}
              {modalContent.type === 'belanja' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">Belanja Dapur</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div><p className="text-xs text-gray-500">Pemasukan</p><p className="font-bold text-emerald-600">{formatCurrency(totalDapurIn)}</p></div>
                      <div><p className="text-xs text-gray-500">Pengeluaran</p><p className="font-bold text-red-600">{formatCurrency(totalDapurOut)}</p></div>
                      <div><p className="text-xs text-gray-500">Sisa</p><p className="font-bold text-blue-600">{formatCurrency(totalDapurIn - totalDapurOut)}</p></div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">Belanja Proyek</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div><p className="text-xs text-gray-500">Pemasukan</p><p className="font-bold text-emerald-600">{formatCurrency(totalProyekIn)}</p></div>
                      <div><p className="text-xs text-gray-500">Pengeluaran</p><p className="font-bold text-red-600">{formatCurrency(totalProyekOut)}</p></div>
                      <div><p className="text-xs text-gray-500">Sisa</p><p className="font-bold text-blue-600">{formatCurrency(totalProyekIn - totalProyekOut)}</p></div>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-3 border-b border-blue-200 pb-2">Total Keseluruhan</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div><p className="text-xs text-blue-600">Total Pemasukan</p><p className="font-bold text-blue-800">{formatCurrency(totalBelanjaIn)}</p></div>
                      <div><p className="text-xs text-blue-600">Total Pengeluaran</p><p className="font-bold text-blue-800">{formatCurrency(totalBelanjaOut)}</p></div>
                      <div><p className="text-xs text-blue-600">Total Sisa</p><p className="text-xl font-black text-blue-900">{formatCurrency(sisaBelanja)}</p></div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL: PEMBELIAN */}
              {modalContent.type === 'pembelian' && (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Nama Vendor</th>
                        <th className="px-4 py-3 font-semibold text-right">Total Pembelian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {vendorPembelian.map((v, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(v.total)}</td>
                        </tr>
                      ))}
                      {vendorPembelian.length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-500">Belum ada data</td></tr>}
                    </tbody>
                    {vendorPembelian.length > 0 && (
                      <tfoot className="bg-gray-50 border-t border-gray-200 font-bold">
                        <tr>
                          <td className="px-4 py-3 text-right text-gray-700">Total Keseluruhan</td>
                          <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totalPembelian)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* MODAL: PENJUALAN */}
              {modalContent.type === 'penjualan' && (
                <div className="space-y-6">
                  <div className="border border-amber-200 rounded-lg overflow-hidden">
                    <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 font-bold text-amber-800 flex justify-between items-center">
                      <span>Invoice Belum Lunas (Piutang)</span>
                      <span>Total: {formatCurrency(totalPiutang)}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white text-gray-500 border-b border-gray-100 text-xs uppercase">
                          <tr><th className="px-4 py-2">No. Invoice</th><th className="px-4 py-2">Customer</th><th className="px-4 py-2 text-right">Nilai</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {belumLunasInvoices.map(inv => (
                            <tr key={inv.id}>
                              <td className="px-4 py-2 font-mono text-xs">{inv.invoice_number}</td>
                              <td className="px-4 py-2">{inv.customer_name}</td>
                              <td className="px-4 py-2 text-right font-semibold">{formatCurrency(inv.nilai)}</td>
                            </tr>
                          ))}
                          {belumLunasInvoices.length === 0 && <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-500">Semua lunas</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border border-emerald-200 rounded-lg overflow-hidden">
                    <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 font-bold text-emerald-800 flex justify-between items-center">
                      <span>Invoice Lunas</span>
                      <span>Total: {formatCurrency(totalLunas)}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white text-gray-500 border-b border-gray-100 text-xs uppercase">
                          <tr><th className="px-4 py-2">No. Invoice</th><th className="px-4 py-2">Customer</th><th className="px-4 py-2 text-right">Nilai</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {lunasInvoices.map(inv => (
                            <tr key={inv.id}>
                              <td className="px-4 py-2 font-mono text-xs">{inv.invoice_number}</td>
                              <td className="px-4 py-2">{inv.customer_name}</td>
                              <td className="px-4 py-2 text-right font-semibold">{formatCurrency(inv.nilai)}</td>
                            </tr>
                          ))}
                          {lunasInvoices.length === 0 && <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-500">Belum ada invoice lunas</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center text-blue-900 font-bold text-lg">
                    <span>Total Keseluruhan Penjualan</span>
                    <span>{formatCurrency(totalPenjualan)}</span>
                  </div>
                </div>
              )}

              {/* MODAL: QUOTATION */}
              {modalContent.type === 'quotation' && (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <tr><th className="px-4 py-3 font-semibold">Nama Customer</th><th className="px-4 py-3 font-semibold text-center">Jumlah Quotation</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {quotByCustomer.map((c, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                          <td className="px-4 py-3 text-center font-bold text-blue-600"><span className="bg-blue-50 px-3 py-1 rounded-full">{c.count}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* MODAL: PO IN */}
              {modalContent.type === 'poin' && (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Nama Customer</th>
                        <th className="px-4 py-3 font-semibold text-center">Jml PO In</th>
                        <th className="px-4 py-3 font-semibold text-right">Total Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {poInByCustomer.map((c, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{c.count}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrency(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* MODAL: CEPAT */}
              {modalContent.type === 'cepat' && (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Nama Customer</th>
                        <th className="px-4 py-3 font-semibold">No. Invoice</th>
                        <th className="px-4 py-3 font-semibold text-right">Nilai Invoice</th>
                        <th className="px-4 py-3 font-semibold text-center">Tempo Pelunasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fastPayments.map((inv, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{inv.customer_name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-blue-600">{inv.invoice_number}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(inv.nilai)}</td>
                          <td className="px-4 py-3 text-center font-bold text-amber-600"><span className="bg-amber-50 px-3 py-1 rounded-full">{inv.diffDays} Hari</span></td>
                        </tr>
                      ))}
                      {fastPayments.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Belum ada data pelunasan</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
