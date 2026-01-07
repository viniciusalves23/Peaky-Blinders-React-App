
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-3 w-full max-w-xs pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md transform transition-all duration-300 animate-slide-in hover:scale-[1.02] cursor-pointer ${
              toast.type === 'success' 
                ? 'bg-zinc-900/95 border-gold-600/50 text-white' 
                : toast.type === 'error'
                ? 'bg-red-950/95 border-red-600/50 text-white'
                : 'bg-zinc-800/95 border-zinc-600/50 text-white'
            }`}
            onClick={() => removeToast(toast.id)}
          >
            <div className={`mt-0.5 shrink-0 ${
               toast.type === 'success' ? 'text-gold-500' : toast.type === 'error' ? 'text-red-500' : 'text-zinc-400'
            }`}>
              {toast.type === 'success' && <CheckCircle2 size={18} />}
              {toast.type === 'error' && <AlertTriangle size={18} />}
              {toast.type === 'info' && <Info size={18} />}
            </div>
            <p className="text-xs font-bold leading-relaxed">{toast.message}</p>
            <button onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }} className="absolute top-2 right-2 text-white/20 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de um ToastProvider');
  return context;
};
