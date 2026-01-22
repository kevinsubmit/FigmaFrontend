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
  review_id?: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  store_name?: string | null;
  service_name?: string | null;
  service_price?: number | null;
  service_duration?: number | null;
  technician_name?: string | null;
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
  return apiClient.post('/api/v1/appointments/', data, true);
};

/**
 * 获取当前用户的预约列表
 */
export const getMyAppointments = async (): Promise<Appointment[]> => {
  return apiClient.get('/api/v1/appointments/', true);
};

/**
 * 获取预约详情
 */
export const getAppointmentById = async (appointmentId: number): Promise<Appointment> => {
  return apiClient.get(`/api/v1/appointments/${appointmentId}`, true);
};

/**
 * 取消预约（带取消原因）
 */
export const cancelAppointment = async (
  appointmentId: number,
  cancelReason?: string
): Promise<Appointment> => {
  return apiClient.post(
    `/api/v1/appointments/${appointmentId}/cancel`,
    { cancel_reason: cancelReason },
    true
  );
};

/**
 * 改期预约
 */
export const rescheduleAppointment = async (
  appointmentId: number,
  newDate: string,
  newTime: string
): Promise<Appointment> => {
  return apiClient.post(
    `/api/v1/appointments/${appointmentId}/reschedule`,
    { new_date: newDate, new_time: newTime },
    true
  );
};

/**
 * 更新预约备注
 */
export const updateAppointmentNotes = async (
  appointmentId: number,
  notes: string
): Promise<Appointment> => {
  return apiClient.patch(
    `/api/v1/appointments/${appointmentId}/notes`,
    { notes },
    true
  );
};
