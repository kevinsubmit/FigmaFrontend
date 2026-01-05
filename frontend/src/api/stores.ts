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
export const getStores = async (params?: {
  skip?: number;
  limit?: number;
  city?: string;
  search?: string;
  min_rating?: number;
  sort_by?: string;
  user_lat?: number;
  user_lng?: number;
}): Promise<Store[]> => {
  return apiClient.get('/api/v1/stores', { params });
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

/**
 * 添加店铺到收藏
 */
export const addStoreToFavorites = async (storeId: number, token: string): Promise<{ message: string; store_id: number }> => {
  return apiClient.post(`/api/v1/stores/${storeId}/favorite`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

/**
 * 从收藏中移除店铺
 */
export const removeStoreFromFavorites = async (storeId: number, token: string): Promise<{ message: string; store_id: number }> => {
  return apiClient.delete(`/api/v1/stores/${storeId}/favorite`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

/**
 * 检查店铺是否已收藏
 */
export const checkIfStoreFavorited = async (storeId: number, token: string): Promise<{ store_id: number; is_favorited: boolean }> => {
  return apiClient.get(`/api/v1/stores/${storeId}/is-favorited`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

/**
 * 获取我的收藏店铺列表
 */
export const getMyFavoriteStores = async (token: string, skip: number = 0, limit: number = 100): Promise<Store[]> => {
  return apiClient.get('/api/v1/stores/favorites/my-favorites', {
    params: { skip, limit },
    headers: { Authorization: `Bearer ${token}` }
  });
};

/**
 * 获取我的收藏数量
 */
export const getMyFavoritesCount = async (token: string): Promise<{ count: number }> => {
  return apiClient.get('/api/v1/stores/favorites/count', {
    headers: { Authorization: `Bearer ${token}` }
  });
};
