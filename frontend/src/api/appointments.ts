import { apiClient } from './client';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: number;
  user_id: number;
  store_id: number;
  service_id: number;
  technician_id: number | null;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM:SS
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AppointmentCreate {
  store_id: number;
  service_id: number;
  technician_id?: number;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM
  notes?: string;
}

/**
 * 创建预约
 */
export const createAppointment = async (data: AppointmentCreate): Promise<Appointment> => {
  return apiClient.post('/api/v1/appointments', data, true);
};

/**
 * 获取当前用户的预约列表
 */
export const getMyAppointments = async (): Promise<Appointment[]> => {
  return apiClient.get('/api/v1/appointments', true);
};

/**
 * 获取预约详情
 */
export const getAppointmentById = async (appointmentId: number): Promise<Appointment> => {
  return apiClient.get(`/api/v1/appointments/${appointmentId}`, true);
};

/**
 * 取消预约
 */
export const cancelAppointment = async (appointmentId: number): Promise<void> => {
  return apiClient.patch(`/api/v1/appointments/${appointmentId}`, { status: 'cancelled' }, true);
};
