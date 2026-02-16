import { api } from './client';

export interface Coupon {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  category?: string;
  discount_value: number;
  min_amount: number;
  max_discount?: number | null;
  valid_days: number;
  is_active?: boolean;
  total_quantity?: number | null;
  claimed_quantity?: number;
  points_required?: number | null;
  created_at?: string;
}

export interface GrantCouponResult {
  status: 'granted' | 'pending_claim' | string;
  detail: string;
  sms_sent?: boolean | null;
  user_coupon_id?: number | null;
  pending_grant_id?: number | null;
}

export interface GrantCouponBatchItem {
  input_phone: string;
  normalized_phone?: string | null;
  status: 'granted' | 'pending_claim' | 'failed' | string;
  detail: string;
  sms_sent?: boolean | null;
  user_coupon_id?: number | null;
  pending_grant_id?: number | null;
}

export interface GrantCouponBatchResult {
  total: number;
  granted_count: number;
  pending_count: number;
  failed_count: number;
  items: GrantCouponBatchItem[];
}

export interface CouponPendingGrant {
  id: number;
  coupon_id: number;
  coupon_name?: string | null;
  phone: string;
  status: string;
  note?: string | null;
  granted_by_user_id?: number | null;
  granted_at: string;
  claim_expires_at?: string | null;
  claimed_user_id?: number | null;
  claimed_at?: string | null;
  user_coupon_id?: number | null;
}

export const getCoupons = async () => {
  const response = await api.get('/coupons');
  return response.data as Coupon[];
};

export const createCoupon = async (payload: {
  name: string;
  description?: string;
  type: 'fixed_amount' | 'percentage';
  category: 'normal' | 'newcomer' | 'birthday' | 'referral' | 'activity';
  discount_value: number;
  min_amount: number;
  max_discount?: number | null;
  valid_days: number;
  is_active: boolean;
  total_quantity?: number | null;
  points_required?: number | null;
}) => {
  const response = await api.post('/coupons/create', payload);
  return response.data as Coupon;
};

export type CouponUpdatePayload = Partial<{
  name: string;
  description: string;
  type: 'fixed_amount' | 'percentage';
  category: 'normal' | 'newcomer' | 'birthday' | 'referral' | 'activity';
  discount_value: number;
  min_amount: number;
  max_discount: number | null;
  valid_days: number;
  is_active: boolean;
  total_quantity: number | null;
  points_required: number | null;
}>;

export const updateCoupon = async (couponId: number, payload: CouponUpdatePayload) => {
  const response = await api.patch(`/coupons/id/${couponId}`, payload);
  return response.data as Coupon;
};

export const grantCoupon = async (payload: { phone: string; coupon_id: number }) => {
  const response = await api.post('/coupons/grant', payload);
  return response.data as GrantCouponResult;
};

export const grantCouponBatch = async (payload: { coupon_id: number; phones: string[] }) => {
  const response = await api.post('/coupons/grant/batch', payload);
  return response.data as GrantCouponBatchResult;
};

export const getCouponPendingGrants = async (params?: Record<string, any>) => {
  const response = await api.get('/coupons/pending-grants', { params });
  return response.data as CouponPendingGrant[];
};

export const revokeCouponPendingGrant = async (grantId: number) => {
  const response = await api.post(`/coupons/pending-grants/${grantId}/revoke`);
  return response.data as CouponPendingGrant;
};
