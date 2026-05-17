import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after specified duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center bg-surface border border-white/10 rounded-lg p-4 shadow-xl min-w-[300px] animate-in slide-in-from-bottom-5 fade-in duration-300"
          >
            {toast.type === 'success' && <CheckCircle className="text-secondary w-5 h-5 mr-3" />}
            {toast.type === 'error' && <XCircle className="text-danger w-5 h-5 mr-3" />}
            {toast.type === 'info' && <Info className="text-primary w-5 h-5 mr-3" />}
            <span className="flex-1 text-sm font-medium text-main">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="text-muted hover:text-main ml-3">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
