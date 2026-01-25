import { api } from './client';

export interface Promotion {
  id: number;
  scope: 'platform' | 'store';
  store_id?: number | null;
  title: string;
  type: string;
  discount_type: 'fixed_amount' | 'percentage';
  discount_value: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
}

export const getPromotions = async (params?: Record<string, any>) => {
  const response = await api.get('/promotions', { params });
  return response.data as Promotion[];
};

export const createPromotion = async (payload: any) => {
  const response = await api.post('/promotions', payload);
  return response.data;
};

export const updatePromotion = async (id: number, payload: any) => {
  const response = await api.put(`/promotions/${id}`, payload);
  return response.data;
};
