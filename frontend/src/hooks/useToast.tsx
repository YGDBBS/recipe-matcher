import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 border ${
            toast.type === 'error' 
              ? 'bg-red-50 text-red-800 border-red-200' 
              : toast.type === 'success' 
              ? 'bg-[#FFF7ED] text-[#F97316] border-[#F97316]/20' 
              : 'bg-[#FEF3C7] text-[#F97316] border-[#FACC15]/30'
          }`}
        >
          <span>{toast.message}</span>
          <button 
            onClick={() => removeToast(toast.id)} 
            className="ml-2 font-bold hover:text-[#F97316]"
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

