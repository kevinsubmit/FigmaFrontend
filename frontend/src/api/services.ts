import { apiClient } from './client';

export interface Service {
  id: number;
  store_id: number;
  catalog_id?: number | null;
  name: string;
  name_snapshot?: string | null;
  description: string | null;
  price: number;
  duration_minutes: number;
  category?: string | null;
  is_active?: number;
  created_at: string;
  updated_at?: string | null;
}

/**
 * 获取店铺的服务列表
 */
export const getServicesByStore = async (storeId: number): Promise<Service[]> => {
  return apiClient.get(`/api/v1/services/store/${storeId}`);
};

/**
 * 获取服务详情
 */
export const getServiceById = async (serviceId: number): Promise<Service> => {
  return apiClient.get(`/api/v1/services/${serviceId}`);
};
