import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

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
  private getAuthHeader() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  async getMyReferralCode(): Promise<ReferralCode> {
    const response = await axios.get(
      `${API_BASE_URL}/referrals/my-code`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async getReferralStats(): Promise<ReferralStats> {
    const response = await axios.get(
      `${API_BASE_URL}/referrals/stats`,
      this.getAuthHeader()
    );
    return response.data;
  }

  async getReferralList(skip: number = 0, limit: number = 100): Promise<ReferralListItem[]> {
    const response = await axios.get(
      `${API_BASE_URL}/referrals/list?skip=${skip}&limit=${limit}`,
      this.getAuthHeader()
    );
    return response.data;
  }
}

export default new ReferralService();
