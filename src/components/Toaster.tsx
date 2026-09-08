import { useEffect, useState } from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore, type Toast } from '@/store/toastStore';

const ICONS = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
  error: <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
  info: <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />,
};

const STYLES = {
  success: 'bg-white border-l-4 border-emerald-500 shadow-lg',
  error: 'bg-white border-l-4 border-red-500 shadow-lg',
  warning: 'bg-white border-l-4 border-amber-500 shadow-lg',
  info: 'bg-white border-l-4 border-blue-500 shadow-lg',
};

const TEXT_STYLES = {
  success: 'text-emerald-800',
  error: 'text-red-800',
  warning: 'text-amber-800',
  info: 'text-blue-800',
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => removeToast(toast.id), 300);
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg max-w-sm w-full transition-all duration-300 ${STYLES[toast.type]} ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
      }`}
    >
      {ICONS[toast.type]}
      <p className={`text-sm font-medium flex-1 leading-snug ${TEXT_STYLES[toast.type]}`}>
        {toast.message}
      </p>
      <button
        onClick={handleClose}
        className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
