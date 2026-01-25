import { useState, useEffect } from 'react';
import { ChevronLeft, Bell, Check, Trash2, Calendar, Clock } from 'lucide-react';
import { apiClient } from '../api/client';
import { toast } from 'react-toastify';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  appointment_id: number | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

interface NotificationsProps {
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

export function Notifications({ onBack, onNavigate }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = filter === 'unread' ? '?is_read=false' : '';
      const data = await apiClient.get<Notification[]>(
        `/api/v1/notifications${params}`,
        true
      );
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await apiClient.patch(`/api/v1/notifications/${id}/read`, {}, true);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      ));
      toast.success('Marked as read');
    } catch (error) {
      console.error('Failed to mark as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await apiClient.delete(`/api/v1/notifications/${id}`, true);
      setNotifications(notifications.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.appointment_id && onNavigate) {
      onNavigate('appointments');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment_created':
      case 'appointment_confirmed':
      case 'appointment_completed':
        return <Calendar className="w-5 h-5 text-[#D4AF37]" />;
      case 'appointment_reminder':
        return <Clock className="w-5 h-5 text-[#D4AF37]" />;
      default:
        return <Bell className="w-5 h-5 text-[#D4AF37]" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-400">{unreadCount} unread</p>
            )}
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#D4AF37] text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-[#D4AF37] text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="w-16 h-16 text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">No notifications</p>
            <p className="text-gray-500 text-sm mt-2">
              {filter === 'unread' 
                ? "You're all caught up!"
                : "You'll see notifications here"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                  notification.is_read
                    ? 'bg-white/5 border-white/10'
                    : 'bg-[#D4AF37]/10 border-[#D4AF37]/30'
                }`}
              >
                {/* Unread Indicator */}
                {!notification.is_read && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-[#D4AF37] rounded-full"></div>
                )}

                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white mb-1">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                  {!notification.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Check className="w-4 h-4" />
                      Mark as read
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 text-sm text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
