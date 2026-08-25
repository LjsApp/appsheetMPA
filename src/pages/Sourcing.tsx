import { useState } from 'react';
import { Check, X, AlertTriangle, TrendingDown, TrendingUp, Clock } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import type { VendorQuotation } from '@/types';
import { formatCurrency } from '@/lib/utils';

const MOCK_VENDOR_QUOTATIONS: VendorQuotation[] = [];

type CompRow = VendorQuotation & {
  total_landed_cost: number;
  is_best_price: boolean;
  is_best_delivery: boolean;
  is_best_total: boolean;
};

export default function Sourcing() {
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectionReason, setSelectionReason] = useState('');
  const [isSelectionConfirmed, setIsSelectionConfirmed] = useState(false);

  const quotations = MOCK_VENDOR_QUOTATIONS;

  // Calculate landed cost for each
  const rows: CompRow[] = quotations.map(q => ({
    ...q,
    total_landed_cost: q.total + q.shipping_cost,
    is_best_price: false,
    is_best_delivery: false,
    is_best_total: false,
  }));

  const minPrice = rows.length ? Math.min(...rows.map(r => r.unit_price)) : 0;
  const minLT = rows.length ? rows.reduce((a, b) => Number((a.lead_time || '').match(/\d+/)?.[0] ?? 99) < Number((b.lead_time || '').match(/\d+/)?.[0] ?? 99) ? a : b) : null;
  const minTotal = rows.length ? Math.min(...rows.map(r => r.total_landed_cost)) : 0;

  rows.forEach(r => {
    r.is_best_price = r.unit_price === minPrice;
    r.is_best_delivery = minLT ? r.id === minLT.id : false;
    r.is_best_total = r.total_landed_cost === minTotal;
  });

  const confirmSelection = () => {
    if (selectedVendorId) setIsSelectionConfirmed(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Comparison & Selection"
        subtitle='INQ-2026-00001 - Gate Valve 6" Class 150 - Qty: 5 PCS'
      />

      {/* Comparison Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Perbandingan Harga Vendor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-48">Parameter</th>
                {rows.map(r => (
                  <th key={r.id} className="px-5 py-3 text-center">
                    <div
                      onClick={() => setSelectedVendorId(r.vendor_id)}
                      className={`cursor-pointer rounded-lg p-2 transition-all ${selectedVendorId === r.vendor_id ? 'bg-blue-50 ring-2 ring-blue-400' : 'hover:bg-gray-100'}`}
                    >
                      <p className="font-semibold text-gray-900">{r.vendor_name}</p>
                      <p className="text-xs text-gray-400">Qt: {r.quotation_number}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                {
                  label: 'Unit Price / pcs',
                  render: (r: CompRow) => (
                    <div className="flex flex-col items-center gap-1">
                      <span className={r.is_best_price ? 'font-bold text-green-700' : 'text-gray-700'}>
                        {formatCurrency(r.unit_price)}
                      </span>
                      {r.is_best_price && <Badge color="green" icon={<TrendingDown className="w-3 h-3" />} label="BEST PRICE" />}
                    </div>
                  ),
                },
                {
                  label: 'Quantity',
                  render: (r: CompRow) => <span>{r.quantity} PCS</span>,
                },
                {
                  label: 'Total (sebelum pajak)',
                  render: (r: CompRow) => <span className="font-medium">{formatCurrency(r.total)}</span>,
                },
                {
                  label: 'Shipping Cost',
                  render: (r: CompRow) => <span>{formatCurrency(r.shipping_cost)}</span>,
                },
                {
                  label: 'Total Landed Cost',
                  render: (r: CompRow) => (
                    <div className="flex flex-col items-center gap-1">
                      <span className={`font-bold ${r.is_best_total ? 'text-blue-700' : 'text-gray-900'}`}>
                        {formatCurrency(r.total_landed_cost)}
                      </span>
                      {r.is_best_total && <Badge color="blue" icon={<Check className="w-3 h-3" />} label="BEST TOTAL COST" />}
                    </div>
                  ),
                },
                {
                  label: 'Lead Time',
                  render: (r: CompRow) => (
                    <div className="flex flex-col items-center gap-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {r.lead_time}
                      </span>
                      {r.is_best_delivery && <Badge color="purple" icon={<TrendingUp className="w-3 h-3" />} label="BEST DELIVERY" />}
                    </div>
                  ),
                },
                {
                  label: 'Payment Term',
                  render: (r: CompRow) => <span>{r.payment_term}</span>,
                },
                {
                  label: 'Valid Until',
                  render: (r: CompRow) => <span>{r.valid_until}</span>,
                },
                {
                  label: 'Catatan',
                  render: (r: CompRow) => <span className="text-gray-400 text-xs">{r.notes || '-'}</span>,
                },
              ].map(({ label, render }) => (
                <tr key={label} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-xs font-medium text-gray-500">{label}</td>
                  {rows.map(r => (
                    <td key={r.id} className="px-5 py-3 text-center">{render(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selection */}
      {!isSelectionConfirmed ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900">Pilih Vendor</h3>
          {!selectedVendorId && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-3 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Klik pada nama vendor di tabel di atas untuk memilih vendor.
            </div>
          )}
          {selectedVendorId && (
            <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-4 py-3 rounded-lg text-sm font-medium">
              <Check className="w-4 h-4" />
              Vendor terpilih: <strong>{rows.find(r => r.vendor_id === selectedVendorId)?.vendor_name}</strong>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Pemilihan</label>
            <textarea
              value={selectionReason}
              onChange={e => setSelectionReason(e.target.value)}
              rows={2}
              placeholder="Contoh: Dipilih karena total landed cost terbaik dengan lead time yang acceptable."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setSelectedVendorId(null)}>
              <X className="w-4 h-4" /> Reset
            </Button>
            <Button onClick={confirmSelection} disabled={!selectedVendorId}>
              <Check className="w-4 h-4" /> Konfirmasi Pilihan Vendor
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-900">
                Vendor terpilih: {rows.find(r => r.vendor_id === selectedVendorId)?.vendor_name}
              </p>
              <p className="text-sm text-green-700">Selanjutnya, lakukan perhitungan harga jual.</p>
            </div>
          </div>
          <Button onClick={() => window.location.href = '/pricing'}>
            Lanjut ke Pricing Calculator →
          </Button>
        </div>
      )}
    </div>
  );
}

function Badge({ color, icon, label }: { color: string; icon: React.ReactNode; label: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[color]}`}>
      {icon}{label}
    </span>
  );
}
