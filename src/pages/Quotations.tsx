import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, Loader2, Trash2, ShoppingCart } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import type { NeracaQuotation, NeracaQuotationStatus, PurchaseOrder } from '@/types';
import {
  useNeracaQuotations, useSaveNeracaQuotation, useDeleteNeracaQuotation,
  useInquiries, usePurchaseOrders, useDeletePurchaseOrder
} from '@/hooks/useData';
import { formatDate, formatCurrency } from '@/lib/utils';
import GeneratePoModal from '@/components/GeneratePoModal';



export default function Quotations() {
  const navigate = useNavigate();
  const { data: inquiries = [] } = useInquiries();
  const { data: quotations = [], isLoading } = useNeracaQuotations();
  const saveQuotation = useSaveNeracaQuotation();
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const deletePurchaseOrder = useDeletePurchaseOrder();

  const [generatingPoQt, setGeneratingPoQt] = useState<NeracaQuotation | null>(null);
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


  const handleDelete = async (q: NeracaQuotation) => {
    if (!confirm(`Hapus quotation ${q.quotation_number}?`)) return;
    const dupes = quotations.filter(x => x.neraca_id === q.neraca_id);
    for (const dupe of dupes) {
      await deleteQuotation.mutateAsync(dupe.id);
    }
  };

  const handlePoGenerated = async () => {
    setGeneratingPoQt(null);
    navigate('/po');
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Customer Quotations" subtitle={`${uniqueQuotations.length} quotation`} />

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
              ) : uniqueQuotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <FileCheck2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Belum ada quotation. Buat dari halaman Neraca.</p>
                  </td>
                </tr>
              ) : uniqueQuotations.map(q => {
                const activePOs = purchaseOrders.filter(p => p.quotation_id === q.id);
                const hasPO = activePOs.length > 0;
                return (
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
                    <td className="px-5 py-3 text-xs text-gray-500">{q.status}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{formatDate(q.created_date)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!hasPO ? (
                          <button
                            onClick={() => setGeneratingPoQt(q)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                          >
                            <ShoppingCart className="w-3 h-3" />
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
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/quotations/${q.id}`)}>
                          Detail
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <GeneratePoModal
        quotation={generatingPoQt}
        onClose={() => setGeneratingPoQt(null)}
        onSuccess={handlePoGenerated}
      />
    </div>
  );
}
