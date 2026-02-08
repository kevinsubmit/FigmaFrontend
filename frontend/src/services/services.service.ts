import apiClient from '../lib/api';

export interface Service {
  id: number;
  store_id: number;
  catalog_id?: number | null;
  name: string;
  name_snapshot?: string | null;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: string | null;
  is_active: number;
  created_at: string;
  updated_at: string | null;
}

export interface ServiceListParams {
  store_id?: number;
  category?: string;
  skip?: number;
  limit?: number;
}

/**
 * 获取服务列表
 */
export const getServices = async (params?: ServiceListParams): Promise<Service[]> => {
  const response = await apiClient.get('/services/', { params });
  return response.data;
};

/**
 * 获取服务详情
 */
export const getServiceById = async (serviceId: number): Promise<Service> => {
  const response = await apiClient.get(`/services/${serviceId}`);
  return response.data;
};

/**
 * 根据店铺ID获取服务列表
 */
export const getServicesByStoreId = async (storeId: number): Promise<Service[]> => {
  const response = await apiClient.get(`/services/store/${storeId}`);
  return response.data;
};
