import { useState, useCallback } from 'react';
import { Calculator, RotateCcw, ChevronDown, FileCheck2 } from 'lucide-react';
import { PageHeader, Button, FormField, Select } from '@/components/ui';
import type { PricingCalculation } from '@/types';
import { formatCurrency } from '@/lib/utils';

const PAYMENT_TERMS_ADJ: { value: string; label: string; adjustment: number }[] = [
  { value: 'COD', label: 'COD (0%)', adjustment: 0 },
  { value: '7 Days', label: '7 Days (0.25%)', adjustment: 0.25 },
  { value: '14 Days', label: '14 Days (0.5%)', adjustment: 0.5 },
  { value: '30 Days', label: '30 Days (1%)', adjustment: 1 },
  { value: '45 Days', label: '45 Days (1.5%)', adjustment: 1.5 },
  { value: '60 Days', label: '60 Days (2%)', adjustment: 2 },
  { value: '90 Days', label: '90 Days (3%)', adjustment: 3 },
];

const ROUNDING_OPTIONS = [
  { value: '1000', label: 'Rp 1.000' },
  { value: '5000', label: 'Rp 5.000' },
  { value: '10000', label: 'Rp 10.000' },
  { value: '50000', label: 'Rp 50.000' },
  { value: '100000', label: 'Rp 100.000' },
  { value: '1000000', label: 'Rp 1.000.000' },
  { value: '0', label: 'Tidak dibulatkan' },
];

const MARGIN_TYPES = [
  { value: 'markup', label: 'Markup (dari cost)' },
  { value: 'gross_margin', label: 'Gross Margin (dari harga jual)' },
];

const DEFAULT_STATE: {
  vendor_cost: number;
  vendor_shipping: number;
  office_shipping: number;
  handling: number;
  other_cost: number;
  payment_term: string;
  margin: number;
  margin_type: 'markup' | 'gross_margin';
  rounding: number;
} = {
  vendor_cost: 47500000,
  vendor_shipping: 600000,
  office_shipping: 1500000,
  handling: 500000,
  other_cost: 0,
  payment_term: '30 Days',
  margin: 15,
  margin_type: 'gross_margin',
  rounding: 10000,
};

function roundTo(value: number, nearest: number): number {
  if (nearest === 0) return value;
  return Math.ceil(value / nearest) * nearest;
}

function calcPricing(state: typeof DEFAULT_STATE): PricingCalculation {
  const subtotal_cost = state.vendor_cost + state.vendor_shipping + state.office_shipping + state.handling + state.other_cost;
  const pt = PAYMENT_TERMS_ADJ.find(p => p.value === state.payment_term) || PAYMENT_TERMS_ADJ[0];
  const payment_adjustment_pct = pt.adjustment;
  const adjusted_cost = subtotal_cost * (1 + payment_adjustment_pct / 100);

  let selling_price: number;
  if (state.margin_type === 'markup') {
    selling_price = adjusted_cost * (1 + state.margin / 100);
  } else {
    selling_price = adjusted_cost / (1 - state.margin / 100);
  }

  const rounded_price = roundTo(selling_price, state.rounding);
  const gross_profit = rounded_price - adjusted_cost;
  const gross_margin_pct = rounded_price > 0 ? (gross_profit / rounded_price) * 100 : 0;

  return {
    vendor_cost: state.vendor_cost,
    vendor_shipping: state.vendor_shipping,
    office_shipping: state.office_shipping,
    handling: state.handling,
    other_cost: state.other_cost,
    subtotal_cost,
    payment_term: state.payment_term,
    payment_adjustment_pct,
    adjusted_cost,
    margin: state.margin,
    margin_type: state.margin_type,
    selling_price,
    rounded_price,
    gross_profit,
    gross_margin_pct,
  };
}

