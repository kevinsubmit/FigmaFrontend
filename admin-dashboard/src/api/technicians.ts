import { api } from './client';

export interface Technician {
  id: number;
  store_id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  bio?: string | null;
  specialties?: string | null;
  years_of_experience?: number | null;
  hire_date?: string | null;
  avatar_url?: string | null;
  is_active: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TechnicianPayload {
  store_id: number;
  name: string;
  hire_date?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface TechnicianPerformanceSummary {
  technician_id: number;
  technician_name: string;
  store_id: number;
  today_order_count: number;
  today_amount: number;
  today_commission?: number;
  total_order_count: number;
  total_amount: number;
  total_commission?: number;
}

export interface TechnicianPerformanceItem {
  split_id: number;
  appointment_id: number;
  order_number?: string | null;
  appointment_date: string;
  appointment_time: string;
  service_name?: string | null;
  customer_name?: string | null;
  work_type?: string | null;
  amount: number;
  commission_amount?: number;
}

export interface TechnicianPerformanceDetail {
  technician_id: number;
  technician_name: string;
  store_id: number;
  date_from?: string | null;
  date_to?: string | null;
  period_order_count: number;
  period_amount: number;
  period_commission?: number;
  total_order_count: number;
  total_amount: number;
  total_commission?: number;
  items: TechnicianPerformanceItem[];
}

export const getTechnicians = async (params?: Record<string, any>) => {
  const response = await api.get('/technicians', { params });
  return response.data as Technician[];
};

export const createTechnician = async (payload: TechnicianPayload) => {
  const response = await api.post('/technicians', payload);
  return response.data as Technician;
};

export const updateTechnician = async (id: number, payload: Partial<TechnicianPayload>) => {
  const response = await api.patch(`/technicians/${id}`, payload);
  return response.data as Technician;
};

export const toggleTechnicianAvailability = async (id: number, isActive: 0 | 1) => {
  const response = await api.patch(`/technicians/${id}/availability`, null, {
    params: { is_active: isActive },
  });
  return response.data as Technician;
};

export const deleteTechnician = async (id: number) => {
  await api.delete(`/technicians/${id}`);
};

export const getTechnicianPerformanceSummary = async (params: { store_id?: number } = {}) => {
  try {
    const response = await api.get('/technicians/performance/summary', { params });
    return response.data as TechnicianPerformanceSummary[];
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

export const getTechnicianPerformanceDetail = async (
  technicianId: number,
  params: { date_from?: string; date_to?: string; skip?: number; limit?: number } = {},
) => {
  try {
    const response = await api.get(`/technicians/${technicianId}/performance`, { params });
    return response.data as TechnicianPerformanceDetail;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return {
        technician_id: technicianId,
        technician_name: '',
        store_id: 0,
        date_from: params.date_from || null,
        date_to: params.date_to || null,
        period_order_count: 0,
        period_amount: 0,
        period_commission: 0,
        total_order_count: 0,
        total_amount: 0,
        total_commission: 0,
        items: [],
      };
    }
    throw error;
  }
};
