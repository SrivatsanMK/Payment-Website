import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Building,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { getAssetUrl } from '../../utils/config';

interface AdminSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, setIsOpen }) => {
  const { admin, logout } = useAdminAuth();
  const [imgFailed, setImgFailed] = useState(false);
  const [expenseMenuOpen, setExpenseMenuOpen] = useState(false);

  const adminLinks: any[] = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { to: '/admin/customers', label: 'Customers', icon: <Users className="h-5 w-5" /> },
    { to: '/admin/invoices', label: 'Invoices', icon: <Receipt className="h-5 w-5" /> },
    { to: '/admin/payments', label: 'Payments', icon: <CreditCard className="h-5 w-5" /> },
    { to: '/admin/reports', label: 'Reports', icon: <BarChart3 className="h-5 w-5" /> },
    {
      label: 'Expense Manager',
      icon: <Building className="h-5 w-5" />,
      subLinks: [
        { to: '/admin/expense-manager', label: 'Dashboard' },
        { to: '/admin/expense-manager/add', label: 'Add Expense' },
        { to: '/admin/expense-manager/history', label: 'Expense History' },
        { to: '/admin/expense-manager/reports', label: 'Reports' },
      ]
    },
    { to: '/admin/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const roleLabel = admin?.role === 'ADMIN_1' ? 'Owner Admin' : 'Partner Admin';

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 lg:h-screen flex-col bg-white dark:bg-black border-r border-slate-150 dark:border-slate-800 transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-center w-full border-b border-slate-100 dark:border-slate-800" style={{ padding: 0 }}>
          <Logo size="sm" />
        </div>

        {/* Role badge */}
        <div className="mx-4 mt-3 mb-1 flex items-center gap-2 rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 px-3 py-2">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
          <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">{roleLabel}</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 px-4 py-4 overflow-y-auto">
          {adminLinks.map((link) =>
            link.subLinks ? (
              <div key={link.label} className="space-y-1">
                <button
                  onClick={() => setExpenseMenuOpen(!expenseMenuOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-3">
                    {link.icon}
                    {link.label}
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expenseMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {expenseMenuOpen && (
                  <div className="pl-11 space-y-1 mt-1">
                    {link.subLinks.map((sub: any) => (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        onClick={() => setIsOpen(false)}
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isActive
                              ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 shadow-sm'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
                          }`
                        }
                      >
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
                  }`
                }
              >
                {link.icon}
                {link.label}
              </NavLink>
            )
          )}
        </nav>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-sm font-bold border border-teal-200 dark:border-teal-800 overflow-hidden">
              {admin?.profilePicture && !imgFailed ? (
                <img
                  src={getAssetUrl(admin.profilePicture)}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                (admin?.name || 'A').charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {admin?.name}
              </span>
              <span className="text-[10px] text-teal-500 font-medium uppercase tracking-wider">
                {roleLabel}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              window.location.href = '/admin/login';
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
