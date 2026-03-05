import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

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

export const NotificationItem: React.FC<NotificationProps> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Enter animation
    setIsVisible(true);

    // Auto close after duration
    const timer = setTimeout(() => {
      handleClose();
    }, notification.duration || 4000);

    return () => clearTimeout(timer);
  }, [notification.duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(notification.id);
    }, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <XCircle size={20} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-500" />;
      case 'info':
        return <Info size={20} className="text-blue-500" />;
      default:
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getStyles = () => {
    const baseStyles = "fixed bottom-4 right-4 max-w-sm bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-4 flex items-center gap-3 z-50 transition-all duration-300";
    const animationStyles = isVisible && !isLeaving 
      ? "translate-y-0 opacity-100" 
      : "translate-y-full opacity-0";
    const borderStyles = {
      success: "border-green-200 dark:border-green-800",
      error: "border-red-200 dark:border-red-800", 
      warning: "border-yellow-200 dark:border-yellow-800",
      info: "border-blue-200 dark:border-blue-800"
    };

    return `${baseStyles} ${animationStyles} ${borderStyles[notification.type]}`;
  };

  return (
    <div className={getStyles()}>
      {getIcon()}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {notification.message}
        </p>
      </div>
      <button
        onClick={handleClose}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
  onClose 
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
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
