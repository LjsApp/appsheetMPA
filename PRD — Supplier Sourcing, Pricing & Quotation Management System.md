# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Supplier Sourcing, Pricing & Quotation Management System

**Versi:** 1.0  
**Platform:** Web Application  
**Frontend:** React.js  
**Backend/API:** Google Apps Script  
**Database:** Google Sheets  
**Authentication:** Application-based authentication  
**Target User:** Supplier / Distributor / Trading Company  
**Status:** Product Specification

---

# 1. EXECUTIVE SUMMARY

## 1.1 Latar Belakang

Perusahaan menjalankan bisnis sebagai supplier/trading yang menerima permintaan barang dari customer, kemudian melakukan sourcing kepada satu atau beberapa vendor untuk mendapatkan harga terbaik.

Alur bisnis utama:

**Customer Request → Item Request → Vendor Sourcing → Vendor Quotation → Vendor Comparison → Vendor Selection → Cost Calculation → Selling Price → Quotation Customer**

Dalam proses manual, terdapat beberapa permasalahan:

- Data permintaan customer tersebar.
- Satu item dapat ditawarkan ke banyak vendor sehingga sulit melakukan perbandingan.
- Harga vendor perlu dibandingkan secara manual.
- Perhitungan ongkir vendor → kantor dan kantor → customer dilakukan manual.
- Margin berbeda-beda berdasarkan kondisi transaksi.
- Termin pembayaran customer memengaruhi harga jual.
- Berat barang berpengaruh terhadap biaya logistik.
- Sulit mengetahui quotation mana yang masih aktif.
- Sulit melakukan tracking status sourcing.
- Riwayat harga vendor tidak terdokumentasi dengan baik.
- Risiko salah memasukkan harga jual cukup tinggi.
- Pembuatan quotation membutuhkan pekerjaan berulang.
- Sulit mengetahui profit aktual setiap transaksi.

Oleh karena itu diperlukan sebuah aplikasi terintegrasi untuk mengelola seluruh proses tersebut.

---

# 2. TUJUAN PRODUK

Sistem bertujuan untuk:

1. Mengelola permintaan customer.
2. Mengelola item-item dalam setiap permintaan.
3. Mengirim satu item kepada banyak vendor.
4. Mencatat quotation/harga dari masing-masing vendor.
5. Membandingkan harga vendor.
6. Menentukan vendor terbaik.
7. Menghitung landed cost.
8. Menghitung harga jual berdasarkan parameter bisnis.
9. Mempertimbangkan ongkir, berat, margin dan termin.
10. Menghasilkan quotation customer secara otomatis.
11. Menyimpan histori harga.
12. Menyediakan dashboard bisnis.
13. Mengurangi kesalahan perhitungan.
14. Mempercepat proses dari inquiry sampai quotation.

---

# 3. SCOPE SISTEM

## 3.1 Modul Utama

Sistem terdiri dari:

1. Authentication
2. Dashboard
3. Customer Management
4. Vendor Management
5. Product / Item Master
6. Customer Request / Inquiry
7. Vendor Sourcing
8. Vendor Quotation
9. Vendor Comparison
10. Cost & Pricing Calculator
11. Customer Quotation
12. Follow Up Quotation
13. Purchase / Order Tracking
14. Payment Terms
15. Logistics / Shipping Cost
16. Document Management
17. Reporting
18. Activity Log
19. User & Role Management
20. Application Settings

---

# 4. USER ROLE

Minimal terdapat dua role.

## 4.1 Admin / Sales / Purchasing

Dapat:

- Membuat customer request.
- Menginput item.
- Memilih vendor.
- Mengirim sourcing request.
- Memasukkan harga vendor.
- Membandingkan harga.
- Menghitung harga jual.
- Membuat quotation.
- Melakukan revisi quotation.
- Melakukan follow-up customer.
- Melihat data customer dan vendor.
- Melihat transaksi yang menjadi tanggung jawabnya.

## 4.2 Owner / Manager

Dapat:

- Melihat seluruh data.
- Melihat dashboard.
- Melihat profit.
- Melihat quotation.
- Melihat vendor comparison.
- Melihat histori harga.
- Menyetujui harga tertentu.
- Mengatur margin.
- Mengatur parameter pricing.
- Mengelola user.
- Melihat laporan.

---

# 5. CORE BUSINESS FLOW

## 5.1 Alur Keseluruhan

```text
CUSTOMER
   │
   ▼
Customer Request
   │
   ├── Item 1
   ├── Item 2
   ├── Item 3
   │
   ▼
Vendor Sourcing
   │
   ├── Vendor A
   ├── Vendor B
   ├── Vendor C
   │
   ▼
Vendor Quotation
   │
   ▼
Vendor Comparison
   │
   ▼
Select Best Vendor
   │
   ▼
Cost Calculation
   │
   ├── Vendor Price
   ├── Vendor → Office Shipping
   ├── Office → Customer Shipping
   ├── Handling
   ├── Tax
   ├── Payment Term Adjustment
   └── Margin
   │
   ▼
Selling Price
   │
   ▼
Quotation Customer
   │
   ▼
Customer Follow Up
   │
   ├── Won
   ├── Lost
   └── Negotiation
```

---

# 6. CUSTOMER MANAGEMENT

## 6.1 Data Customer

Field:

