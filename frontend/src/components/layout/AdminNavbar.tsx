import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  const { admin } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const api = useAxios();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

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
      setRefreshing(true);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await api.put(endpoints.notifications.read);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      fetchNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  const markSingleRead = async (id: string) => {
    try {
      setNotifications((prev) => prev.map((n) => ((n._id === id || n.id === id) ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await api.put(`/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 dark:border-white/10 glass-panel px-4 sm:px-8">
      {/* Left: hamburger */}
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setSidebarOpen(true)}
          className="rounded-2xl p-2.5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white glass-button-secondary lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </motion.button>

        {/* Admin badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-xl bg-teal-500/10 border border-teal-500/30 px-3.5 py-1.5 backdrop-blur-md">
          <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
            {admin?.role === 'ADMIN_1' ? 'Akash Admin' : 'Hrithik Admin'}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Switch Profile (Admin 1 only) */}
        {admin?.role === 'ADMIN_1' && (
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSwitchProfile}
            title="Switch Profile"
            className="flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold glass-button-secondary"
          >
            <ArrowLeftRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">Switch Profile</span>
          </motion.button>
        )}

        {/* Notifications */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-2xl p-2.5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white glass-button-secondary"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg shadow-red-500/40">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </motion.button>

          {showNotifications && (
            <>
              {/* Invisible backdrop to dismiss notifications when clicking outside */}
              <div
                onClick={() => setShowNotifications(false)}
                className="fixed inset-0 z-40"
              />
              <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 glass-dropdown flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-5 py-4 bg-slate-50/50 dark:bg-white/[0.02]">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchNotifications}
                      title="Refresh notifications"
                      className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        <Check className="h-3.5 w-3.5" /> Mark all read
                      </button>
                    )}
                  </div>
                </div>

                {/* Notification List */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-200 dark:divide-white/10">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400 font-medium">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n: any) => (
                      <div
                        key={n._id || n.id}
                        onClick={() => markSingleRead(n._id || n.id)}
                        className={`p-4 flex flex-col gap-1 transition-colors cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.03] ${!n.isRead ? 'bg-purple-500/10' : ''
                          }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span className="h-2 w-2 rounded-full bg-purple-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          {n.message}
                        </p>
                        {n.createdAt && (
                          <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                            {new Date(n.createdAt).toLocaleDateString('en-GB')} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.08, rotate: 12 }}
          whileTap={{ scale: 0.92 }}
          onClick={toggleTheme}
          className="rounded-2xl p-2.5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white glass-button-secondary"
          title="Toggle theme"
        >
          {isDark ? <Moon className="h-5 w-5 text-white" /> : <Sun className="h-5 w-5 text-amber-500" />}
        </motion.button>

        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-700 dark:text-teal-300 text-sm font-bold border border-teal-500/30 overflow-hidden shadow-lg shadow-teal-500/10">
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
