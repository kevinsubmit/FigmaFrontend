/**
 * Store Holidays Service
 * Handles API calls for store holidays
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface StoreHoliday {
  id: number;
  store_id: number;
  holiday_date: string; // YYYY-MM-DD
  name: string;
  description?: string;
  created_at: string;
}

/**
 * Get holidays for a store
 */
export async function getStoreHolidays(
  storeId: number,
  startDate?: string,
  endDate?: string
): Promise<StoreHoliday[]> {
  try {
    let url = `${API_BASE_URL}/stores/holidays/${storeId}`;
    const params = new URLSearchParams();
    
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch holidays: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching store holidays:', error);
    throw error;
  }
}

/**
 * Check if a specific date is a holiday
 */
export async function checkHoliday(
  storeId: number,
  checkDate: string
): Promise<{ is_holiday: boolean; date: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/stores/holidays/${storeId}/check/${checkDate}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to check holiday: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking holiday:', error);
    throw error;
  }
}
