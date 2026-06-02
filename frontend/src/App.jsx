import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/shared/ProtectedRoute.jsx';

import LoginPage from './pages/auth/LoginPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import VendorsPage from './pages/admin/VendorsPage.jsx';
import BillsPage from './pages/admin/BillsPage.jsx';
import PaymentsPage from './pages/admin/PaymentsPage.jsx';
import CollectorsPage from './pages/admin/CollectorsPage.jsx';
import AuditPage from './pages/admin/AuditPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
import RoutesPage from './pages/admin/RoutesPage.jsx';
import SoudasPage from './pages/admin/SoudasPage.jsx';
import SoudaMastersPage from './pages/admin/SoudaMastersPage.jsx';
import CollectorVendorsPage from './pages/collector/CollectorVendorsPage.jsx';
import CollectPage from './pages/collector/CollectPage.jsx';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/collector/vendors" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RootRedirect />} />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute role="ADMIN"><DashboardPage /></ProtectedRoute>} />
        <Route path="/admin/vendors"   element={<ProtectedRoute role="ADMIN"><VendorsPage /></ProtectedRoute>} />
        <Route path="/admin/bills"     element={<ProtectedRoute role="ADMIN"><BillsPage /></ProtectedRoute>} />
        <Route path="/admin/payments"  element={<ProtectedRoute role="ADMIN"><PaymentsPage /></ProtectedRoute>} />
        <Route path="/admin/collectors"element={<ProtectedRoute role="ADMIN"><CollectorsPage /></ProtectedRoute>} />
        <Route path="/admin/audit"       element={<ProtectedRoute role="ADMIN"><AuditPage /></ProtectedRoute>} />
        <Route path="/admin/categories"    element={<ProtectedRoute role="ADMIN"><CategoriesPage /></ProtectedRoute>} />
        <Route path="/admin/routes"        element={<ProtectedRoute role="ADMIN"><RoutesPage /></ProtectedRoute>} />
        <Route path="/admin/soudas"        element={<ProtectedRoute role="ADMIN"><SoudasPage /></ProtectedRoute>} />
        <Route path="/admin/souda-masters" element={<ProtectedRoute role="ADMIN"><SoudaMastersPage /></ProtectedRoute>} />

        {/* Collector routes */}
        <Route path="/collector/vendors" element={<ProtectedRoute role="COLLECTOR"><CollectorVendorsPage /></ProtectedRoute>} />
        <Route path="/collector/collect" element={<ProtectedRoute role="COLLECTOR"><CollectPage /></ProtectedRoute>} />

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
