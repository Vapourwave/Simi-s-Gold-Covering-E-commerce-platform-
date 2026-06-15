import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Info, AlertTriangle, X, ShoppingBag, Sparkles } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'cart';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'success', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Floating Toasts Stack Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            // Pick Icon and Style based on toast.type
            let icon = <Info className="w-4 h-4 text-amber-500 shrink-0" />;
            let borderColor = 'border-stone-800';
            let glowColor = 'shadow-[0_10px_30px_rgba(0,0,0,0.5)]';
            let progressColor = 'bg-amber-500';

            switch (toast.type) {
              case 'success':
                icon = <Check className="w-4 h-4 text-emerald-400 shrink-0" />;
                borderColor = 'border-emerald-500/20';
                progressColor = 'bg-emerald-500';
                break;
              case 'cart':
                icon = <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />;
                borderColor = 'border-amber-400/30';
                progressColor = 'bg-amber-400';
                glowColor = 'shadow-[0_10px_40px_rgba(245,158,11,0.15)]';
                break;
              case 'error':
                icon = <X className="w-4 h-4 text-rose-400 shrink-0" />;
                borderColor = 'border-rose-500/30';
                progressColor = 'bg-rose-500';
                break;
              case 'warning':
                icon = <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />;
                borderColor = 'border-yellow-500/25';
                progressColor = 'bg-yellow-500';
                break;
              case 'info':
              default:
                icon = <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />;
                borderColor = 'border-stone-800';
                progressColor = 'bg-amber-500';
                break;
            }

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.85, x: 40, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className={`pointer-events-auto relative overflow-hidden bg-stone-900/95 backdrop-blur-md border ${borderColor} rounded-2xl p-4 flex items-start gap-3.5 ${glowColor} select-none`}
              >
                {/* Decorative Amber Left Stripe */}
                <div className={`absolute top-0 left-0 bottom-0 w-1 ${progressColor}`} />

                {/* Toast Icon Frame */}
                <div className="p-1.5 rounded-lg bg-stone-950 border border-stone-800/40 flex items-center justify-center">
                  {icon}
                </div>

                {/* Text Details Area */}
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-xs text-stone-200 font-sans font-medium leading-relaxed leading-snug">
                    {toast.message}
                  </p>
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={() => removeToast(toast.id)}
                  className="rounded-full p-1 text-stone-500 hover:text-stone-300 hover:bg-stone-800/60 transition-colors shrink-0 focus:outline-none"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Visual Auto-dismiss Progress Bar slide animation */}
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: (toast.duration || 4000) / 1000, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 h-[2px] ${progressColor}`}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
