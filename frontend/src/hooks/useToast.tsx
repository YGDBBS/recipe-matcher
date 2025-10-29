import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 animate-slideIn">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`border rounded-xl shadow-xl p-4 mb-3 flex items-center justify-between backdrop-blur-sm ${
            toast.type === 'error' 
              ? 'bg-red-50 border-red-200 text-red-800' 
              : toast.type === 'success' 
              ? 'bg-[#FB923C]/5 border-[#FB923C]/20 text-[#84CC16]' 
              : 'bg-white/90 border-gray-200 text-[#84CC16]'
          }`}
        >
          <span>{toast.message}</span>
          <button 
            onClick={() => removeToast(toast.id)} 
            className="ml-2 font-bold hover:text-[#84CC16] transition-colors"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    showToast,
    ToastContainer: () => <ToastContainer toasts={toasts} removeToast={removeToast} />,
  };
}

export type { Toast };

