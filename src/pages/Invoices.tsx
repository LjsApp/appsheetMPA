import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Receipt, Plus, X, Trash2, Printer, Pencil, SendHorizonal, BadgeCheck, HandCoins } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import TableToolbar from '@/components/TableToolbar';
import { useInvoices, useSaveInvoice, useDeleteInvoice, usePoIns, useCustomers, useCompany, fetchApi, useSaveNotification, useUsers, useUploadFile } from '@/hooks/useData';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export default function Invoices() {
  const navigate = useNavigate();
  const { data: invoices = [], isLoading: loadingInv } = useInvoices();
  const { data: poIns = [], isLoading: loadingPo } = usePoIns();
  const { data: customers = [] } = useCustomers();
  const { data: company } = useCompany();
  const { data: users = [] } = useUsers();
  const saveInvoice = useSaveInvoice();
  const deleteInvoice = useDeleteInvoice();
  const saveNotification = useSaveNotification();
  const uploadFile = useUploadFile();
  const user = useAuthStore(state => state.user);

  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState<{ isOpen: boolean; invoice: typeof invoices[0] | null }>({ isOpen: false, invoice: null });
  
  // Payment Modal States
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; invoice: typeof invoices[0] | null }>({ isOpen: false, invoice: null });
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('Semua');
  const [selectedPoId, setSelectedPoId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [addressOptions, setAddressOptions] = useState<{ label: string; value: string }[]>([]);
  const [addressChoice, setAddressChoice] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; title: string }>({ isOpen: false, id: null, title: '' });

  const isLoading = loadingInv || loadingPo;
  const [requestingVerificationId, setRequestingVerificationId] = useState<string | null>(null);

  // auto-fill address when PO In selected
  const handlePoSelect = async (poId: string) => {
    setSelectedPoId(poId);
    if (!poId) { setDeliveryAddress(''); setAddressOptions([]); setAddressChoice(''); return; }
    const po = poIns.find(p => p.id === poId);
    if (po) {
      const cust = customers.find(c => 
        (po.customer_id && c.id === po.customer_id) ||
        (po.customer_name && c.company_name === po.customer_name)
      );
      const opts: { label: string; value: string }[] = [];
      if (cust?.office_address) opts.push({ label: 'Alamat Kantor', value: cust.office_address });
      if (cust?.warehouse_address) opts.push({ label: 'Alamat Gudang', value: cust.warehouse_address });
      setAddressOptions(opts);
      const firstAddr = opts[0]?.value || '';
      setAddressChoice(firstAddr);
      setDeliveryAddress(firstAddr);
    }
    // generate invoice number
    try {
      const nextNum = await fetchApi('getNextInvoiceNumber');
      setInvoiceNumber(nextNum);
    } catch {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const sn = company?.short_name || 'MPA';
      setInvoiceNumber(`1/INV/${sn}/${mm}.${yyyy}`);
    }
  };

  const handleCreate = async () => {
    if (!selectedPoId || !invoiceNumber) return;
    const po = poIns.find(p => p.id === selectedPoId);
    if (!po) return;
    setIsCreating(true);
    try {
      const data = {
        id: `INV-${Date.now()}`,
        po_in_id: po.id,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        customer_id: po.customer_id,
        delivery_address: deliveryAddress,
        created_by: user?.id || '',
        verification_status: 'Perlu Verifikasi' as any,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };
      await saveInvoice.mutateAsync(data);

      setShowModal(false);
      resetModal();
    } catch {
      alert('Gagal membuat Invoice');
    } finally {
      setIsCreating(false);
    }
  };


  const handlePaymentSubmit = async () => {
    if (!paymentModal.invoice) return;
    setIsCreating(true);
    try {
      let fileUrl = '';
      if (paymentFile) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(paymentFile);
        });
        const res = await uploadFile.mutateAsync({ filename: paymentFile.name, mimeType: paymentFile.type, base64 });
        fileUrl = typeof res === 'string' ? res : (res as any)?.url || '';
      }

      await saveInvoice.mutateAsync({
        ...paymentModal.invoice,
        payment_status: 'Lunas',
        payment_date: paymentDate,
        payment_proof_url: fileUrl || paymentModal.invoice.payment_proof_url,
        payment_note: paymentNote,
        updated_date: new Date().toISOString(),
      });
      setPaymentModal({ isOpen: false, invoice: null });
      setPaymentFile(null);
      setPaymentNote('');
    } catch {
      alert('Gagal menandai lunas');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editModal.invoice) return;
    setIsCreating(true);
    try {
      await saveInvoice.mutateAsync({
        ...editModal.invoice,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        delivery_address: deliveryAddress,
        updated_date: new Date().toISOString(),
      });

      setEditModal({ isOpen: false, invoice: null });
      resetModal();
    } catch {
      alert('Gagal mengupdate Invoice');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRequestVerification = async (invoice: typeof invoices[0]) => {
    if (!window.confirm(`Minta verifikasi pimpinan untuk Invoice: ${invoice.invoice_number}?`)) return;
    setRequestingVerificationId(invoice.id);
    try {
      await saveInvoice.mutateAsync({
        ...invoice,
        verification_status: 'Menunggu Verifikasi' as any,
        updated_date: new Date().toISOString()
      });
    } catch (e) {
      alert('Gagal mengubah status Invoice');
      return;
    }

    try {
      await saveNotification.mutateAsync({
        id: Date.now().toString(),
        from_user_id: user?.id || 'system',
        from_user_name: user?.name || 'System',
        to_user_id: 'pimpinan',
        type: 'verification_request',
        ref_type: 'invoice',
        ref_id: invoice.id,
        ref_number: invoice.invoice_number,
        message: `User ${user?.name} meminta verifikasi Invoice: ${invoice.invoice_number}`,
        is_read: false,
        created_date: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Notifikasi gagal dikirim, tapi status Invoice sudah diubah:', e);
    } finally {
      setRequestingVerificationId(null);
    }
  };

  const openEdit = (inv: typeof invoices[0]) => {
    setInvoiceNumber(inv.invoice_number);
    setInvoiceDate(inv.invoice_date ? new Date(inv.invoice_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setDeliveryAddress(inv.delivery_address || '');
    // Rebuild address options from customer
    const po = poIns.find(p => p.id === inv.po_in_id);
    const cust = customers.find(c => c.id === po?.customer_id || c.company_name === po?.customer_name);
    const opts: { label: string; value: string }[] = [];
    if (cust?.office_address) opts.push({ label: 'Alamat Kantor', value: cust.office_address });
    if (cust?.warehouse_address) opts.push({ label: 'Alamat Gudang', value: cust.warehouse_address });
    setAddressOptions(opts);
    // match saved address to option
    const matched = opts.find(o => o.value === inv.delivery_address);
    setAddressChoice(matched ? matched.value : inv.delivery_address || '');
    setEditModal({ isOpen: true, invoice: inv });
  };

  const resetModal = () => {
    setSelectedPoId('');
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDeliveryAddress('');
    setAddressOptions([]);
    setAddressChoice('');
  };

  const dataWithDetails = useMemo(() => {
    return invoices.map(inv => {
      const po = poIns.find(p => p.id === inv.po_in_id);
      return {
        ...inv,
        customer_name: po?.customer_name || '-',
        no_po: po?.po_in_number || '-',
        judul_po: po?.judul || '-',
      };
    }).filter(item => {
      if (paymentStatusFilter !== 'Semua') {
        const isLunas = item.payment_status === 'Lunas';
        if (paymentStatusFilter === 'Lunas' && !isLunas) return false;
        if (paymentStatusFilter === 'Belum Dibayar' && isLunas) return false;
      }
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.invoice_number?.toLowerCase().includes(term) ||
        item.customer_name.toLowerCase().includes(term) ||
        item.no_po.toLowerCase().includes(term)
      );
    });
  }, [invoices, poIns, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(dataWithDetails.length / rowsPerPage));
  const paginatedData = dataWithDetails.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const selectedPo = poIns.find(p => p.id === selectedPoId);

  const ModalContent = ({ isEdit }: { isEdit: boolean }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit Invoice' : 'Tambah Invoice'}</h2>
          <button onClick={() => { isEdit ? setEditModal({ isOpen: false, invoice: null }) : setShowModal(false); resetModal(); }} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Pilih PO In</label>
              <select
                value={selectedPoId}
                onChange={e => handlePoSelect(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="">-- Pilih PO In --</option>
                {poIns.map(po => {
                  const isUsed = invoices.some(inv => inv.po_in_id === po.id);
                  return (
                    <option key={po.id} value={po.id} disabled={isUsed}>
                      {po.po_in_number || po.id} — {po.customer_name} {isUsed ? '(Sudah dibuat)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {(isEdit || selectedPoId) && (
            <>
              {!isEdit && selectedPo && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                  <div><span className="font-medium">Customer:</span> {selectedPo.customer_name}</div>
                  <div><span className="font-medium">Judul:</span> {selectedPo.judul}</div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Nomor Invoice</label>
                <input
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="1/INV/MPA/08.2026"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Tanggal Invoice</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Alamat Pengiriman Invoice</label>
                {addressOptions.length > 0 ? (
                  <div className="space-y-2">
                    {addressOptions.map(opt => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          addressChoice === opt.value
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="address_choice"
                          value={opt.value}
                          checked={addressChoice === opt.value}
                          onChange={() => { setAddressChoice(opt.value); setDeliveryAddress(opt.value); }}
                          className="mt-0.5 accent-blue-600 shrink-0"
                        />
                        <div>
                          <div className="text-xs font-semibold text-gray-800">{opt.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{opt.value}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    placeholder="Alamat pengiriman..."
                  />
                )}
              </div>
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => { isEdit ? setEditModal({ isOpen: false, invoice: null }) : setShowModal(false); resetModal(); }}>Batal</Button>
          <Button
            variant="primary"
            onClick={isEdit ? handleEdit : handleCreate}
            disabled={(!isEdit && !selectedPoId) || !invoiceNumber || isCreating}
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {isEdit ? 'Simpan' : 'Buat Invoice'}
          </Button>
        </div>
      </div>
    </div>
  );


  const PaymentModalContent = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Tandai Invoice Lunas</h2>
          <button onClick={() => { setPaymentModal({ isOpen: false, invoice: null }); setPaymentFile(null); setPaymentNote(''); }} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-green-800 mb-4">
            <div><span className="font-medium">No Invoice:</span> {paymentModal.invoice?.invoice_number}</div>
            <div><span className="font-medium">Customer:</span> {paymentModal.invoice?.customer_name}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Tanggal Pembayaran</label>
            <input
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Bukti Transfer (opsional)</label>
            <input
              type="file"
              onChange={e => setPaymentFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              accept="image/*,.pdf"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Catatan Pembayaran (opsional)</label>
            <textarea
              value={paymentNote}
              onChange={e => setPaymentNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="Catatan..."
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => { setPaymentModal({ isOpen: false, invoice: null }); setPaymentFile(null); setPaymentNote(''); }}>Batal</Button>
          <Button
            variant="primary"
            onClick={handlePaymentSubmit}
            disabled={isCreating}
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Simpan Pembayaran
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice"
        subtitle={`${invoices.length} Invoice`}
        action={
          <Button variant="primary" onClick={() => { resetModal(); setShowModal(true); }}>
            <Plus className="w-4 h-4" />
            Tambah Invoice
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 gap-4">
          <TableToolbar
            search={searchTerm}
            onSearchChange={v => { setSearchTerm(v); setCurrentPage(1); }}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={v => { setRowsPerPage(v); setCurrentPage(1); }}
            totalRows={dataWithDetails.length}
            searchPlaceholder="Cari No Invoice, Customer..."
          />
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm font-medium text-gray-700"
          >
            <option value="Semua">Semua Status Bayar</option>
            <option value="Belum Dibayar">Belum Dibayar</option>
            <option value="Lunas">Lunas</option>
          </select>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : paginatedData.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500">
            <Receipt className="w-12 h-12 text-gray-300 mb-3" />
            <p>Belum ada data Invoice.</p>
            <p className="text-sm mt-1">Klik tombol "Tambah Invoice" untuk membuat Invoice baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">No. Invoice</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tanggal Invoice</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Alamat Pengiriman</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status Verifikasi</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status Bayar</th>
                  {user?.is_super_admin && <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dikerjakan Oleh</th>}
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 align-top border-r border-gray-100">
                      <div className="font-semibold text-gray-900">{item.customer_name}</div>
                      <div className="font-mono text-xs text-gray-500 mt-0.5">{item.no_po}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-blue-700">{item.invoice_number}</td>
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap text-xs">{formatDate(item.invoice_date)}</td>
                    <td className="px-5 py-4 align-top max-w-[200px] truncate text-gray-900" title={item.delivery_address}>{item.delivery_address || '-'}</td>
                    <td className="px-5 py-4 align-top">
                      {item.verification_status === 'Terverifikasi' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          Terverifikasi
                        </span>
                      ) : item.verification_status === 'Ditolak' ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex w-max items-center px-2 py-1 rounded-md text-[11px] font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20" title={item.verification_note}>
                            Ditolak
                          </span>
                          <span className="text-[10px] text-gray-500 italic max-w-[120px] truncate" title={item.verification_note}>Note: {item.verification_note}</span>
                        </div>
                      ) : item.verification_status === 'Menunggu Verifikasi' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          Menunggu Verifikasi
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20">
                          Perlu Verifikasi
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 align-top">
                      {item.payment_status === 'Lunas' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                          <BadgeCheck className="w-3 h-3" />
                          Lunas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20 whitespace-nowrap">
                          Belum Dibayar
                        </span>
                      )}
                    </td>
                    {user?.is_super_admin && <td className="px-5 py-4 align-top italic text-gray-500">{users.find(u => u.id === item.created_by)?.name || item.created_by || '-'}</td>}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.verification_status === 'Terverifikasi' && item.payment_status !== 'Lunas' && (
                          <button
                            onClick={() => setPaymentModal({ isOpen: true, invoice: item })}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors whitespace-nowrap"
                            title="Tandai Lunas"
                          >
                            <HandCoins className="w-3 h-3" />
                            Tandai Lunas
                          </button>
                        )}
                        {(item.verification_status === 'Perlu Verifikasi' || item.verification_status === 'Ditolak') && (
                          <button
                            onClick={() => handleRequestVerification(item)}
                            disabled={requestingVerificationId === item.id}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors whitespace-nowrap"
                            title="Minta Verifikasi"
                          >
                            {requestingVerificationId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <SendHorizonal className="w-3 h-3" />}
                            Minta Verifikasi
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/invoices/${item.id}`)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Cetak / Detail Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Edit Invoice"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, id: item.id, title: `Hapus Invoice ${item.invoice_number}` })}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Hapus Invoice"
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

      {showModal && <ModalContent isEdit={false} />}
      {editModal.isOpen && <ModalContent isEdit={true} />}
      {paymentModal.isOpen && <PaymentModalContent />}

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (deleteModal.id) deleteInvoice.mutate(deleteModal.id, { onSuccess: () => setDeleteModal(prev => ({ ...prev, isOpen: false })) });
        }}
        title={deleteModal.title}
        description="Yakin ingin menghapus Invoice ini? Aksi ini tidak dapat dibatalkan."
        isLoading={deleteInvoice.isPending}
      />
    </div>
  );
}
