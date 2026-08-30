import type { NeracaItem, NeracaDetail } from '@/types';

// ==================== Constants ====================
export const DEFAULT_DETAIL: Partial<NeracaDetail> = {
  ongkir_a: '' as any, ongkir_b: '' as any, ongkir_c: '' as any, ongkir_d: '' as any, ongkir_e: '' as any,
  ongkir_x: '' as any, ongkir_y: '' as any, ongkir_z: '' as any,
  difficulty_easy: '' as any, difficulty_medium: '' as any, difficulty_hard: '' as any, difficulty_rare: '' as any,
  disc: '' as any, ppn: 11, un_cost: 2,
};

export function getDifficultyValue(detail: Partial<NeracaDetail>, difficulty: string): number {
  if (difficulty === 'Easy') return Number(detail.difficulty_easy) || 0;
  if (difficulty === 'Medium') return Number(detail.difficulty_medium) || 0;
  if (difficulty === 'Hard') return Number(detail.difficulty_hard) || 0;
  if (difficulty === 'Rare') return Number(detail.difficulty_rare) || 0;
  return 0;
}

export function getOngkirVK(detail: Partial<NeracaDetail>, cat: string): number {
  if (cat === 'A') return Number(detail.ongkir_a) || 0;
  if (cat === 'B') return Number(detail.ongkir_b) || 0;
  if (cat === 'C') return Number(detail.ongkir_c) || 0;
  if (cat === 'D') return Number(detail.ongkir_d) || 0;
  if (cat === 'E') return Number(detail.ongkir_e) || 0;
  return 0;
}

export function getOngkirKC(detail: Partial<NeracaDetail>, cat: string): number {
  if (cat === 'X') return Number(detail.ongkir_x) || 0;
  if (cat === 'Y') return Number(detail.ongkir_y) || 0;
  if (cat === 'Z') return Number(detail.ongkir_z) || 0;
  return 0;
}

export function calcBaseHargaJual(item: NeracaItem, items: NeracaItem[], detail: Partial<NeracaDetail>): number {
  const hb = Number(item.harga_beli) || 0;
  const qty = Number(item.qty) || 1;

  let hbDiskon = hb; 

  const sameVK = items.filter(i => i.category_vk === item.category_vk).length || 1;
  const sameKC = items.filter(i => i.category_kc === item.category_kc).length || 1;
  const sameDiff = items.filter(i => i.difficulty === item.difficulty).length || 1;

  const ongkirVKPerItem = getOngkirVK(detail, item.category_vk) / sameVK;
  const ongkirKCPerItem = getOngkirKC(detail, item.category_kc) / sameKC;
  
  const difficultyPct = getDifficultyValue(detail, item.difficulty);
  const difficultyPerItem = (hbDiskon * (difficultyPct / 100)) / sameDiff;

  const hjSatuan = hbDiskon + ongkirVKPerItem + ongkirKCPerItem + difficultyPerItem;
  return hjSatuan * qty;
}

export function calculateNeracaGrandTotal(items: NeracaItem[], detailData: Partial<NeracaDetail> | undefined): number {
  const detail = detailData || DEFAULT_DETAIL;
  const unCostPct = Number(detail.un_cost) || 0;
  const baseJualTotal = items.reduce((sum, item) => sum + calcBaseHargaJual(item, items, detail), 0);
  const totalUnCost = baseJualTotal * (unCostPct / 100);
  const unCostPerItem = items.length > 0 ? totalUnCost / items.length : 0;
  
  const jualTotal = items.reduce((sum, item) => {
    const baseHj = calcBaseHargaJual(item, items, detail);
    return sum + (baseHj + unCostPerItem);
  }, 0);

  const discPct = Number(detail.disc) || 0;
  const ppnPct = Number(detail.ppn) ?? 11;
  const jualAfterDisc = jualTotal * (1 - discPct / 100);
  const ppn = jualAfterDisc * (ppnPct / 100);
  const grandTotal = jualAfterDisc + ppn;
  
  return grandTotal;
}

export function getDeliveryWeeks(dt: string) {
  if (!dt) return 0;
  const match = dt.match(/\d+/g);
  if (match && match.length > 0) {
    return Math.max(...match.map(Number));
  }
  return 0;
}
