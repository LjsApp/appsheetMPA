import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { usePurchaseOrders, useDeletePurchaseOrder } from '@/hooks/useData';
import type { PurchaseOrder } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { data: purchaseOrders = [], isLoading } = usePurchaseOrders();
  const deletePurchaseOrder = useDeletePurchaseOrder();

  const handleDeletePo = async (po: PurchaseOrder) => {
    if (confirm(`Hapus PO ${po.po_number}?`)) {
      await deletePurchaseOrder.mutateAsync(po.id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle={`${purchaseOrders.length} purchase order`}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-gray-500">
            Belum ada data Purchase Order
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">NO. PO</th>
                  <th className="px-6 py-4">VENDOR</th>
                  <th className="px-6 py-4 text-center">JML ITEM</th>
                  <th className="px-6 py-4 text-right">TOTAL NILAI</th>
                  <th className="px-6 py-4">DOKUMEN</th>
                  <th className="px-6 py-4 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchaseOrders.map((po) => {
                  let docs: any[] = [];
                  if (po.dokumen) {
                    try {
                      docs = JSON.parse(po.dokumen);
                    } catch {}
                  }

                  return (
                    <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-violet-700">
                        {po.po_number}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {po.vendor_name}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {po.jumlah_item}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        Rp {formatCurrency(Number(po.total_nilai))}
                      </td>
                      <td className="px-6 py-4">
                        {docs.length > 0 ? (
                          <div className="flex gap-2 flex-wrap">
                            {docs.map((d: any, idx: number) => (
                              <a
                                key={`${po.id}-doc-${idx}`}
                                href={d.url || d}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-1 rounded-md transition-colors"
                              >
                                Dok.{idx + 1}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Tidak ada dokumen</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => navigate(`/po/${po.id}`)}
                            className="text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
                          >
                            Detail →
                          </button>
                          <button
                            onClick={() => handleDeletePo(po)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Hapus PO"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
