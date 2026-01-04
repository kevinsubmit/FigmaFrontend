import { apiClient } from './client';

export interface Store {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  description: string | null;
  image_url: string | null;
  rating: number | null;
  created_at: string;
}

export interface StoreHours {
  id: number;
  store_id: number;
  day_of_week: number; // 0=Monday, 6=Sunday
  open_time: string; // HH:MM:SS
  close_time: string; // HH:MM:SS
  is_closed: boolean;
}

/**
 * 获取所有店铺列表
 */
export const getStores = async (): Promise<Store[]> => {
  return apiClient.get('/api/v1/stores');
};

/**
 * 获取店铺详情
 */
export const getStoreById = async (storeId: number): Promise<Store> => {
  return apiClient.get(`/api/v1/stores/${storeId}`);
};

/**
 * 获取店铺营业时间
 */
export const getStoreHours = async (storeId: number): Promise<StoreHours[]> => {
  return apiClient.get(`/api/v1/stores/${storeId}/hours`);
};
