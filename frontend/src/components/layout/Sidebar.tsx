import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  CreditCard,
  User,
  LogOut,
  ShoppingBag,
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { getAssetUrl } from '../../utils/config';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const [imgFailed, setImgFailed] = useState(false);

  const customerLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { to: '/orders', label: 'My Orders', icon: <ShoppingBag className="h-5 w-5" /> },
    { to: '/payments/history', label: 'Payments', icon: <CreditCard className="h-5 w-5" /> },
    { to: '/profile', label: 'My Profile', icon: <User className="h-5 w-5" /> },
  ];

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
        {/* Brand */}
        <div className="flex items-center justify-center w-full border-b border-slate-200/80 dark:border-white/10" style={{ padding: '8px 0' }}>
          <Logo size="sm" />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
          {customerLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20 dark:bg-purple-600/30 dark:text-white dark:border dark:border-purple-400/40 backdrop-blur-md'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white'
                }`
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 text-sm font-bold border border-purple-500/30 overflow-hidden shadow-inner">
              {user?.profilePicture && !imgFailed ? (
                <img
                  src={getAssetUrl(user.profilePicture)}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                (user?.name || 'C').charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {user?.name}
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">
                Customer Portal
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
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

export default Sidebar;
