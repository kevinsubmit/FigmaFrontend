import { api } from './client';

export interface Store {
  id: number;
  name: string;
  address: string;
  phone?: string | null;
  rating?: number | null;
}

export const getStores = async (params?: Record<string, any>) => {
  const response = await api.get('/stores', { params });
  return response.data as Store[];
};

export const getStoreById = async (id: number) => {
  const response = await api.get(`/stores/${id}`);
  return response.data as Store;
};
