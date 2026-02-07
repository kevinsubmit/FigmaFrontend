import { api } from './client';

export interface Appointment {
  id: number;
  order_number?: string | null;
  store_id: number;
  store_name?: string | null;
  service_id: number;
  service_name?: string | null;
  service_price?: number | null;
  user_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string | null;
  cancel_reason?: string | null;
}

export const getAppointments = async (params?: Record<string, any>) => {
  const response = await api.get('/appointments/admin', { params });
  return response.data as Appointment[];
};

export const updateAppointmentStatus = async (id: number, payload: { status: string; cancel_reason?: string }) => {
  const response = await api.put(`/appointments/${id}/status`, payload);
  return response.data;
};
