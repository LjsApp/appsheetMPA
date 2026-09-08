import { useState, useMemo } from 'react';

import Modal from '@/components/Modal';
import { Button } from '@/components/ui';
import SearchableSelect from '@/components/SearchableSelect';
import { usePoIns, useNeracaQuotations, usePurchaseOrders } from '@/hooks/useData';
import type { NeracaQuotation } from '@/types';

interface AddPoOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (quotation: NeracaQuotation) => void;
}

export default function AddPoOutModal({ isOpen, onClose, onContinue }: AddPoOutModalProps) {
  const { data: poIns = [] } = usePoIns();
  const { data: quotations = [] } = useNeracaQuotations();
  const { data: purchaseOrders = [] } = usePurchaseOrders();

  const [selectedPoInId, setSelectedPoInId] = useState('');

  // Find PO In that already have PO Out (linked via quotation_id)
  const usedPoInQuotationIds = useMemo(() => {
    return new Set(purchaseOrders.map(p => p.quotation_id).filter(Boolean));
  }, [purchaseOrders]);

  const poInOptions = useMemo(() =>
    poIns.map(p => {
      const isUsed = usedPoInQuotationIds.has(p.quotation_id);
      return {
        value: p.id,
        label: `${p.po_in_number || p.id} — ${p.customer_name}${isUsed ? ' ✓ Sudah PO Out' : ''}`,
        disabled: isUsed,
      };
    }),
  [poIns, usedPoInQuotationIds]);

  const handleContinue = () => {
    if (!selectedPoInId) return;
    const poIn = poIns.find(p => p.id === selectedPoInId);
    if (!poIn) return;

    const qt = quotations.find(q => q.id === poIn.quotation_id);
    if (!qt) {
      alert('Quotation untuk PO In ini tidak ditemukan.');
      return;
    }

    onContinue(qt);
  };

  const handleClose = () => {
    setSelectedPoInId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Tambah PO Out" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Pilih PO In <span className="text-red-500">*</span></label>
          <SearchableSelect
            options={poInOptions}
            value={selectedPoInId}
            onChange={setSelectedPoInId}
            placeholder="-- Pilih PO In --"
          />
          {selectedPoInId && (
            <p className="text-xs text-gray-500 mt-2">
              Sistem akan membuat PO Out untuk vendor berdasarkan quotation yang terhubung dengan PO In ini.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={handleClose}>Batal</Button>
          <Button onClick={handleContinue} disabled={!selectedPoInId}>
            Lanjut Buat PO Out
          </Button>
        </div>
      </div>
    </Modal>
  );
}
