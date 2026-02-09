import { api } from './client';

export interface HomeFeedImage {
  id: number;
  title: string;
  image_url: string;
  description?: string | null;
  status: 'draft' | 'published' | 'offline' | string;
  sort_order: number;
  is_deleted: boolean;
  tag_ids: number[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface HomeFeedCategory {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const getHomeFeedImages = async (params?: Record<string, any>) => {
  const response = await api.get('/pins/admin', { params });
  return response.data as HomeFeedImage[];
};

export const createHomeFeedImage = async (payload: {
  title: string;
  image_url: string;
  description?: string;
  status: string;
  sort_order: number;
  tag_ids: number[];
}) => {
  const response = await api.post('/pins/admin', payload);
  return response.data as HomeFeedImage;
};

export const updateHomeFeedImage = async (
  id: number,
  payload: Partial<{
    title: string;
    image_url: string;
    description: string;
    status: string;
    sort_order: number;
    tag_ids: number[];
  }>,
) => {
  const response = await api.patch(`/pins/admin/${id}`, payload);
  return response.data as HomeFeedImage;
};

export const deleteHomeFeedImage = async (id: number) => {
  await api.delete(`/pins/admin/${id}`);
};

export const getHomeFeedCategories = async (params?: Record<string, any>) => {
  const response = await api.get('/pins/admin/tags', { params });
  return response.data as HomeFeedCategory[];
};

export const createHomeFeedCategory = async (payload: {
  name: string;
  sort_order?: number;
  is_active?: boolean;
}) => {
  const response = await api.post('/pins/admin/tags', payload);
  return response.data as HomeFeedCategory;
};

export const updateHomeFeedCategory = async (
  id: number,
  payload: Partial<{ name: string; sort_order: number; is_active: boolean }>,
) => {
  const response = await api.patch(`/pins/admin/tags/${id}`, payload);
  return response.data as HomeFeedCategory;
};

export const deleteHomeFeedCategory = async (id: number) => {
  await api.delete(`/pins/admin/tags/${id}`);
};

export const uploadHomeFeedImage = async (file: File) => {
  const formData = new FormData();
  formData.append('files', file);
  const response = await api.post('/upload/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data as string[];
};
