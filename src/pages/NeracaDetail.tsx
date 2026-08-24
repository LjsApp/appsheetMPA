import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2, Save, FileText, Upload, X, Edit2, Eye, Settings, Lock, AlertTriangle } from 'lucide-react';
import { Button, FormField } from '@/components/ui';
import Modal from '@/components/Modal';
import type { NeracaDetail as NeracaDetailType, NeracaItem } from '@/types';
import { useForm, Controller } from 'react-hook-form';
import {
  useNeracas, useNeracaDetail, useSaveNeracaDetail,
  useNeracaItems, useSaveNeracaItem, useDeleteNeracaItem,
  useVendors, useUploadFile,
  useVendorDiscounts, useSaveVendorDiscount, useDeleteVendorDiscount,
  useNeracaQuotations, usePurchaseOrders
} from '@/hooks/useData';

// ==================== Constants ====================
const VK_GROUPS = ['A', 'B', 'C', 'D', 'E'] as const;
const KC_GROUPS = ['X', 'Y', 'Z'] as const;
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Rare'] as const;
const DELIVERY_TIMES = [
  '1-2 Minggu','2-3 Minggu','3-4 Minggu','4-5 Minggu','5-6 Minggu',
  '6-7 Minggu','7-8 Minggu','8-9 Minggu','9-10 Minggu','10-11 Minggu',
  '11-12 Minggu','12-13 Minggu','13-14 Minggu','14-15 Minggu','15-16 Minggu','16-17 Minggu',
];

const DEFAULT_DETAIL: Partial<NeracaDetailType> = {
  ongkir_a: '' as any, ongkir_b: '' as any, ongkir_c: '' as any, ongkir_d: '' as any, ongkir_e: '' as any,
  ongkir_x: '' as any, ongkir_y: '' as any, ongkir_z: '' as any,
  difficulty_easy: '' as any, difficulty_medium: '' as any, difficulty_hard: '' as any, difficulty_rare: '' as any,
  disc: '' as any, ppn: 11, un_cost: 2,
};

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(n));
}

