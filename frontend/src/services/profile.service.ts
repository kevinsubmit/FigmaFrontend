import apiClient from '../lib/api';
import type { VipStatus } from './vip.service';

export interface ProfileSummary {
  unread_count: number;
  points: number;
  favorite_count: number;
  completed_orders: number;
  vip_status: VipStatus;
  coupon_count: number;
  gift_balance: number;
  review_count: number;
}

class ProfileService {
  async getSummary(token: string): Promise<ProfileSummary> {
    const response = await apiClient.get<ProfileSummary>('/profile/summary');
    return response.data;
  }
}

export default new ProfileService();
