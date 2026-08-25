import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, Loader2, Trash2, ShoppingCart, Plus, X, Printer } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import type { NeracaQuotation } from '@/types';
import {
  useNeracaQuotations, useDeleteNeracaQuotation,
  useInquiries, usePurchaseOrders,
  useNeracas, useSaveNeracaQuotation, useGetNextQuotationNumber, fetchApi,
  useNeracaItems, useNeracaDetail
} from '@/hooks/useData';
import { calculateNeracaGrandTotal } from '@/lib/neracaUtils';
import { formatDate, formatCurrency } from '@/lib/utils';
import GeneratePoModal from '@/components/GeneratePoModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Helper component to render a single neraca row in the modal
function NeracaSelectionRow({ 
  neraca, 
  isUsed, 
  isSelected, 
  onToggle 
}: { 
  neraca: any; 
  isUsed: boolean; 
  isSelected: boolean; 
  onToggle: (id: string) => void;
}) {
  const { data: items } = useNeracaItems(neraca.id);
  const { data: detail } = useNeracaDetail(neraca.id);
  
  const total = items ? calculateNeracaGrandTotal(items, detail || undefined) : 0;

  return (
    <tr className="bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
      <td className="px-4 py-2 border-b border-gray-100"></td>
      <td colSpan={3} className="px-4 py-2 border-b border-gray-100">
        <div className="flex items-center justify-between w-full">
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input 
              type="checkbox" 
              disabled={isUsed} 
              checked={isUsed || isSelected} 
              onChange={() => onToggle(neraca.id)} 
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <span className={`text-sm ${isUsed ? 'text-gray-400' : 'text-gray-700'}`}>
              {neraca.name || neraca.id}
            </span>
          </label>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-gray-700">
              {total > 0 ? formatCurrency(total) : '-'}
            </span>
            {isUsed && (
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">✓ Sudah Jadi Quotation</span>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}



export default function Quotations() {
  const navigate = useNavigate();
  const { data: inquiries = [] } = useInquiries();
  const { data: quotations = [], isLoading } = useNeracaQuotations();
  const { data: purchaseOrders = [] } = usePurchaseOrders();

  const [generatingPoQt, setGeneratingPoQt] = useState<NeracaQuotation | null>(null);
  const deleteQuotation = useDeleteNeracaQuotation();
  const { data: neracas = [] } = useNeracas();
  const { data: allQuotations } = useNeracaQuotations();
  const saveQuotation = useSaveNeracaQuotation();
  const getNextQtNumber = useGetNextQuotationNumber();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedNeracaIds, setSelectedNeracaIds] = useState<Set<string>>(new Set());
  const [expandedInq, setExpandedInq] = useState<Record<string, boolean>>({});
  const [isCreatingQt, setIsCreatingQt] = useState(false);

  const toggleNeracaSelection = (id: string) => {
    setSelectedNeracaIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleInqExpand = (id: string) => {
    setExpandedInq(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // neraca IDs that already have a quotation
  const usedNeracaIds = useMemo(() => new Set((allQuotations || []).map(q => q.neraca_id).filter(Boolean)), [allQuotations]);

  const handleAddQuotation = async () => {
    if (selectedNeracaIds.size === 0) return;
    setIsCreatingQt(true);
    try {
      const baseQtNumber = await getNextQtNumber.mutateAsync();
      // If baseQtNumber looks like 1/QT/MPA/08.2026, we can try to increment it for multiple, 
      // but to be safe we just fetch once and add an index if multiple.
      // Alternatively, we just create them with Date.now() based IDs and base numbers.
      let counter = 0;

      for (const neracaId of Array.from(selectedNeracaIds)) {
        const neraca = neracas.find(n => n.id === neracaId);
        if (!neraca) continue;
        const inquiry = inquiries.find(i => i.id === neraca.inquiry_id);
        if (!inquiry) continue;

        const items = await fetchApi(`getNeracaItems&neraca_id=${neraca.id}`);
        const detail = await fetchApi(`getNeracaDetail&neraca_id=${neraca.id}`);
        const grandTotal = calculateNeracaGrandTotal(items || [], detail || undefined);
        
        let qtNum = baseQtNumber || `QT-${new Date().getFullYear()}-${Date.now()}`;
        if (counter > 0 && baseQtNumber) {
           // simple increment logic if possible, else just append counter
           const parts = String(baseQtNumber).split('/');
           if (parts.length > 1) {
             const num = parseInt(parts[0], 10) + counter;
             qtNum = `${num}/${parts.slice(1).join('/')}`;
           } else {
             qtNum = `${baseQtNumber}-${counter}`;
           }
        }

        const payload = {
          id: `QT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          quotation_number: qtNum,
          neraca_id: neraca.id,
          inquiry_id: inquiry.id,
          customer_id: inquiry.customer_id || '',
          customer_name: inquiry.customer_name || '',
          request_title: inquiry.request_title || '',
          nilai: grandTotal,
          dokumen: '',
          status: 'Draft' as const,
          created_date: new Date().toISOString().split('T')[0],
          updated_date: new Date().toISOString().split('T')[0],
        };
        await saveQuotation.mutateAsync(payload);
        counter++;
      }
      setShowAddModal(false);
      setSelectedNeracaIds(new Set());
    } catch (e: any) {
      alert('Gagal membuat quotation: ' + e.message);
    } finally {
      setIsCreatingQt(false);
    }
  };

  // Deduplicate: keep only one (latest) quotation per neraca_id
  const uniqueQuotations = useMemo(() => {
    const map = new Map<string, NeracaQuotation>();
    quotations.forEach(q => {
      const existing = map.get(q.neraca_id);
      if (!existing || q.created_date > existing.created_date) {
        map.set(q.neraca_id, q);
      }
    });
    return Array.from(map.values());
  }, [quotations]);

  const getInquiryDocument = (inquiryId: string) => {
    const inq = inquiries.find(i => i.id === inquiryId);
    if (!inq || !inq.documents) return null;
    try {
      const docs = JSON.parse(inq.documents);
      if (Array.isArray(docs) && docs.length > 0) return docs[0].url;
      return docs;
    } catch {
      return inq.documents;
    }
  };


  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; title: string; quotation: NeracaQuotation | null }>({ isOpen: false, id: null, title: '', quotation: null });

  const handleDelete = (q: NeracaQuotation) => {
    setDeleteModal({ isOpen: true, id: q.id, title: `Hapus Quotation ${q.quotation_number}`, quotation: q });
  };

  const executeDelete = async () => {
    if (!deleteModal.quotation) return;
    const q = deleteModal.quotation;
    const dupes = quotations.filter(x => x.neraca_id === q.neraca_id);
    for (const dupe of dupes) {
      await deleteQuotation.mutateAsync(dupe.id);
    }
    setDeleteModal({ isOpen: false, id: null, title: '', quotation: null });
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handlePoGenerated = async () => {
    setIsGenerating(false);
    setGeneratingPoQt(null);
    navigate('/po-in');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer Quotations"
        subtitle={`${uniqueQuotations.length} quotation`}
        action={
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Tambah Quotation
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">No. Quotation</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Nilai</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dokumen</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : uniqueQuotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <FileCheck2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Belum ada quotation. Buat dari halaman Neraca.</p>
                  </td>
                </tr>
              ) : (() => {
                // Group by inquiry_id
                const groups = new Map<string, NeracaQuotation[]>();
                uniqueQuotations.forEach(q => {
                  const key = q.inquiry_id || q.id;
                  if (!groups.has(key)) groups.set(key, []);
                  groups.get(key)!.push(q);
                });

                return Array.from(groups.values()).map(group => {
                  const inquiry = inquiries.find(i => i.id === group[0].inquiry_id);
                  return group.map((q, idx) => {
                    const activePOs = purchaseOrders.filter(p => p.quotation_id === q.id);
                    const hasPO = activePOs.length > 0;
                    const docUrl = getInquiryDocument(q.inquiry_id);
                    return (
                      <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                        {/* Customer cell — merged for the whole group */}
                        {idx === 0 && (
                          <td rowSpan={group.length} className="px-5 py-4 align-top border-r border-gray-100 bg-white">
                            <div className="font-semibold text-gray-900">{q.customer_name}</div>
                            <div className="font-mono text-xs text-gray-500 mt-0.5">{inquiry?.request_number || '-'}</div>
                            <div className="text-xs text-gray-400 max-w-[160px] truncate mt-0.5" title={inquiry?.request_title}>{inquiry?.request_title || '-'}</div>
                          </td>
                        )}
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-blue-700">{q.quotation_number}</td>
                        <td className="px-5 py-4 text-right font-semibold text-gray-900">
                          {Number(q.nilai) > 0 ? formatCurrency(Number(q.nilai)) : <span className="text-gray-400 font-normal text-xs">-</span>}
                        </td>
                        <td className="px-5 py-4">
                          {docUrl ? (
                            <a href={docUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800">Lihat Dok.</a>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500">{q.status}</td>
                        <td className="px-5 py-4 text-xs text-gray-500">{formatDate(q.created_date)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!hasPO ? (
                              <button
                                onClick={() => { setIsGenerating(true); setGeneratingPoQt(q); }}
                                disabled={isGenerating && generatingPoQt?.id === q.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                              >
                                {isGenerating && generatingPoQt?.id === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />}
                                Buat PO
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate('/po')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
                              >
                                Sudah PO ({activePOs.length})
                              </button>
                            )}
                            <button onClick={() => handleDelete(q)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => navigate(`/quotations/${q.id}`)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Cetak / Detail Quotation"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                });
              })()}
            </tbody>

          </table>
        </div>
      </div>

      <GeneratePoModal
        quotation={generatingPoQt}
        onClose={() => {
          setGeneratingPoQt(null);
          setIsGenerating(false);
        }}
        onSuccess={handlePoGenerated}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeDelete}
        title={deleteModal.title}
        description="Yakin ingin menghapus quotation ini?"
        isLoading={deleteQuotation.isPending}
      />

      {/* Add Quotation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-900">Tambah Quotation</h2>
              <button onClick={() => { setShowAddModal(false); setSelectedNeracaIds(new Set()); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            
            <div className="p-0 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="w-10 px-4 py-3"></th>
                    <th className="px-4 py-3 font-semibold text-gray-600">No. Permintaan</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Customer</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Judul</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inquiries.filter(i => i.status === 'Neraca').length === 0 && (
                     <tr><td colSpan={4} className="p-8 text-center text-gray-500">Belum ada inquiry di tahap Neraca.</td></tr>
                  )}
                  {inquiries.filter(i => i.status === 'Neraca').map(inq => {
                    const inqNeracas = neracas.filter(n => n.inquiry_id === inq.id);
                    if (inqNeracas.length === 0) return null;
                    const isExpanded = expandedInq[inq.id];
                    return (
                      <React.Fragment key={inq.id}>
                        <tr className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => toggleInqExpand(inq.id)}>
                          <td className="px-4 py-3 text-gray-400">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="px-4 py-3 font-medium text-blue-600">{inq.request_number}</td>
                          <td className="px-4 py-3 text-gray-800">{inq.customer_name}</td>
                          <td className="px-4 py-3 text-gray-700 truncate max-w-[200px]" title={inq.request_title}>{inq.request_title}</td>
                        </tr>
                        {isExpanded && inqNeracas.map(n => (
                          <NeracaSelectionRow 
                            key={n.id}
                            neraca={n}
                            isUsed={usedNeracaIds.has(n.id)}
                            isSelected={selectedNeracaIds.has(n.id)}
                            onToggle={toggleNeracaSelection}
                          />
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center p-5 border-t bg-gray-50 rounded-b-2xl">
              <span className="text-sm font-medium text-gray-600">{selectedNeracaIds.size} neraca dipilih</span>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => { setShowAddModal(false); setSelectedNeracaIds(new Set()); }}>Batal</Button>
                <Button onClick={handleAddQuotation} loading={isCreatingQt} disabled={selectedNeracaIds.size === 0}>
                  Buat Quotation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
