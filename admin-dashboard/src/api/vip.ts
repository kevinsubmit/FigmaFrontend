import { api } from './client';

export interface VipLevelItem {
  level: number;
  min_spend: number;
  min_visits: number;
  benefit: string;
  is_active: boolean;
}

export interface VipLevelsUpdatePayload {
  levels: VipLevelItem[];
}

export const getAdminVipLevels = async () => {
  const response = await api.get('/vip/admin/levels');
  return (response.data || []) as VipLevelItem[];
};

export const updateAdminVipLevels = async (payload: VipLevelsUpdatePayload) => {
  const response = await api.put('/vip/admin/levels', payload);
  return (response.data || []) as VipLevelItem[];
};