- Customer ID
- Customer Code
- Company Name
- Customer Type
- Contact Person
- Position
- Phone
- Email
- Address
- City
- Province
- NPWP
- Payment Term Default
- Shipping Address
- Notes
- Status
- Created Date
- Updated Date

## 6.2 Customer Type

Contoh:

- Corporate
- Contractor
- Factory
- Government
- Individual
- Reseller
- Other

---

# 7. VENDOR MANAGEMENT

Vendor menjadi salah satu modul paling penting.

## 7.1 Data Vendor

Field:

- Vendor ID
- Vendor Code
- Vendor Name
- Vendor Type
- Contact Person
- Phone
- Email
- Address
- City
- Province
- Product Category
- Payment Term
- Lead Time
- Shipping Origin
- NPWP
- Bank Information
- Vendor Rating
- Status
- Notes

## 7.2 Vendor Rating

Sistem dapat memberikan rating:

- Price
- Quality
- Delivery
- Response Speed
- Reliability

Contoh:

```text
Vendor A
Price       : 5/5
Quality     : 4/5
Delivery    : 4/5
Response    : 5/5
Reliability : 4/5
```

---

# 8. PRODUCT / ITEM MASTER

Item master digunakan untuk menyimpan data barang yang sering diminta.

## 8.1 Field

- Item ID
- Item Code
- Part Number
- Item Name
- Description
- Brand
- Specification
- Category
- Subcategory
- Unit
- Weight
- Weight Unit
- Dimension
- Origin
- HS Code
- Default Margin
- Notes
- Status

Contoh:

```text
Item Code       : VAL-001
Part Number     : VLV-150-001
Item Name       : Gate Valve
Brand           : Example Brand
Specification   : 6" Class 150
Unit            : PCS
Weight          : 35 KG
Category        : Valve
```

---

# 9. CUSTOMER REQUEST / INQUIRY

Ini menjadi transaksi utama sistem.

## 9.1 Create Inquiry

User membuat:

- Inquiry Number
- Inquiry Date
- Customer
- Customer PIC
- Customer Reference Number
- Project
- Deadline Quotation
- Delivery Location
- Payment Term
- Currency
- Notes
- Attachment

Contoh nomor:

```text
INQ-2026-00001
```

---

# 10. INQUIRY ITEMS

Satu inquiry dapat memiliki banyak item.

Contoh:

```text
INQ-2026-00001

1. Gate Valve 6"
   Qty: 5 PCS

2. Stud Bolt M24
   Qty: 100 PCS

3. Pipe Elbow 6"
   Qty: 20 PCS
```

## 10.1 Field

- Inquiry Item ID
- Inquiry ID
- Item ID
- Description
- Specification
- Quantity
- Unit
- Customer Target Price
- Required Date
- Weight
- Notes
- Status

Status:

```text
Draft
Sourcing
Vendor Quotation Received
Pricing
Quoted
Won
Lost
Cancelled
```

---

# 11. VENDOR SOURCING

Ini merupakan fitur inti aplikasi.

Satu item dapat dikirim ke banyak vendor.

Contoh:

```text
ITEM:
Gate Valve 6"

Vendor:
├── Vendor A
├── Vendor B
├── Vendor C
├── Vendor D
└── Vendor E
```

## 11.1 Sourcing Request

Field:

- Sourcing ID
- Inquiry Item ID
- Vendor ID
- Request Date
- Request Number
- Requested Qty
- Requested Specification
- Deadline
- Status
- Notes
- Attachment

Status:

```text
Not Sent
Sent
Waiting Response
Responded
No Response
Rejected
Expired
```

---

# 12. VENDOR QUOTATION

Setiap vendor dapat memberikan harga berbeda.

Contoh:

| Vendor | Harga | Lead Time |
|---|---:|---:|
| Vendor A | Rp 10.000.000 | 14 hari |
| Vendor B | Rp 9.500.000 | 21 hari |
| Vendor C | Rp 11.000.000 | 7 hari |

Sistem menyimpan semuanya.

## 12.1 Data Vendor Quotation

- Vendor Quotation ID
- Sourcing ID
- Vendor ID
- Quotation Number
- Quotation Date
- Valid Until
- Currency
- Unit Price
- Quantity
- Discount
- Tax
- Total
- Lead Time
- Weight
- Shipping Cost
- Payment Term
- Notes
- Attachment
- Received Date

---

# 13. VENDOR COMPARISON

Sistem harus menyediakan halaman khusus untuk membandingkan vendor.

Contoh:

### Gate Valve 6"

| Parameter | Vendor A | Vendor B | Vendor C |
|---|---:|---:|---:|
| Unit Price | 10.000.000 | 9.500.000 | 11.000.000 |
| Lead Time | 14 hari | 21 hari | 7 hari |
| Weight | 35 KG | 36 KG | 34 KG |
| Shipping | 300.000 | 350.000 | 250.000 |
| Total Cost | 10.300.000 | 9.850.000 | 11.250.000 |

Sistem memberi indikator:

```text
BEST PRICE
BEST DELIVERY
BEST TOTAL COST
```

---

# 14. VENDOR SELECTION

Vendor termurah tidak selalu otomatis menjadi vendor terpilih.

Sistem menyediakan:

### Selection Criteria

- Harga
- Total landed cost
- Lead time
- Payment term
- Vendor rating
- Availability
- Customer requirement

Contoh:

