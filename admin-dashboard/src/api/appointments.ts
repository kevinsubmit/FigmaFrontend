import { api } from './client';

export interface Appointment {
  id: number;
  order_number?: string | null;
  store_id: number;
  store_name?: string | null;
  service_id: number;
  technician_id?: number | null;
  service_name?: string | null;
  service_price?: number | null;
  order_amount?: number | null;
  original_amount?: number | null;
  coupon_discount_amount?: number | null;
  gift_card_used_amount?: number | null;
  cash_paid_amount?: number | null;
  final_paid_amount?: number | null;
  points_earned?: number | null;
  points_reverted?: number | null;
  settlement_status?: string | null;
  settled_at?: string | null;
  service_duration?: number | null;
  user_id: number;
  user_name?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_vip_level?: number | null;
  is_new_customer?: boolean | null;
  staff_name?: string | null;
  stylist_name?: string | null;
  technician_name?: string | null;
  duration_minutes?: number | null;
  end_time?: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  group_id?: number | null;
  is_group_host?: boolean | null;
  payment_status?: string | null;
  paid_amount?: number | null;
  booked_by_user_id?: number | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  notes?: string | null;
  cancel_reason?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AppointmentGroupResponse {
  group_id: number;
  group_code?: string | null;
  host_appointment: Appointment;
  guest_appointments: Appointment[];
}

export interface AppointmentStaffSplit {
  id: number;
  appointment_id: number;
  technician_id: number;
  technician_name?: string | null;
  service_id: number;
  service_name?: string | null;
  amount: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AppointmentStaffSplitSummary {
  order_amount: number;
  split_total: number;
  is_balanced: boolean;
  splits: AppointmentStaffSplit[];
}

export interface AppointmentServiceItem {
  id: number;
  appointment_id: number;
  service_id: number;
  service_name?: string | null;
  amount: number;
  is_primary: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AppointmentServiceSummary {
  order_amount: number;
  items: AppointmentServiceItem[];
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

export interface AppointmentSettlePayload {
  idempotency_key: string;
  original_amount?: number;
  user_coupon_id?: number;
  coupon_discount_amount?: number;
  gift_card_id?: number;
  gift_card_amount?: number;
  cash_paid_amount?: number;
}

export interface AppointmentRefundPayload {
  idempotency_key: string;
  refund_cash_amount?: number;
  refund_gift_card_amount?: number;
  gift_card_id?: number;
  reason?: string;
}

export const settleAppointment = async (id: number, payload: AppointmentSettlePayload) => {
  const response = await api.post(`/appointments/${id}/settle`, payload);
  return response.data as Appointment;
};

export const refundAppointment = async (id: number, payload: AppointmentRefundPayload) => {
  const response = await api.post(`/appointments/${id}/refund`, payload);
  return response.data as Appointment;
};

export const updateAppointmentTechnician = async (
  id: number,
  payload: { technician_id: number | null },
) => {
  const response = await api.patch(`/appointments/${id}/technician`, payload);
  return response.data as Appointment;
};

export const getAppointmentStaffSplits = async (id: number) => {
  const response = await api.get(`/appointments/${id}/splits`);
  return response.data as AppointmentStaffSplitSummary;
};

export const updateAppointmentStaffSplits = async (
  id: number,
  payload: { splits: Array<{ technician_id: number; service_id: number; amount: number }> },
) => {
  const response = await api.put(`/appointments/${id}/splits`, payload);
  return response.data as AppointmentStaffSplitSummary;
};

export const getAppointmentGroup = async (groupId: number) => {
  const response = await api.get(`/appointments/groups/${groupId}`);
  return response.data as AppointmentGroupResponse;
};

export const getAppointmentServices = async (id: number) => {
  const response = await api.get(`/appointments/${id}/services`);
  return response.data as AppointmentServiceSummary;
};

export const addAppointmentService = async (
  id: number,
  payload: { service_id: number; amount: number },
) => {
  const response = await api.post(`/appointments/${id}/services`, payload);
  return response.data as AppointmentServiceSummary;
};

export const deleteAppointmentService = async (id: number, itemId: number) => {
  const response = await api.delete(`/appointments/${id}/services/${itemId}`);
  return response.data as AppointmentServiceSummary;
};

export const updateAppointmentGuestOwner = async (
  id: number,
  payload: { guest_phone?: string | null; guest_name?: string | null },
) => {
  const response = await api.patch(`/appointments/${id}/guest-owner`, payload);
  return response.data as Appointment;
};
