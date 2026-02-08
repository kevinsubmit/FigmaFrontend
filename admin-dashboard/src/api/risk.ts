import { api } from './client';

export interface RiskUserItem {
  user_id: number;
  username: string;
  phone: string;
  full_name?: string | null;
  risk_level: 'normal' | 'medium' | 'high' | string;
  restricted_until?: string | null;
  cancel_7d: number;
  no_show_30d: number;
  manual_note?: string | null;
}

export const getRiskUsers = async (params?: Record<string, any>) => {
  const response = await api.get('/risk/users', { params });
  return response.data as RiskUserItem[];
};

export const updateRiskUser = async (
  userId: number,
  payload: { action: string; risk_level?: string; note?: string; hours?: number },
) => {
  const response = await api.patch(`/risk/users/${userId}`, payload);
  return response.data as RiskUserItem;
};
