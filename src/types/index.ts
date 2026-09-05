// ==================== MASTER DATA TYPES ====================

export interface Customer {
  id: string;
  code: string;               // CUS-XXXXXX (6 random alphanumeric)
  company_name: string;
  office_address: string;
  warehouse_address: string;
  email: string;
  npwp: string;
  status: 'Active' | 'Inactive';
  created_date: string;
  updated_date: string;
}

export interface PIC {
  id: string;
  name: string;
  customer_id: string;
  customer_name?: string;     // denormalized for display
  phone: string;
  email: string;
  position: string;
  status?: 'Active' | 'Inactive';
}

export interface Vendor {
  id: string;
  code: string;
  vendor_name: string;
  address: string;
  npwp: string;
  products: string; // Long text
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  status: 'Active' | 'Inactive';
  created_date: string;
  updated_date: string;
}

export interface PicVendor {
  id: string;
  name: string;
  vendor_id: string;
  vendor_name?: string; // denormalized
  phone: string;
  email: string;
  position: string;
  status?: 'Active' | 'Inactive';
}

export interface Product {
  id: string;
  code: string;
  part_number: string;
  product_name: string;
  description: string;
  brand: string;
  specification: string;
  category: string;
  subcategory: string;
  uom: string;
  weight_kg: number;
  dimension: string;
  origin: string;
  hs_code: string;
  default_margin: number;
  notes: string;
  status: 'Active' | 'Inactive';
}

// ==================== TRANSACTION TYPES ====================

export interface Inquiry {
  id: string;
  request_number: string;         // No Permintaan
  request_title: string;          // Judul Permintaan
  request_date: string;           // Tanggal Permintaan
  offer_deadline: string;         // Batas Penawaran
  customer_id: string;
  customer_name?: string;
  pic_id: string;                 // PIC dari management customer
  pic_name?: string;
  documents: string;              // JSON array of Drive URLs
  status: InquiryStatus;
  notes?: string;
  created_by?: string;
  created_date: string;
  updated_date: string;
}

export type InquiryStatus = 'Jalan' | 'Batal' | 'Telat' | 'Neraca' | 'Quotation' | 'PO' | 'Invoice' | 'Selesai';

export interface Neraca {
  id: string;
  inquiry_id: string;
  name: string;        // e.g. "Neraca 1", "Neraca 2"
  created_by?: string;
  created_date: string;
  updated_date: string;
}

export interface NeracaDetail {
  id: string;
  neraca_id: string;
  // Ongkir Vendor-Kantor (Rp)
  ongkir_a: number;
  ongkir_b: number;
  ongkir_c: number;
  ongkir_d: number;
  ongkir_e: number;
  // Ongkir Kantor-Customer (Rp)
  ongkir_x: number;
  ongkir_y: number;
  ongkir_z: number;
  // Difficulty of Item (%)
  difficulty_easy: number;   // default 30
  difficulty_medium: number; // default 100
  difficulty_hard: number;   // default 150
  difficulty_rare: number;   // default 200
  // Resume settings
  disc: number;   // discount %, default 0
  ppn: number;    // PPN %, default 11
  un_cost: number; // Un Cost %, default 2
  updated_date: string;
}

export interface NeracaItem {
  id: string;
  neraca_id: string;
  vendor_id: string;
  vendor_name: string;
  item_customer: string; // Item name as shown to customer
  item_vendor: string;   // Item name from vendor
  category_vk: string;   // 'A' | 'B' | 'C' | 'D' | 'E'
  category_kc: string;   // 'X' | 'Y' | 'Z'
  difficulty: string;    // 'Easy' | 'Medium' | 'Hard' | 'Rare'
  qty: number;
  harga_beli: number;
  berat: number;
  dt_kc?: string;         // Renamed from delivery_time
  dt_vk?: string;         // Renamed from delivery_time_vk
  created_date: string;
  updated_date: string;
}

