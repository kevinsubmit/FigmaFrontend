import apiClient from '../lib/api';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: number;
  user_id: number;
  store_id: number;
  service_id: number;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM:SS
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AppointmentWithDetails extends Appointment {
  store_name: string;
  service_name: string;
  service_price: number;
  service_duration: number;
}

export interface AppointmentCreate {
  store_id: number;
  service_id: number;
  technician_id?: number;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM:SS
  notes?: string;
}

export interface AppointmentGroupGuestCreate {
  service_id: number;
  technician_id?: number;
  notes?: string;
  guest_name?: string;
  guest_phone?: string;
}

export interface AppointmentGroupCreate {
  store_id: number;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM:SS
  host_service_id: number;
  host_technician_id?: number;
  host_notes?: string;
  guests: AppointmentGroupGuestCreate[];
}

export interface AppointmentGroupResponse {
  group_id: number;
  group_code?: string | null;
  host_appointment: AppointmentWithDetails;
  guest_appointments: AppointmentWithDetails[];
}

export interface AppointmentUpdate {
  appointment_date?: string;
  appointment_time?: string;
  status?: AppointmentStatus;
  notes?: string;
}

export interface AppointmentListParams {
  skip?: number;
  limit?: number;
}

/**
 * 创建预约
 */
export const createAppointment = async (data: AppointmentCreate): Promise<Appointment> => {
  const response = await apiClient.post('/appointments/', data);
  return response.data;
};

/**
 * 创建多人团单预约（主单+子单）
 */
export const createAppointmentGroup = async (data: AppointmentGroupCreate): Promise<AppointmentGroupResponse> => {
  const response = await apiClient.post('/appointments/groups', data);
  return response.data;
};

/**
 * 获取当前用户的预约列表
 */
export const getMyAppointments = async (params?: AppointmentListParams): Promise<AppointmentWithDetails[]> => {
  const response = await apiClient.get('/appointments/', { params });
  return response.data;
};

/**
 * 获取预约详情
 */
export const getAppointmentById = async (appointmentId: number): Promise<Appointment> => {
  const response = await apiClient.get(`/appointments/${appointmentId}`);
  return response.data;
};

/**
 * 更新预约
 */
export const updateAppointment = async (
  appointmentId: number,
  data: AppointmentUpdate
): Promise<Appointment> => {
  const response = await apiClient.patch(`/appointments/${appointmentId}`, data);
  return response.data;
};

/**
 * 取消预约
 */
export const cancelAppointment = async (appointmentId: number): Promise<Appointment> => {
  const response = await apiClient.delete(`/appointments/${appointmentId}`);
  return response.data;
};
