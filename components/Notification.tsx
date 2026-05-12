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

// Per-type styling. Backgrounds, borders, and icon colours are explicit
// so that:
//   APP-09 — error toasts have a clearly red background + alert icon.
//   APP-10 — success toasts use the brand gold/green family (never red).
//   UI-07  — all toasts auto-dismiss after ~4s.
const TYPE_STYLES: Record<
  NotificationType,
  { bg: string; border: string; icon: string; ring: string; Icon: React.FC<{ size?: number; className?: string }> }
> = {
  success: {
    // Brand gold so it ties to the BlackBox palette (#CDA032).
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
        pointer-events-auto w-full sm:min-w-[320px] sm:max-w-md
        flex items-center gap-3 px-5 py-3.5 rounded-2xl
        shadow-2xl border ring-1 ${styles.ring} ${styles.border} ${styles.bg}
        transition-all duration-300 will-change-transform
        ${isLeaving
          ? '-translate-y-3 opacity-0 scale-95'
          : 'translate-y-0 opacity-100 scale-100 animate-in slide-in-from-top-6 zoom-in-95'}
      `}
    >
      <div className={`flex items-center justify-center shrink-0 ${styles.icon}`}>
        <Icon size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold tracking-tight leading-snug break-words">
          {notification.message}
        </p>
      </div>

      <button
        onClick={handleClose}
        aria-label="Dismiss notification"
        className={`p-1.5 rounded-full transition-colors shrink-0 hover:bg-black/10 ${styles.icon}`}
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
    // Top-centered stack (UI-07). Each toast keeps its own dismiss timer so
    // they tear down independently — APP-11.
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-3 w-[min(92vw,28rem)] pointer-events-none"
      aria-label="Notifications"
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={onClose}
        />
      ))}
    </div>
  );
};
