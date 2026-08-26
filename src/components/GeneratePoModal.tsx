import { useState, useMemo, useRef } from 'react';
import { Loader2, Upload, X, FileText } from 'lucide-react';
import Modal from '@/components/Modal';
import { Button } from '@/components/ui';
import {
  useNeracaItems, useVendorDiscounts, useGetNextPoNumber,
  useSavePurchaseOrder, useCustomers, usePics, useSavePoIn, useUploadFile
} from '@/hooks/useData';
import type { NeracaQuotation } from '@/types';

interface GeneratePoModalProps {
  quotation: NeracaQuotation | null;
  onClose: () => void;
  onSuccess: (quotation: NeracaQuotation) => void;
  skipPoInForm?: boolean;
}

export default function GeneratePoModal({ quotation, onClose, onSuccess, skipPoInForm }: GeneratePoModalProps) {
  const { data: items = [], isLoading: loadingItems } = useNeracaItems(quotation?.neraca_id || '');
  const { data: vds = [], isLoading: loadingVds } = useVendorDiscounts(quotation?.neraca_id || '');
  const { data: customers = [] } = useCustomers();
  const { data: pics = [] } = usePics();
  const getNextPoNumber = useGetNextPoNumber();
  const savePurchaseOrder = useSavePurchaseOrder();
  const savePoIn = useSavePoIn();
  const uploadFile = useUploadFile();

  const [isGenerating, setIsGenerating] = useState(false);

  // PO In form fields
  const [poInNumber, setPoInNumber] = useState('');
  const [judul, setJudul] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [alamatType, setAlamatType] = useState<'office' | 'warehouse'>('office');
  const [customAlamat, setCustomAlamat] = useState('');
  const [picId, setPicId] = useState('');
  const [tanggalBatas, setTanggalBatas] = useState('');
  const [poInFiles, setPoInFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customer = useMemo(() =>
    customers.find(c => c.id === quotation?.customer_id),
    [customers, quotation?.customer_id]
  );

  const customerPics = useMemo(() =>
    pics.filter(p => p.customer_id === quotation?.customer_id),
    [pics, quotation?.customer_id]
  );

  const alamatOptions = useMemo(() => {
    if (!customer) return [];
    const opts: { label: string; value: string; key: 'office' | 'warehouse' }[] = [];
    if (customer.office_address) opts.push({ label: 'Alamat Kantor', value: customer.office_address, key: 'office' });
    if (customer.warehouse_address) opts.push({ label: 'Alamat Gudang', value: customer.warehouse_address, key: 'warehouse' });
    return opts;
  }, [customer]);

  const selectedAlamat = useMemo(() => {
    const opt = alamatOptions.find(o => o.key === alamatType);
    return opt ? opt.value : customAlamat;
  }, [alamatType, alamatOptions, customAlamat]);

  const uniqueVendors = useMemo(() => {
    if (!quotation) return [];
    const vendorMap = new Map<string, { id: string, name: string }>();
    items.forEach(item => {
      if (item.vendor_id && item.vendor_name) {
        vendorMap.set(item.vendor_id, { id: item.vendor_id, name: item.vendor_name });
      }
    });
    return Array.from(vendorMap.values());
  }, [items, quotation]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPoInFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setPoInFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = async () => {
    if (!quotation) return;
    if (!skipPoInForm && (!poInNumber.trim() || !judul.trim() || !picId || !tanggalBatas)) {
      alert('Harap lengkapi semua field yang wajib diisi (Nomor PO Customer, Judul PO, PIC, dan Batas Waktu Pengerjaan).');
      return;
    }

    setIsGenerating(true);

    try {
      if (!skipPoInForm) {
        // 1. Upload PO In documents
        const uploadedDocs: { name: string; url: string }[] = [];
        for (const file of poInFiles) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
          });
          const res = await uploadFile.mutateAsync({ filename: file.name, mimeType: file.type, base64 });
          const fileUrl = typeof res === 'string' ? res : res?.url;
          if (fileUrl) uploadedDocs.push({ name: file.name, url: fileUrl });
        }

        // 2. Save PO In record
        const selectedPic = pics.find(p => p.id === picId);
        const poInId = `POIN-${Date.now()}`;
        await savePoIn.mutateAsync({
          id: poInId,
          quotation_id: quotation.id,
          neraca_id: quotation.neraca_id,
          customer_id: quotation.customer_id,
          customer_name: quotation.customer_name,
          po_in_number: poInNumber,
          judul,
          tanggal,
          alamat_pengiriman: selectedAlamat || customAlamat,
          pic_id: picId,
          pic_name: selectedPic?.name || '',
          tanggal_batas: tanggalBatas,
          dokumen: JSON.stringify(uploadedDocs),
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        });
      }

      // 3. Create PO Out records (one per vendor)
      const nextNumRes = await getNextPoNumber.mutateAsync();
      const parts = String(nextNumRes).split('/');
      let currentCounter = parseInt(parts[0], 10);
      const prefix = parts.slice(1).join('/');

      for (const vendor of uniqueVendors) {
        const poNumber = `${currentCounter}/${prefix}`;
        currentCounter++;

        const vItems = items.filter(i => i.vendor_id === vendor.id);
        const vd = vds.find(d => d.vendor_id === vendor.id);

        const jumlahItem = vItems.length;
        let totalBeli = 0;
        let totalDiscVal = 0;

        vItems.forEach(item => {
          const hb = Number(item.harga_beli) || 0;
          const qty = Number(item.qty) || 1;
          totalBeli += hb * qty;
        });

        if (vd) {
          if (vd.discount_pct > 0) totalDiscVal = totalBeli * (vd.discount_pct / 100);
          else if (vd.discount_cash > 0) totalDiscVal = vd.discount_cash;
        }

        const total_nilai = totalBeli - totalDiscVal;

        const docs: any[] = [];
        // Removed auto-pulling documents from item.documents per user request

        const poId = `PO-${Date.now()}-${currentCounter}`;
        await savePurchaseOrder.mutateAsync({
          id: poId,
          po_number: poNumber,
          neraca_id: quotation.neraca_id,
          quotation_id: quotation.id,
          vendor_id: vendor.id,
          vendor_name: vendor.name,
          jumlah_item: jumlahItem,
          total_nilai,
          dokumen: JSON.stringify(docs),
          status: 'Active',
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        });
      }

      onSuccess(quotation);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan saat membuat PO');
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = loadingItems || loadingVds;

  return (
    <Modal isOpen={!!quotation} onClose={onClose} title="Buat PO Out" size="lg">
      <div className="space-y-5">
        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : (
          <>
            {/* Vendor Summary */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-800 mb-1.5">PO Out akan dibuat untuk {uniqueVendors.length} vendor:</p>
              {uniqueVendors.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-0.5">
                  {uniqueVendors.map(v => <li key={v.id}>{v.name}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-amber-600">⚠ Tidak ada vendor yang ditemukan pada neraca ini.</p>
              )}
            </div>

            {/* PO In Form */}
            {!skipPoInForm && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800">Data PO In (dari Customer)</h3>
                <p className="text-xs text-gray-500 mt-0.5">Quotation: <strong>{quotation?.quotation_number}</strong> — Customer: <strong>{quotation?.customer_name}</strong></p>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* No PO Customer */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nomor PO Customer <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={poInNumber}
                      onChange={e => setPoInNumber(e.target.value)}
                      placeholder="mis. PO/CUST/0001/VIII/2026"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  {/* Judul PO */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Judul PO <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={judul}
                      onChange={e => setJudul(e.target.value)}
                      placeholder="mis. Pengadaan Peralatan Lab"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Tanggal */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal PO</label>
                    <input
                      type="date"
                      value={tanggal}
                      onChange={e => setTanggal(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  {/* Batas Pengerjaan */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Batas Waktu Pengerjaan <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={tanggalBatas}
                      onChange={e => setTanggalBatas(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                {/* Alamat */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Alamat Pengiriman</label>
                  {alamatOptions.length > 0 ? (
                    <div className="space-y-2">
                      {alamatOptions.map(opt => (
                        <label key={opt.key} className="flex items-start gap-2 cursor-pointer p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                          <input
                            type="radio"
                            name="alamat"
                            value={opt.key}
                            checked={alamatType === opt.key}
                            onChange={() => setAlamatType(opt.key)}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div>
                            <p className="text-xs font-medium text-gray-700">{opt.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{opt.value}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={customAlamat}
                      onChange={e => setCustomAlamat(e.target.value)}
                      placeholder="Masukkan alamat pengiriman..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                  )}
                </div>

                {/* PIC */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">PIC Customer <span className="text-red-500">*</span></label>
                  <select
                    value={picId}
                    onChange={e => setPicId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">-- Pilih PIC --</option>
                    {customerPics.map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.position ? `(${p.position})` : ''}</option>
                    ))}
                  </select>
                  {customerPics.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">⚠ Belum ada PIC untuk customer ini. Tambahkan di menu Customers.</p>
                  )}
                </div>

                {/* Upload Dokumen */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dokumen PO In</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Klik untuk unggah (bisa lebih dari satu)</p>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                  </div>
                  {poInFiles.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {poInFiles.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded px-2 py-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          <span className="flex-1 truncate">{f.name}</span>
                          <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="secondary" onClick={onClose} disabled={isGenerating}>Batal</Button>
              <Button onClick={handleGenerate} loading={isGenerating} disabled={uniqueVendors.length === 0}>
                {skipPoInForm ? `Buat ${uniqueVendors.length} PO Out` : `Buat PO In + ${uniqueVendors.length} PO Out`}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
