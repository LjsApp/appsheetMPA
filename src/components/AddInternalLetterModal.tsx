import { useState, useMemo } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui";
import { usePoIns, useInternalLetters, useNeracaItems, useVendorDiscounts, useSaveInternalLetter, useGetNextInternalLetterNumber, useNeracaQuotations, usePurchaseOrders } from "@/hooks/useData";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddInternalLetterModal({ isOpen, onClose, onSuccess }: Props) {
  const { data: poIns = [] } = usePoIns();
  const { data: internalLetters = [] } = useInternalLetters();
  const { data: quotations = [] } = useNeracaQuotations();
  const { data: purchaseOrders = [] } = usePurchaseOrders();
  const saveInternalLetter = useSaveInternalLetter();
  const getNextNumber = useGetNextInternalLetterNumber();

  const [selectedPoInId, setSelectedPoInId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const usedPoInIds = useMemo(() => {
    return new Set(internalLetters.map((il) => il.po_in_id).filter(Boolean));
  }, [internalLetters]);

  const selectedPoIn = useMemo(() => poIns.find((p) => p.id === selectedPoInId), [poIns, selectedPoInId]);
  const selectedQuotation = useMemo(() => quotations.find((q) => q.id === selectedPoIn?.quotation_id), [quotations, selectedPoIn]);

  const { data: items = [] } = useNeracaItems(selectedQuotation?.neraca_id || "");
  const { data: vds = [] } = useVendorDiscounts(selectedQuotation?.neraca_id || "");

  const uniqueVendors = useMemo(() => {
    const vendorMap = new Map<string, { id: string; name: string }>();
    items.forEach((item) => {
      if (item.vendor_id && item.vendor_name) {
        vendorMap.set(item.vendor_id, { id: item.vendor_id, name: item.vendor_name });
      }
    });
    return Array.from(vendorMap.values());
  }, [items]);

  const handleGenerate = async () => {
    if (!selectedPoIn || !selectedQuotation) return;
    setIsGenerating(true);
    try {
      const nextNumRes = await getNextNumber.mutateAsync();
      const parts = String(nextNumRes).split("/");
      let counter = parseInt(parts[0], 10);
      const suffix = parts.slice(1).join("/");

      for (const vendor of uniqueVendors) {
        const ilNumber = `${counter}/${suffix}`;
        counter++;

        const vItems = items.filter((i) => i.vendor_id === vendor.id);
        const vd = vds.find((d) => d.vendor_id === vendor.id);

        let totalBeli = 0;
        vItems.forEach((item) => {
          totalBeli += (Number(item.harga_beli) || 0) * (Number(item.qty) || 1);
        });

        let totalDisc = 0;
        if (vd) {
          if ((vd.discount_pct || 0) > 0) totalDisc = totalBeli * ((vd.discount_pct || 0) / 100);
          else if ((vd.discount_cash || 0) > 0) totalDisc = vd.discount_cash || 0;
        }
        const totalNilai = totalBeli - totalDisc;

        let dpVal = 0;
        if (vd) {
          if (vd.dp_pct && vd.dp_pct > 0) dpVal = totalNilai * (vd.dp_pct / 100);
          else if (vd.dp_nominal && vd.dp_nominal > 0) dpVal = vd.dp_nominal;
        }

        const baseIlId = `IL-${Date.now()}-${vendor.id.slice(-4)}`;

        if (dpVal > 0) {
          // Buat 2 IL: DP dan Sisa
          const ilDpId = baseIlId + '-DP';
          const ilSisaId = baseIlId + '-SISA';
          
          const linkedPoOutDp = purchaseOrders.find(
            (po) => po.quotation_id === selectedQuotation.id && po.vendor_id === vendor.id && po.type === "DP"
          );
          
          const linkedPoOutSisa = purchaseOrders.find(
            (po) => po.quotation_id === selectedQuotation.id && po.vendor_id === vendor.id && po.type === "Sisa"
          );

          // 1. IL DP
          await saveInternalLetter.mutateAsync({
            id: ilDpId,
            po_in_id: selectedPoIn.id,
            po_out_id: linkedPoOutDp?.id || "",
            quotation_id: selectedQuotation.id,
            neraca_id: selectedQuotation.neraca_id,
            vendor_id: vendor.id,
            vendor_name: vendor.name,
            customer_id: selectedQuotation.customer_id,
            customer_name: selectedQuotation.customer_name,
            internal_letter_number: ilNumber,
            tanggal: new Date().toISOString().split("T")[0],
            perihal: "-",
            franco: "-",
            jumlah_item: vItems.length,
            total_nilai: dpVal,
            type: 'DP',
            dokumen: JSON.stringify([]),
            created_date: new Date().toISOString(),
            updated_date: new Date().toISOString(),
          });
          
          // 2. IL Sisa
          await saveInternalLetter.mutateAsync({
            id: ilSisaId,
            po_in_id: selectedPoIn.id,
            po_out_id: linkedPoOutSisa?.id || "",
            quotation_id: selectedQuotation.id,
            neraca_id: selectedQuotation.neraca_id,
            vendor_id: vendor.id,
            vendor_name: vendor.name,
            customer_id: selectedQuotation.customer_id,
            customer_name: selectedQuotation.customer_name,
            internal_letter_number: ilNumber,
            tanggal: new Date().toISOString().split("T")[0],
            perihal: "-",
            franco: "-",
            jumlah_item: vItems.length,
            total_nilai: totalNilai - dpVal,
            type: 'Sisa',
            dp_reference_id: ilDpId,
            dokumen: JSON.stringify([]),
            created_date: new Date().toISOString(),
            updated_date: new Date().toISOString(),
          });
        } else {
          // Buat 1 IL Full
          const linkedPoOut = purchaseOrders.find(
            (po) => po.quotation_id === selectedQuotation.id && po.vendor_id === vendor.id && (po.type === "Full" || !po.type)
          );

          await saveInternalLetter.mutateAsync({
            id: baseIlId,
            po_in_id: selectedPoIn.id,
            po_out_id: linkedPoOut?.id || "",
            quotation_id: selectedQuotation.id,
            neraca_id: selectedQuotation.neraca_id,
            vendor_id: vendor.id,
            vendor_name: vendor.name,
            customer_id: selectedQuotation.customer_id,
            customer_name: selectedQuotation.customer_name,
            internal_letter_number: ilNumber,
            tanggal: new Date().toISOString().split("T")[0],
            perihal: "-",
            franco: "-",
            jumlah_item: vItems.length,
            total_nilai: totalNilai,
            type: 'Full',
            dokumen: JSON.stringify([]),
            created_date: new Date().toISOString(),
            updated_date: new Date().toISOString(),
          });
        }
      }

      onSuccess();
      handleClose();
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan saat membuat Internal Letter");
    } finally {
      setIsGenerating(false);
    }
  };

  const calculatedLetters = useMemo(() => {
    const letters: { vendorName: string; type: string; }[] = [];
    uniqueVendors.forEach((vendor) => {
      const vd = vds.find((d) => d.vendor_id === vendor.id);
      
      const vItems = items.filter((i) => i.vendor_id === vendor.id);
      let totalBeli = 0;
      vItems.forEach((item) => {
        totalBeli += (Number(item.harga_beli) || 0) * (Number(item.qty) || 1);
      });
      let totalDisc = 0;
      if (vd) {
        if ((vd.discount_pct || 0) > 0) totalDisc = totalBeli * ((vd.discount_pct || 0) / 100);
        else if ((vd.discount_cash || 0) > 0) totalDisc = vd.discount_cash || 0;
      }
      const totalNilai = totalBeli - totalDisc;

      let dpVal = 0;
      if (vd) {
        if (vd.dp_pct && vd.dp_pct > 0) dpVal = totalNilai * (vd.dp_pct / 100);
        else if (vd.dp_nominal && vd.dp_nominal > 0) dpVal = vd.dp_nominal;
      }
      
      if (dpVal > 0) {
        letters.push({ vendorName: vendor.name, type: 'DP' });
        letters.push({ vendorName: vendor.name, type: 'Sisa' });
      } else {
        letters.push({ vendorName: vendor.name, type: 'Full' });
      }
    });
    return letters;
  }, [uniqueVendors, vds, items]);

  const handleClose = () => {
    setSelectedPoInId("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Tambah Internal Letter" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Pilih PO In <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedPoInId}
            onChange={(e) => setSelectedPoInId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-400"
          >
            <option value="">-- Pilih PO In --</option>
            {poIns.map((p) => {
              const isUsed = usedPoInIds.has(p.id);
              return (
                <option key={p.id} value={p.id} disabled={isUsed}>
                  {p.po_in_number || p.id} - {p.customer_name} {isUsed ? "(Sudah dibuat)" : ""}
                </option>
              );
            })}
          </select>
        </div>

        {selectedPoIn && calculatedLetters.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-800 mb-1">
              Akan dibuat {calculatedLetters.length} Internal Letter untuk:
            </p>
            <ul className="list-disc list-inside text-xs text-blue-700 space-y-0.5">
              {calculatedLetters.map((l, idx) => (
                <li key={idx}>{l.vendorName} {l.type !== 'Full' ? `(${l.type})` : ''}</li>
              ))}
            </ul>
          </div>
        )}

        {selectedPoIn && uniqueVendors.length === 0 && (
          <p className="text-xs text-amber-600">Tidak ada vendor ditemukan pada neraca PO In ini.</p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={handleClose}>
            Batal
          </Button>
          <Button onClick={handleGenerate} loading={isGenerating} disabled={!selectedPoInId || uniqueVendors.length === 0}>
            Buat Internal Letter
          </Button>
        </div>
      </div>
    </Modal>
  );
}