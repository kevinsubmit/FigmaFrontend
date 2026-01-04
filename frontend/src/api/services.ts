import { apiClient } from './client';

export interface Service {
  id: number;
  store_id: number;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  created_at: string;
}

/**
 * 获取店铺的服务列表
 */
export const getServicesByStore = async (storeId: number): Promise<Service[]> => {
  return apiClient.get(`/api/v1/stores/${storeId}/services`);
};

/**
 * 获取服务详情
 */
export const getServiceById = async (serviceId: number): Promise<Service> => {
  return apiClient.get(`/api/v1/services/${serviceId}`);
};