export interface VendorDiscount {
  id: string;
  neraca_id: string;
  vendor_id: string;
  vendor_name: string;
  discount_pct: number;   // discount as percentage
  discount_cash: number;  // discount as cash (Rp)
  dp_pct?: number;        // DP as percentage
  dp_nominal?: number;    // DP as nominal cash
  ppn_pct?: number;       // PPN percentage (e.g. 11)
  updated_date: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  neraca_id: string;
  quotation_id: string;
  vendor_id: string;
  vendor_name: string;
  jumlah_item: number;
  total_nilai: number;
  dokumen: string; // JSON array string
  status: 'Active' | 'Deleted';
  type?: 'Full' | 'DP' | 'Sisa';
  dp_reference_id?: string;
  due_date?: string;
  franco?: string;
  subject?: string;
  ref?: string;
  ref_date?: string;
  created_by?: string;
  verification_status?: 'Perlu Verifikasi' | 'Menunggu Verifikasi' | 'Terverifikasi' | 'Ditolak';
  verification_note?: string;
  verified_by?: string;
  verified_date?: string;
  created_date: string;
  updated_date: string;
}

export interface SuratJalan {
  id: string;
  po_in_id: string;
  sj_number: string;
  ekspedisi: string;
  no_resi?: string;
  upload_resi?: string;
  resi_data?: string;
  delivery_address?: string;
  created_by?: string;
  created_date: string;
  updated_date: string;
}

export interface Invoice {
  id: string;
  po_in_id: string;
  invoice_number: string;
  invoice_date: string;
  customer_id: string;
  delivery_address: string;
  created_by?: string;
  verification_status?: 'Perlu Verifikasi' | 'Menunggu Verifikasi' | 'Terverifikasi' | 'Ditolak';
  verification_note?: string;
  verified_by?: string;
  verified_date?: string;
  created_date: string;
  payment_status?: 'Belum Dibayar' | 'Lunas';
  payment_date?: string;
  payment_proof_url?: string;
  payment_note?: string;
  updated_date: string;
}

export interface POIn {
  id: string;
  quotation_id: string;
  neraca_id: string;
  customer_id: string;
  customer_name: string;
  po_in_number: string;
  judul: string;
  tanggal: string;

  tanggal_batas: string;
  dokumen: string; // JSON array string
  created_by?: string;
  created_date: string;
  updated_date: string;
}

export type NeracaQuotationStatus = 'Draft' | 'Send' | 'PO' | 'Invoice' | 'Tracking' | 'Selesai';

export interface NeracaQuotation {
  id: string;
  quotation_number: string;  // e.g. QT-2026-00001
  neraca_id: string;
  inquiry_id: string;
  customer_id: string;
  customer_name: string;
  nilai: number;             // grand_total dari neraca
  dokumen: string;           // URL dokumen (optional)
  created_by?: string;
  follow_up_count?: number;
  last_follow_up_date?: string;
  created_date: string;
  updated_date: string;
}

export interface InquiryItem {
  id: string;
  inquiry_id: string;
  item_id: string;
  description: string;
  specification: string;
  quantity: number;
  unit: string;
  customer_target_price: number;
  required_date: string;
  weight: number;
  notes: string;
  status: InquiryItemStatus;
}

export type InquiryItemStatus = 'Draft' | 'Sourcing' | 'Vendor Quotation Received' | 'Pricing' | 'Quoted' | 'Won' | 'Lost' | 'Cancelled';

export interface SourcingRequest {
  id: string;
  inquiry_item_id: string;
  vendor_id: string;
  vendor_name?: string;
  request_date: string;
  request_number: string;
  requested_qty: number;
  requested_specification: string;
  deadline: string;
  status: SourcingStatus;
  notes: string;
}

export type SourcingStatus = 'Not Sent' | 'Sent' | 'Waiting Response' | 'Responded' | 'No Response' | 'Rejected' | 'Expired';

export interface VendorQuotation {
  id: string;
  sourcing_id: string;
  vendor_id: string;
  vendor_name?: string;
  quotation_number: string;
  quotation_date: string;
  valid_until: string;
  currency: string;
  unit_price: number;
  quantity: number;
  discount: number;
  tax: number;
  total: number;
  lead_time: string;
  weight: number;
  shipping_cost: number;
  payment_term: string;
  notes: string;
  received_date: string;
}

export interface CostCalculation {
  id: string;
  inquiry_item_id: string;
  vendor_id: string;
  vendor_cost: number;
  vendor_shipping: number;
  office_shipping: number;
  handling: number;
  other_cost: number;
  payment_adjustment_pct: number;
  margin: number;
  margin_type: 'markup' | 'gross_margin';
  selling_price: number;
  rounding: number;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  inquiry_id: string;
  customer_id: string;
  customer_name?: string;
  date: string;
  valid_until: string;
  project: string;
  payment_term: string;
  currency: string;
  subtotal: number;
  tax_pct: number;
  grand_total: number;
  status: QuotationStatus;
  revision: number;
  notes: string;
  created_by: string;
}