```text
Vendor B
Price              : Excellent
Landed Cost        : Excellent
Lead Time          : Poor
Payment Term       : Good
Vendor Rating      : Excellent
```

User kemudian memilih:

**Select Vendor**

Sistem menyimpan:

- Selected Vendor
- Selection Date
- Selected By
- Selection Reason

---

# 15. COST CALCULATION

Ini adalah fitur paling penting.

Sistem menghitung harga jual berdasarkan:

```text
Vendor Cost
+
Vendor → Office Shipping
+
Office Handling
+
Office → Customer Shipping
+
Other Cost
+
Payment Term Adjustment
+
Tax
+
Margin
=
Selling Price
```

---

# 16. KOMPONEN COST

## 16.1 Vendor Purchase Price

```text
Vendor Unit Price × Quantity
```

Contoh:

```text
Rp 10.000.000 × 5
=
Rp 50.000.000
```

---

# 17. ONGKIR VENDOR → KANTOR

Sistem menyediakan beberapa metode.

### Method A — Manual

User memasukkan:

```text
Shipping Cost = Rp 500.000
```

### Method B — Per KG

```text
Weight × Rate/KG
```

Contoh:

```text
100 KG × Rp 5.000
=
Rp 500.000
```

### Method C — Per Item

```text
Qty × Shipping Rate
```

---

# 18. ONGKIR KANTOR → CUSTOMER

Parameter:

- Destination
- Weight
- Shipping Method
- Courier
- Rate
- Handling
- Insurance

Formula:

```text
Shipping Cost =
Base Shipping
+
Handling
+
Insurance
```

---

# 19. WEIGHT MANAGEMENT

Berat barang sangat penting karena memengaruhi biaya pengiriman.

Sistem menyimpan:

```text
Weight per Unit
Quantity
Total Weight
```

Formula:

```text
Total Weight =
Weight per Unit × Quantity
```

Contoh:

```text
Weight = 35 KG
Qty = 5

Total = 175 KG
```

---

# 20. PAYMENT TERM

Payment term customer dapat memengaruhi harga jual.

Contoh:

```text
COD
7 Days
14 Days
30 Days
45 Days
60 Days
90 Days
```

Sistem dapat memiliki konfigurasi adjustment.

Contoh:

| Termin | Adjustment |
|---|---:|
| COD | 0% |
| 14 Hari | 0.5% |
| 30 Hari | 1% |
| 45 Hari | 1.5% |
| 60 Hari | 2% |
| 90 Hari | 3% |

Nilai ini harus configurable oleh Owner.

---

# 21. MARGIN

Margin dapat ditentukan berdasarkan:

- Item
- Category
- Customer
- Transaction
- Default Company Margin

Contoh:

```text
Default Margin = 15%
```

Owner dapat mengubahnya.

---

# 22. PRICING ENGINE

Sistem menyediakan kalkulator harga.

Contoh:

```text
Vendor Price
Rp 50.000.000

Vendor → Office
Rp 1.000.000

Office → Customer
Rp 1.500.000

Handling
Rp 500.000

Subtotal Cost
Rp 53.000.000

Payment Term Adjustment
1%

Adjusted Cost
Rp 53.530.000

Margin
15%

Selling Price
Rp 61.559.500
```

Formula harus disimpan secara terstruktur agar tidak terjadi perbedaan perhitungan antara halaman.

---

# 23. MODE PRICING

Sistem menyediakan beberapa mode.

## Mode 1 — Markup

```text
Selling Price =
Cost × (1 + Markup%)
```

Contoh:

```text
Cost = 100.000
Markup = 20%

Selling = 120.000
```

## Mode 2 — Gross Margin

Jika yang dimaksud margin adalah persentase dari harga jual:

```text
Selling Price =
Cost / (1 - Margin%)
```

Contoh:

```text
Cost = 100.000
Margin = 20%

Selling =
100.000 / 0.8
=
125.000
```

Sistem **wajib membedakan Markup dan Gross Margin** agar perhitungan bisnis tidak salah.

---

# 24. ROUNDING PRICE

Sistem menyediakan pembulatan harga.

Contoh:

```text
Exact Price:
Rp 61.559.500

Rounded:
Rp 61.600.000
```

Setting:

```text
Round to:
Rp 1.000
Rp 5.000
Rp 10.000
Rp 50.000
Rp 100.000
Rp 1.000.000
```

---

# 25. SELLING PRICE ANALYSIS

Sebelum quotation dibuat, user melihat:

```text
Vendor Cost              Rp 50.000.000
Vendor Shipping          Rp 1.000.000
Office Shipping          Rp 1.500.000
Other Cost               Rp 500.000
------------------------------------
Total Cost               Rp 53.000.000

Margin                   15%
Payment Adjustment       1%

Selling Price            Rp XX.XXX.XXX
Gross Profit              Rp X.XXX.XXX
Gross Margin              XX%
```

---

# 26. QUOTATION CUSTOMER

Setelah harga disetujui, user klik:

**Generate Quotation**

Sistem membuat quotation otomatis.

## 26.1 Quotation Header

- Company Logo
- Company Name
- Address
- Phone
- Email
- Quotation Number
- Date
- Valid Until
- Customer
- Customer Address
- Customer PIC
- Project
- Customer Reference

Contoh:

```text
Quotation No:
QT-2026-00001
```

---

