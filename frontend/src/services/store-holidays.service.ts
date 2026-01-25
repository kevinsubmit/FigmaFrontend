/**
 * Store Holidays Service
 * Handles API calls for store holidays
 */

import apiClient from '../lib/api';

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
    const response = await apiClient.get<StoreHoliday[]>(
      `/stores/holidays/${storeId}`,
      { params: { start_date: startDate, end_date: endDate } }
    );
    return response.data;
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
    const response = await apiClient.get<{ is_holiday: boolean; date: string }>(
      `/stores/holidays/${storeId}/check/${checkDate}`
    );
    return response.data;
  } catch (error) {
    console.error('Error checking holiday:', error);
    throw error;
  }
}
