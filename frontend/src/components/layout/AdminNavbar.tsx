import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import {
  Sun,
  Moon,
  Menu,
  Bell,
  Check,
  RefreshCw,
  ArrowLeftRight,
  ShieldCheck
} from 'lucide-react';
import { getAssetUrl } from '../../utils/config';

interface AdminNavbarProps {
  setSidebarOpen: (open: boolean) => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({ setSidebarOpen }) => {
  const { admin, logout } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const api = useAxios();
  const navigate = useNavigate();

  const handleSwitchProfile = () => {
    if (admin?.role === 'ADMIN_1') {
      navigate('/admin/profile-selection');
    }
  };

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      setRefreshing(true);
      const res = await api.get(endpoints.notifications.base);
      if (res.data.success) {
        const notifs = res.data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n: any) => !n.isRead).length);
      }
    } catch {
      // Silently fail
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      await api.put(endpoints.notifications.read);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-850/80 backdrop-blur-md px-4 sm:px-6">
      {/* Left: hamburger */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Admin badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 px-3 py-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
          <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            {admin?.role === 'ADMIN_1' ? 'Owner Admin' : 'Partner Admin'}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Switch Profile (Admin 1 only) */}
        {admin?.role === 'ADMIN_1' && (
          <button
            onClick={handleSwitchProfile}
            title="Switch Profile"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Switch Profile</span>
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xl z-50">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notifications</span>
                <div className="flex items-center gap-2">
                  <button onClick={fetchNotifications} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <RefreshCw className={`h-3.5 w-3.5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline">
                      <Check className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">No notifications</div>
                ) : (
                  notifications.slice(0, 10).map((n: any) => (
                    <div
                      key={n._id}
                      className={`px-4 py-3 text-sm ${!n.isRead ? 'bg-primary-50/50 dark:bg-primary-950/10' : ''}`}
                    >
                      <p className="font-medium text-slate-700 dark:text-slate-300">{n.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Avatar */}
        <div className="h-8 w-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-200 dark:border-teal-800 overflow-hidden">
          {admin?.profilePicture ? (
            <img
              src={getAssetUrl(admin.profilePicture)}
              alt="avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            (admin?.name || 'A').charAt(0).toUpperCase()
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
