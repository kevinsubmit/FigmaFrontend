import { api } from './client';

export interface Coupon {
  id: number;
  name: string;
  type: string;
  discount_value: number;
}

export const getCoupons = async () => {
  const response = await api.get('/coupons');
  return response.data as Coupon[];
};

export const grantCoupon = async (payload: { phone: string; coupon_id: number }) => {
  const response = await api.post('/coupons/grant', payload);
  return response.data;
};
