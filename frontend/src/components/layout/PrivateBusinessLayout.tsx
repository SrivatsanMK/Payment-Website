import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import PrivateBusinessSidebar from './PrivateBusinessSidebar';
import AdminNavbar from './AdminNavbar';
import Spinner from '../ui/Spinner';

export const PrivateBusinessLayout: React.FC = () => {
  const { admin, loading } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-[#2A2A2A]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  // Admin 2 (Hrithik Partner Admin) only has 1 default workspace (Green Glide Logistics)
  if (admin.role !== 'ADMIN_1') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#2A2A2A]">
      <PrivateBusinessSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminNavbar setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto px-6 pt-6 sm:pt-8 pb-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrivateBusinessLayout;