export default function Pricing() {
  const [form, setForm] = useState(DEFAULT_STATE);
  const [saved, setSaved] = useState(false);

  const set = useCallback((key: keyof typeof DEFAULT_STATE, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const result = calcPricing(form);

  const isGoodMargin = result.gross_margin_pct >= 10;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Calculator"
        subtitle='INQ-2026-00001 - Gate Valve 6" - Vendor: PT Sumber Teknik'
        action={
          <Button variant="secondary" onClick={() => { setForm(DEFAULT_STATE); setSaved(false); }}>
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Cost Components */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" /> Komponen Biaya
            </h3>
            <div className="space-y-3">
              <FormField label="Vendor Purchase Cost (total)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                  <input
                    type="number"
                    value={form.vendor_cost}
                    onChange={e => set('vendor_cost', Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </FormField>
              <FormField label="Ongkir Vendor → Kantor">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                  <input type="number" value={form.vendor_shipping} onChange={e => set('vendor_shipping', Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
              </FormField>
              <FormField label="Ongkir Kantor → Customer">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                  <input type="number" value={form.office_shipping} onChange={e => set('office_shipping', Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
              </FormField>
              <FormField label="Handling">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                  <input type="number" value={form.handling} onChange={e => set('handling', Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
              </FormField>
              <FormField label="Biaya Lainnya">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                  <input type="number" value={form.other_cost} onChange={e => set('other_cost', Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
              </FormField>
            </div>
          </div>

          {/* Pricing Parameters */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ChevronDown className="w-5 h-5 text-purple-600" /> Parameter Harga
            </h3>
            <div className="space-y-3">
              <FormField label="Payment Term Customer">
                <Select
                  value={form.payment_term}
                  onChange={e => set('payment_term', e.target.value)}
                  options={PAYMENT_TERMS_ADJ.map(p => ({ value: p.value, label: p.label }))}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Margin (%)">
                  <div className="relative">
                    <input type="number" value={form.margin} min={0} max={100}
                      onChange={e => set('margin', Number(e.target.value))}
                      className="w-full pr-8 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                  </div>
                </FormField>
                <FormField label="Mode Margin">
                  <Select
                    value={form.margin_type}
                    onChange={e => set('margin_type', e.target.value as 'markup' | 'gross_margin')}
                    options={MARGIN_TYPES}
                  />
                </FormField>
              </div>
              <FormField label="Pembulatan Harga">
                <Select
                  value={String(form.rounding)}
                  onChange={e => set('rounding', Number(e.target.value))}
                  options={ROUNDING_OPTIONS}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm sticky top-6 overflow-hidden">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-5 py-4">
              <h3 className="font-semibold text-white">Hasil Kalkulasi</h3>
            </div>
            <div className="p-5 space-y-0">
              {[
                { label: 'Vendor Cost', value: result.vendor_cost },
                { label: 'Ongkir Vendor → Kantor', value: result.vendor_shipping },
                { label: 'Ongkir Kantor → Customer', value: result.office_shipping },
                { label: 'Handling', value: result.handling },
                { label: 'Biaya Lainnya', value: result.other_cost },
              ].map(item => (
                <div key={item.label} className="flex justify-between py-2 text-sm border-b border-gray-50">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="text-gray-800">{formatCurrency(item.value)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2.5 text-sm font-semibold border-b border-gray-200">
                <span>Subtotal Cost</span>
                <span>{formatCurrency(result.subtotal_cost)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm border-b border-gray-50">
                <span className="text-gray-500">Penyesuaian Termin ({result.payment_adjustment_pct}%)</span>
                <span className="text-amber-600">+{formatCurrency(result.adjusted_cost - result.subtotal_cost)}</span>
              </div>
              <div className="flex justify-between py-2.5 text-sm font-semibold border-b border-gray-200">
                <span>Adjusted Cost</span>
                <span>{formatCurrency(result.adjusted_cost)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm border-b border-gray-50">
                <span className="text-gray-500">
                  {form.margin_type === 'markup' ? 'Markup' : 'Gross Margin'} ({form.margin}%)
                </span>
                <span className="text-green-600">+{formatCurrency(result.selling_price - result.adjusted_cost)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm border-b border-gray-50">
                <span className="text-gray-500">Harga Exact</span>
                <span>{formatCurrency(result.selling_price)}</span>
              </div>

              {/* Final Price */}
              <div className="mt-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-blue-900">Harga Jual (dibulatkan)</span>
                </div>
                <div className="text-2xl font-bold text-blue-700 mt-1">
                  {formatCurrency(result.rounded_price)}
                </div>
              </div>

              {/* Profit Summary */}
              <div className={`mt-3 p-4 rounded-xl border ${isGoodMargin ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-gray-600">Gross Profit</span>
                  <span className="font-bold text-gray-900">{formatCurrency(result.gross_profit)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600">Gross Margin</span>
                  <span className={`font-bold text-lg ${isGoodMargin ? 'text-green-700' : 'text-amber-700'}`}>
                    {result.gross_margin_pct.toFixed(2)}%
                  </span>
                </div>
                {!isGoodMargin && (
                  <p className="text-xs text-amber-700 mt-2">⚠ Margin di bawah 10% — pertimbangkan untuk meminta approval.</p>
                )}
              </div>
            </div>
            <div className="px-5 pb-5 space-y-2">
              <Button className="w-full" onClick={() => setSaved(true)} variant={saved ? 'secondary' : 'primary'}>
                {saved ? '✓ Harga Tersimpan' : 'Simpan Harga'}
              </Button>
              {saved && (
                <Button className="w-full" onClick={() => window.location.href = '/quotations'}>
                  <FileCheck2 className="w-4 h-4" /> Generate Quotation
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
