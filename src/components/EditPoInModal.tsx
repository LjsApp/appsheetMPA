import { useState, useMemo, useRef, useEffect } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import Modal from '@/components/Modal';
import { Button } from '@/components/ui';
import { useNeracaQuotations, useCustomers, usePics, useSavePoIn, useUploadFile, usePurchaseOrders, useInquiries } from '@/hooks/useData';
import type { POIn } from '@/types';

interface EditPoInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  poIn: POIn | null;
  usedQuotationIds: Set<string>;
}

function parseDocs(raw: string | undefined | null): { name: string; url: string }[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'string') {
        const parsed2 = JSON.parse(parsed);
        if (Array.isArray(parsed2)) return parsed2;
      }
      return [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function EditPoInModal({ isOpen, onClose, onSuccess, poIn, usedQuotationIds }: EditPoInModalProps) {
  const { data: quotations = [] } = useNeracaQuotations();
  const { data: customers = [] } = useCustomers();
  const { data: inquiries = [] } = useInquiries();
  const { data: pics = [] } = usePics();
  const savePoIn = useSavePoIn();
  const uploadFile = useUploadFile();
  const { data: pos = [] } = usePurchaseOrders();
  const hasPoOut = poIn ? pos.some(p => p.neraca_id === poIn.neraca_id) : false;

  const [selectedQtId, setSelectedQtId] = useState('');
  
  const [poInNumber, setPoInNumber] = useState('');
  const [judul, setJudul] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [alamatType, setAlamatType] = useState<'office' | 'warehouse'>('office');
  const [customAlamat, setCustomAlamat] = useState('');
  const [picId, setPicId] = useState('');
  const [tanggalBatas, setTanggalBatas] = useState('');
  const [existingDocs, setExistingDocs] = useState<{ name: string; url: string }[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize selected Quotation when modal opens
  useEffect(() => {
    if (!poIn || !isOpen) return;
    setSelectedQtId(poIn.quotation_id || '');
  }, [poIn?.id, isOpen]);

  const selectedQt = useMemo(() => quotations.find(q => q.id === selectedQtId), [quotations, selectedQtId]);
  
  const customer = useMemo(() => {
    if (!selectedQt) return undefined;
    return customers.find(c => 
      (selectedQt.customer_id && c.id === selectedQt.customer_id) || 
      (selectedQt.customer_name && c.company_name === selectedQt.customer_name)
    );
  }, [customers, selectedQt]);

  const customerPics = useMemo(() => {
    if (!customer) return [];
    return pics.filter(p => p.customer_id === customer.id);
  }, [pics, customer]);

  const alamatOptions = useMemo(() => {
    if (!customer) return [];
    const opts: { label: string; value: string; key: 'office' | 'warehouse' }[] = [];
    if (customer.office_address) opts.push({ label: 'Alamat Kantor', value: customer.office_address, key: 'office' });
    if (customer.warehouse_address) opts.push({ label: 'Alamat Gudang', value: customer.warehouse_address, key: 'warehouse' });
    return opts;
  }, [customer]);

  // Sync form fields when quotation changes
  useEffect(() => {
    if (!poIn || !isOpen) return;

    if (selectedQtId === poIn.quotation_id) {
      // Restore original data
      setPoInNumber(poIn.po_in_number || '');
      setJudul(poIn.judul || '');
      setTanggal(poIn.tanggal ? String(poIn.tanggal).split('T')[0] : '');
      setTanggalBatas(poIn.tanggal_batas ? String(poIn.tanggal_batas).split('T')[0] : '');
      setPicId(poIn.pic_id || '');
      setExistingDocs(parseDocs(poIn.dokumen));
      
      // Try to determine alamatType based on original data
      if (customer) {
        if (poIn.alamat_pengiriman === customer.office_address) {
          setAlamatType('office');
        } else if (poIn.alamat_pengiriman === customer.warehouse_address) {
          setAlamatType('warehouse');
        } else {
          setAlamatType('office');
        }
      }
      setCustomAlamat(poIn.alamat_pengiriman || '');
    } else {
      // Reset form for a new quotation
      setPoInNumber('');
      setJudul(selectedQt?.inquiry_id ? (inquiries?.find((i: any) => i.id === selectedQt.inquiry_id)?.request_title || '') : '');
      setTanggal(new Date().toISOString().split('T')[0]);
      setTanggalBatas('');
      setPicId('');
      setAlamatType('office');
      setCustomAlamat('');
      setExistingDocs([]);
    }
    setNewFiles([]);
  }, [selectedQtId, poIn, isOpen, customer]);

  const selectedAlamat = useMemo(() => {
    if (alamatOptions.length > 0) {
      const opt = alamatOptions.find(o => o.key === alamatType);
      return opt ? opt.value : '';
    }
    return customAlamat;
  }, [alamatType, alamatOptions, customAlamat]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeNewFile = (idx: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExistingDoc = (idx: number) => {
    setExistingDocs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!poIn || !selectedQt) return;
    if (!poInNumber.trim() || !judul.trim() || !picId || !tanggalBatas) {
      alert('Harap lengkapi field wajib: No PO Customer, Judul PO, PIC, dan Batas Waktu.');
      return;
    }

    setIsSaving(true);
    try {
      const uploadedDocs = [...existingDocs];
      for (const file of newFiles) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        const res = await uploadFile.mutateAsync({ filename: file.name, mimeType: file.type, base64 });
        const fileUrl = typeof res === 'string' ? res : res?.url;
        if (fileUrl) uploadedDocs.push({ name: file.name, url: fileUrl });
      }

      const selectedPic = pics.find(p => p.id === picId);
      await savePoIn.mutateAsync({
        ...poIn,
        quotation_id: selectedQt.id,
        neraca_id: selectedQt.neraca_id,
        customer_id: selectedQt.customer_id,
        customer_name: selectedQt.customer_name,
        po_in_number: poInNumber,
        judul,
        tanggal,
        alamat_pengiriman: selectedAlamat,
        pic_id: picId,
        pic_name: selectedPic?.name || '',
        tanggal_batas: tanggalBatas,
        dokumen: JSON.stringify(uploadedDocs),
        updated_date: new Date().toISOString(),
      });

      if (onSuccess) onSuccess();
      handleClose();
    } catch (e: any) {
      alert('Gagal menyimpan PO In: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setNewFiles([]);
    onClose();
  };

  if (!poIn) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit PO In" size="lg">
      <div className="space-y-4">

        {/* Pilih Quotation */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Pilih Quotation <span className="text-red-500">*</span></label>
          <select
            value={selectedQtId}
            onChange={e => setSelectedQtId(e.target.value)}
            disabled={hasPoOut}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-purple-400"
          >
            <option value="">-- Pilih Quotation --</option>
            {hasPoOut && (
              <option disabled className="text-amber-600 bg-amber-50">
                ⚠️ Tidak dapat diubah karena sudah ada PO Out
              </option>
            )}
            {quotations.map(q => {
              // Jika ini quotation_id asli milik poIn, biarkan tetap bisa dipilih.
              // Jika bukan, disable jika sudah ada PO In.
              const isUsed = q.id !== poIn.quotation_id && usedQuotationIds.has(q.id);
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

              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nomor PO Customer <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={poInNumber}
                    onChange={e => setPoInNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Judul PO <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={judul}
                    onChange={e => setJudul(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              {/* Row 2 */}
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

              {/* Alamat */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Alamat Pengiriman</label>
                {alamatOptions.length > 0 ? (
                  <div className="space-y-2">
                    {alamatOptions.map(opt => (
                      <label key={opt.key} className="flex items-start gap-2 cursor-pointer p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                        <input
                          type="radio"
                          name="edit-alamat"
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
                    rows={2}
                    placeholder="Masukkan alamat pengiriman..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-purple-400"
                  />
                )}
              </div>

              {/* PIC */}
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

              {/* Dokumen */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Dokumen PO In</label>

                {/* Existing docs */}
                {existingDocs.length > 0 && (
                  <ul className="mb-2 space-y-1">
                    {existingDocs.map((d, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-blue-50 rounded px-2 py-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-blue-600 hover:underline">{d.name}</a>
                        <button type="button" onClick={() => removeExistingDoc(i)} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Upload zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">Klik untuk unggah dokumen baru</p>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                </div>

                {newFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {newFiles.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 rounded px-2 py-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                        <span className="flex-1 truncate">{f.name}</span>
                        <button type="button" onClick={() => removeNewFile(i)} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={handleClose} disabled={isSaving}>Batal</Button>
          <Button onClick={handleSave} loading={isSaving} disabled={!selectedQtId}>
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
