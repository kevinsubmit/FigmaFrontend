import { api } from './client';

export interface PortfolioItem {
  id: number;
  store_id: number;
  image_url: string;
  title?: string | null;
  description?: string | null;
  display_order: number;
  created_at: string;
  updated_at?: string | null;
}

export const getStorePortfolio = async (storeId: number, params?: Record<string, any>) => {
  const response = await api.get(`/stores/portfolio/${storeId}`, { params });
  return response.data as PortfolioItem[];
};

export const uploadStorePortfolioImage = async (
  storeId: number,
  file: File,
  title?: string,
  description?: string
) => {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  if (description) formData.append('description', description);

  const response = await api.post(`/stores/portfolio/${storeId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data as PortfolioItem;
};

export const deleteStorePortfolioImage = async (portfolioId: number) => {
  await api.delete(`/stores/portfolio/${portfolioId}`);
};
