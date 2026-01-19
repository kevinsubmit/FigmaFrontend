import { apiClient } from './client';

export interface Pin {
  id: number;
  title: string;
  image_url: string;
  description?: string | null;
  tags: string[];
  created_at: string;
}

export const getPins = async (params?: {
  skip?: number;
  limit?: number;
  tag?: string;
  search?: string;
}): Promise<Pin[]> => {
  return apiClient.get('/api/v1/pins', { params });
};

export const getPinById = async (pinId: number): Promise<Pin> => {
  return apiClient.get(`/api/v1/pins/${pinId}`);
};
