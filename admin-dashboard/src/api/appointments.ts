import { api } from './client';

export interface Appointment {
  id: number;
  order_number?: string | null;
  store_id: number;
  store_name?: string | null;
  service_id: number;
  service_name?: string | null;
  service_price?: number | null;
  order_amount?: number | null;
  service_duration?: number | null;
  user_id: number;
  user_name?: string | null;
  user_phone?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  phone?: string | null;
  staff_name?: string | null;
  stylist_name?: string | null;
  technician_name?: string | null;
  duration_minutes?: number | null;
  end_time?: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string | null;
  cancel_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const getAppointments = async (params?: Record<string, any>) => {
  const response = await api.get('/appointments/admin', { params });
  return response.data as Appointment[];
};

export const updateAppointmentStatus = async (id: number, payload: { status: string; cancel_reason?: string }) => {
  const response = await api.put(`/appointments/${id}/status`, payload);
  return response.data;
};

export const markAppointmentNoShow = async (id: number) => {
  const response = await api.post(`/appointments/${id}/no-show`);
  return response.data as Appointment;
};

export const rescheduleAppointment = async (
  id: number,
  payload: { new_date: string; new_time: string },
) => {
  const response = await api.post(`/appointments/${id}/reschedule`, payload);
  return response.data as Appointment;
};

export const updateAppointmentNotes = async (id: number, payload: { notes: string }) => {
  const response = await api.patch(`/appointments/${id}/notes`, payload);
  return response.data as Appointment;
};

export const updateAppointmentAmount = async (id: number, payload: { order_amount: number }) => {
  const response = await api.patch(`/appointments/${id}/amount`, payload);
  return response.data as Appointment;
};
