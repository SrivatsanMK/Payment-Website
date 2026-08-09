import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { SocketProvider } from './context/SocketContext';
import { GlobalBackground } from './components/ui/GlobalBackground';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';
import AdminLayout from './components/layout/AdminLayout';
import PrivateBusinessLayout from './components/layout/PrivateBusinessLayout';

// ─── CUSTOMER AUTH PAGES ──────────────────────────────────────────────────────
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP from './pages/VerifyOTP';
import ResetPassword from './pages/ResetPassword';

// ─── ADMIN AUTH PAGES ─────────────────────────────────────────────────────────
import AdminLogin from './pages/admin/AdminLogin';
import ProfileSelection from './pages/admin/ProfileSelection';

// ─── GREEN GLIDE LOGISTICS ADMIN DASHBOARD PAGES ──────────────────────────────
import AdminDashboard from './pages/admin/AdminDashboard';
import Customers from './pages/admin/Customers';
import Invoices from './pages/admin/Invoices';
import Payments from './pages/admin/Payments';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';

// ─── EXPENSE MANAGER PAGES ───────────────────────────────────────────────────
import ExpenseDashboard from './pages/expense-manager/ExpenseDashboard';
import AddExpense from './pages/expense-manager/AddExpense';
import { ExpenseHistory } from './pages/expense-manager/ExpenseHistory';
import { ExpenseReports } from './pages/expense-manager/ExpenseReports';
import { ExpenseSettings } from './pages/expense-manager/ExpenseSettings';

// ─── PRIVATE BUSINESS (VEGETABLE PURCHASING) PAGES ────────────────────────────
import PrivateBusinessDashboard from './pages/private-business/PrivateBusinessDashboard';
import AddPurchase from './pages/private-business/AddPurchase';
import PurchaseHistory from './pages/private-business/PurchaseHistory';
import Vegetables from './pages/private-business/Vegetables';
import Suppliers from './pages/private-business/Suppliers';
import PrivateBusinessReports from './pages/private-business/PrivateBusinessReports';
import PrivateBusinessSettings from './pages/private-business/PrivateBusinessSettings';

// ─── CUSTOMER PORTAL PAGES ───────────────────────────────────────────────────
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerOrders from './pages/customer/CustomerOrders';
import CustomerPayments from './pages/customer/CustomerPayments';
import CustomerProfile from './pages/customer/CustomerProfile';
import PayInvoice from './pages/customer/PayInvoice';

// Admin 1 profile selection guard
const AdminProfileRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin } = useAdminAuth();
  if (admin?.role !== 'ADMIN_1') return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      {/* Global Persistent 3D Background Canvas */}
      <GlobalBackground />

      <ToastProvider>
        {/* Customer auth provider wraps the entire app */}
        <AuthProvider>
          {/* Admin auth provider wraps admin-specific parts */}
          <AdminAuthProvider>
            <SocketProvider>
              <BrowserRouter>
                <Routes>

                  {/* ── CUSTOMER PUBLIC ROUTES ──────────────────────────────── */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/verify-otp" element={<VerifyOTP />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* ── CUSTOMER PROTECTED ROUTES ───────────────────────────── */}
                  <Route element={<DashboardLayout />}>
                    <Route path="/dashboard" element={<CustomerDashboard />} />
                    <Route path="/orders" element={<CustomerOrders />} />
                    <Route path="/payments/history" element={<CustomerPayments />} />
                    <Route path="/profile" element={<CustomerProfile />} />
                    <Route path="/pay-invoice/:id" element={<PayInvoice />} />
                  </Route>

                  {/* ── ADMIN PUBLIC ROUTES ─────────────────────────────────── */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/forgot-password" element={<ForgotPassword forcedRole="Admin" />} />

                  {/* Admin 1 profile selection — outside AdminLayout (no sidebar) */}
                  <Route
                    path="/admin/profile-selection"
                    element={
                      <AdminProfileRoute>
                        <ProfileSelection />
                      </AdminProfileRoute>
                    }
                  />

                  {/* ── PRIVATE BUSINESS (VEGETABLE PURCHASE WORKSPACE) ───────── */}
                  <Route path="/admin/private-business" element={<PrivateBusinessLayout />}>
                    <Route path="dashboard" element={<PrivateBusinessDashboard />} />
                    <Route path="purchases/add" element={<AddPurchase />} />
                    <Route path="purchases" element={<PurchaseHistory />} />
                    <Route path="vegetables" element={<Vegetables />} />
                    <Route path="suppliers" element={<Suppliers />} />
                    <Route path="reports" element={<PrivateBusinessReports />} />
                    <Route path="settings" element={<PrivateBusinessSettings />} />
                  </Route>

                  {/* ── GREEN GLIDE LOGISTICS ADMIN PROTECTED ROUTES ───────────── */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="invoices" element={<Invoices />} />
                    <Route path="payments" element={<Payments />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="settings" element={<Settings />} />
                    {/* Expense Manager sub-routes */}
                    <Route path="expense-manager" element={<ExpenseDashboard />} />
                    <Route path="expense-manager/add" element={<AddExpense />} />
                    <Route path="expense-manager/history" element={<ExpenseHistory />} />
                    <Route path="expense-manager/reports" element={<ExpenseReports />} />
                    <Route path="expense-manager/settings" element={<ExpenseSettings />} />
                  </Route>

                  {/* ── FALLBACK ────────────────────────────────────────────── */}
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="*" element={<Navigate to="/login" replace />} />

                </Routes>
              </BrowserRouter>
            </SocketProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
