import { useState, useMemo, useRef, useEffect } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import Modal from '@/components/Modal';
import { Button } from '@/components/ui';
import { useCustomers, usePics, useSavePoIn, useUploadFile } from '@/hooks/useData';
import type { POIn } from '@/types';

interface EditPoInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  poIn: POIn | null;
}

export default function EditPoInModal({ isOpen, onClose, onSuccess, poIn }: EditPoInModalProps) {
  const { data: customers = [] } = useCustomers();
  const { data: pics = [] } = usePics();
  const savePoIn = useSavePoIn();
  const uploadFile = useUploadFile();

  const [poInNumber, setPoInNumber] = useState('');
  const [judul, setJudul] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [alamatType, setAlamatType] = useState<'office' | 'warehouse' | 'custom'>('custom');
  const [customAlamat, setCustomAlamat] = useState('');
  const [picId, setPicId] = useState('');
  const [tanggalBatas, setTanggalBatas] = useState('');
  const [existingDocs, setExistingDocs] = useState<{ name: string; url: string }[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill form when poIn changes
  useEffect(() => {
    if (!poIn) return;
    setPoInNumber(poIn.po_in_number || '');
    setJudul(poIn.judul || '');
    setTanggal(poIn.tanggal ? poIn.tanggal.split('T')[0] : '');
    setTanggalBatas(poIn.tanggal_batas ? poIn.tanggal_batas.split('T')[0] : '');
    setPicId(poIn.pic_id || '');
    setCustomAlamat(poIn.alamat_pengiriman || '');
    setNewFiles([]);
    try {
      setExistingDocs(JSON.parse(poIn.dokumen || '[]') || []);
    } catch {
      setExistingDocs([]);
    }
  }, [poIn]);

  const customer = useMemo(() =>
    customers.find(c => c.id === poIn?.customer_id),
    [customers, poIn?.customer_id]
  );

  const customerPics = useMemo(() =>
    pics.filter(p => p.customer_id === poIn?.customer_id),
    [pics, poIn?.customer_id]
  );

  const alamatOptions = useMemo(() => {
    if (!customer) return [];
    const opts: { label: string; value: string; key: 'office' | 'warehouse' }[] = [];
    if (customer.office_address) opts.push({ label: 'Alamat Kantor', value: customer.office_address, key: 'office' });
    if (customer.warehouse_address) opts.push({ label: 'Alamat Gudang', value: customer.warehouse_address, key: 'warehouse' });
    return opts;
  }, [customer]);

  const selectedAlamat = useMemo(() => {
    if (alamatType === 'custom') return customAlamat;
    const opt = alamatOptions.find(o => o.key === alamatType);
    return opt ? opt.value : customAlamat;
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
    if (!poIn) return;
    if (!poInNumber.trim() || !judul.trim() || !picId || !tanggalBatas) {
      alert('Harap lengkapi field wajib: No PO Customer, Judul PO, PIC, dan Batas Waktu.');
      return;
    }

    setIsSaving(true);
    try {
      // Upload new files
      const uploadedDocs = [...existingDocs];
      for (const file of newFiles) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        const res = await uploadFile.mutateAsync({ filename: file.name, mimeType: file.type, base64 });
        if (res?.url) uploadedDocs.push({ name: file.name, url: res.url });
      }

      const selectedPic = pics.find(p => p.id === picId);
      await savePoIn.mutateAsync({
        ...poIn,
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit PO In" size="lg">
      <div className="space-y-4">
        {/* Info customer (read-only) */}
        {poIn && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
            <div>
              <span className="text-gray-500 text-xs">Customer</span>
              <p className="font-semibold text-gray-800">{poIn.customer_name}</p>
            </div>
            <div className="text-right">
              <span className="text-gray-500 text-xs">No. Quotation Terkait</span>
              <p className="font-mono text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded mt-0.5">{poIn.quotation_id || '—'}</p>
            </div>
          </div>
        )}

        <div className="border border-gray-200 rounded-xl overflow-hidden">
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
                  <label className="flex items-start gap-2 cursor-pointer p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="edit-alamat"
                      value="custom"
                      checked={alamatType === 'custom'}
                      onChange={() => setAlamatType('custom')}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-700 mb-1">Alamat Lainnya</p>
                      {alamatType === 'custom' && (
                        <textarea
                          value={customAlamat}
                          onChange={e => setCustomAlamat(e.target.value)}
                          rows={2}
                          placeholder="Masukkan alamat..."
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-purple-400"
                        />
                      )}
                    </div>
                  </label>
                </div>
              ) : (
                <textarea
                  value={customAlamat}
                  onChange={e => setCustomAlamat(e.target.value)}
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
              <label className="block text-xs font-medium text-gray-700 mb-2">Dokumen PO In</label>

              {/* Existing docs */}
              {existingDocs.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {existingDocs.map((d, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-blue-50 rounded px-2 py-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-blue-600 hover:underline">{d.name}</a>
                      <button onClick={() => removeExistingDoc(i)} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Upload new */}
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
                      <button onClick={() => removeNewFile(i)} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={handleClose} disabled={isSaving}>Batal</Button>
          <Button onClick={handleSave} loading={isSaving}>
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
