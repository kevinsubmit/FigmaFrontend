/**
 * Store Portfolio Service
 * Handles API calls for store portfolio/works
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';

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
  try {
    const response = await fetch(
      `${API_BASE_URL}/stores/portfolio/${storeId}?skip=${skip}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch portfolio: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching store portfolio:', error);
    throw error;
  }
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
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);
    
    const response = await fetch(
      `${API_BASE_URL}/stores/portfolio/${storeId}/upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading portfolio image:', error);
    throw error;
  }
}

/**
 * Delete a portfolio item (requires authentication)
 */
export async function deletePortfolioItem(portfolioId: number): Promise<void> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(
      `${API_BASE_URL}/stores/portfolio/${portfolioId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to delete portfolio item: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting portfolio item:', error);
    throw error;
  }
}
