import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCircle2, FileText, ShoppingCart, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useSaveNotification } from '@/hooks/useData';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import type { AppNotification } from '@/types';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  
  const { data: notifications = [] } = useNotifications();
  const saveNotification = useSaveNotification();

  // Filter notifications for current user
  const myNotifications = notifications.filter(n => {
    // If to 'pimpinan', show if user is pimpinan
    if (n.to_user_id === 'pimpinan') {
      return user?.role_name?.toLowerCase() === 'pimpinan' || user?.is_super_admin;
    }
    // Else check specific user id
    return n.to_user_id === user?.id;
  }).sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());

  const unreadCount = myNotifications.filter(n => n.is_read === false || n.is_read === 'FALSE' || n.is_read === 'false').length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: AppNotification) => {
    // Mark as read
    if (notif.is_read === false || notif.is_read === 'FALSE' || notif.is_read === 'false') {
      try {
        await saveNotification.mutateAsync({ ...notif, is_read: true });
      } catch (e) {
        console.error('Failed to mark notification as read', e);
      }
    }
    setIsOpen(false);

    // Navigate based on type
    if (notif.type === 'verification_request') {
      // Pimpinan goes to verification page
      navigate('/verifikasi');
    } else if (notif.type === 'verification_result') {
      // User goes to specific doc
      if (notif.ref_type === 'po') {
        navigate(`/po`);
      } else if (notif.ref_type === 'invoice') {
        navigate(`/invoices`);
      }
    }
  };

  const markAllAsRead = async () => {
    const unread = myNotifications.filter(n => n.is_read === false || n.is_read === 'FALSE' || n.is_read === 'false');
    try {
      await Promise.all(
        unread.map(notif => saveNotification.mutateAsync({ ...notif, is_read: true }))
      );
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  const getIcon = (type: string, refType: string) => {
    if (type === 'verification_result') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (refType === 'po') return <ShoppingCart className="w-4 h-4 text-blue-500" />;
    if (refType === 'invoice') return <Receipt className="w-4 h-4 text-violet-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-[9999] transform opacity-100 scale-100 transition-all origin-top-right">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900">Notifikasi</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Tandai dibaca
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {myNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Belum ada notifikasi.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {myNotifications.map(notif => {
                  const isUnread = notif.is_read === false || notif.is_read === 'FALSE' || notif.is_read === 'false';
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${isUnread ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className={`mt-0.5 p-1.5 rounded-full ${isUnread ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
                        {getIcon(notif.type, notif.ref_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isUnread ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                          {notif.message}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
                          <span>{formatDate(notif.created_date)}</span>
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
