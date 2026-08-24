import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { Button } from '@/components/ui';
import { useNeracaItems, useVendorDiscounts, useGetNextPoNumber, useSavePurchaseOrder } from '@/hooks/useData';
import type { NeracaQuotation } from '@/types';

interface GeneratePoModalProps {
  quotation: NeracaQuotation | null;
  onClose: () => void;
  onSuccess: (quotation: NeracaQuotation) => void;
}

export default function GeneratePoModal({ quotation, onClose, onSuccess }: GeneratePoModalProps) {
  const { data: items = [], isLoading: loadingItems } = useNeracaItems(quotation?.neraca_id || '');
  const { data: vds = [], isLoading: loadingVds } = useVendorDiscounts(quotation?.neraca_id || '');
  const getNextPoNumber = useGetNextPoNumber();
  const savePurchaseOrder = useSavePurchaseOrder();
  
  const [isGenerating, setIsGenerating] = useState(false);

  const uniqueVendors = useMemo(() => {
    if (!quotation) return [];
    
    // Find unique vendors from items
    const vendorMap = new Map<string, { id: string, name: string }>();
    items.forEach(item => {
      if (item.vendor_id && item.vendor_name) {
        vendorMap.set(item.vendor_id, { id: item.vendor_id, name: item.vendor_name });
      }
    });
    return Array.from(vendorMap.values());
  }, [items, quotation]);

  const handleGenerate = async () => {
    if (!quotation) return;
    setIsGenerating(true);
    
    try {
      // Get starting PO number
      const nextNumRes = await getNextPoNumber.mutateAsync();
      const parts = String(nextNumRes).split('/');
      let currentCounter = parseInt(parts[0], 10);
      const prefix = parts.slice(1).join('/');

      for (const vendor of uniqueVendors) {
        const poNumber = `${currentCounter}/${prefix}`;
        currentCounter++;
        
        // Find items for this vendor
        const vItems = items.filter(i => i.vendor_id === vendor.id);
        const vd = vds.find(d => d.vendor_id === vendor.id);
        
        // Calculate total items (qty)
        const jumlahItem = vItems.length;
        
        // Calculate total_nilai based on qty * (harga_beli - disc)
        let total_nilai = 0;
        let totalDiscVal = 0;
        let totalBeli = 0;
        
        vItems.forEach(item => {
          const hb = Number(item.harga_beli) || 0;
          const qty = Number(item.qty) || 1;
          totalBeli += (hb * qty);
        });
        
        if (vd) {
          if (vd.discount_pct > 0) totalDiscVal = totalBeli * (vd.discount_pct / 100);
          else if (vd.discount_cash > 0) totalDiscVal = vd.discount_cash;
        }
        
        total_nilai = totalBeli - totalDiscVal;
        
        // Collect all documents
        const docs: any[] = [];
        for (const item of vItems) {
          if (item.documents) {
            try {
              const p = JSON.parse(item.documents);
              if (Array.isArray(p)) docs.push(...p);
            } catch {}
          }
        }
        
        const poId = `PO-${Date.now()}-${currentCounter}`;
        
        await savePurchaseOrder.mutateAsync({
          id: poId,
          po_number: poNumber,
          neraca_id: quotation.neraca_id,
          quotation_id: quotation.id,
          vendor_id: vendor.id,
          vendor_name: vendor.name,
          jumlah_item: jumlahItem,
          total_nilai: total_nilai,
          dokumen: JSON.stringify(docs),
          status: 'Active',
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString()
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
    <Modal isOpen={!!quotation} onClose={onClose} title="Buat Purchase Order">
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : (
          <>
            <p className="text-gray-600">
              Apakah Anda yakin ingin membuat PO untuk quotation <strong>{quotation?.quotation_number}</strong>?
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">PO akan dibuat untuk {uniqueVendors.length} vendor:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {uniqueVendors.map(v => (
                  <li key={v.id}>{v.name}</li>
                ))}
              </ul>
              {uniqueVendors.length === 0 && <p className="text-sm text-amber-600">Peringatan: Tidak ada vendor yang ditemukan pada neraca ini.</p>}
            </div>
            
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
              <Button variant="secondary" onClick={onClose} disabled={isGenerating}>Batal</Button>
              <Button onClick={handleGenerate} loading={isGenerating} disabled={uniqueVendors.length === 0}>
                Buat {uniqueVendors.length} PO
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