# 27. QUOTATION ITEM

Contoh:

| No | Description | Specification | Qty | Unit | Unit Price | Total |
|---|---|---|---:|---|---:|---:|
| 1 | Gate Valve | 6" Class 150 | 5 | PCS | 12.500.000 | 62.500.000 |
| 2 | Stud Bolt | M24 | 100 | PCS | 25.000 | 2.500.000 |

Subtotal:

```text
Rp 65.000.000
```

Tax jika berlaku:

```text
PPN
```

Grand Total:

```text
Rp XX.XXX.XXX
```

---

# 28. QUOTATION TERMS & CONDITIONS

Quotation dapat memiliki template.

Contoh:

### Delivery

```text
Delivery: 2–4 weeks after PO/payment confirmation.
```

### Payment

```text
Payment Term: 30 Days.
```

### Validity

```text
Quotation valid for 14 days.
```

### Warranty

```text
Warranty follows manufacturer's terms.
```

### Shipping

```text
Delivery cost is included/excluded as specified.
```

Template dapat dikonfigurasi Owner.

---

# 29. QUOTATION STATUS

Status:

```text
Draft
Waiting Approval
Approved
Sent
Viewed
Negotiation
Revised
Won
Lost
Expired
Cancelled
```

---

# 30. QUOTATION REVISION

Sistem harus mendukung revisi.

Contoh:

```text
QT-2026-00001 Rev 0
QT-2026-00001 Rev 1
QT-2026-00001 Rev 2
```

Setiap revisi menyimpan:

- Harga sebelumnya
- Harga baru
- Perubahan margin
- Perubahan biaya
- User
- Timestamp
- Reason

Quotation lama tidak boleh hilang.

---

# 31. CUSTOMER FOLLOW-UP

Setelah quotation dikirim, sistem menyediakan follow-up.

Field:

- Follow-up Date
- PIC
- Customer Response
- Notes
- Next Follow-up
- Status

Contoh:

```text
19 Aug
Quotation sent

22 Aug
Customer sedang review

25 Aug
Customer meminta revisi harga

27 Aug
Final negotiation

30 Aug
Won
```

---

# 32. DEAL STATUS

Setiap inquiry/quotation dapat berakhir:

### WON

Customer melakukan order.

### LOST

Customer tidak jadi membeli.

Reason:

- Harga terlalu tinggi
- Vendor tidak tersedia
- Lead time terlalu lama
- Customer memilih competitor
- Project cancelled
- Specification berubah
- Other

Reason wajib dipilih agar nantinya dapat dianalisis.

---

# 33. DASHBOARD

Dashboard menjadi halaman utama.

## KPI Cards

```text
Total Inquiry
125

Active Sourcing
42

Pending Vendor
18

Quotation Sent
65

Won
21

Lost
12

Pipeline Value
Rp 2.4 M

Estimated Profit
Rp 350 Jt
```

---

# 34. DASHBOARD CHART

### Inquiry Trend

```text
Jan ███████
Feb █████████
Mar ███████████
Apr █████████████
```

### Quotation Status

- Draft
- Sent
- Negotiation
- Won
- Lost

### Vendor Performance

Menampilkan:

- Response rate
- Average price
- Lead time
- Win rate

---

# 35. PROFIT ANALYSIS

Owner dapat melihat:

```text
Sales
Cost
Gross Profit
Margin
```

Filter:

- Date
- Customer
- Vendor
- Category
- Sales Person
- Project

Contoh:

```text
Sales
Rp 1.500.000.000

Cost
Rp 1.200.000.000

Gross Profit
Rp 300.000.000

Gross Margin
20%
```

---

# 36. HISTORI HARGA

Sistem menyimpan histori vendor.

Contoh:

```text
Gate Valve 6"

Vendor A

Jan 2026
Rp 9.500.000

Mar 2026
Rp 9.800.000

Jun 2026
Rp 10.000.000

Aug 2026
Rp 10.500.000
```

Fitur ini sangat berguna untuk menentukan apakah harga vendor saat ini wajar.

---

# 37. PRICE HISTORY WARNING

Jika vendor memberikan harga jauh di atas histori:

```text
⚠ PRICE INCREASE

Current:
Rp 12.000.000

Previous:
Rp 10.000.000

Increase:
20%
```

Sistem dapat memberikan warning.

---

# 38. VENDOR PRICE COMPARISON HISTORY

User dapat melihat:

```text
Item: Gate Valve 6"

Last Sourcing:

Vendor A  Rp 10.000.000
Vendor B  Rp 9.500.000
Vendor C  Rp 11.000.000
```

---

# 39. SEARCH & FILTER

Semua halaman harus memiliki:

- Search
- Filter Date
- Filter Status
- Filter Customer
- Filter Vendor
- Filter Category
- Filter PIC

Contoh pencarian:

```text
Gate Valve
```

akan mencari:

- Item
- Inquiry
- Vendor quotation
- Customer quotation
- Price history

---

# 40. DOCUMENT ATTACHMENT

Sistem dapat menyimpan link dokumen.

Jenis:

- Customer inquiry
- Vendor quotation
- Vendor datasheet
- Product catalog
- Customer PO
- Vendor PO
- Quotation PDF

Karena Google Sheets tidak ideal untuk menyimpan file, file disimpan di:

**Google Drive**

Sedangkan spreadsheet hanya menyimpan:

