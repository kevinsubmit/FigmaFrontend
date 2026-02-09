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

export const getPinTags = async (): Promise<string[]> => {
  return apiClient.get('/api/v1/pins/tags');
};

export const getPinById = async (pinId: number): Promise<Pin> => {
  return apiClient.get(`/api/v1/pins/${pinId}`);
};

export const addPinToFavorites = async (pinId: number, token: string): Promise<{ message: string; pin_id: number }> => {
  return apiClient.post(`/api/v1/pins/${pinId}/favorite`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const removePinFromFavorites = async (pinId: number, token: string): Promise<{ message: string; pin_id: number }> => {
  return apiClient.delete(`/api/v1/pins/${pinId}/favorite`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const checkIfPinFavorited = async (pinId: number, token: string): Promise<{ pin_id: number; is_favorited: boolean }> => {
  return apiClient.get(`/api/v1/pins/${pinId}/is-favorited`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const getMyFavoritePins = async (token: string, skip: number = 0, limit: number = 100): Promise<Pin[]> => {
  return apiClient.get('/api/v1/pins/favorites/my-favorites', {
    params: { skip, limit },
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const getMyFavoritePinsCount = async (token: string): Promise<{ count: number }> => {
  return apiClient.get('/api/v1/pins/favorites/count', {
    headers: { Authorization: `Bearer ${token}` }
  });
};
