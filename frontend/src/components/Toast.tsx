import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-elevated/95 backdrop-blur-xl border border-white/15 text-xs text-primary-text shadow-glass-elevated animate-fade-in"
        >
          {t.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-status-error shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-status-success shrink-0" />
          )}
          <span className="font-medium">{t.text}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="ml-2 text-secondary-text hover:text-primary-text transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
