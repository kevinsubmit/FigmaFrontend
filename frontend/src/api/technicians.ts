import { apiClient } from './client';

export interface Technician {
  id: number;
  store_id: number;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  rating: number | null;
  specialties: string | null;
  created_at: string;
}

export interface AvailableSlot {
  start_time: string; // HH:MM
  end_time: string; // HH:MM
}

/**
 * 获取店铺的美甲师列表
 */
export const getTechniciansByStore = async (storeId: number): Promise<Technician[]> => {
  return apiClient.get(`/api/v1/technicians?store_id=${storeId}`);
};

/**
 * 获取美甲师详情
 */
export const getTechnicianById = async (technicianId: number): Promise<Technician> => {
  return apiClient.get(`/api/v1/technicians/${technicianId}`);
};

/**
 * 获取美甲师的可用时间段
 */
export const getAvailableSlots = async (
  technicianId: number,
  date: string, // YYYY-MM-DD
  serviceId: number
): Promise<AvailableSlot[]> => {
  return apiClient.get(
    `/api/v1/technicians/${technicianId}/available-slots?date=${date}&service_id=${serviceId}`
  );
};
