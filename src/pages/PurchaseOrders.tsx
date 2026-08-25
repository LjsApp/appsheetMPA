import { useState } from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Printer, Plus } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import { usePurchaseOrders, usePoIns } from '@/hooks/useData';
import type { PurchaseOrder, NeracaQuotation } from '@/types';
import { formatCurrency } from '@/lib/utils';
import AddPoOutModal from '@/components/AddPoOutModal';
import GeneratePoModal from '@/components/GeneratePoModal';

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { data: purchaseOrders = [], isLoading: loadingPOs, refetch: refetchPOs } = usePurchaseOrders();
  const { data: poIns = [], isLoading: loadingPoIns } = usePoIns();
  const isLoading = loadingPOs || loadingPoIns;

  const [showAddModal, setShowAddModal] = useState(false);
  const [generatingPoQt, setGeneratingPoQt] = useState<NeracaQuotation | null>(null);

  const handleContinueAdd = (qt: NeracaQuotation) => {
    setShowAddModal(false);
    setGeneratingPoQt(qt);
  };

  const groupedPOs = useMemo(() => {
    const groups = new Map<string, PurchaseOrder[]>();
    purchaseOrders.forEach(po => {
      const key = po.quotation_id || po.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(po);
    });
    return Array.from(groups.values());
  }, [purchaseOrders]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader
          title="PO Out"
          subtitle={`${purchaseOrders.length} PO Out`}
        />
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Tambah PO Out
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-gray-500">
            Belum ada data PO Out
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">CUSTOMER</th>
                  <th className="px-6 py-4">NO. PO OUT</th>
                  <th className="px-6 py-4">VENDOR</th>
                  <th className="px-6 py-4 text-center">JML ITEM</th>
                  <th className="px-6 py-4 text-right">TOTAL NILAI</th>
                  <th className="px-6 py-4">DOKUMEN</th>
                  <th className="px-6 py-4 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groupedPOs.map((group) => {
                  return group.map((po, index) => {
                    let docs: any[] = [];
                    if (po.dokumen) {
                      try {
                        docs = JSON.parse(po.dokumen);
                      } catch {}
                    }

                    const poIn = poIns.find(p => p.quotation_id === po.quotation_id);

                    return (
                      <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                        {index === 0 && (
                          <td rowSpan={group.length} className="px-6 py-4 align-top border-r border-gray-100 bg-white">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">{poIn?.customer_name || '—'}</span>
                              <span className="text-xs text-gray-500 font-medium truncate max-w-[200px]" title={poIn?.judul}>{poIn?.judul || '—'}</span>
                              <span className="text-[11px] text-gray-400 font-mono mt-0.5">{poIn?.po_in_number || '—'}</span>
                            </div>
                          </td>
                        )}
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
                              className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                              title="Cetak / Detail PO"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddPoOutModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onContinue={handleContinueAdd}
      />

      <GeneratePoModal 
        quotation={generatingPoQt}
        skipPoInForm={true}
        onClose={() => setGeneratingPoQt(null)}
        onSuccess={() => {
          refetchPOs();
          setGeneratingPoQt(null);
        }}
      />
    </div>
  );
}
