import { api } from './client';

export interface DashboardSummary {
  today_appointments: number;
  today_revenue: number;
  active_customers_week: number;
  avg_ticket_week: number;
  avg_ticket_change_pct: number;
  scope: 'all_stores' | 'store';
  store_id?: number | null;
}

export const getDashboardSummary = async () => {
  const response = await api.get('/dashboard/summary');
  return response.data as DashboardSummary;
};

export interface DashboardRealtimeNotificationItem {
  id: number;
  appointment_id: number;
  store_id: number;
  store_name?: string | null;
  customer_name: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  title: string;
  message: string;
  created_at: string;
}

export interface DashboardRealtimeNotificationList {
  total: number;
  items: DashboardRealtimeNotificationItem[];
}

export const getDashboardRealtimeNotifications = async (limit: number = 10) => {
  const response = await api.get('/dashboard/realtime-notifications', { params: { limit } });
  return response.data as DashboardRealtimeNotificationList;
};