```text
File ID
File URL
File Type
Related Transaction
```

---

# 41. DATABASE ARCHITECTURE

Google Sheets digunakan sebagai database tabular.

Struktur spreadsheet:

```text
SUPPLIER_SYSTEM.xlsx / Google Spreadsheet

├── users
├── roles
├── customers
├── vendors
├── products
├── categories
├── inquiries
├── inquiry_items
├── sourcing_requests
├── vendor_quotations
├── vendor_quotation_items
├── vendor_comparisons
├── selected_vendors
├── cost_calculations
├── pricing_rules
├── quotations
├── quotation_items
├── quotation_revisions
├── follow_ups
├── payment_terms
├── shipping_rates
├── documents
├── activity_logs
└── settings
```

---

# 42. PRIMARY KEY

Setiap record memiliki ID unik.

Contoh:

```text
CUS-000001
VEN-000001
ITM-000001
INQ-2026-000001
SRC-2026-000001
VQT-2026-000001
QT-2026-000001
```

ID tidak boleh menggunakan nomor baris spreadsheet sebagai primary key.

---

# 43. GOOGLE SHEETS AS DATABASE

Google Sheets hanya berfungsi sebagai storage layer.

Arsitektur:

```text
React
  │
  ▼
API Layer
Google Apps Script
  │
  ├── Validation
  ├── Authentication
  ├── Business Logic
  ├── Pricing Engine
  └── CRUD
  │
  ▼
Google Sheets
  │
  └── Google Drive
```

React **tidak direkomendasikan langsung mengakses spreadsheet**.

---

# 44. FRONTEND TECHNOLOGY

Recommended:

### React

```text
React + TypeScript
```

### Build Tool

```text
Vite
```

### UI

```text
Tailwind CSS
```

atau:

```text
shadcn/ui
```

### Routing

```text
React Router
```

### Form

```text
React Hook Form
```

### Validation

```text
Zod
```

### State Management

Untuk tahap awal:

```text
Zustand
```

### Data Fetching

```text
TanStack Query
```

### Table

```text
TanStack Table
```

### Charts

```text
Recharts
```

---

# 45. BACKEND

Recommended:

```text
Google Apps Script
```

Tugas backend:

- CRUD
- Authentication
- Authorization
- Spreadsheet operations
- Pricing calculation
- Number generation
- Validation
- Logging
- Google Drive integration
- PDF generation
- Email sending

---

# 46. DATABASE GOOGLE SHEETS

Contoh sheet `customers`:

| id | code | name | pic | phone | email | address | payment_term | status |
|---|---|---|---|---|---|---|---|---|

Sheet `vendors`:

| id | code | name | pic | phone | email | address | payment_term | rating |
|---|---|---|---|---|---|---|---|---|

Sheet `inquiries`:

| id | number | customer_id | date | deadline | project | status | created_by |
|---|---|---|---|---|---|---|---|

Sheet `inquiry_items`:

| id | inquiry_id | item_id | description | qty | unit | weight | status |
|---|---|---|---|---:|---|---:|---|

---

# 47. PRICING DATABASE

Sheet `cost_calculations`:

| id | inquiry_item_id | vendor_id | vendor_cost | vendor_shipping | office_shipping | handling | other_cost | payment_adjustment | margin | selling_price |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|

Semua perhitungan disimpan sehingga hasil quotation dapat ditelusuri kembali.

---

# 48. PRICING RULES

Sheet:

`pricing_rules`

Field:

- Rule ID
- Name
- Type
- Min Weight
- Max Weight
- Payment Term
- Margin
- Adjustment
- Active
- Priority

Contoh:

```text
Rule:
Payment 60 Days

Adjustment:
2%
```

---

# 49. SHIPPING RULES

Sheet:

`shipping_rates`

Field:

- Rate ID
- Origin
- Destination
- Weight From
- Weight To
- Rate
- Courier
- Additional Cost
- Active

Contoh:

```text
Semarang → Jakarta
0–10 KG
Rp 15.000/KG
```

Namun sistem tetap menyediakan manual override.

---

# 50. USER INTERFACE

Desain aplikasi:

```text
┌──────────────────────────────────────────────────┐
│ LOGO        Search...          🔔    User        │
├──────────────┬───────────────────────────────────┤
│ Dashboard    │                                   │
│              │ Dashboard                         │
│ Inquiry      │                                   │
│ Customers    │ ┌───────┐ ┌───────┐ ┌─────────┐ │
│ Vendors      │ │Inquiry│ │Quotes │ │ Profit  │ │
│ Products     │ └───────┘ └───────┘ └─────────┘ │
│ Sourcing     │                                   │
│ Quotations   │ Recent Inquiry                    │
│ Follow Up    │ ┌───────────────────────────────┐ │
│ Reports      │ │ Customer | Item | Status      │ │
│              │ └───────────────────────────────┘ │
│ Settings     │                                   │
└──────────────┴───────────────────────────────────┘
```

---

# 51. DESIGN PRINCIPLE

UI harus:

- Clean
- Professional
- Business oriented
- Responsive
- Desktop-first
- Mobile-friendly
- Tidak terlalu banyak warna
- Status menggunakan badge
- Table mudah dibaca
- Form dibagi menjadi beberapa section

---

# 52. INQUIRY DETAIL UI

Halaman detail inquiry:

```text
INQ-2026-00001

Customer:
PT ABC Indonesia

Project:
PLTU XYZ

Deadline:
25 Aug 2026

────────────────────────

ITEMS

┌─────────────────────────────────────────┐
│ Gate Valve 6"                           │
│ Qty: 5 PCS                              │
│                                         │
│ Sourcing: 4 Vendors                     │
│ Best Vendor: Vendor B                   │
│ Best Cost: Rp 9.850.000                 │
│                                         │
│ [Compare Vendors] [Calculate Price]     │
└─────────────────────────────────────────┘
```

---

# 53. VENDOR COMPARISON UI

Tampilan harus mudah mengambil keputusan.

```text
Gate Valve 6"

Vendor A
Rp 10.300.000
14 Days

Vendor B
Rp 9.850.000
21 Days
★ BEST COST

Vendor C
Rp 11.250.000
7 Days
★ BEST DELIVERY
```

Button:

```text
SELECT VENDOR
```

---

# 54. PRICE CALCULATOR UI

Layout:

```text
PRICE CALCULATOR

Vendor Cost
[ Rp 50.000.000 ]

Vendor → Office
[ Rp 1.000.000 ]

Office → Customer
[ Rp 1.500.000 ]

Handling
[ Rp 500.000 ]

Other Cost
[ Rp 0 ]

Payment Term
[ 30 Days ]

Margin
[ 15 % ]

────────────────────

Total Cost
Rp 53.000.000

Selling Price
Rp 62.000.000

Gross Profit
Rp 9.000.000

Gross Margin
14.52%

[ SAVE PRICE ]
[ GENERATE QUOTATION ]
```

---

# 55. QUOTATION WORKFLOW

```text
Pricing Complete
      ↓
Save Pricing
      ↓
Review
      ↓
Approval
      ↓
Generate Quotation
      ↓
Preview PDF
      ↓
Send Customer
```

---

# 56. APPROVAL WORKFLOW

Untuk transaksi tertentu, Owner dapat diwajibkan melakukan approval.

Contoh rule:

```text
Margin < 10%
        ↓
Requires Owner Approval
```

Atau:

```text
Quotation > Rp 100.000.000
        ↓
Requires Owner Approval
```

---

# 57. AUDIT LOG

Semua aktivitas penting dicatat.

Contoh:

```text
19 Aug 2026 19:30
Admin Budi

Changed:
Selling Price

From:
Rp 60.000.000

To:
Rp 58.000.000

Reason:
Customer negotiation
```

Audit log:

- User
- Action
- Module
- Record ID
- Old Value
- New Value
- Timestamp

---

# 58. NOTIFICATION

Dashboard dapat memberikan notification:

```text
⚠ Vendor quotation belum diterima
⚠ Quotation akan expired
⚠ Customer follow-up hari ini
⚠ Inquiry mendekati deadline
⚠ Approval diperlukan
```

---

# 59. REPORTING

## Inquiry Report

Filter:

- Date
- Customer
- Status
- PIC

## Vendor Report

- Vendor response rate
- Vendor pricing
- Average lead time
- Vendor usage

## Sales Report

- Total quotation
- Won
- Lost
- Conversion rate

## Profit Report

- Revenue
- Cost
- Gross Profit
- Gross Margin

---

# 60. CONVERSION RATE

Formula:

```text
Won Quotations
÷
Total Quotations
× 100%
```

Contoh:

```text
20 Won
100 Quotation

Conversion Rate = 20%
```

---

# 61. VENDOR PERFORMANCE

Contoh:

```text
Vendor A

Quotation Received:
80

Selected:
35

Selection Rate:
43.75%

Average Response:
1.5 Days

Average Lead Time:
14 Days
```

---

# 62. CUSTOMER PROFITABILITY

Owner dapat mengetahui customer mana yang paling menguntungkan.

Contoh:

```text
Customer A

Sales:
Rp 500.000.000

Gross Profit:
Rp 100.000.000

Margin:
20%
```

---

# 63. IMPORT / EXPORT

Sistem mendukung:

### Import Excel / CSV

Untuk:

- Customer
- Vendor
- Product
- Price list

### Export

- Excel
- CSV
- PDF

---

# 64. GOOGLE DRIVE

Folder structure:

```text
Supplier System
│
├── Customers
├── Vendor Quotations
├── Customer Quotations
├── Product Documents
├── Purchase Orders
└── Reports
```

Setiap transaksi menyimpan link ke folder terkait.

---

# 65. SECURITY

Karena Google Sheets menjadi database, keamanan harus diperhatikan.

User tidak boleh mendapatkan akses langsung ke spreadsheet database.

Arsitektur:

```text
User
 ↓
React
 ↓
API
 ↓
Google Apps Script
 ↓
Google Sheets
```

Spreadsheet hanya dapat diakses oleh akun backend/owner.

---

# 66. VALIDATION

Contoh validasi:

### Inquiry

```text
Customer wajib
Tanggal wajib
Minimal 1 item
Qty > 0
```

### Vendor quotation

```text
Vendor wajib
Harga > 0
Qty > 0
Currency wajib
```

### Pricing

```text
Margin tidak boleh negatif
Selling Price tidak boleh < Cost
```

Jika ada exception, sistem menampilkan warning.

---

# 67. BUSINESS RULES

## Rule 1

Satu inquiry memiliki banyak item.