export type QuotationStatus = 'Draft' | 'Waiting Approval' | 'Approved' | 'Sent' | 'Viewed' | 'Negotiation' | 'Revised' | 'Won' | 'Lost' | 'Expired' | 'Cancelled';

// ==================== COMPANY ====================

export interface Company {
  id: string;
  name: string;           // Nama lengkap perusahaan
  short_name: string;     // Singkatan / nama pendek
  logo_url: string;       // URL logo dari Google Drive
  address: string;        // Alamat lengkap
  email: string;
  phone: string;
  leader_name?: string;   // Nama pimpinan / penandatangan
  admin_position: string; // Posisi admin untuk tanda tangan quotation
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  updated_date: string;
}

// ==================== UI TYPES ====================

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: string;
}

export interface PricingCalculation {
  vendor_cost: number;
  vendor_shipping: number;
  office_shipping: number;
  handling: number;
  other_cost: number;
  subtotal_cost: number;
  payment_term: string;
  payment_adjustment_pct: number;
  adjusted_cost: number;
  margin: number;
  margin_type: 'markup' | 'gross_margin';
  selling_price: number;
  rounded_price: number;
  gross_profit: number;
  gross_margin_pct: number;
}

// ==================== INTERNAL LETTER ====================

export interface InternalLetter {
  id: string;
  po_in_id: string;
  po_out_id: string;       // linked PO Out for the same vendor
  quotation_id: string;
  neraca_id: string;
  vendor_id: string;
  vendor_name: string;
  customer_id: string;
  customer_name: string;
  internal_letter_number: string; // e.g. 98/In/MPA/08.2027
  tanggal: string;
  perihal: string;
  franco: string;
  jumlah_item: number;
  total_nilai: number;
  type: string;            // 'Full' | 'DP' | 'Sisa'
  dp_reference_id?: string; // For Sisa: link to DP internal letter
  dokumen: string;         // JSON array of uploaded documents
  created_by?: string;     // Name of user who created this record
  verification_status?: 'Perlu Verifikasi' | 'Menunggu Verifikasi' | 'Terverifikasi' | 'Ditolak';
  verification_note?: string;  // Catatan dari pimpinan
  verified_by?: string;        // Nama pimpinan yang memverifikasi
  verified_date?: string;      // Tanggal verifikasi
  bukti_tf_url?: string;       // URL bukti transfer yang diupload pimpinan
  created_date: string;
  updated_date: string;
}

// ==================== USER & AUTH TYPES ====================

export interface Role {
  id: string;
  role_name: string;
  permissions: string; // JSON array of allowed paths, e.g. ["/inquiries", "/neraca"]
  is_super_admin?: boolean; // If true, all permissions granted
  created_date?: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password?: string; // Only sent when creating/updating
  role_id: string;
  role_name?: string; // Denormalized for display
  status: 'Active' | 'Inactive';
  created_date?: string;
}

export type NotificationType = 'verification_request' | 'verification_result';
export type NotificationRefType = 'po' | 'invoice' | 'internal_letter';

export interface AppNotification {
  id: string;
  from_user_id: string;
  from_user_name: string;
  to_user_id: string; // user ID or 'pimpinan'
  type: NotificationType;
  ref_type: NotificationRefType;
  ref_id: string;
  ref_number: string;
  message: string;
  is_read: boolean | string;
  created_date: string;
}

// ==================== BELANJA (PURCHASING) TYPES ====================

export interface BelanjaPemasukan {
  id: string;
  tanggal: string;
  nominal: number;
  keterangan: string;
  bukti_tf: string; // URL string
  created_date?: string;
  updated_date?: string;
}

export interface BelanjaPengeluaran {
  id: string;
  tanggal: string;
  nominal: number;
  keterangan: string;
  bukti_foto: string; // URL string
  po_out_id?: string; // Only for Belanja Proyek
  po_out_number?: string; // Denormalized for display
  created_date?: string;
  updated_date?: string;
}
