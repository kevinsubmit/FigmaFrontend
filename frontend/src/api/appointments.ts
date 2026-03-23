import { apiClient } from './client';
import { getServicesByStore, Service } from './services';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: number;
  order_number?: string | null;
  user_id: number;
  store_id: number;
  service_id: number;
  technician_id: number | null;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM:SS
  status: AppointmentStatus;
  group_id?: number | null;
  is_group_host?: boolean | null;
  payment_status?: string | null;
  paid_amount?: number | null;
  review_id?: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  store_name?: string | null;
  store_address?: string | null;
  service_name?: string | null;
  service_price?: number | null;
  service_duration?: number | null;
  service_summary?: AppointmentServiceSummary | null;
  service_items?: AppointmentServiceItem[] | null;
  technician_name?: string | null;
  user_name?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
}

export interface AppointmentGroupResponse {
  group_id: number;
  group_code?: string | null;
  host_appointment: Appointment;
  guest_appointments: Appointment[];
}

export interface AppointmentServiceItem {
  id: number;
  appointment_id: number;
  service_id: number;
  service_name?: string | null;
  amount: number;
  is_primary: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface AppointmentServiceSummary {
  order_amount: number;
  items: AppointmentServiceItem[];
}

export interface AppointmentCreate {
  store_id: number;
  service_id: number;
  technician_id?: number;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM
  notes?: string;
}

export const getAppointmentServiceSummary = async (appointmentId: number): Promise<AppointmentServiceSummary> => {
  return apiClient.get(`/api/v1/appointments/${appointmentId}/services`, true);
};

const enrichAppointment = async (appointment: Appointment): Promise<Appointment> => {
  try {
    const [summary, storeServices] = await Promise.all([
      getAppointmentServiceSummary(appointment.id),
      getServicesByStore(appointment.store_id),
    ]);
    const servicesById = new Map<number, Service>(storeServices.map((service) => [service.id, service]));
    const uniqueNames = Array.from(
      new Set(
        summary.items
          .map((item) => {
            const rawName = String(item.service_name || '').trim();
            if (rawName) return rawName;
            return servicesById.get(item.service_id)?.name || '';
          })
          .filter(Boolean),
      ),
    );
    const totalDuration = summary.items.reduce((acc, item) => {
      const matched = servicesById.get(item.service_id);
      if (matched) return acc + matched.duration_minutes;
      if (item.service_id === appointment.service_id) return acc + (appointment.service_duration || 0);
      return acc;
    }, 0);
    const totalAmount = summary.order_amount > 0 ? summary.order_amount : (appointment.order_amount ?? appointment.service_price ?? undefined);
    const serviceName =
      uniqueNames.length === 0
        ? appointment.service_name
        : uniqueNames.length === 1
          ? uniqueNames[0]
          : uniqueNames.join(', ');

    return {
      ...appointment,
      order_amount: totalAmount ?? appointment.order_amount,
      service_name: serviceName,
      service_price: totalAmount ?? appointment.service_price,
      service_duration: totalDuration || appointment.service_duration,
      service_summary: summary,
      service_items: summary.items,
    };
  } catch {
    return appointment;
  }
};

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
  const appointments = await apiClient.get('/api/v1/appointments/', true) as Appointment[];
  return Promise.all(appointments.map(enrichAppointment));
};

/**
 * 获取预约详情
 */
export const getAppointmentById = async (appointmentId: number): Promise<Appointment> => {
  const appointment = await apiClient.get(`/api/v1/appointments/${appointmentId}`, true) as Appointment;
  return enrichAppointment(appointment);
};

/**
 * 取消预约（带取消原因）
 */
export const cancelAppointment = async (
  appointmentId: number,
  cancelReason?: string
): Promise<Appointment> => {
  const reason = cancelReason?.trim();
  const payload = reason ? { cancel_reason: reason } : undefined;
  const appointment = await apiClient.post(
    `/api/v1/appointments/${appointmentId}/cancel`,
    payload,
    { requiresAuth: true, allowEmptyBody: !payload }
  ) as Appointment;
  return enrichAppointment(appointment);
};

/**
 * 改期预约
 */
export const rescheduleAppointment = async (
  appointmentId: number,
  newDate: string,
  newTime: string
): Promise<Appointment> => {
  const appointment = await apiClient.post(
    `/api/v1/appointments/${appointmentId}/reschedule`,
    { new_date: newDate, new_time: newTime },
    true
  ) as Appointment;
  return enrichAppointment(appointment);
};

/**
 * 更新预约备注
 */
export const updateAppointmentNotes = async (
  appointmentId: number,
  notes: string
): Promise<Appointment> => {
  const appointment = await apiClient.patch(
    `/api/v1/appointments/${appointmentId}/notes`,
    { notes },
    true
  ) as Appointment;
  return enrichAppointment(appointment);
};

/**
 * 获取团单详情
 */
export const getAppointmentGroup = async (groupId: number): Promise<AppointmentGroupResponse> => {
  return apiClient.get(`/api/v1/appointments/groups/${groupId}`, true);
};
