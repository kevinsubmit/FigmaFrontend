import { api } from './client';

export interface Service {
  id: number;
  store_id: number;
  name: string;
  price: number;
  duration_minutes: number;
}

export const getServices = async (params?: Record<string, any>) => {
  const response = await api.get('/services', { params });
  return response.data as Service[];
};
