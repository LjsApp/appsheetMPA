import { useEffect, useState } from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore, type Toast } from '@/store/toastStore';

const ICONS = {
  success: <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{color:'#10b981'}} />,
  error: <XCircle className="w-5 h-5 shrink-0 mt-0.5" style={{color:'#ef4444'}} />,
  warning: <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{color:'#f59e0b'}} />,
  info: <Info className="w-5 h-5 shrink-0 mt-0.5" style={{color:'#3b82f6'}} />,
};

const BORDER_COLOR = {
  success: '#10b981',
  error:   '#ef4444',
  warning: '#f59e0b',
  info:    '#3b82f6',
};

const TEXT_COLOR = {
  success: '#065f46',
  error:   '#7f1d1d',
  warning: '#78350f',
  info:    '#1e3a8a',
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in after 10ms
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => removeToast(toast.id), 300);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        maxWidth: '360px',
        width: '100%',
        background: '#ffffff',
        borderLeft: `4px solid ${BORDER_COLOR[toast.type]}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        transition: 'all 0.3s ease',
        // Animate in/out using inline style (avoids Tailwind class purging)
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(32px)',
      }}
    >
      {ICONS[toast.type]}
      <p
        style={{
          fontSize: '14px',
          fontWeight: 500,
          flex: 1,
          lineHeight: 1.4,
          color: TEXT_COLOR[toast.type],
          margin: 0,
        }}
      >
        {toast.message}
      </p>
      <button
        onClick={handleClose}
        style={{
          padding: '2px',
          borderRadius: '4px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: '#9ca3af',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}
