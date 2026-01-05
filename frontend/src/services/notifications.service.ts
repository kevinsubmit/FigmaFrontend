/**
 * Notifications Service
 * Handles all notification-related API calls
 */
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

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
    const token = localStorage.getItem('access_token');
    const params = unreadOnly ? '?unread_only=true' : '';
    
    const response = await axios.get(
      `${API_BASE_URL}/notifications${params}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    return response.data;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const token = localStorage.getItem('access_token');
    
    const response = await axios.get<NotificationStats>(
      `${API_BASE_URL}/notifications/unread-count`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    return response.data.unread_count;
  }

  /**
   * Get a specific notification
   */
  async getNotification(notificationId: number): Promise<Notification> {
    const token = localStorage.getItem('access_token');
    
    const response = await axios.get(
      `${API_BASE_URL}/notifications/${notificationId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    return response.data;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: number): Promise<Notification> {
    const token = localStorage.getItem('access_token');
    
    const response = await axios.patch(
      `${API_BASE_URL}/notifications/${notificationId}/read`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    return response.data;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ marked_count: number }> {
    const token = localStorage.getItem('access_token');
    
    const response = await axios.post(
      `${API_BASE_URL}/notifications/mark-all-read`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    return response.data;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: number): Promise<void> {
    const token = localStorage.getItem('access_token');
    
    await axios.delete(
      `${API_BASE_URL}/notifications/${notificationId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
  }
}

export const notificationsService = new NotificationsService();
