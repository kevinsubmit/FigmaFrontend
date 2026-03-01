import { api } from './client';

export interface Service {
  id: number;
  store_id: number;
  catalog_id?: number | null;
  name: string;
  name_snapshot?: string | null;
  category?: string | null;
  description?: string | null;
  price: number;
  commission_type?: 'fixed' | 'percent';
  commission_value?: number;
  commission_amount?: number;
  duration_minutes: number;
  is_active?: number;
}

export interface ServiceCatalogItem {
  id: number;
  name: string;
  category?: string | null;
  description?: string | null;
  default_duration_minutes?: number | null;
  is_active: number;
  sort_order: number;
}

export const getServices = async (params?: Record<string, any>) => {
  const response = await api.get('/services', { params });
  return response.data as Service[];
};

export const getStoreServices = async (storeId: number, params?: Record<string, any>) => {
  const response = await api.get(`/services/store/${storeId}`, { params });
  return response.data as Service[];
};

export const getServiceCatalog = async (params?: Record<string, any>) => {
  const safeParams = { ...(params || {}) };
  if (typeof safeParams.limit === 'number' && safeParams.limit > 200) {
    safeParams.limit = 200;
  }
  const response = await api.get('/services/admin/catalog', { params: safeParams });
  return response.data as ServiceCatalogItem[];
};

export const createServiceCatalogItem = async (payload: {
  name: string;
  category?: string;
  description?: string;
  default_duration_minutes?: number;
  is_active?: number;
  sort_order?: number;
}) => {
  const response = await api.post('/services/admin/catalog', payload);
  return response.data as ServiceCatalogItem;
};

export const updateServiceCatalogItem = async (
  catalogId: number,
  payload: {
    name?: string;
    category?: string;
    description?: string;
    default_duration_minutes?: number;
    is_active?: number;
    sort_order?: number;
  }
) => {
  const response = await api.patch(`/services/admin/catalog/${catalogId}`, payload);
  return response.data as ServiceCatalogItem;
};

export const addServiceToStore = async (
  storeId: number,
  payload: {
    catalog_id: number;
    price: number;
    commission_type?: 'fixed' | 'percent';
    commission_value?: number;
    commission_amount?: number;
    duration_minutes: number;
    description?: string;
  }
) => {
  const response = await api.post(`/services/store/${storeId}`, payload);
  return response.data as Service;
};

export const updateStoreService = async (
  storeId: number,
  serviceId: number,
  payload: {
    price?: number;
    commission_type?: 'fixed' | 'percent';
    commission_value?: number;
    commission_amount?: number;
    duration_minutes?: number;
    description?: string;
    is_active?: number;
  }
) => {
  const response = await api.patch(`/services/store/${storeId}/${serviceId}`, payload);
  return response.data as Service;
};

export const removeStoreService = async (storeId: number, serviceId: number) => {
  await api.delete(`/services/store/${storeId}/${serviceId}`);
};
