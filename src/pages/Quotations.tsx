import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, FileCheck2, Loader2, Trash2, X } from 'lucide-react';
import { PageHeader, Button, FormField } from '@/components/ui';
import type { NeracaQuotation, NeracaQuotationStatus } from '@/types';
import { useNeracaQuotations, useSaveNeracaQuotation, useDeleteNeracaQuotation, useInquiries } from '@/hooks/useData';
import { formatDate, formatCurrency } from '@/lib/utils';

const STATUS_OPTIONS: NeracaQuotationStatus[] = ['Draft', 'Send', 'PO', 'Invoice', 'Tracking', 'Selesai'];

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Send: 'bg-blue-100 text-blue-700',
  PO: 'bg-violet-100 text-violet-700',
  Invoice: 'bg-amber-100 text-amber-700',
  Tracking: 'bg-cyan-100 text-cyan-700',
  Selesai: 'bg-emerald-100 text-emerald-700',
};

const TAB_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Send', value: 'Send' },
  { label: 'PO', value: 'PO' },
  { label: 'Invoice', value: 'Invoice' },
  { label: 'Tracking', value: 'Tracking' },
  { label: 'Selesai', value: 'Selesai' },
];

export default function Quotations() {
  const navigate = useNavigate();
  const { data: inquiries = [] } = useInquiries();
  const { data: quotations = [], isLoading } = useNeracaQuotations();
  const saveQuotation = useSaveNeracaQuotation();

  const [activeTab, setActiveTab] = useState('all');
  const [editingQt, setEditingQt] = useState<NeracaQuotation | null>(null);
  const [editForm, setEditForm] = useState<{ status: NeracaQuotationStatus }>({ status: 'Draft' });
  const deleteQuotation = useDeleteNeracaQuotation();

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

  // Helper to get document link from Inquiry
  const getInquiryDocument = (inquiryId: string) => {
    const inq = inquiries.find(i => i.id === inquiryId);
    if (!inq || !inq.documents) return null;
    try {
      const docs = JSON.parse(inq.documents);
      if (Array.isArray(docs) && docs.length > 0) return docs[0].url;
      return docs;
    } catch {
      return inq.documents; // If it's just a raw URL string
    }
  };

  const tabCount = (value: string) => {
    if (value === 'all') return uniqueQuotations.length;
    return uniqueQuotations.filter(q => q.status === value).length;
  };

  const filtered = useMemo(() => {
    if (activeTab === 'all') return uniqueQuotations;
    return uniqueQuotations.filter(q => q.status === activeTab);
  }, [uniqueQuotations, activeTab]);

  const handleDelete = async (q: NeracaQuotation) => {
    if (!confirm(`Hapus quotation ${q.quotation_number}?`)) return;
    // Delete ALL quotations with same neraca_id (clean duplicates too)
    const dupes = quotations.filter(x => x.neraca_id === q.neraca_id);
    for (const dupe of dupes) {
      await deleteQuotation.mutateAsync(dupe.id);
    }
  };

  const openEdit = (q: NeracaQuotation) => {
    setEditForm({ status: q.status });
    setEditingQt(q);
  };

  const handleSaveEdit = async () => {
    if (!editingQt) return;
    await saveQuotation.mutateAsync({
      ...editingQt,
      status: editForm.status,
      updated_date: new Date().toISOString().split('T')[0],
    });
    setEditingQt(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Customer Quotations" subtitle={`${quotations.length} quotation`} />

      {/* Status Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TAB_FILTERS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-gray-400">({tabCount(tab.value)})</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">No. Quotation</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Judul Permintaan</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Nilai</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dokumen</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <FileCheck2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Belum ada quotation. Buat dari halaman Neraca.</p>
                  </td>
                </tr>
              ) : filtered.map(q => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-blue-700">{q.quotation_number}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{q.customer_name}</td>
                  <td className="px-5 py-3 text-gray-600 max-w-[180px] truncate">{q.request_title}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">
                    {Number(q.nilai) > 0 ? formatCurrency(Number(q.nilai)) : <span className="text-gray-400 font-normal text-xs">-</span>}
                  </td>
                  <td className="px-5 py-3">
                    {(() => {
                      const docUrl = getInquiryDocument(q.inquiry_id);
                      return docUrl ? (
                        <a href={docUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800">Lihat Dok.</a>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[q.status] || 'bg-gray-100 text-gray-600'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{formatDate(q.created_date)}</td>
                   <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(q)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(q)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Hapus" disabled={deleteQuotation.isPending}>
                        {deleteQuotation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => navigate(`/quotations/${q.id}`)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                      >
                        Detail →
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingQt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingQt(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Edit Quotation</h2>
              <button onClick={() => setEditingQt(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-mono font-semibold text-blue-700">{editingQt.quotation_number}</p>
                <p className="text-gray-600 text-xs mt-1">{editingQt.customer_name} — {editingQt.request_title}</p>
              </div>

              <FormField label="Status">
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditForm(f => ({ ...f, status: s }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        editForm.status === s
                          ? `${STATUS_COLORS[s]} border-current ring-2 ring-offset-1 ring-current`
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </FormField>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setEditingQt(null)}>Batal</Button>
              <Button onClick={handleSaveEdit} loading={saveQuotation.isPending}>Simpan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