## Rule 2

Satu inquiry item dapat memiliki banyak vendor.

## Rule 3

Satu vendor dapat memberikan quotation untuk banyak item.

## Rule 4

Satu item dapat memiliki satu vendor terpilih untuk quotation tertentu.

## Rule 5

Vendor termurah tidak selalu otomatis terpilih.

## Rule 6

Harga jual harus berasal dari pricing engine.

## Rule 7

Pricing yang sudah digunakan quotation tidak boleh berubah tanpa membuat revision.

## Rule 8

Quotation yang sudah dikirim harus immutable terhadap histori.

---

# 68. STATUS MACHINE

## Inquiry

```text
Draft
 ↓
Sourcing
 ↓
Pricing
 ↓
Quoted
 ↓
Won / Lost
```

## Vendor Sourcing

```text
Draft
 ↓
Sent
 ↓
Waiting
 ↓
Received
```

## Quotation

```text
Draft
 ↓
Approval
 ↓
Approved
 ↓
Sent
 ↓
Negotiation
 ↓
Won / Lost
```

---

# 69. MVP VERSION

Versi pertama sebaiknya jangan langsung membuat seluruh fitur.

MVP:

### Phase 1

- Login
- Dashboard
- Customer
- Vendor
- Product
- Inquiry
- Inquiry Item
- Vendor Sourcing
- Vendor Quotation
- Vendor Comparison
- Pricing Calculator
- Customer Quotation
- PDF
- Google Sheets
- Google Drive

Ini sudah mencakup core business.

---

# 70. PHASE 2

Tambahkan:

- Follow-up
- Approval
- Price History
- Vendor Rating
- Profit Report
- Customer Profitability
- Advanced Shipping
- Payment Term Rules
- Import Excel
- Export Excel
- Notification

---

# 71. PHASE 3

Jika bisnis semakin besar:

- Purchase Order
- Sales Order
- Customer PO
- Vendor PO
- Delivery Tracking
- Invoice
- Payment Tracking
- Inventory
- Multi-warehouse
- Multi-user permission
- Multi-company

Pada tahap ini Google Sheets mulai perlu dievaluasi kembali.

---

# 72. FUTURE DATABASE MIGRATION

Karena aplikasi menggunakan repository/API layer, database dapat diganti tanpa membangun ulang frontend.

Awal:

```text
React
 ↓
Apps Script
 ↓
Google Sheets
```

Kemudian:

```text
React
 ↓
REST API
 ↓
PostgreSQL
```

atau:

```text
React
 ↓
Supabase
 ↓
PostgreSQL
```

Sehingga sistem dapat berkembang tanpa harus mengubah seluruh UI.

---

# 73. RECOMMENDED PROJECT STRUCTURE

```text
supplier-management/
│
├── src/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   │   ├── dashboard/
│   │   ├── customers/
│   │   ├── vendors/
│   │   ├── products/
│   │   ├── inquiries/
│   │   ├── sourcing/
│   │   ├── pricing/
│   │   ├── quotations/
│   │   ├── followups/
│   │   └── reports/
│   │
│   ├── features/
│   │   ├── inquiry/
│   │   ├── vendor/
│   │   ├── pricing/
│   │   └── quotation/
│   │
│   ├── services/
│   │   ├── api.ts
│   │   ├── customer.service.ts
│   │   ├── vendor.service.ts
│   │   ├── inquiry.service.ts
│   │   ├── pricing.service.ts
│   │   └── quotation.service.ts
│   │
│   ├── hooks/
│   ├── store/
│   ├── types/
│   ├── utils/
│   └── config/
│
└── apps-script/
    ├── Code.gs
    ├── api.gs
    ├── auth.gs
    ├── customer.gs
    ├── vendor.gs
    ├── inquiry.gs
    ├── sourcing.gs
    ├── pricing.gs
    ├── quotation.gs
    └── utils.gs
```

---

# 74. API DESIGN

Contoh endpoint/action:

```text
POST /login

GET /customers
POST /customers
PUT /customers/:id

GET /vendors
POST /vendors
PUT /vendors/:id

GET /products
POST /products

GET /inquiries
POST /inquiries
GET /inquiries/:id
PUT /inquiries/:id

POST /sourcing
GET /sourcing/:inquiryItemId

POST /vendor-quotations
GET /vendor-quotations/:inquiryItemId

GET /vendor-comparison/:inquiryItemId

POST /pricing/calculate
POST /pricing/save

POST /quotations
GET /quotations/:id
POST /quotations/:id/revision
POST /quotations/:id/send
```

Pada implementasi Google Apps Script, endpoint tersebut dapat direpresentasikan sebagai action-based API.

---

# 75. PERFORMANCE CONSIDERATION

Google Sheets memiliki keterbatasan dibanding database relasional.

Karena itu:

- Jangan melakukan request per baris.
- Gunakan batch read/write.
- Cache master data.
- Gunakan ID sebagai reference.
- Hindari formula spreadsheet yang terlalu kompleks.
- Business calculation dilakukan di backend.
- React menggunakan caching.
- Pagination dilakukan pada layer aplikasi.
- Jangan menyimpan file binary di spreadsheet.

---

# 76. DATA RELATIONSHIP

Relasi utama:

```text
Customer
   │
   └── Inquiry
          │
          └── Inquiry Item
                 │
                 ├── Sourcing Request
                 │       │
                 │       └── Vendor
                 │
                 └── Vendor Quotation
                          │
                          ▼
                    Vendor Comparison
                          │
                          ▼
                    Selected Vendor
                          │
                          ▼
                    Cost Calculation
                          │
                          ▼
                    Customer Quotation
```

---

# 77. SUCCESS METRICS

Setelah sistem digunakan, target:

### Efficiency

Mengurangi waktu membuat quotation.

### Accuracy

Mengurangi kesalahan pricing.

### Visibility

Owner dapat melihat semua pipeline.

### Vendor Management

Mengetahui vendor dengan harga dan performa terbaik.

### Profitability

Mengetahui margin setiap transaksi.

### Conversion

Mengetahui persentase quotation yang menjadi order.

---

# 78. ACCEPTANCE CRITERIA UTAMA

Sistem dianggap berhasil jika:

### AC-01

User dapat membuat inquiry customer dengan banyak item.

### AC-02

Satu item dapat dikirim ke minimal 2 vendor.

### AC-03

User dapat memasukkan quotation masing-masing vendor.

### AC-04

Sistem dapat membandingkan vendor.

### AC-05

User dapat memilih vendor berdasarkan total cost.

### AC-06

Sistem dapat menghitung total berat.

### AC-07

Sistem dapat menghitung ongkir.

### AC-08

Sistem dapat menghitung margin.

### AC-09

Sistem dapat menghitung selling price.

### AC-10

Sistem dapat membuat quotation PDF.

### AC-11

Quotation memiliki nomor unik.

### AC-12

Quotation revision tersimpan.

### AC-13

Owner dapat melihat profit.

### AC-14

Histori harga vendor tersimpan.

### AC-15

Semua perubahan penting tercatat pada audit log.

---

# 79. CONTOH TRANSAKSI END-TO-END

Customer:

```text
PT ABC
```

Meminta:

```text
Gate Valve 6"
Qty: 5 PCS
```

Admin membuat:

```text
INQ-2026-00001
```

Kemudian sourcing:

```text
Vendor A
Vendor B
Vendor C
Vendor D
```

Harga yang diterima:

```text
Vendor A = Rp 10.000.000
Vendor B = Rp 9.500.000
Vendor C = Rp 10.500.000
Vendor D = Rp 9.800.000
```

Sistem menghitung landed cost:

```text
Vendor B
Purchase Cost       Rp 47.500.000
Shipping             Rp 1.000.000
Handling             Rp   500.000
Office → Customer    Rp 1.500.000
----------------------------------
Total Cost           Rp 50.500.000
```

Kemudian:

```text
Payment Term = 30 Days
Adjustment = 1%

Margin = 15%
```

Sistem menghasilkan selling price.

User melakukan review.

Kemudian:

```text
GENERATE QUOTATION
```

Sistem menghasilkan:

```text
QT-2026-00001
```

PDF dikirim kepada customer.

Status:

```text
Sent
```

Customer melakukan negosiasi.

User membuat:

```text
QT-2026-00001 Rev 1
```

Setelah customer menyetujui:

```text
WON
```

Owner dapat melihat:

```text
Sales
Cost
Profit
Margin
Customer
Vendor
```

Seluruh histori tetap tersimpan.

---

# 80. RECOMMENDED MENU FINAL

Sidebar aplikasi:

```text
DASHBOARD

TRANSACTIONS
├── Customer Inquiry
├── Vendor Sourcing
├── Vendor Quotations
├── Pricing
├── Customer Quotations
└── Follow Up

MASTER DATA
├── Customers
├── Vendors
├── Products
├── Categories
├── Payment Terms
└── Shipping Rates

REPORTS
├── Sales Report
├── Profit Report
├── Vendor Performance
├── Customer Analysis
├── Price History
└── Conversion Report

SYSTEM
├── Users
├── Roles & Permissions
├── Numbering
├── Quotation Template
├── Company Profile
├── Settings
└── Activity Logs
```

---

# 81. KESIMPULAN ARSITEKTUR

Untuk kondisi bisnis saat ini, rekomendasi teknologinya:

```text
                 ┌───────────────────┐
                 │       USER        │
                 └─────────┬─────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │   React + Vite    │
                 │   TypeScript      │
                 │   Tailwind        │
                 └─────────┬─────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │   Apps Script API  │
                 │                   │
                 │ Business Logic    │
                 │ Pricing Engine    │
                 │ Validation        │
                 │ Authentication    │
                 └───────┬─────┬─────┘
                         │     │
              ┌──────────┘     └──────────┐
              ▼                           ▼
     ┌─────────────────┐          ┌─────────────────┐
     │ Google Sheets   │          │ Google Drive    │
     │ Database        │          │ Documents/PDF   │
     └─────────────────┘          └─────────────────┘
```

**Core value sistem ini adalah Pricing Engine.**

Jangan membuat sistem hanya sebagai CRUD customer/vendor/quotation. Inti aplikasinya harus mampu menjawab satu pertanyaan:

> **"Dari sekian banyak vendor untuk item ini, setelah semua biaya diperhitungkan, berapa harga jual yang aman dan menguntungkan untuk ditawarkan kepada customer?"**

Karena itu, modul **Vendor Comparison + Landed Cost + Pricing Engine + Quotation Generator** harus menjadi prioritas utama dalam development.