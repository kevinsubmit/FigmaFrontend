import apiClient from '../lib/api';

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
    const response = await apiClient.get<PointsBalance>('/points/balance');
    return response.data;
  }

  /**
   * Get user's point transaction history
   */
  async getTransactions(token: string, skip: number = 0, limit: number = 50): Promise<PointTransaction[]> {
    const response = await apiClient.get<PointTransaction[]>(
      '/points/transactions',
      { params: { skip, limit } }
    );
    return response.data;
  }

  /**
   * Test: Award points (for testing only)
   */
  async testAwardPoints(token: string, amount: number): Promise<any> {
    const response = await apiClient.post(
      '/points/test-award',
      null,
      { params: { amount } }
    );
    return response.data;
  }
}

export default new PointsService();
