import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  ShoppingBag,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
  User
} from 'lucide-react';
import { getAssetUrl } from '../../utils/config';

interface PrivateBusinessSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const PrivateBusinessSidebar: React.FC<PrivateBusinessSidebarProps> = ({ isOpen, setIsOpen }) => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [imgFailed, setImgFailed] = useState(false);

  const navLinks = [
    { to: '/admin/private-business/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { to: '/admin/private-business/purchases/add', label: 'Add Purchase', icon: <PlusCircle className="h-5 w-5" /> },
    { to: '/admin/private-business/purchases', label: 'Purchase History', icon: <History className="h-5 w-5" /> },
    { to: '/admin/private-business/vegetables', label: 'Vegetables', icon: <ShoppingBag className="h-5 w-5" /> },
    { to: '/admin/private-business/suppliers', label: 'Suppliers', icon: <Truck className="h-5 w-5" /> },
    { to: '/admin/private-business/reports', label: 'Reports', icon: <BarChart3 className="h-5 w-5" /> },
    { to: '/admin/private-business/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
    { to: '/admin/private-business/profile', label: 'My Profile', icon: <User className="h-5 w-5" /> },
  ];

  const roleLabel = admin?.role === 'ADMIN_1' ? 'Akash Admin' : 'Hrithik Admin';

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 lg:h-screen flex-col glass-panel border-r border-slate-200/80 dark:border-white/10 transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo Container Slot — Empty for future logo update */}
        <div className="flex items-center justify-center w-full min-h-[64px] border-b border-slate-200/80 dark:border-white/10 px-4 py-3">
          {/* Logo placeholder slot for future custom logo */}
        </div>

        {/* Workspace Badge */}
        <div className="mx-4 mt-3 mb-1 flex items-center justify-between rounded-xl bg-teal-500/10 border border-teal-500/30 px-3.5 py-2 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
            <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
              Private Business
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 px-4 py-4 overflow-y-auto">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20 dark:bg-teal-600/30 dark:text-white dark:border dark:border-teal-400/40 backdrop-blur-md'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white'
                }`
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer Info & Logout */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 text-sm font-bold border border-teal-500/30 overflow-hidden shadow-inner">
              <img
                src={admin?.profilePicture ? getAssetUrl(admin?.profilePicture) : '/temp_profile_photo.png'}
                alt="Avatar"
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.endsWith('/temp_profile_photo.png')) {
                    target.src = '/temp_profile_photo.png';
                  }
                }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {admin?.name}
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wider">
                {roleLabel}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              window.location.href = '/admin/login';
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-500/15 border border-red-500/20 hover:border-red-500/40 transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default PrivateBusinessSidebar;
