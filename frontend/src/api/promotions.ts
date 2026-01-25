import { apiClient } from './client';

export interface PromotionServiceRule {
  id: number;
  service_id: number;
  min_price?: number | null;
  max_price?: number | null;
}

export interface Promotion {
  id: number;
  scope: 'platform' | 'store';
  store_id?: number | null;
  title: string;
  type: string;
  discount_type: 'fixed_amount' | 'percentage';
  discount_value: number;
  rules?: string | null;
  start_at: string;
  end_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service_rules: PromotionServiceRule[];
}

export const getPromotions = async (params?: {
  skip?: number;
  limit?: number;
  store_id?: number;
  scope?: 'platform' | 'store';
  active_only?: boolean;
  include_platform?: boolean;
}): Promise<Promotion[]> => {
  const query = new URLSearchParams();
  if (params?.skip !== undefined) query.set('skip', String(params.skip));
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.store_id !== undefined) query.set('store_id', String(params.store_id));
  if (params?.scope) query.set('scope', params.scope);
  if (params?.active_only !== undefined) query.set('active_only', String(params.active_only));
  if (params?.include_platform !== undefined) query.set('include_platform', String(params.include_platform));

  const suffix = query.toString();
  const endpoint = suffix ? `/api/v1/promotions?${suffix}` : '/api/v1/promotions';
  return apiClient.get(endpoint);
};
