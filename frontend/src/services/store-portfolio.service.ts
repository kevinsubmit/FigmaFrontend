/**
 * Store Portfolio Service
 * Handles API calls for store portfolio/works
 */
import { validateRequestPayload } from '../lib/requestValidation';
import apiClient from '../lib/api';

export interface PortfolioItem {
  id: number;
  store_id: number;
  image_url: string;
  title?: string;
  description?: string;
  display_order: number;
  created_at: string;
  updated_at?: string;
}

/**
 * Get portfolio items for a store
 */
export async function getStorePortfolio(
  storeId: number,
  skip: number = 0,
  limit: number = 50
): Promise<PortfolioItem[]> {
  const response = await apiClient.get(`/stores/portfolio/${storeId}`, {
    params: { skip, limit },
  });
  return response.data;
}

/**
 * Upload a portfolio image (requires authentication)
 */
export async function uploadPortfolioImage(
  storeId: number,
  file: File,
  title?: string,
  description?: string
): Promise<PortfolioItem> {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  if (description) formData.append('description', description);
  validateRequestPayload(formData, { context: 'Upload portfolio image' });

  const response = await apiClient.post(`/stores/portfolio/${storeId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * Delete a portfolio item (requires authentication)
 */
export async function deletePortfolioItem(portfolioId: number): Promise<void> {
  await apiClient.delete(`/stores/portfolio/${portfolioId}`);
}
