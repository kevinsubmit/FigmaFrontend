import { api } from './client';

export interface StoreAdminApplicationPayload {
  phone: string;
  password: string;
  store_name: string;
}

export interface StoreAdminApplicationUpdatePayload {
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  opening_hours?: string;
}

export interface StoreAdminApplication {
  id: number;
  phone: string;
  store_name: string;
  store_address?: string | null;
  store_phone?: string | null;
  opening_hours?: string | null;
  status: string;
  review_reason?: string | null;
  created_at: string;
  user_id?: number | null;
  store_id?: number | null;
}

export const submitStoreAdminApplication = async (payload: StoreAdminApplicationPayload) => {
  const response = await api.post('/store-admin-applications', payload);
  return response.data;
};

export const getMyStoreAdminApplication = async () => {
  const response = await api.get('/store-admin-applications/me');
  return response.data as StoreAdminApplication;
};

export const updateMyStoreAdminApplication = async (payload: StoreAdminApplicationUpdatePayload) => {
  const response = await api.patch('/store-admin-applications/me', payload);
  return response.data as StoreAdminApplication;
};

export const submitStoreAdminReview = async () => {
  const response = await api.post('/store-admin-applications/submit-review');
  return response.data as StoreAdminApplication;
};

export const getStoreAdminApplications = async (params?: Record<string, any>) => {
  const response = await api.get('/store-admin-applications/admin', { params });
  return response.data as StoreAdminApplication[];
};

export const approveStoreAdminApplication = async (id: number) => {
  const response = await api.post(`/store-admin-applications/admin/${id}/approve`);
  return response.data as StoreAdminApplication;
};

export const rejectStoreAdminApplication = async (id: number, review_reason?: string) => {
  const response = await api.post(`/store-admin-applications/admin/${id}/reject`, { review_reason });
  return response.data as StoreAdminApplication;
};
