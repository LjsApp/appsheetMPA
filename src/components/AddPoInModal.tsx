import { useState, useMemo, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import Modal from '@/components/Modal';
import { Button } from '@/components/ui';
import { useNeracaQuotations, useCustomers, usePics, useSavePoIn, useUploadFile } from '@/hooks/useData';

interface AddPoInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  usedQuotationIds: Set<string>;
}

export default function AddPoInModal({ isOpen, onClose, onSuccess, usedQuotationIds }: AddPoInModalProps) {
  const { data: quotations = [] } = useNeracaQuotations();
  const { data: customers = [] } = useCustomers();
  const { data: pics = [] } = usePics();
  const savePoIn = useSavePoIn();
  const uploadFile = useUploadFile();

  const [selectedQtId, setSelectedQtId] = useState('');
  const [poInNumber, setPoInNumber] = useState('');
  const [judul, setJudul] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [alamatType, setAlamatType] = useState<'office' | 'warehouse'>('office');
  const [customAlamat, setCustomAlamat] = useState('');
  const [picId, setPicId] = useState('');
  const [tanggalBatas, setTanggalBatas] = useState('');
  const [poInFiles, setPoInFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedQt = useMemo(() => quotations.find(q => q.id === selectedQtId), [quotations, selectedQtId]);
  
  const customer = useMemo(() =>
    customers.find(c => c.id === selectedQt?.customer_id),
    [customers, selectedQt?.customer_id]
  );

  const customerPics = useMemo(() =>
    pics.filter(p => p.customer_id === selectedQt?.customer_id),
    [pics, selectedQt?.customer_id]
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPoInFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setPoInFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = async () => {
    if (!selectedQt) return;
    if (!poInNumber.trim() || !judul.trim() || !picId || !tanggalBatas) {
      alert('Harap lengkapi field wajib: No PO Customer, Judul PO, PIC, dan Batas Waktu.');
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Upload PO In documents
      const uploadedDocs: { name: string; url: string }[] = [];
      for (const file of poInFiles) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        const res = await uploadFile.mutateAsync({ filename: file.name, mimeType: file.type, base64 });
        if (res?.url) uploadedDocs.push({ name: file.name, url: res.url });
      }

      // 2. Save PO In record
      const selectedPic = pics.find(p => p.id === picId);
      const poInId = `POIN-${Date.now()}`;
      await savePoIn.mutateAsync({
        id: poInId,
        quotation_id: selectedQt.id,
        neraca_id: selectedQt.neraca_id,
        customer_id: selectedQt.customer_id,
        customer_name: selectedQt.customer_name,
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

      if (onSuccess) onSuccess();
      handleClose();
    } catch (e: any) {
      alert('Gagal membuat PO In: ' + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setSelectedQtId('');
    setPoInNumber('');
    setJudul('');
    setPicId('');
    setTanggalBatas('');
    setPoInFiles([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Tambah PO In" size="lg">
      <div className="space-y-4">
        {/* Pilih Quotation */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Pilih Quotation <span className="text-red-500">*</span></label>
          <select
            value={selectedQtId}
            onChange={e => setSelectedQtId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-purple-400"
          >
            <option value="">-- Pilih Quotation --</option>
            {quotations.map(q => {
              const isUsed = usedQuotationIds.has(q.id);
              return (
                <option key={q.id} value={q.id} disabled={isUsed}>
                  {q.quotation_number} — {q.customer_name} {isUsed ? ' ✓ Sudah PO In' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {selectedQt && (
          <div className="border border-gray-200 rounded-xl overflow-hidden mt-4">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">Data PO In (dari Customer)</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nomor PO Customer <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={poInNumber}
                    onChange={e => setPoInNumber(e.target.value)}
                    placeholder="mis. PO/CUST/0001/..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Judul PO <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={judul}
                    onChange={e => setJudul(e.target.value)}
                    placeholder="mis. Pengadaan Peralatan"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal PO</label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={e => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Batas Pengerjaan <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={tanggalBatas}
                    onChange={e => setTanggalBatas(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

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
                          className="mt-0.5"
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
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-purple-400"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">PIC Customer <span className="text-red-500">*</span></label>
                <select
                  value={picId}
                  onChange={e => setPicId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">-- Pilih PIC --</option>
                  {customerPics.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.position ? `(${p.position})` : ''}</option>
                  ))}
                </select>
                {customerPics.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠ Belum ada PIC untuk customer ini.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Dokumen PO In</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">Klik untuk unggah (bisa lebih dari satu)</p>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                </div>
                {poInFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {poInFiles.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded px-2 py-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
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
          <Button variant="secondary" onClick={handleClose} disabled={isGenerating}>Batal</Button>
          <Button onClick={handleGenerate} loading={isGenerating} disabled={!selectedQtId}>
            Simpan PO In
          </Button>
        </div>
      </div>
    </Modal>
  );
}
