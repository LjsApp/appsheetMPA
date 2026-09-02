import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Search, Package, ChevronDown, ChevronUp, History,
  Tag, ShoppingCart, Users, DollarSign, Calendar, Hash, Truck,
  ExternalLink, X
} from 'lucide-react';
import { PageHeader } from '@/components/ui';
import {
  useAllNeracaItems,
  useAllNeracaDetails,
  useNeracaQuotations,
  usePoIns,
  useVendors,
} from '@/hooks/useData';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calcBaseHargaJual } from '@/lib/neracaUtils';
import type { NeracaItem, NeracaDetail, NeracaQuotation, POIn } from '@/types';

interface ProductHistoryRow {
  item: NeracaItem;
  hargaBeli: number;
  hargaJual: number;
  vendorName: string;
  quotation: NeracaQuotation | undefined;
  poIn: POIn | undefined;
}

interface ProductGroup {
  productKey: string; // normalized item name
  originalName: string;
  rows: ProductHistoryRow[];
  lastSeen: string;
}

function normalizeItemName(name: string): string {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export default function Products() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<ProductHistoryRow | null>(null);

  const { data: allItems = [], isLoading: loadingItems } = useAllNeracaItems();
  const { data: allDetails = [], isLoading: loadingDetails } = useAllNeracaDetails();
  const { data: quotations = [], isLoading: loadingQt } = useNeracaQuotations();
  const { data: poIns = [], isLoading: loadingPoi } = usePoIns();
  const { data: vendors = [] } = useVendors();

  const isLoading = loadingItems || loadingDetails || loadingQt || loadingPoi;

  // Build product groups with history
  const productGroups = useMemo((): ProductGroup[] => {
    const groups = new Map<string, ProductGroup>();

    allItems.forEach(item => {
      const key = normalizeItemName(item.item_vendor || item.item_customer || '');
      if (!key) return;

      const originalName = item.item_vendor || item.item_customer || '';

      // Find detail for harga jual calculation
      const detail = allDetails.find(d => d.neraca_id === item.neraca_id);
      const neracaItems = allItems.filter(i => i.neraca_id === item.neraca_id);

      let hargaJual = 0;
      if (detail) {
        try {
          const detailPartial: Partial<NeracaDetail> = detail;
          const unCostPct = Number(detail.un_cost) || 0;
          const baseJualTotal = neracaItems.reduce((sum, i) => sum + calcBaseHargaJual(i, neracaItems, detailPartial), 0);
          const totalUnCost = baseJualTotal * (unCostPct / 100);
          const unCostPerItem = neracaItems.length > 0 ? totalUnCost / neracaItems.length : 0;
          const baseHj = calcBaseHargaJual(item, neracaItems, detailPartial);
          hargaJual = baseHj + unCostPerItem;
        } catch { hargaJual = 0; }
      }

      const quotation = quotations.find(q => q.neraca_id === item.neraca_id);
      const poIn = poIns.find(p => p.quotation_id === quotation?.id || p.neraca_id === item.neraca_id);
      const vendor = vendors.find(v => v.id === item.vendor_id);

      const row: ProductHistoryRow = {
        item,
        hargaBeli: Number(item.harga_beli) || 0,
        hargaJual,
        vendorName: vendor?.vendor_name || item.vendor_name || '-',
        quotation,
        poIn,
      };

      if (!groups.has(key)) {
        groups.set(key, {
          productKey: key,
          originalName,
          rows: [],
          lastSeen: item.created_date || '',
        });
      }

      const grp = groups.get(key)!;
      grp.rows.push(row);

      // Update lastSeen
      if ((item.created_date || '') > grp.lastSeen) {
        grp.lastSeen = item.created_date || '';
      }
    });

    // Sort rows within each group by created_date desc
    groups.forEach(grp => {
      grp.rows.sort((a, b) => (b.item.created_date || '').localeCompare(a.item.created_date || ''));
    });

    // Convert to array sorted by lastSeen desc
    return Array.from(groups.values()).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  }, [allItems, allDetails, quotations, poIns, vendors]);

  const filtered = useMemo(() => {
    if (!search.trim()) return productGroups;
    const s = search.toLowerCase();
    return productGroups.filter(g =>
      g.originalName.toLowerCase().includes(s) ||
      g.rows.some(r =>
        r.vendorName.toLowerCase().includes(s) ||
        (r.quotation?.quotation_number || '').toLowerCase().includes(s) ||
        (r.poIn?.po_in_number || '').toLowerCase().includes(s) ||
        (r.poIn?.customer_name || '').toLowerCase().includes(s)
      )
    );
  }, [productGroups, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produk"
        subtitle={`${productGroups.length} produk unik dari ${allItems.length} transaksi`}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama produk, vendor, customer, no. quotation..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 shadow-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-gray-400">
          <Package className="w-10 h-10" />
          <p className="text-sm">Tidak ada produk ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(group => {
            const isExpanded = expandedKey === group.productKey;
            const latestRow = group.rows[0];
            const avgBeli = group.rows.reduce((s, r) => s + r.hargaBeli, 0) / group.rows.length;
            const vendorSet = [...new Set(group.rows.map(r => r.vendorName).filter(v => v !== '-'))];

            return (
              <div key={group.productKey} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Product Header Row */}
                <button
                  onClick={() => setExpandedKey(isExpanded ? null : group.productKey)}
                  className="w-full flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors text-left"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug truncate">{group.originalName}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Truck className="w-3 h-3" />
                            {vendorSet.slice(0, 2).join(', ')}{vendorSet.length > 2 ? ` +${vendorSet.length - 2}` : ''}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <History className="w-3 h-3" />
                            {group.rows.length} transaksi
                          </span>
                          {latestRow?.poIn?.customer_name && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Users className="w-3 h-3" />
                              {latestRow.poIn.customer_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs text-gray-400 mb-1">Harga Beli Rata-rata</div>
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(avgBeli)}</div>
                      </div>
                    </div>

                    {/* Summary badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                        <Tag className="w-3 h-3" />
                        Beli: {formatCurrency(latestRow?.hargaBeli)}
                      </span>
                      {latestRow?.hargaJual > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          <Tag className="w-3 h-3" />
                          Jual: {formatCurrency(latestRow.hargaJual)}
                        </span>
                      )}
                      {latestRow?.item.qty && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200">
                          Qty: {latestRow.item.qty}
                        </span>
                      )}
                      {group.lastSeen && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200">
                          <Calendar className="w-3 h-3" />
                          {formatDate(group.lastSeen)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 pt-1">
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </button>

                {/* Expanded History Table */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-4 py-2.5 text-left font-medium text-gray-500 uppercase tracking-wide">Tanggal</th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-500 uppercase tracking-wide">Vendor</th>
                            <th className="px-4 py-2.5 text-right font-medium text-gray-500 uppercase tracking-wide">Harga Beli</th>
                            <th className="px-4 py-2.5 text-right font-medium text-gray-500 uppercase tracking-wide">Harga Jual</th>
                            <th className="px-4 py-2.5 text-center font-medium text-gray-500 uppercase tracking-wide">Qty</th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-500 uppercase tracking-wide">No. Quotation</th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-500 uppercase tracking-wide">No. PO In</th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-500 uppercase tracking-wide">Tgl. Permintaan</th>
                            <th className="px-4 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {group.rows.map((row, idx) => (
                            <tr key={`${row.item.id}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 text-gray-600">
                                {row.item.created_date ? formatDate(row.item.created_date) : '-'}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-800">{row.vendorName}</td>
                              <td className="px-4 py-3 text-right font-mono text-gray-900">
                                {formatCurrency(row.hargaBeli)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-emerald-700 font-medium">
                                {row.hargaJual > 0 ? formatCurrency(row.hargaJual) : '-'}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-600">
                                {row.item.qty}
                              </td>
                              <td className="px-4 py-3">
                                {row.quotation ? (
                                  <button
                                    onClick={() => navigate(`/quotations/${row.quotation!.id}`)}
                                    className="flex items-center gap-1 text-violet-600 hover:text-violet-800 hover:underline font-mono"
                                  >
                                    {row.quotation.quotation_number}
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                ) : '-'}
                              </td>
                              <td className="px-4 py-3 font-mono text-blue-600">
                                {row.poIn?.po_in_number || '-'}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {row.poIn?.customer_name || '-'}
                              </td>
                              <td className="px-4 py-3 text-gray-500">
                                {row.poIn?.tanggal ? formatDate(row.poIn.tanggal) : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => setSelectedRow(row)}
                                  className="px-2 py-1 text-[11px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                >
                                  Detail
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedRow(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{selectedRow.item.item_vendor}</h3>
                  <p className="text-xs text-gray-500">Detail Histori Transaksi</p>
                </div>
              </div>
              <button onClick={() => setSelectedRow(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoBlock icon={<Truck className="w-4 h-4 text-blue-500" />} label="Vendor" value={selectedRow.vendorName} />
                <InfoBlock icon={<Tag className="w-4 h-4 text-amber-500" />} label="Harga Beli" value={`Rp ${formatCurrency(selectedRow.hargaBeli)}`} />
                <InfoBlock icon={<DollarSign className="w-4 h-4 text-emerald-500" />} label="Harga Jual (est.)" value={selectedRow.hargaJual > 0 ? `Rp ${formatCurrency(selectedRow.hargaJual)}` : '-'} />
                <InfoBlock icon={<ShoppingCart className="w-4 h-4 text-violet-500" />} label="Qty" value={`${selectedRow.item.qty}`} />
                <InfoBlock icon={<Hash className="w-4 h-4 text-gray-400" />} label="No. Quotation" value={selectedRow.quotation?.quotation_number || '-'} />
                <InfoBlock icon={<Hash className="w-4 h-4 text-gray-400" />} label="No. PO In" value={selectedRow.poIn?.po_in_number || '-'} />
                <InfoBlock icon={<Users className="w-4 h-4 text-pink-500" />} label="Customer" value={selectedRow.poIn?.customer_name || '-'} />
                <InfoBlock icon={<Calendar className="w-4 h-4 text-orange-500" />} label="Tgl. Permintaan" value={selectedRow.poIn?.tanggal ? formatDate(selectedRow.poIn.tanggal) : '-'} />
              </div>

              {selectedRow.item.item_customer && selectedRow.item.item_customer !== selectedRow.item.item_vendor && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Nama Item dari Customer</p>
                  <p className="text-sm text-gray-800">{selectedRow.item.item_customer}</p>
                </div>
              )}

              {selectedRow.quotation && (
                <button
                  onClick={() => { navigate(`/quotations/${selectedRow.quotation!.id}`); setSelectedRow(null); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Lihat Quotation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold text-gray-900 truncate" title={value}>{value}</p>
    </div>
  );
}
