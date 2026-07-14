import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const ToastContext = createContext(null);

const VARIANT_STYLES = {
  success: 'border-green-200 dark:border-green-900 bg-white dark:bg-slate-800',
  error: 'border-red-200 dark:border-red-900 bg-white dark:bg-slate-800',
  info: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
};

const VARIANT_ICONS = { success: '✅', error: '⚠️', info: 'ℹ️' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, variant = 'info') => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const toast = {
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    info: (msg) => showToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[100] flex flex-col gap-2 items-center sm:items-end">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border shadow-lg text-sm text-slate-800 dark:text-slate-100 ${VARIANT_STYLES[t.variant]}`}
            >
              <span>{VARIANT_ICONS[t.variant]}</span>
              <span>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
