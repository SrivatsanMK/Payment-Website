import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
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
} from 'lucide-react';

interface NavbarProps {
  setSidebarOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ setSidebarOpen }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const api = useAxios();
  const isDark = theme === 'dark';

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isCustomer = user?.role === 'Customer';

  const fetchNotifications = async () => {
    if (!isCustomer) return;
    try {
      const res = await api.get(endpoints.notifications.base);
      if (res.data.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!isCustomer || unreadCount === 0) return;
    setRefreshing(true);
    try {
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      await api.put(endpoints.notifications.read);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
      fetchNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  const markSingleRead = async (id: string) => {
    try {
      setNotifications(prev => prev.map(n => (n._id === id || n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount(prev => Math.max(0, prev - 1));
      await api.put(`/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (isCustomer) {
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isCustomer]);

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-200/80 dark:border-white/10 glass-panel px-6 sm:px-8">
      {/* Left items */}
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setSidebarOpen(true)}
          className="rounded-2xl p-2.5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white glass-button-secondary lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </motion.button>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Welcome back, <span className="text-purple-600 dark:text-purple-400 font-bold">{user?.name}</span>
        </h2>
      </div>

      {/* Right items */}
      <div className="flex items-center gap-3">
        {/* Dark Mode Toggle */}
        <motion.button
          whileHover={{ scale: 1.08, rotate: 12 }}
          whileTap={{ scale: 0.92 }}
          onClick={toggleTheme}
          className="rounded-2xl p-2.5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white glass-button-secondary"
          title="Toggle Light/Dark Theme"
        >
          {isDark ? <Moon className="h-5 w-5 text-white" /> : <Sun className="h-5 w-5 text-amber-500" />}
        </motion.button>

        {/* Notifications Dropdown (Customer Only) */}
        {isCustomer && (
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
                  {unreadCount}
                </span>
              )}
            </motion.button>

            {showNotifications && (
              <>
                <div 
                  onClick={() => setShowNotifications(false)}
                  className="fixed inset-0 z-40"
                />
                <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 glass-dropdown flex flex-col shadow-2xl">
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
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
                          onClick={markAllAsRead}
                          disabled={refreshing}
                          className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                        >
                          {refreshing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Body */}
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-200 dark:divide-white/10">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-400 font-medium">
                        No notifications to show
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n._id || n.id} 
                          onClick={() => markSingleRead(n._id || n.id)}
                          className={`p-4 flex flex-col gap-1 transition-colors cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.03] ${
                            n.isRead ? '' : 'bg-purple-500/10'
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
        )}
      </div>
    </header>
  );
};

export default Navbar;
