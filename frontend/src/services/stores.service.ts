import apiClient from '../lib/api';

export interface Store {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  rating: number | null;
  review_count: number | null;
  description: string | null;
  opening_hours: string | null;
  created_at: string;
  updated_at: string | null;
  images?: StoreImage[];
}

export interface StoreImage {
  id: number;
  store_id: number;
  image_url: string;
  is_primary: number;
  display_order: number;
  created_at: string;
}

export interface StoreListParams {
  skip?: number;
  limit?: number;
  city?: string;
  state?: string;
  search?: string;
}

export interface StoreSearchParams {
  query: string;
  city?: string;
  state?: string;
}

export interface StoreBlockedSlot {
  id: number;
  store_id: number;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason?: string | null;
  status?: string;
}

/**
 * 获取店铺列表
 */
export const getStores = async (params?: StoreListParams): Promise<Store[]> => {
  const response = await apiClient.get('/stores/', { params });
  return response.data;
};

/**
 * 获取店铺详情
 */
export const getStoreById = async (storeId: number): Promise<Store> => {
  const response = await apiClient.get(`/stores/${storeId}`);
  return response.data;
};

/**
 * 搜索店铺
 */
export const searchStores = async (params: StoreSearchParams): Promise<Store[]> => {
  const response = await apiClient.get('/stores/search', { params });
  return response.data;
};

export const getStoreBlockedSlotsPublic = async (storeId: number, date: string): Promise<StoreBlockedSlot[]> => {
  const response = await apiClient.get(`/stores/${storeId}/blocked-slots/public`, { params: { date } });
  return response.data;
};
