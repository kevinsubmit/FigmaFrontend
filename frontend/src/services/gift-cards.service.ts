import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1`;

export interface GiftCardSummary {
  total_balance: number;
  active_count: number;
  total_count: number;
}

export interface GiftCard {
  id: number;
  user_id: number;
  card_number: string;
  balance: number;
  initial_balance: number;
  status: 'active' | 'expired' | 'used';
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

class GiftCardsService {
  private getAuthHeader(token: string) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  async getSummary(token: string): Promise<GiftCardSummary> {
    const response = await axios.get(
      `${API_BASE_URL}/gift-cards/summary`,
      this.getAuthHeader(token)
    );
    return response.data;
  }

  async getMyGiftCards(token: string, skip: number = 0, limit: number = 50): Promise<GiftCard[]> {
    const response = await axios.get(`${API_BASE_URL}/gift-cards/my-cards`, {
      params: { skip, limit },
      ...this.getAuthHeader(token),
    });
    return response.data;
  }
}

export default new GiftCardsService();
