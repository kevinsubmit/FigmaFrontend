import apiClient from '../lib/api';

export interface ReferralCode {
  referral_code: string;
}

export interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  total_rewards_earned: number;
}

export interface ReferralListItem {
  id: number;
  referee_name: string;
  referee_phone: string;
  status: string;
  created_at: string;
  rewarded_at: string | null;
  referrer_reward_given: boolean;
}

class ReferralService {
  async getMyReferralCode(): Promise<ReferralCode> {
    const response = await apiClient.get<ReferralCode>('/referrals/my-code');
    return response.data;
  }

  async getReferralStats(): Promise<ReferralStats> {
    const response = await apiClient.get<ReferralStats>('/referrals/stats');
    return response.data;
  }

  async getReferralList(skip: number = 0, limit: number = 100): Promise<ReferralListItem[]> {
    const response = await apiClient.get<ReferralListItem[]>(
      '/referrals/list',
      { params: { skip, limit } }
    );
    return response.data;
  }
}

export default new ReferralService();
