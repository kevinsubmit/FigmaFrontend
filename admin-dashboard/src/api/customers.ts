import { api } from './client';

export interface CustomerListItem {
  id: number;
  name: string;
  phone: string;
  registered_at: string;
  last_login_at?: string | null;
  total_appointments: number;
  completed_count: number;
  cancelled_count: number;
  no_show_count: number;
  next_appointment_at?: string | null;
  risk_level: string;
  restricted_until?: string | null;
  status: 'active' | 'restricted' | string;
}

export interface CustomerListResponse {
  items: CustomerListItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface CustomerDetail extends CustomerListItem {
  username: string;
  cancel_rate: number;
  lifetime_spent: number;
}

export interface CustomerAppointmentItem {
  id: number;
  order_number?: string | null;
  store_id: number;
  store_name?: string | null;
  service_name?: string | null;
  service_price?: number | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  cancel_reason?: string | null;
  created_at?: string | null;
}

export interface CustomerPointsSummary {
  total_points: number;
  available_points: number;
}

export interface CustomerPointTransactionItem {
  id: number;
  amount: number;
  type: string;
  reason: string;
  description?: string | null;
  reference_type?: string | null;
  reference_id?: number | null;
  created_at: string;
}

export interface CustomerCouponItem {
  id: number;
  coupon_id: number;
  coupon_name: string;
  status: string;
  source?: string | null;
  obtained_at: string;
  expires_at: string;
  used_at?: string | null;
  discount_type?: string | null;
  discount_value: number;
  min_amount: number;
  max_discount?: number | null;
}

export interface CustomerGiftCardItem {
  id: number;
  card_number: string;
  status: string;
  balance: number;
  initial_balance: number;
  expires_at?: string | null;
  created_at: string;
}

export interface CustomerRewardsResponse {
  points: CustomerPointsSummary;
  point_transactions: CustomerPointTransactionItem[];
  coupons: CustomerCouponItem[];
  gift_cards: CustomerGiftCardItem[];
}

export const getCustomers = async (params?: Record<string, any>) => {
  const response = await api.get('/customers/admin', { params });
  return response.data as CustomerListResponse;
};

export const getCustomerDetail = async (customerId: number) => {
  const response = await api.get(`/customers/admin/${customerId}`);
  return response.data as CustomerDetail;
};

export const getCustomerAppointments = async (customerId: number, params?: Record<string, any>) => {
  const response = await api.get(`/customers/admin/${customerId}/appointments`, { params });
  return response.data as CustomerAppointmentItem[];
};

export const getCustomerRewards = async (customerId: number, params?: Record<string, any>) => {
  const response = await api.get(`/customers/admin/${customerId}/rewards`, { params });
  return response.data as CustomerRewardsResponse;
};
