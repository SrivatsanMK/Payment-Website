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
      const res = await api.put(endpoints.notifications.read);
      if (res.data.success) {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    } finally {
      setRefreshing(false);
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
                <div className="absolute right-0 top-full mt-3 w-80 z-50 rounded-3xl glass-card border border-slate-200 dark:border-white/20 shadow-2xl overflow-hidden flex flex-col">
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Notifications ({unreadCount})
                    </span>
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

                  {/* Dropdown Body */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-200 dark:divide-white/10">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No notifications to show
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n._id} 
                          className={`p-4 flex flex-col gap-1 transition-colors ${
                            n.isRead ? '' : 'bg-purple-500/10'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate w-4/5">
                              {n.title}
                            </span>
                            {!n.isRead && (
                              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-1" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                            {n.message}
                          </p>
                          <span className="text-[9px] text-slate-400 mt-1 font-medium">
                            {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
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
