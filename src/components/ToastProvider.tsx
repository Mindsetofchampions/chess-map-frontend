/**
 * Toast Notification System
 *
 * Provides global toast notifications for success/error messages
 * with automatic dismissal and responsive design.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Toast type enumeration
 */
type ToastType = 'success' | 'error' | 'warning';

/**
 * Toast data interface
 */
interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

/**
 * Toast context interface
 */
interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  hideToast: (id: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  // Error log visibility for diagnostics
  errorLogs: Array<{
    id: string;
    title: string;
    message?: string;
    timestamp: string;
    path?: string;
  }>;
  clearErrorLogs: () => void;
}

/**
 * Create toast context
 */
const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Hook to use toast notifications
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * Toast Provider Props
 */
interface ToastProviderProps {
  children: React.ReactNode;
}

/**
 * Individual Toast Component
 */
interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const getToastIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className='w-5 h-5 text-cyber-green-400' />;
      case 'error':
        return <XCircle className='w-5 h-5 text-red-400' />;
      case 'warning':
        return <AlertTriangle className='w-5 h-5 text-yellow-400' />;
    }
  };

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-cyber-green-500/20 border-cyber-green-500/30';
      case 'error':
        return 'bg-red-500/20 border-red-500/30';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-500/30';
    }
  };

  return (
    <motion.div
      className={`${getToastStyles()} backdrop-blur-lg border rounded-xl p-4 shadow-xl max-w-sm w-full`}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className='flex items-start gap-3'>
        <div className='flex-shrink-0'>{getToastIcon()}</div>

        <div className='flex-1 min-w-0'>
          <h4 className='text-white font-medium text-sm'>{toast.title}</h4>
          {toast.message && (
            <p className='text-gray-200 text-xs mt-1 leading-relaxed'>{toast.message}</p>
          )}
        </div>

        <button
          onClick={() => onRemove(toast.id)}
          className='flex-shrink-0 p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors'
          aria-label='Close notification'
        >
          <X className='w-4 h-4 text-gray-300' />
        </button>
      </div>
    </motion.div>
  );
};

/**
 * Toast Provider Component
 *
 * Manages global toast state and provides toast functions to child components.
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [errorLogs, setErrorLogs] = useState<
    Array<{ id: string; title: string; message?: string; timestamp: string; path?: string }>
  >([]);

  /**
   * Show a toast notification
   */
  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration: number = 5000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const toast: Toast = {
        id,
        type,
        title,
        message,
        duration,
      };

      setToasts((prev) => [...prev, toast]);

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          hideToast(id);
        }, duration);
      }
    },
    [],
  );

  /**
   * Hide specific toast
   */
  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Convenience methods
   */
  const showSuccess = useCallback(
    (title: string, message?: string) => {
      showToast('success', title, message);
    },
    [showToast],
  );

  const showError = useCallback(
    (title: string, message?: string) => {
      showToast('error', title, message, 8000); // Errors stay longer
      // Persist to in-memory error log for diagnostics view
      try {
        const entry = {
          id: `elog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          message,
          timestamp: new Date().toISOString(),
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        };
        setErrorLogs((prev) => [entry, ...prev].slice(0, 200)); // keep last 200
      } catch {}
    },
    [showToast],
  );

  const showWarning = useCallback(
    (title: string, message?: string) => {
      showToast('warning', title, message);
    },
    [showToast],
  );

  const contextValue: ToastContextType = {
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    errorLogs,
    clearErrorLogs: () => setErrorLogs([]),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast Container */}
      <div className='fixed top-4 right-4 z-50 space-y-2'>
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onRemove={hideToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
