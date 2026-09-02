import { useState, useMemo, useRef } from 'react';
import { PageHeader, Button } from '@/components/ui';
import { 
  useBelanjaDapurIn, useSaveBelanjaDapurIn, useDeleteBelanjaDapurIn,
  useBelanjaDapurOut, useSaveBelanjaDapurOut, useDeleteBelanjaDapurOut,
  useUploadFile, useCompany
} from '@/hooks/useData';
import { Loader2, Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, Wallet, FileText, X, Upload, Printer, MapPin, Phone, Mail, AtSign } from 'lucide-react';
import { formatCurrency, formatDate, getDriveImageUrl } from '@/lib/utils';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import type { BelanjaPemasukan, BelanjaPengeluaran } from '@/types';

export default function BelanjaDapur() {
  const { data: pemasukan = [], isLoading: loadIn } = useBelanjaDapurIn();
  const { data: pengeluaran = [], isLoading: loadOut } = useBelanjaDapurOut();
  const saveIn = useSaveBelanjaDapurIn();
  const delIn = useDeleteBelanjaDapurIn();
  const saveOut = useSaveBelanjaDapurOut();
  const delOut = useDeleteBelanjaDapurOut();
  const uploadFile = useUploadFile();
  const { data: company } = useCompany();

  const isLoading = loadIn || loadOut;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const rowsPerPage = 10;
  const [pageIn, setPageIn] = useState(1);
  const [pageOut, setPageOut] = useState(1);

  // Modals
  const [modalIn, setModalIn] = useState<{ isOpen: boolean; data: Partial<BelanjaPemasukan> | null }>({ isOpen: false, data: null });
  const [modalOut, setModalOut] = useState<{ isOpen: boolean; data: Partial<BelanjaPengeluaran> | null }>({ isOpen: false, data: null });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; type: 'in' | 'out'; title: string }>({ isOpen: false, id: '', type: 'in', title: '' });

  // Form states In
  const [tanggalIn, setTanggalIn] = useState(new Date().toISOString().split('T')[0]);
  const [nominalIn, setNominalIn] = useState('');
  const [keteranganIn, setKeteranganIn] = useState('');
  const [fileIn, setFileIn] = useState<File | null>(null);

  // Form states Out
  const [tanggalOut, setTanggalOut] = useState(new Date().toISOString().split('T')[0]);
  const [nominalOut, setNominalOut] = useState('');
  const [keteranganOut, setKeteranganOut] = useState('');
  const [fileOut, setFileOut] = useState<File | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const fileInputInRef = useRef<HTMLInputElement>(null);
  const fileInputOutRef = useRef<HTMLInputElement>(null);

  // Filtered Data
  const filteredIn = useMemo(() => {
    return pemasukan.filter(item => {
      const matchSearch = item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDate = (!dateFrom || item.tanggal >= dateFrom) && (!dateTo || item.tanggal <= dateTo);
      return matchSearch && matchDate;
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [pemasukan, searchTerm, dateFrom, dateTo]);

  const filteredOut = useMemo(() => {
    return pengeluaran.filter(item => {
      const matchSearch = item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDate = (!dateFrom || item.tanggal >= dateFrom) && (!dateTo || item.tanggal <= dateTo);
      return matchSearch && matchDate;
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [pengeluaran, searchTerm, dateFrom, dateTo]);

  // Summaries
  const totalIn = filteredIn.reduce((sum, item) => sum + Number(item.nominal), 0);
  const totalOut = filteredOut.reduce((sum, item) => sum + Number(item.nominal), 0);
  const balance = totalIn - totalOut;

  // Pagination
  const totalPagesIn = Math.max(1, Math.ceil(filteredIn.length / rowsPerPage));
  const totalPagesOut = Math.max(1, Math.ceil(filteredOut.length / rowsPerPage));
  const paginatedIn = filteredIn.slice((pageIn - 1) * rowsPerPage, pageIn * rowsPerPage);
  const paginatedOut = filteredOut.slice((pageOut - 1) * rowsPerPage, pageOut * rowsPerPage);

  const formatNumberInput = (val: string) => {
    const number = val.replace(/[^\d]/g, '');
    if (!number) return '';
    return parseInt(number, 10).toLocaleString('id-ID');
  };

  const parseNumberInput = (val: string) => {
    return parseInt(val.replace(/[^\d]/g, ''), 10) || 0;
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSaveIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let url = modalIn.data?.bukti_tf || '';
      if (fileIn) {
        const base64 = await readFileAsBase64(fileIn);
        url = await uploadFile.mutateAsync({ filename: fileIn.name, mimeType: fileIn.type, base64 });
      }
      
      const payload: Partial<BelanjaPemasukan> = {
        ...(modalIn.data || {}),
        tanggal: tanggalIn,
        nominal: parseNumberInput(nominalIn),
        keterangan: keteranganIn,
        bukti_tf: url,
        updated_date: new Date().toISOString()
      };
      
      if (!modalIn.data?.id) {
        payload.created_date = new Date().toISOString();
      }

      await saveIn.mutateAsync(payload);
      setModalIn({ isOpen: false, data: null });
    } catch (e) {
      alert('Gagal menyimpan pemasukan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let url = modalOut.data?.bukti_foto || '';
      if (fileOut) {
        const base64 = await readFileAsBase64(fileOut);
        url = await uploadFile.mutateAsync({ filename: fileOut.name, mimeType: fileOut.type, base64 });
      }
      
      const payload: Partial<BelanjaPengeluaran> = {
        ...(modalOut.data || {}),
        tanggal: tanggalOut,
        nominal: parseNumberInput(nominalOut),
        keterangan: keteranganOut,
        bukti_foto: url,
        updated_date: new Date().toISOString()
      };
      
      if (!modalOut.data?.id) {
        payload.created_date = new Date().toISOString();
      }

      await saveOut.mutateAsync(payload);
      setModalOut({ isOpen: false, data: null });
    } catch (e) {
      alert('Gagal menyimpan pengeluaran');
    } finally {
      setIsSaving(false);
    }
  };

  const openAddIn = () => {
    setTanggalIn(new Date().toISOString().split('T')[0]);
    setNominalIn('');
    setKeteranganIn('');
    setFileIn(null);
    setModalIn({ isOpen: true, data: null });
  };

  const openEditIn = (data: BelanjaPemasukan) => {
    setTanggalIn(data.tanggal.split('T')[0]);
    setNominalIn(data.nominal.toLocaleString('id-ID'));
    setKeteranganIn(data.keterangan || '');
    setFileIn(null);
    setModalIn({ isOpen: true, data });
  };

  const openAddOut = () => {
    setTanggalOut(new Date().toISOString().split('T')[0]);
    setNominalOut('');
    setKeteranganOut('');
    setFileOut(null);
    setModalOut({ isOpen: true, data: null });
  };

  const openEditOut = (data: BelanjaPengeluaran) => {
    setTanggalOut(data.tanggal.split('T')[0]);
    setNominalOut(data.nominal.toLocaleString('id-ID'));
    setKeteranganOut(data.keterangan || '');
    setFileOut(null);
    setModalOut({ isOpen: true, data });
  };

  return (
    <div className="space-y-6 pb-20">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body, html, #root { margin:0; padding:0; background:white !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; height:auto !important; overflow:visible !important; }
          .overflow-hidden, .overflow-y-auto { overflow: visible !important; }
          .no-print { display: none !important; }
          #report-doc { background:transparent !important; box-shadow:none !important; border:none !important; border-radius:0 !important; max-width:100% !important; margin:0 !important; position:relative; z-index:1; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          .print-wm-tl { position:fixed !important; opacity:0.35 !important; z-index:-1 !important; }
          .print-wm-br { position:fixed !important; opacity:0.35 !important; z-index:-1 !important; }
          .print-page-footer { display:flex !important; position:fixed !important; bottom:0; left:0; right:0; background:white !important; z-index:100 !important; padding:10px 40px; justify-content:space-between; align-items:center; }
        }
        .print-wm-tl { position:absolute; top:0; left:0; width:320px; opacity:0.15; transform:translate(-20%, -20%); z-index:-1; pointer-events:none; }
        .print-wm-br { position:absolute; bottom:0; right:0; width:360px; opacity:0.15; transform:translate(20%, 20%); z-index:-1; pointer-events:none; }
        .print-page-footer { position:absolute; bottom:0; left:0; right:0; padding:10px 40px; display:flex; justify-content:space-between; align-items:center; background:transparent; z-index:0; pointer-events:none; }
      `}</style>
      <div className="no-print space-y-6">
        <PageHeader 
          title="Belanja Dapur" 
          subtitle="Kelola pemasukan dan pengeluaran operasional dapur/kantor"
        />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <ArrowDownCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Pemasukan</p>
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalIn)}</h3>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-xl">
            <ArrowUpCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Pengeluaran</p>
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalOut)}</h3>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${balance >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Sisa Saldo</p>
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(balance)}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Global Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <span className="text-xs text-gray-500 font-medium">Dari:</span>
              <input 
                type="date" 
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-transparent border-none text-sm p-0 focus:ring-0 text-gray-700" 
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <span className="text-xs text-gray-500 font-medium">Sampai:</span>
              <input 
                type="date" 
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-transparent border-none text-sm p-0 focus:ring-0 text-gray-700" 
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="text"
              placeholder="Cari keterangan..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <Button 
              variant="secondary"
              onClick={() => window.print()}
              className="gap-2 text-gray-600 hover:text-gray-900 whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              Cetak Laporan
            </Button>
          </div>
        </div>

        {/* Dual Tables Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          
          {/* PEMASUKAN TABLE */}
          <div className="border border-gray-100 rounded-xl overflow-hidden flex flex-col shadow-sm">
            <div className="bg-emerald-50/50 p-4 border-b border-emerald-100 flex justify-between items-center">
              <h3 className="font-semibold text-emerald-800 flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5" /> Pemasukan
              </h3>
              <Button size="sm" onClick={openAddIn} className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-3.5 h-3.5" /> Tambah
              </Button>
            </div>
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tgl</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Keterangan</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nominal</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Bukti</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-500">Memuat...</td></tr>
                  ) : paginatedIn.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400">Tidak ada pemasukan</td></tr>
                  ) : (
                    paginatedIn.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(item.tanggal)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 line-clamp-2">{item.keterangan || '-'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-600 whitespace-nowrap">+{formatCurrency(item.nominal)}</td>
                        <td className="px-4 py-3 text-center">
                          {item.bukti_tf ? (
                            <a href={item.bukti_tf} target="_blank" rel="noopener noreferrer" className="inline-flex text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded" title="Lihat Bukti">
                              <FileText className="w-4 h-4" />
                            </a>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => openEditIn(item)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded" title="Edit"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteModal({ isOpen: true, id: item.id, type: 'in', title: 'Hapus data ini?' })} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination In */}
            {!isLoading && filteredIn.length > 0 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
                <span>{((pageIn - 1) * rowsPerPage) + 1}-{Math.min(pageIn * rowsPerPage, filteredIn.length)} dari {filteredIn.length}</span>
                <div className="flex gap-1">
                  <button disabled={pageIn === 1} onClick={() => setPageIn(p => p - 1)} className="px-2 py-1 border border-gray-200 rounded disabled:opacity-50 bg-white">Prev</button>
                  <button disabled={pageIn === totalPagesIn} onClick={() => setPageIn(p => p + 1)} className="px-2 py-1 border border-gray-200 rounded disabled:opacity-50 bg-white">Next</button>
                </div>
              </div>
            )}
          </div>

          {/* PENGELUARAN TABLE */}
          <div className="border border-gray-100 rounded-xl overflow-hidden flex flex-col shadow-sm">
            <div className="bg-red-50/50 p-4 border-b border-red-100 flex justify-between items-center">
              <h3 className="font-semibold text-red-800 flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5" /> Pengeluaran
              </h3>
              <Button size="sm" onClick={openAddOut} className="h-8 gap-1 bg-red-600 hover:bg-red-700 text-white">
                <Plus className="w-3.5 h-3.5" /> Tambah
              </Button>
            </div>
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tgl</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Keterangan</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nominal</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Bukti</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-500">Memuat...</td></tr>
                  ) : paginatedOut.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400">Tidak ada pengeluaran</td></tr>
                  ) : (
                    paginatedOut.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(item.tanggal)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 line-clamp-2">{item.keterangan || '-'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-600 whitespace-nowrap">-{formatCurrency(item.nominal)}</td>
                        <td className="px-4 py-3 text-center">
                          {item.bukti_foto ? (
                            <a href={item.bukti_foto} target="_blank" rel="noopener noreferrer" className="inline-flex text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded" title="Lihat Bukti">
                              <FileText className="w-4 h-4" />
                            </a>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => openEditOut(item)} className="p-1.5 text-gray-400 hover:text-amber-600 rounded" title="Edit"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteModal({ isOpen: true, id: item.id, type: 'out', title: 'Hapus data ini?' })} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Out */}
            {!isLoading && filteredOut.length > 0 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
                <span>{((pageOut - 1) * rowsPerPage) + 1}-{Math.min(pageOut * rowsPerPage, filteredOut.length)} dari {filteredOut.length}</span>
                <div className="flex gap-1">
                  <button disabled={pageOut === 1} onClick={() => setPageOut(p => p - 1)} className="px-2 py-1 border border-gray-200 rounded disabled:opacity-50 bg-white">Prev</button>
                  <button disabled={pageOut === totalPagesOut} onClick={() => setPageOut(p => p + 1)} className="px-2 py-1 border border-gray-200 rounded disabled:opacity-50 bg-white">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal In */}
      {modalIn.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{modalIn.data ? 'Edit Pemasukan' : 'Tambah Pemasukan'}</h2>
              <button onClick={() => setModalIn({ isOpen: false, data: null })} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveIn} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={tanggalIn}
                  onChange={e => setTanggalIn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                <input 
                  type="text" 
                  required
                  value={nominalIn}
                  onChange={e => setNominalIn(formatNumberInput(e.target.value))}
                  placeholder="Contoh: 1.500.000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-emerald-600" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea 
                  required
                  rows={2}
                  value={keteranganIn}
                  onChange={e => setKeteranganIn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bukti Transfer</label>
                <input 
                  type="file" 
                  ref={fileInputInRef}
                  onChange={e => setFileIn(e.target.files?.[0] || null)}
                  className="hidden" 
                  accept="image/*,.pdf"
                />
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => fileInputInRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Upload
                  </Button>
                  <span className="text-sm text-gray-500 truncate">{fileIn?.name || (modalIn.data?.bukti_tf ? 'File tersimpan' : 'Pilih file')}</span>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setModalIn({ isOpen: false, data: null })}>Batal</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Out */}
      {modalOut.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{modalOut.data ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h2>
              <button onClick={() => setModalOut({ isOpen: false, data: null })} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveOut} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={tanggalOut}
                  onChange={e => setTanggalOut(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                <input 
                  type="text" 
                  required
                  value={nominalOut}
                  onChange={e => setNominalOut(formatNumberInput(e.target.value))}
                  placeholder="Contoh: 1.500.000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-red-600" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea 
                  required
                  rows={2}
                  value={keteranganOut}
                  onChange={e => setKeteranganOut(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bukti Foto / Nota</label>
                <input 
                  type="file" 
                  ref={fileInputOutRef}
                  onChange={e => setFileOut(e.target.files?.[0] || null)}
                  className="hidden" 
                  accept="image/*,.pdf"
                />
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => fileInputOutRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Upload
                  </Button>
                  <span className="text-sm text-gray-500 truncate">{fileOut?.name || (modalOut.data?.bukti_foto ? 'File tersimpan' : 'Pilih file')}</span>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setModalOut({ isOpen: false, data: null })}>Batal</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: '', type: 'in', title: '' })}
        onConfirm={async () => {
          if (deleteModal.type === 'in') {
            await delIn.mutateAsync(deleteModal.id);
          } else {
            await delOut.mutateAsync(deleteModal.id);
          }
        }}
        title={deleteModal.title}
      />
      </div>

      <div className="hidden print:block bg-white text-[12pt] relative z-0" id="report-doc">
        {/* Watermark & footer — absolute on screen, fixed on print */}
        <img className="print-wm-tl" src="/watermark.png" alt="" />
        <img className="print-wm-br" src="/watermark.png" alt="" />
        <div className="print-page-footer">
          <div className="text-right text-[7.5pt] text-gray-700 leading-tight flex flex-col gap-0.5 ml-auto">
            <div className="flex items-center justify-end gap-1.5">
              <span>HO: Citra Grand City – Tropical Valley - SB06/11 - Palembang – Sumatera Selatan</span>
              <MapPin className="w-3 h-3 text-red-500" />
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span>RO: Jl. Bratang Gede I No. 8 – Surabaya – Jawa Timur</span>
              <MapPin className="w-3 h-3 text-red-500" />
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span>+62-823-3587-8789, +62-857-3292-9919</span>
              <Phone className="w-3 h-3 text-green-600" />
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span>morganpowerindo@gmail.com</span>
              <Mail className="w-3 h-3 text-blue-500" />
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span>morgan_powerindo</span>
              <AtSign className="w-3 h-3 text-pink-600" />
            </div>
          </div>
        </div>
        <table className="w-full" style={{borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <td style={{padding:0}}>
                <div className="px-10 pt-8 pb-4">
                  {/* Row 1: Logo + Company name kiri, Badge kanan — same as Quotation */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      {company?.logo_url ? (
                        <div className="w-24 h-24 overflow-hidden flex items-center justify-center">
                          <img src={getDriveImageUrl(company.logo_url)} alt="Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 border border-gray-200 rounded flex items-center justify-center text-gray-300 text-xs font-medium">Logo</div>
                      )}
                      <div>
                        <h1 className="text-blue-900 font-bold tracking-wide leading-tight text-[12pt]">{company?.name || 'Perusahaan'}</h1>
                        {company?.address && <p className="text-gray-600 mt-0.5 text-[10pt]">{company.address}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-blue-800 text-white font-bold text-[8pt] uppercase tracking-widest px-3 py-1.5 rounded">Belanja Dapur</span>
                    </div>
                  </div>
                  {/* Row 2: Judul Laporan — tengah */}
                  <div className="text-center mt-6 mb-1">
                    <h2 className="text-gray-900 font-bold text-[16pt] uppercase tracking-wider">LAPORAN MUTASI KAS</h2>
                  </div>
                  {/* Row 3: Tanggal — tengah */}
                  <div className="text-center mb-4">
                    <p className="text-gray-600 text-[11pt]">
                      {dateFrom && dateTo ? `${formatDate(dateFrom)} \u2013 ${formatDate(dateTo)}` : 
                       dateFrom ? `Dari ${formatDate(dateFrom)}` : 
                       dateTo ? `Sampai ${formatDate(dateTo)}` : 'Semua Waktu'}
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{padding:0}}>
                <div className="px-10 pb-8 space-y-8">
                  {/* Pemasukan Table */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2 uppercase tracking-wide text-sm">Tabel Pemasukan</h3>
                    <table className="w-full text-left border-collapse border border-black text-sm">
                      <thead className="bg-blue-900 text-white">
                        <tr>
                          <th className="py-2.5 px-3 border-x border-black font-semibold w-[15%]">Tanggal</th>
                          <th className="py-2.5 px-3 border-x border-black font-semibold">Keterangan</th>
                          <th className="py-2.5 px-3 border-x border-black font-semibold text-center w-[20%]">Dokumen</th>
                          <th className="py-2.5 px-3 border-x border-black font-semibold text-right w-[20%]">Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {filteredIn.length === 0 ? (
                          <tr><td colSpan={4} className="py-4 text-center text-gray-500 italic">Tidak ada pemasukan.</td></tr>
                        ) : (
                          filteredIn.map((item: any) => (
                            <tr key={item.id} className="bg-white">
                              <td className="py-3 px-3 border-x border-black align-top">{formatDate(item.tanggal)}</td>
                              <td className="py-3 px-3 border-x border-black align-top">{item.keterangan || '-'}</td>
                              <td className="py-3 px-3 border-x border-black align-middle text-center">
                                {item.bukti_tf ? (
                                  <img src={getDriveImageUrl(item.bukti_tf)} alt="Bukti" style={{width:'113px', height:'76px', objectFit:'contain'}} className="mx-auto rounded shadow-sm border border-gray-200" referrerPolicy="no-referrer" />
                                ) : <span className="text-gray-400 italic text-xs">-</span>}
                              </td>
                              <td className="py-3 px-3 border-x border-black align-top text-right text-emerald-700 font-medium">{formatCurrency(item.nominal)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot className="border-t border-black bg-gray-50 font-semibold break-inside-avoid">
                        <tr>
                          <td colSpan={3} className="py-2.5 px-3 border-x border-black text-right">TOTAL PEMASUKAN</td>
                          <td className="py-2.5 px-3 border-x border-black text-right text-emerald-700">{formatCurrency(totalIn)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Pengeluaran Table */}
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2 uppercase tracking-wide text-sm">Tabel Pengeluaran</h3>
                    <table className="w-full text-left border-collapse border border-black text-sm">
                      <thead className="bg-blue-900 text-white">
                        <tr>
                          <th className="py-2.5 px-3 border-x border-black font-semibold w-[15%]">Tanggal</th>
                          <th className="py-2.5 px-3 border-x border-black font-semibold">Keterangan</th>
                          <th className="py-2.5 px-3 border-x border-black font-semibold text-center w-[20%]">Dokumen</th>
                          <th className="py-2.5 px-3 border-x border-black font-semibold text-right w-[20%]">Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {filteredOut.length === 0 ? (
                          <tr><td colSpan={4} className="py-4 text-center text-gray-500 italic">Tidak ada pengeluaran.</td></tr>
                        ) : (
                          filteredOut.map((item: any) => (
                            <tr key={item.id} className="bg-white">
                              <td className="py-3 px-3 border-x border-black align-top">{formatDate(item.tanggal)}</td>
                              <td className="py-3 px-3 border-x border-black align-top">{item.keterangan || '-'}</td>
                              <td className="py-3 px-3 border-x border-black align-middle text-center">
                                {item.bukti_foto ? (
                                  <img src={getDriveImageUrl(item.bukti_foto)} alt="Bukti" style={{width:'113px', height:'76px', objectFit:'contain'}} className="mx-auto rounded shadow-sm border border-gray-200" referrerPolicy="no-referrer" />
                                ) : <span className="text-gray-400 italic text-xs">-</span>}
                              </td>
                              <td className="py-3 px-3 border-x border-black align-top text-right text-red-700 font-medium">{formatCurrency(item.nominal)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot className="border-t border-black bg-gray-50 font-semibold break-inside-avoid">
                        <tr>
                          <td colSpan={3} className="py-2.5 px-3 border-x border-black text-right">TOTAL PENGELUARAN</td>
                          <td className="py-2.5 px-3 border-x border-black text-right text-red-700">{formatCurrency(totalOut)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Summary Box */}
                  <div className="flex justify-end pt-4 pb-24 break-inside-avoid">
                    <table className="w-1/2 text-left border-collapse border border-black text-sm">
                      <tbody>
                        <tr className="bg-gray-50">
                          <td className="py-3 px-4 border-black border-r font-bold uppercase tracking-wide text-gray-800">Sisa Saldo</td>
                          <td className="py-3 px-4 text-right font-bold text-lg text-blue-900">{formatCurrency(balance)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Modal In */}
      {modalIn.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{modalIn.data ? 'Edit Pemasukan' : 'Tambah Pemasukan'}</h2>
              <button onClick={() => setModalIn({ isOpen: false, data: null })} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveIn} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={tanggalIn}
                  onChange={e => setTanggalIn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                <input 
                  type="text" 
                  required
                  value={nominalIn}
                  onChange={e => setNominalIn(formatNumberInput(e.target.value))}
                  placeholder="Contoh: 1.500.000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-emerald-600" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea 
                  required
                  rows={2}
                  value={keteranganIn}
                  onChange={e => setKeteranganIn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bukti Transfer</label>
                <input 
                  type="file" 
                  ref={fileInputInRef}
                  onChange={e => setFileIn(e.target.files?.[0] || null)}
                  className="hidden" 
                  accept="image/*,.pdf"
                />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" onClick={() => fileInputInRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> {modalIn.data?.bukti_tf ? 'Upload Baru' : 'Upload'}
                    </Button>
                    <span className="text-sm text-gray-500 truncate">{fileIn?.name || (modalIn.data?.bukti_tf ? '' : 'Pilih file')}</span>
                  </div>
                  {!fileIn && modalIn.data?.bukti_tf && (
                    <a href={modalIn.data.bukti_tf} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 w-fit">
                      <FileText className="w-3 h-3" /> Lihat dokumen tersimpan
                    </a>
                  )}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setModalIn({ isOpen: false, data: null })}>Batal</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Out */}
      {modalOut.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{modalOut.data ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h2>
              <button onClick={() => setModalOut({ isOpen: false, data: null })} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveOut} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input 
                  type="date" 
                  required
                  value={tanggalOut}
                  onChange={e => setTanggalOut(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                <input 
                  type="text" 
                  required
                  value={nominalOut}
                  onChange={e => setNominalOut(formatNumberInput(e.target.value))}
                  placeholder="Contoh: 1.500.000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-red-600" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea 
                  required
                  rows={2}
                  value={keteranganOut}
                  onChange={e => setKeteranganOut(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bukti Foto / Nota</label>
                <input 
                  type="file" 
                  ref={fileInputOutRef}
                  onChange={e => setFileOut(e.target.files?.[0] || null)}
                  className="hidden" 
                  accept="image/*,.pdf"
                />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" onClick={() => fileInputOutRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> {modalOut.data?.bukti_foto ? 'Upload Baru' : 'Upload'}
                    </Button>
                    <span className="text-sm text-gray-500 truncate">{fileOut?.name || (modalOut.data?.bukti_foto ? '' : 'Pilih file')}</span>
                  </div>
                  {!fileOut && modalOut.data?.bukti_foto && (
                    <a href={modalOut.data.bukti_foto} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 w-fit">
                      <FileText className="w-3 h-3" /> Lihat dokumen tersimpan
                    </a>
                  )}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setModalOut({ isOpen: false, data: null })}>Batal</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
