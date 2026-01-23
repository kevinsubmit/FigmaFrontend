import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1`;

export interface PointsBalance {
  user_id: number;
  total_points: number;
  available_points: number;
}

export interface PointTransaction {
  id: number;
  amount: number;
  type: string;
  reason: string;
  description?: string;
  reference_type?: string;
  reference_id?: number;
  created_at: string;
}

class PointsService {
  /**
   * Get user's points balance
   */
  async getBalance(token: string): Promise<PointsBalance> {
    const response = await axios.get(`${API_BASE_URL}/points/balance`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  /**
   * Get user's point transaction history
   */
  async getTransactions(token: string, skip: number = 0, limit: number = 50): Promise<PointTransaction[]> {
    const response = await axios.get(`${API_BASE_URL}/points/transactions`, {
      params: { skip, limit },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  /**
   * Test: Award points (for testing only)
   */
  async testAwardPoints(token: string, amount: number): Promise<any> {
    const response = await axios.post(
      `${API_BASE_URL}/points/test-award`,
      null,
      {
        params: { amount },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }
}

export default new PointsService();
