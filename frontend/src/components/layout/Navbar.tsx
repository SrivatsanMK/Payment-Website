import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowLeftRight
} from 'lucide-react';

interface NavbarProps {
  setSidebarOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const api = useAxios();
  const navigate = useNavigate();


  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isCustomer = user?.role === 'Customer';

  // Fetch notifications
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
        // Mark locally
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

    // Poll every 30 seconds for live notification updates
    if (isCustomer) {
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isCustomer]);

  return (
    <header className="flex h-16 w-full items-center justify-between bg-white dark:bg-slate-850 px-6 border-b border-slate-150 dark:border-slate-800">
      {/* Left items */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Welcome back, <span className="text-primary-600 dark:text-primary-400">{user?.name}</span>
        </h2>
      </div>

      {/* Right items */}
      <div className="flex items-center gap-4">

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Toggle Light/Dark Theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications Dropdown (Customer Only) */}
        {isCustomer && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-850">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div 
                  onClick={() => setShowNotifications(false)}
                  className="fixed inset-0 z-40"
                />
                <div className="absolute right-0 mt-2 w-80 z-50 rounded-xl bg-white dark:bg-slate-850 shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    <span className="text-xs font-semibold text-slate-850 dark:text-slate-100">
                      Notifications ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        disabled={refreshing}
                        className="text-[10px] text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-medium disabled:opacity-50"
                      >
                        {refreshing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Mark read
                      </button>
                    )}
                  </div>

                  {/* Dropdown Body */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No notifications to show
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n._id} 
                          className={`p-4 flex flex-col gap-1 transition-colors ${
                            n.isRead ? 'bg-white dark:bg-slate-850' : 'bg-primary-50/20 dark:bg-primary-950/10'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate w-4/5">
                              {n.title}
                            </span>
                            {!n.isRead && (
                              <span className="h-1.5 w-1.5 rounded-full bg-primary-600 mt-1" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {n.message}
                          </p>
                          <span className="text-[9px] text-slate-400 mt-1">
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
