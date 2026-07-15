import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const borderColors = {
    success: 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-50/90 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-350',
    error: 'border-red-100 dark:border-red-950/20 bg-red-50/90 dark:bg-red-950/20 text-red-900 dark:text-red-350',
    info: 'border-blue-100 dark:border-blue-950/20 bg-blue-50/90 dark:bg-blue-950/20 text-blue-900 dark:text-blue-350',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Portal Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`p-4 rounded-xl border backdrop-blur-md shadow-premium dark:shadow-dark-premium flex items-start gap-3 pointer-events-auto ${borderColors[toast.type]}`}
            >
              <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
              <div className="flex-grow text-sm font-medium">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
