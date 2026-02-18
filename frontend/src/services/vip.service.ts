import apiClient from '../lib/api';

export interface VipLevelItem {
  level: number;
  min_spend: number;
  min_visits: number;
  benefit: string;
}

export interface VipProgress {
  current: number;
  required: number;
  percent: number;
}

export interface VipStatus {
  current_level: VipLevelItem;
  total_spend: number;
  total_visits: number;
  spend_progress: VipProgress;
  visits_progress: VipProgress;
  next_level?: VipLevelItem | null;
}

class VipService {
  async getLevels(): Promise<VipLevelItem[]> {
    const response = await apiClient.get<VipLevelItem[]>('/vip/levels');
    return response.data;
  }

  async getStatus(): Promise<VipStatus> {
    const response = await apiClient.get<VipStatus>('/vip/status');
    return response.data;
  }
}

export default new VipService();
