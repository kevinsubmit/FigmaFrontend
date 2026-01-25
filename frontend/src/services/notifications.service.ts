/**
 * Notifications Service
 * Handles all notification-related API calls
 */
import apiClient from '../lib/api';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  appointment_id: number | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationStats {
  unread_count: number;
}

class NotificationsService {
  /**
   * Get user's notifications
   */
  async getNotifications(unreadOnly: boolean = false): Promise<Notification[]> {
    const params = unreadOnly ? { unread_only: true } : undefined;
    const response = await apiClient.get<Notification[]>(
      '/notifications',
      { params }
    );
    return response.data;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<NotificationStats>(
      '/notifications/unread-count'
    );
    return response.data.unread_count;
  }

  /**
   * Get a specific notification
   */
  async getNotification(notificationId: number): Promise<Notification> {
    const response = await apiClient.get<Notification>(
      `/notifications/${notificationId}`
    );
    return response.data;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: number): Promise<Notification> {
    const response = await apiClient.patch<Notification>(
      `/notifications/${notificationId}/read`,
      {}
    );
    return response.data;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ marked_count: number }> {
    const response = await apiClient.post<{ marked_count: number }>(
      '/notifications/mark-all-read',
      {}
    );
    return response.data;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: number): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`);
  }
}

export const notificationsService = new NotificationsService();
