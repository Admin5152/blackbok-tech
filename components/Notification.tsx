import React, { useEffect, useState } from 'react';
import { CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationProps {
  notification: Notification;
  onClose: (id: string) => void;
}

const TYPE_STYLES: Record<
  NotificationType,
  { bg: string; border: string; icon: string; ring: string; Icon: React.FC<{ size?: number; className?: string }> }
> = {
  success: {
    bg: 'bg-gradient-to-r from-[#CDA032] to-[#B38B21] text-black',
    border: 'border-[#B38B21]/60',
    icon: 'text-black',
    ring: 'ring-[#CDA032]/40',
    Icon: CheckCircle,
  },
  error: {
    bg: 'bg-gradient-to-r from-red-600 to-red-500 text-white',
    border: 'border-red-700/60',
    icon: 'text-white',
    ring: 'ring-red-500/40',
    Icon: AlertTriangle,
  },
  warning: {
    bg: 'bg-gradient-to-r from-amber-500 to-amber-400 text-black',
    border: 'border-amber-600/60',
    icon: 'text-black',
    ring: 'ring-amber-500/40',
    Icon: AlertTriangle,
  },
  info: {
    bg: 'bg-gradient-to-r from-blue-600 to-blue-500 text-white',
    border: 'border-blue-700/60',
    icon: 'text-white',
    ring: 'ring-blue-500/40',
    Icon: Info,
  },
};

export const NotificationItem: React.FC<NotificationProps> = ({ notification, onClose }) => {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, notification.duration ?? 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification.duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(notification.id);
    }, 280);
  };

  const styles = TYPE_STYLES[notification.type] ?? TYPE_STYLES.info;
  const { Icon } = styles;

  return (
    <div
      role={notification.type === 'error' ? 'alert' : 'status'}
      aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
      className={`
        pointer-events-auto w-full max-w-full box-border
        flex items-start gap-2.5 sm:gap-3
        px-3 py-3 sm:px-5 sm:py-3.5 rounded-xl sm:rounded-2xl
        shadow-2xl border ring-1 ${styles.ring} ${styles.border} ${styles.bg}
        transition-all duration-300
        overflow-hidden
        ${isLeaving ? '-translate-y-2 opacity-0 scale-[0.98]' : 'translate-y-0 opacity-100 scale-100'}
      `}
    >
      <div className={`flex items-center justify-center shrink-0 mt-0.5 ${styles.icon}`}>
        <Icon size={18} />
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-xs sm:text-sm font-semibold tracking-tight leading-snug break-words [overflow-wrap:anywhere] [word-break:break-word]">
          {notification.message}
        </p>
      </div>

      <button
        type="button"
        onClick={handleClose}
        aria-label="Dismiss notification"
        className={`p-1 sm:p-1.5 rounded-full transition-colors shrink-0 mt-0.5 hover:bg-black/10 ${styles.icon}`}
      >
        <X size={16} />
      </button>
    </div>
  );
};

interface NotificationContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onClose,
}) => {
  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed z-[300] pointer-events-none flex flex-col gap-2 sm:gap-3 overflow-x-hidden overflow-y-auto max-h-[min(70vh,100dvh)] overscroll-contain left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-md"
      style={{
        top: 'max(0.5rem, env(safe-area-inset-top, 0px))',
      }}
      aria-label="Notifications"
    >
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} onClose={onClose} />
      ))}
    </div>
  );
};
