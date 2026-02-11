import { api } from './client';

export interface Store {
  id: number;
  name: string;
  address: string;
  is_visible?: boolean;
  manual_rank?: number | null;
  boost_score?: number | null;
  featured_until?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  opening_hours?: string | null;
  rating?: number | null;
}

export interface StoreImage {
  id: number;
  store_id: number;
  image_url: string;
  is_primary?: number | null;
  display_order?: number | null;
  created_at: string;
}

export interface StoreHours {
  id: number;
  store_id: number;
  day_of_week: number; // 0=Mon ... 6=Sun
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export interface StoreHoursUpsert {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export const getStores = async (params?: Record<string, any>) => {
  const response = await api.get('/stores', { params });
  return response.data as Store[];
};

export const getStoreById = async (id: number) => {
  const response = await api.get(`/stores/${id}`);
  return response.data as Store;
};

export const updateStore = async (id: number, payload: Partial<Store>) => {
  const response = await api.patch(`/stores/${id}`, payload);
  return response.data as Store;
};

export const updateStoreVisibility = async (id: number, isVisible: boolean) => {
  const response = await api.patch(`/stores/${id}/visibility`, { is_visible: isVisible });
  return response.data as Store;
};

export const updateStoreRanking = async (
  id: number,
  payload: { manual_rank?: number | null; boost_score?: number | null; featured_until?: string | null },
) => {
  const response = await api.patch(`/stores/${id}/ranking`, payload);
  return response.data as Store;
};

export const getStoreImages = async (storeId: number) => {
  const response = await api.get(`/stores/${storeId}/images`);
  return response.data as StoreImage[];
};

export const addStoreImage = async (storeId: number, imageUrl: string, displayOrder = 0) => {
  const response = await api.post(`/stores/${storeId}/images`, null, {
    params: { image_url: imageUrl, display_order: displayOrder },
  });
  return response.data as StoreImage;
};

export const deleteStoreImage = async (storeId: number, imageId: number) => {
  await api.delete(`/stores/${storeId}/images/${imageId}`);
};

export const getStoreHours = async (storeId: number) => {
  const response = await api.get(`/stores/${storeId}/hours`);
  return response.data as StoreHours[];
};

export const setStoreHours = async (storeId: number, hours: StoreHoursUpsert[]) => {
  const response = await api.put(`/stores/${storeId}/hours`, { hours });
  return response.data as StoreHours[];
};
