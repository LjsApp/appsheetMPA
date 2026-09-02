import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Vendors from './pages/Vendors';
import Products from './pages/Products';
import Inquiries from './pages/Inquiries';
import Neracas from './pages/Neracas';
import NeracaDetail from './pages/NeracaDetail';
import Sourcing from './pages/Sourcing';
import Pricing from './pages/Pricing';
import Quotations from './pages/Quotations';
import QuotationDetail from './pages/QuotationDetail';
import PurchaseOrders from './pages/PurchaseOrders';
import PODetail from './pages/PODetail';
import POInList from './pages/POInList';
import SuratJalan from './pages/SuratJalan';
import SuratJalanDetail from './pages/SuratJalanDetail';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import InternalLetters from './pages/InternalLetters';
import InternalLetterDetail from './pages/InternalLetterDetail';
import CompanySettings from './pages/CompanySettings';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Verifikasi from './pages/Verifikasi';
import BelanjaDapur from './pages/BelanjaDapur';
import BelanjaProyek from './pages/BelanjaProyek';

const Placeholder = ({ title }: { title: string }) => (
  <div>
    <h1 className="text-2xl font-bold mb-4">{title}</h1>
    <p className="text-gray-500">Work in progress...</p>
  </div>
);

function App() {
  return (
    <Routes>
      <Route path="/setup" element={<Setup />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="products" element={<Products />} />
          <Route path="inquiries" element={<Inquiries />} />
          <Route path="neraca" element={<Neracas />} />
          <Route path="neraca/:inquiryId/:neracaId" element={<NeracaDetail />} />
          <Route path="sourcing" element={<Sourcing />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="quotations" element={<Quotations />} />
          <Route path="quotations/:quotationId" element={<QuotationDetail />} />
          <Route path="po" element={<PurchaseOrders />} />
          <Route path="po/:poId" element={<PODetail />} />
          <Route path="po-in" element={<POInList />} />
          <Route path="surat-jalan" element={<SuratJalan />} />
          <Route path="surat-jalan/:id" element={<SuratJalanDetail />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="verifikasi" element={<Verifikasi />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="belanja-dapur" element={<BelanjaDapur />} />
          <Route path="belanja-proyek" element={<BelanjaProyek />} />
          <Route path="internal-letters" element={<InternalLetters />} />
          <Route path="internal-letters/:id" element={<InternalLetterDetail />} />
          <Route path="settings/company" element={<CompanySettings />} />
          <Route path="settings/users" element={<Users />} />
          <Route path="settings/roles" element={<Roles />} />
          <Route path="*" element={<Placeholder title="Coming Soon" />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