function ThousandInput({ value, onChange, className, placeholder, min = 0, isFloat = false, disabled = false }: { value: any, onChange: (v: number | '') => void, className?: string, placeholder?: string, min?: number, isFloat?: boolean, disabled?: boolean }) {
  const formatStr = (val: any) => {
    if (val === undefined || val === null || val === '') return '';
    return isFloat ? String(val) : new Intl.NumberFormat('id-ID').format(Number(val));
  };
  const [localVal, setLocalVal] = useState(formatStr(value));

  useEffect(() => {
    setLocalVal(formatStr(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFloat) {
      let raw = e.target.value.replace(/[^0-9.]/g, '');
      setLocalVal(raw);
      onChange(raw === '' ? '' : parseFloat(raw));
      return;
    }
    const raw = e.target.value.replace(/\D/g, '');
    if (raw === '') {
      setLocalVal('');
      onChange('');
    } else {
      const num = parseInt(raw, 10);
      if (num < min) return;
      setLocalVal(new Intl.NumberFormat('id-ID').format(num));
      onChange(num);
    }
  };

  return <input type="text" value={localVal} onChange={handleChange} className={className} placeholder={placeholder} disabled={disabled} />;
}

// ==================== Calculation Helpers ====================
function getDifficultyValue(detail: Partial<NeracaDetailType>, difficulty: string): number {
  if (difficulty === 'Easy') return Number(detail.difficulty_easy) || 0;
  if (difficulty === 'Medium') return Number(detail.difficulty_medium) || 0;
  if (difficulty === 'Hard') return Number(detail.difficulty_hard) || 0;
  if (difficulty === 'Rare') return Number(detail.difficulty_rare) || 0;
  return 0;
}

function getOngkirVK(detail: Partial<NeracaDetailType>, cat: string): number {
  if (cat === 'A') return Number(detail.ongkir_a) || 0;
  if (cat === 'B') return Number(detail.ongkir_b) || 0;
  if (cat === 'C') return Number(detail.ongkir_c) || 0;
  if (cat === 'D') return Number(detail.ongkir_d) || 0;
  if (cat === 'E') return Number(detail.ongkir_e) || 0;
  return 0;
}

function getOngkirKC(detail: Partial<NeracaDetailType>, cat: string): number {
  if (cat === 'X') return Number(detail.ongkir_x) || 0;
  if (cat === 'Y') return Number(detail.ongkir_y) || 0;
  if (cat === 'Z') return Number(detail.ongkir_z) || 0;
  return 0;
}

/**
 * For each item: harga_jual = (harga_beli_setelah_diskon) + (ongkir_vk / count_same_vk) + (ongkir_kc / count_same_kc) + (harga_beli_setelah_diskon * difficulty_pct / 100 / count_same_diff)
 */
function calcBaseHargaJual(item: NeracaItem, items: NeracaItem[], detail: Partial<NeracaDetailType>): number {
  const hb = Number(item.harga_beli) || 0;
  const qty = Number(item.qty) || 1;

  // 1. Calculate Vendor Discount (Not deducted from Harga Jual base)
  let hbDiskon = hb; // User requested not to deduct this from the selling price

  const sameVK = items.filter(i => i.category_vk === item.category_vk).length || 1;
  const sameKC = items.filter(i => i.category_kc === item.category_kc).length || 1;
  const sameDiff = items.filter(i => i.difficulty === item.difficulty).length || 1;

  const ongkirVKPerItem = getOngkirVK(detail, item.category_vk) / sameVK;
  const ongkirKCPerItem = getOngkirKC(detail, item.category_kc) / sameKC;
  
  const difficultyPct = getDifficultyValue(detail, item.difficulty);
  const difficultyPerItem = (hbDiskon * (difficultyPct / 100)) / sameDiff;

  const hjSatuan = hbDiskon + ongkirVKPerItem + ongkirKCPerItem + difficultyPerItem;
  return hjSatuan * qty;
}

// ==================== Component ====================
export default function NeracaDetail() {
  const { neracaId } = useParams<{ inquiryId: string; neracaId: string }>();
  const navigate = useNavigate();

  // --- Neraca name ---
  const { data: neracas = [] } = useNeracas();
  const neraca = neracas.find(n => n.id === neracaId);

  // --- Detail (ongkir settings) ---
  const { data: detailData, isLoading: isLoadingDetail } = useNeracaDetail(neracaId!);
  const saveDetail = useSaveNeracaDetail();
  const [detail, setDetail] = useState<Partial<NeracaDetailType>>(DEFAULT_DETAIL);
  const [detailDirty, setDetailDirty] = useState(false);

  useEffect(() => {
    if (detailData) {
      setDetail(detailData);
    }
  }, [detailData]);

  const updateDetail = (key: keyof NeracaDetailType, val: number | '') => {
    setDetail(prev => ({ ...prev, [key]: val }));
    setDetailDirty(true);
  };

  const saveDetailHandler = () => {
    const payload: Partial<NeracaDetailType> = {
      ...detail,
      neraca_id: neracaId,
      updated_date: new Date().toISOString().split('T')[0],
    };
    if (!payload.id) {
      payload.id = `DET-${Date.now()}`;
    }
    saveDetail.mutate(payload, { onSuccess: () => setDetailDirty(false) });
  };

  // --- Items ---
  const { data: items = [], isLoading: isLoadingItems } = useNeracaItems(neracaId!);
  const saveItem = useSaveNeracaItem();
  const deleteItem = useDeleteNeracaItem();
  const { data: vendors = [] } = useVendors();
  const uploadFile = useUploadFile();

  // --- Lock status: locked if this neraca already has Quotations or POs ---
  const { data: allQuotations = [] } = useNeracaQuotations();
  const { data: allPOs = [] } = usePurchaseOrders();
  const hasQuotation = allQuotations.some(q => q.neraca_id === neracaId);
  const hasPO = allPOs.some(p => p.neraca_id === neracaId);
  const isLocked = hasQuotation || hasPO;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; url: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingItem, setViewingItem] = useState<NeracaItem | null>(null);

  // --- Vendor Discount Modal ---
  const { data: vendorDiscounts = [] } = useVendorDiscounts(neracaId!);
  const [vendorDiscountModalId, setVendorDiscountModalId] = useState<string | null>(null);
  const [vdForm, setVdForm] = useState<{pct: number | '', cash: number | '', subject: string, delivery_time_disc: string, letter_date: string}>({ pct: '', cash: '', subject: '', delivery_time_disc: '', letter_date: '' });
  const [vdFormType, setVdFormType] = useState<'pct' | 'cash'>('pct');
  const saveVd = useSaveVendorDiscount();
  const deleteVd = useDeleteVendorDiscount();

  const openVendorDiscount = (vendorId: string) => {
    const existing = (vendorDiscounts || []).find(d => d.vendor_id === vendorId);
    if (existing) {
      setVdForm({ 
        pct: existing.discount_pct || '', 
        cash: existing.discount_cash || '',
        subject: existing.subject || '',
        delivery_time_disc: existing.delivery_time_disc || '',
        letter_date: existing.letter_date || ''
      });
      setVdFormType(existing.discount_cash > 0 && !existing.discount_pct ? 'cash' : 'pct');
    } else {
      setVdForm({ pct: '', cash: '', subject: '', delivery_time_disc: '', letter_date: '' });
      setVdFormType('pct');
    }
    setVendorDiscountModalId(vendorId);
  };

  const handleSaveVd = async () => {
    if (!vendorDiscountModalId) return;
    const vendor = vendors.find(v => v.id === vendorDiscountModalId);
    const existing = (vendorDiscounts || []).find(d => d.vendor_id === vendorDiscountModalId);
    
    const payload = {
      id: existing ? existing.id : `VD-${Date.now()}`,
      neraca_id: neracaId!,
      vendor_id: vendorDiscountModalId,
      vendor_name: vendor?.vendor_name || vendorDiscountModalId,
      discount_pct: vdFormType === 'pct' ? (Number(vdForm.pct) || 0) : 0,
      discount_cash: vdFormType === 'cash' ? (Number(vdForm.cash) || 0) : 0,
      subject: vdForm.subject,
      delivery_time_disc: vdForm.delivery_time_disc,
      letter_date: vdForm.letter_date,
      updated_date: new Date().toISOString().split('T')[0]
    };
    
    await saveVd.mutateAsync(payload);
    setVendorDiscountModalId(null);
  };

  const handleDeleteVd = async () => {
    const existing = (vendorDiscounts || []).find(d => d.vendor_id === vendorDiscountModalId);
    if (existing) {
      await deleteVd.mutateAsync({ id: existing.id, neraca_id: neracaId! });
    }
    setVendorDiscountModalId(null);
  };

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<NeracaItem>();

  const openCreate = () => {
    reset({});
    setSelectedFiles([]);
    setUploadedDocs([]);
    setEditingItemId(null);
    setIsModalOpen(true);
  };

  const openEdit = (item: NeracaItem) => {
    reset(item);
    setSelectedFiles([]);
    try { setUploadedDocs(item.documents ? JSON.parse(item.documents) : []); } catch { setUploadedDocs([]); }
    setEditingItemId(item.id);
    setIsModalOpen(true);
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const onSubmitItem = async (data: NeracaItem) => {
    setIsUploading(true);
    let currentDocs = [...uploadedDocs];
    for (const file of selectedFiles) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
        });
        const url = await uploadFile.mutateAsync({ filename: file.name, mimeType: file.type, base64 });
        currentDocs.push({ name: file.name, url });
      } catch { alert(`Gagal upload ${file.name}`); }
    }
    // Renumber
    currentDocs = currentDocs.map((d, i) => ({ ...d, name: `Lampiran ${i + 1}` }));
    setIsUploading(false);

    const selectedVendor = vendors.find(v => v.id === data.vendor_id);
    let payload: NeracaItem = {
      ...data,
      neraca_id: neracaId!,
      vendor_name: selectedVendor?.vendor_name || data.vendor_id,
      documents: JSON.stringify(currentDocs),
      qty: Number(data.qty) || 1,
      harga_beli: Number(data.harga_beli) || 0,
      berat: Number(data.berat) || 0,
    };
    if (!editingItemId) {
      payload = { ...payload, id: `ITM-${Date.now()}`, created_date: new Date().toISOString().split('T')[0], updated_date: new Date().toISOString().split('T')[0] };
    } else {
      payload.updated_date = new Date().toISOString().split('T')[0];
    }
    saveItem.mutate(payload, { onSuccess: () => setIsModalOpen(false) });
  };

  const calculatedItems = useMemo(() => {
    const unCostPct = Number(detail.un_cost) || 0;
    const baseJualTotal = items.reduce((sum, item) => sum + calcBaseHargaJual(item, items, detail), 0);
    const totalUnCost = baseJualTotal * (unCostPct / 100);
    const unCostPerItem = items.length > 0 ? totalUnCost / items.length : 0;
    
    return items.map(item => {
      const baseHj = calcBaseHargaJual(item, items, detail);
      return {
        ...item,
        baseHj,
        hj: baseHj + unCostPerItem,
      };
    });
  }, [items, detail]);

  const resume = useMemo(() => {
    const modalTotal = calculatedItems.reduce((sum, item) => sum + (Number(item.harga_beli) || 0) * (Number(item.qty) || 1), 0);
    const jualTotal = calculatedItems.reduce((sum, item) => sum + item.hj, 0);
    const totalBerat = calculatedItems.reduce((sum, item) => sum + (Number(item.berat) || 0), 0);
    const discPct = Number(detail.disc) || 0;
    const ppnPct = Number(detail.ppn) ?? 11;
    const jualAfterDisc = jualTotal * (1 - discPct / 100);
    const ppn = jualAfterDisc * (ppnPct / 100);
    const grandTotal = jualAfterDisc + ppn;
    const marginTotal = jualTotal - modalTotal;
    const marginPct = modalTotal > 0 ? (marginTotal / modalTotal) * 100 : 0;
    return { modalTotal, jualTotal, totalAfterDisc: jualAfterDisc, ppn, grandTotal, marginTotal, marginPct, totalBerat };
  }, [calculatedItems, detail]);

  const isLoading = isLoadingDetail || isLoadingItems;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/neraca')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{neraca?.name || 'Detail Neraca'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kalkulasi harga dan evaluasi penawaran</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* LEFT: Ongkir Settings */}
          <div className="xl:col-span-1 space-y-4">
            {/* Ongkir Vendor-Kantor */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-blue-600 px-4 py-2.5">
                <h3 className="text-sm font-semibold text-white">Ongkir Vendor-Kantor</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {VK_GROUPS.map(g => (
                  <div key={g} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <span className="text-sm font-medium text-gray-700 w-16 whitespace-nowrap">Group {g}</span>
                    <ThousandInput
                      value={detail[`ongkir_${g.toLowerCase()}` as keyof NeracaDetailType] as any}
                      onChange={val => updateDetail(`ongkir_${g.toLowerCase()}` as keyof NeracaDetailType, val)}
                      className="flex-1 min-w-0 text-right px-2 py-1 rounded border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={isLocked}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Ongkir Kantor-Customer */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-emerald-600 px-4 py-2.5">
                <h3 className="text-sm font-semibold text-white">Ongkir Kantor-Customer</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {KC_GROUPS.map(g => (
                  <div key={g} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <span className="text-sm font-medium text-gray-700 w-16 whitespace-nowrap">Group {g}</span>
                    <ThousandInput
                      value={detail[`ongkir_${g.toLowerCase()}` as keyof NeracaDetailType] as any}
                      onChange={val => updateDetail(`ongkir_${g.toLowerCase()}` as keyof NeracaDetailType, val)}
                      className="flex-1 min-w-0 text-right px-2 py-1 rounded border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={isLocked}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-amber-500 px-4 py-2.5">
                <h3 className="text-sm font-semibold text-white">Difficulty of Item (%) per item</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {DIFFICULTIES.map(d => (
                  <div key={d} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <span className="text-sm font-medium text-gray-700 w-16 whitespace-nowrap">{d}</span>
                    <ThousandInput
                      value={detail[`difficulty_${d.toLowerCase()}` as keyof NeracaDetailType] as any}
                      onChange={val => updateDetail(`difficulty_${d.toLowerCase()}` as keyof NeracaDetailType, val)}
                      className="flex-1 min-w-0 text-right px-2 py-1 rounded border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={isLocked}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Save settings */}
            <Button onClick={saveDetailHandler} loading={saveDetail.isPending} disabled={isLocked || !detailDirty} className="w-full" variant={detailDirty ? 'primary' : 'secondary'}>
              <Save className="w-4 h-4" /> Simpan Pengaturan
            </Button>
          </div>

          {/* RIGHT: Items + Resume */}
          <div className="xl:col-span-3 space-y-4">
            {/* Items Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Lock Alert */}
              {isLocked && (
                <div className="flex items-start gap-3 px-5 py-3 bg-amber-50 border-b border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <span className="font-semibold">Neraca Terkunci</span> — Neraca ini sudah memiliki {hasQuotation && 'Quotation'}{hasQuotation && hasPO && ' dan '}{hasPO && 'PO Out'}. Hapus Quotation &amp; PO Out terlebih dahulu untuk dapat mengedit item.
                  </div>
                  <Lock className="w-4 h-4 text-amber-600 ml-auto flex-shrink-0" />
                </div>
              )}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Daftar Item</h3>
                <Button size="sm" onClick={openCreate} disabled={isLocked}>
                  <Plus className="w-3.5 h-3.5" /> Tambah Item
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">#</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Vendor</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap min-w-[150px]">Item Customer</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap min-w-[150px]">Item Vendor</th>
                      <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 whitespace-nowrap">Cat VK</th>
                      <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 whitespace-nowrap">Cat KC</th>
                      <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 whitespace-nowrap">Difficulty</th>
                      <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 whitespace-nowrap">Delivery</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Qty</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Harga Beli</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Total Beli</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Harga Jual</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Total Jual</th>
                      <th className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 whitespace-nowrap">Dokumen</th>
                      <th className="px-3 py-2.5 whitespace-nowrap"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {calculatedItems.length === 0 ? (
                      <tr><td colSpan={14} className="px-4 py-8 text-center text-gray-500 text-sm">Belum ada item di neraca ini</td></tr>
                    ) : (
                      calculatedItems.map((item, idx) => {
                        let docs: any[] = [];
                        try { docs = item.documents ? JSON.parse(item.documents) : []; } catch { docs = []; }
                        const isFirstVendorItem = calculatedItems.findIndex(i => i.vendor_id === item.vendor_id) === idx;
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2.5 text-gray-500 text-xs">{idx + 1}</td>
                            <td className="px-3 py-2.5 text-gray-800 font-medium">
                              <div className="flex items-center gap-1.5">
                                <span>{item.vendor_name}</span>
                                {isFirstVendorItem && (
                                  <button onClick={() => openVendorDiscount(item.vendor_id)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Atur Diskon Vendor">
                                    <Settings className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-gray-700 max-w-[150px] truncate">{item.item_customer}</td>
                            <td className="px-3 py-2.5 text-gray-500 max-w-[150px] truncate">{item.item_vendor}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">{item.category_vk}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">{item.category_kc}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">{item.difficulty}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              {item.delivery_time ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">{item.delivery_time}</span> : <span className="text-gray-300 text-xs">-</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right text-gray-800">{item.qty}</td>
                            <td className="px-3 py-2.5 text-right text-gray-800">{fmt(Number(item.harga_beli))}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-gray-800">{fmt((Number(item.harga_beli) || 0) * (Number(item.qty) || 1))}</td>
                            <td className="px-3 py-2.5 text-right text-blue-700">{fmt(Number(item.qty) > 0 ? item.hj / Number(item.qty) : item.hj)}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-blue-700">{fmt(item.hj)}</td>
                            <td className="px-3 py-2.5 text-right">
                              {docs.map((d, i) => (
                                <a key={i} href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mr-1">
                                  <FileText className="w-3 h-3" />{d.name}
                                </a>
                              ))}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1">
                                <button onClick={() => setViewingItem(item)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Lihat Resume Item">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => openEdit(item)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed" title="Edit Item" disabled={isLocked}>
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => deleteItem.mutate({ id: item.id, neraca_id: item.neraca_id })} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed" disabled={deleteItem.isPending || isLocked} title="Hapus Item">
                                  {deleteItem.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resume */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800">Resume</div>
              <div className="grid grid-cols-2 divide-x divide-gray-100">
                {/* Left: Calculation chain */}
                <div className="px-5 py-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jual Total</span>
                    <span className="font-semibold text-gray-900">Rp {fmt(resume.jualTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Disc (%)</span>
                    <ThousandInput
                      isFloat
                      value={detail.disc as any}
                      onChange={val => updateDetail('disc', val)}
                      className="w-20 text-right px-2 py-1 rounded border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={isLocked}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total After Disc</span>
                    <span className="font-semibold text-gray-900">Rp {fmt(resume.totalAfterDisc)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">PPN (%)</span>
                    <ThousandInput
                      isFloat
                      value={detail.ppn ?? 11}
                      onChange={val => updateDetail('ppn', val)}
                      className="w-20 text-right px-2 py-1 rounded border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={isLocked}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">PPN</span>
                    <span className="text-gray-900">Rp {fmt(resume.ppn)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between text-base font-bold">
                    <span>Grand Total</span>
                    <span className="text-blue-700">Rp {fmt(resume.grandTotal)}</span>
                  </div>
                </div>
                {/* Right: Summary info */}
                <div className="px-5 py-4 space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Un Cost (%)</span>
                    <ThousandInput
                      isFloat
                      value={detail.un_cost as any}
                      onChange={val => updateDetail('un_cost', val)}
                      className="w-20 text-right px-2 py-1 rounded border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                      disabled={isLocked}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Berat</span>
                    <span className="font-semibold text-gray-900">{fmt(resume.totalBerat)} kg</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2 flex justify-between">
                    <span className="text-gray-600">Modal Total</span>
                    <span className="font-semibold text-gray-900">Rp {fmt(resume.modalTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jual Total</span>
                    <span className="font-semibold text-gray-900">Rp {fmt(resume.jualTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Margin Total</span>
                    <span className="font-semibold text-emerald-600">Rp {fmt(resume.marginTotal)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
                    <span>% Margin Total</span>
                    <span className="text-emerald-600">{resume.marginPct.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
              {detailDirty && !isLocked && (
                <div className="px-5 pb-4 border-t border-gray-100">
                  <Button onClick={saveDetailHandler} loading={saveDetail.isPending} className="w-full" size="sm">
                    <Save className="w-3.5 h-3.5" /> Simpan Perubahan
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Form - Add/Edit Item */}
      <Modal size="lg" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItemId ? 'Edit Item' : 'Tambah Item'}>
        <form onSubmit={handleSubmit(onSubmitItem)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Pilih Vendor" required error={errors.vendor_id?.message}>
              <select {...register('vendor_id', { required: 'Wajib dipilih' })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">-- Pilih Vendor --</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Kategori VK" required>
                <select {...register('category_vk', { required: true })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="">--</option>
                  {VK_GROUPS.map(g => <option key={g} value={g}>Group {g}</option>)}
                </select>
              </FormField>
              <FormField label="Kategori KC" required>
                <select {...register('category_kc', { required: true })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="">--</option>
                  {KC_GROUPS.map(g => <option key={g} value={g}>Group {g}</option>)}
                </select>
              </FormField>
            </div>
          </div>

          <div className="space-y-4">
            <FormField label="Item Customer" required error={errors.item_customer?.message}>
              <textarea {...register('item_customer', { required: 'Wajib diisi' })} rows={3}
                placeholder="Nama item sesuai permintaan customer..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
            </FormField>
            <FormField label="Item Vendor" required error={errors.item_vendor?.message}>
              <textarea {...register('item_vendor', { required: 'Wajib diisi' })} rows={3}
                placeholder="Nama item dari vendor..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
            </FormField>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <FormField label="Difficulty" required>
              <select {...register('difficulty', { required: true })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">--</option>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </FormField>
            <FormField label="Delivery Time">
              <select {...register('delivery_time')}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">--</option>
                {DELIVERY_TIMES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
              </select>
            </FormField>
            <FormField label="Qty" required error={errors.qty?.message}>
              <Controller name="qty" control={control} rules={{ required: 'Wajib' }} render={({field}) => (
                <ThousandInput value={field.value} onChange={field.onChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              )} />
            </FormField>
            <FormField label="Harga Beli" required error={errors.harga_beli?.message}>
              <Controller name="harga_beli" control={control} rules={{ required: 'Wajib' }} render={({field}) => (
                <ThousandInput value={field.value} onChange={field.onChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              )} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Berat (kg)">
              <Controller name="berat" control={control} render={({field}) => (
                <ThousandInput isFloat value={field.value} onChange={field.onChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              )} />
            </FormField>
          </div>

          {/* Upload Dokumen Vendor */}
          <FormField label="Upload Dokumen Vendor">
            <label className="flex items-center justify-center w-full px-4 py-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors group">
              <div className="flex flex-col items-center gap-1.5">
                <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                <span className="text-xs text-gray-500 group-hover:text-blue-600">Pilih satu atau lebih dokumen</span>
              </div>
              <input type="file" multiple className="hidden" onChange={handleFileAdd} accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" />
            </label>
            <div className="mt-2 space-y-1">
              {uploadedDocs.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-emerald-50 rounded text-xs">
                  <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-700 hover:underline">
                    <FileText className="w-3.5 h-3.5" />{d.name}
                  </a>
                  <button type="button" onClick={() => setUploadedDocs(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {selectedFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs">
                  <span className="flex items-center gap-1 text-blue-700"><FileText className="w-3.5 h-3.5" />Lampiran {uploadedDocs.length + i + 1} <span className="text-gray-400">({f.name})</span></span>
                  <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)} disabled={isUploading || saveItem.isPending}>Batal</Button>
            <Button type="submit" loading={isUploading || saveItem.isPending}>
              {isUploading ? 'Mengupload...' : editingItemId ? 'Simpan Perubahan' : 'Tambah Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Form - View Item Resume */}
      <Modal isOpen={!!viewingItem} onClose={() => setViewingItem(null)} title="Resume Item Detail">
        {viewingItem && (() => {
          const hb = Number(viewingItem.harga_beli) || 0;
          const qty = Number(viewingItem.qty) || 1;
          
          const hbDiskon = hb;

          const sameVK = items.filter(i => i.category_vk === viewingItem.category_vk).length || 1;
          const sameKC = items.filter(i => i.category_kc === viewingItem.category_kc).length || 1;
          const sameDiff = items.filter(i => i.difficulty === viewingItem.difficulty).length || 1;

          const ongkirVKPerItem = getOngkirVK(detail, viewingItem.category_vk) / sameVK;
          const ongkirKCPerItem = getOngkirKC(detail, viewingItem.category_kc) / sameKC;
          const difficultyPct = getDifficultyValue(detail, viewingItem.difficulty);
          const difficultyPerItem = (hbDiskon * (difficultyPct / 100)) / sameDiff;

          const hjSatuan = hbDiskon + ongkirVKPerItem + ongkirKCPerItem + difficultyPerItem;
          
          // uncost
          const unCostPct = Number(detail.un_cost) || 0;
          const baseJualTotal = items.reduce((sum, item) => sum + calcBaseHargaJual(item, items, detail), 0);
          const totalUnCost = baseJualTotal * (unCostPct / 100);
          const unCostPerItem = items.length > 0 ? totalUnCost / items.length : 0;
          
          const finalHjSatuan = hjSatuan + unCostPerItem;
          const finalHjTotal = finalHjSatuan * qty;

          return (
            <div className="space-y-5">
              <div className="bg-blue-50/50 p-4 rounded-lg space-y-2">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">{viewingItem.item_customer}</h4>
                    <p className="text-xs text-gray-500 mt-1">Vendor: {viewingItem.item_vendor}</p>
                    <p className="text-xs text-gray-500">{viewingItem.vendor_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700">
                      Qty: {qty}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 font-medium text-sm text-gray-800">
                  Kalkulasi Harga Jual
                </div>
                <div className="p-4 space-y-3 text-sm">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Harga Beli Satuan</span>
                    <span className="font-medium text-gray-900">Rp {fmt(hb)}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Ongkir Vendor-Kantor (Group {viewingItem.category_vk} ÷ {sameVK} item)</span>
                    <span className="font-medium text-gray-900">+ Rp {fmt(ongkirVKPerItem)}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Ongkir Kantor-Customer (Group {viewingItem.category_kc} ÷ {sameKC} item)</span>
                    <span className="font-medium text-gray-900">+ Rp {fmt(ongkirKCPerItem)}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Difficulty Add-on ({difficultyPct}% ÷ {sameDiff} item)</span>
                    <span className="font-medium text-gray-900">+ Rp {fmt(difficultyPerItem)}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Un Cost Tambahan (Alokasi Rata)</span>
                    <span className="font-medium text-gray-900">+ Rp {fmt(unCostPerItem)}</span>
                  </div>
                  
                  <div className="border-t border-gray-100 pt-3 flex justify-between items-center font-semibold text-gray-800">
                    <span>Harga Jual Satuan Final</span>
                    <span className="text-blue-700">Rp {fmt(finalHjSatuan)}</span>
                  </div>
                  
                  <div className="border-t border-dashed border-gray-200 mt-3 pt-3 flex justify-between items-center text-base font-bold text-gray-900">
                    <span>Total Harga Jual ({qty} unit)</span>
                    <span className="text-blue-700">Rp {fmt(finalHjTotal)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <Button variant="secondary" onClick={() => setViewingItem(null)}>Tutup</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal Form - Vendor Discount */}
      <Modal size="lg" isOpen={!!vendorDiscountModalId} onClose={() => setVendorDiscountModalId(null)} title={`Atur Diskon Vendor: ${vendors.find(v => v.id === vendorDiscountModalId)?.vendor_name}`}>
        {vendorDiscountModalId && (() => {
          const vItems = calculatedItems.filter(i => i.vendor_id === vendorDiscountModalId);
          const totalBeli = vItems.reduce((s, i) => s + ((Number(i.harga_beli) || 0) * (Number(i.qty) || 1)), 0);
          
          let totalDiscVal = 0;
          if (vdFormType === 'pct' && Number(vdForm.pct) > 0) {
            totalDiscVal = totalBeli * (Number(vdForm.pct) / 100);
          } else if (vdFormType === 'cash' && Number(vdForm.cash) > 0) {
            totalDiscVal = Number(vdForm.cash);
          }

          return (
            <div className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Item Customer</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Qty</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Harga Beli Satuan</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Total Beli</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Setelah Diskon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {vItems.map((i, idx) => {
                        const totalBeliRow = (Number(i.harga_beli) || 0) * (Number(i.qty) || 1);
                        
                        let discRow = 0;
                        if (vdFormType === 'pct' && Number(vdForm.pct) > 0) {
                          discRow = totalBeliRow * (Number(vdForm.pct) / 100);
                        } else if (vdFormType === 'cash' && Number(vdForm.cash) > 0 && totalBeli > 0) {
                          discRow = Number(vdForm.cash) * (totalBeliRow / totalBeli);
                        }
                        const setelahDiskonRow = totalBeliRow - discRow;

                        return (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-gray-800">{i.item_customer}</td>
                            <td className="px-3 py-2 text-right">{i.qty}</td>
                            <td className="px-3 py-2 text-right">Rp {fmt(Number(i.harga_beli) || 0)}</td>
                            <td className="px-3 py-2 text-right">Rp {fmt(totalBeliRow)}</td>
                            <td className="px-3 py-2 text-right font-medium text-emerald-700">Rp {fmt(setelahDiskonRow)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 font-semibold">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right">Total:</td>
                        <td className="px-3 py-2 text-right text-blue-700">Rp {fmt(totalBeli)}</td>
                        <td className="px-3 py-2 text-right text-emerald-700">Rp {fmt(totalBeli - totalDiscVal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-700 block mb-2">Tipe Diskon</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="vdType" value="pct" checked={vdFormType === 'pct'} onChange={() => setVdFormType('pct')} className="text-blue-600 focus:ring-blue-500" />
                      Persen (%)
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="vdType" value="cash" checked={vdFormType === 'cash'} onChange={() => setVdFormType('cash')} className="text-blue-600 focus:ring-blue-500" />
                      Tunai (Rp)
                    </label>
                  </div>
                </div>

                {vdFormType === 'pct' && (
                  <FormField label="Diskon Persen (%)">
                    <ThousandInput isFloat value={vdForm.pct} onChange={val => setVdForm({ ...vdForm, pct: val })} placeholder="Cth: 10" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  </FormField>
                )}
                {vdFormType === 'cash' && (
                  <FormField label="Diskon Tunai (Rp)">
                    <ThousandInput value={vdForm.cash} onChange={val => setVdForm({ ...vdForm, cash: val })} placeholder="Cth: 500000" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  </FormField>
                )}
              </div>

              <div className="bg-emerald-50 p-4 rounded-lg flex flex-col gap-2 border border-emerald-100">
                <div className="flex justify-between items-center text-emerald-800">
                  <span className="font-medium text-sm">Total Nilai Diskon:</span>
                  <span className="font-bold">Rp {fmt(totalDiscVal)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-900 border-t border-emerald-200 pt-2">
                  <span className="font-medium">Total Setelah Diskon:</span>
                  <span className="text-xl font-bold">Rp {fmt(totalBeli - totalDiscVal)}</span>
                </div>
              </div>

              {/* PO Info */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Informasi PO Out</h4>
                <div className="grid gap-4">
                  <FormField label="Subject PO">
                    <input type="text" value={vdForm.subject} onChange={e => setVdForm({ ...vdForm, subject: e.target.value })} placeholder="Cth: Filter Element" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm" />
                  </FormField>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Tanggal Surat (Letter Date)">
                      <input type="date" value={vdForm.letter_date} onChange={e => setVdForm({ ...vdForm, letter_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm" />
                    </FormField>
                    <FormField label="Waktu Pengiriman (PO)">
                      <select value={vdForm.delivery_time_disc} onChange={e => setVdForm({ ...vdForm, delivery_time_disc: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm bg-white">
                        <option value="">- Pilih Waktu -</option>
                        {DELIVERY_TIMES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                      </select>
                    </FormField>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-gray-100 mt-2">
                <Button variant="danger" type="button" onClick={handleDeleteVd} loading={deleteVd.isPending} disabled={!(vendorDiscounts || []).find(d => d.vendor_id === vendorDiscountModalId)}>
                  Hapus Diskon
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" type="button" onClick={() => setVendorDiscountModalId(null)}>Batal</Button>
                  <Button type="button" onClick={handleSaveVd} loading={saveVd.isPending}>Simpan Diskon</Button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
