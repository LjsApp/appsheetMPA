import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
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
import CompanySettings from './pages/CompanySettings';

const Placeholder = ({ title }: { title: string }) => (
  <div>
    <h1 className="text-2xl font-bold mb-4">{title}</h1>
    <p className="text-gray-500">Work in progress...</p>
  </div>
);

function App() {
  return (
    <Routes>
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
        <Route path="settings/company" element={<CompanySettings />} />
        <Route path="*" element={<Placeholder title="Coming Soon" />} />
      </Route>
    </Routes>
  );
}

export default App;
