import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Spinner from '../ui/Spinner';

export const DashboardLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // If loading user state on application start
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner size="lg" />
      </div>
    );
  }

  // Redirect to login if user session is not found
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admins should never be in the customer layout
  if (user.role !== 'Customer') {
    return <Navigate to="/admin/dashboard" replace />;
  }


  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Bar */}
        <Navbar setSidebarOpen={setSidebarOpen} />

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
