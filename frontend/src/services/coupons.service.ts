import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface Coupon {
  id: number;
  name: string;
  description?: string;
  type: string; // "fixed_amount" or "percentage"
  category: string; // "normal", "newcomer", "birthday", "referral", "activity"
  discount_value: number;
  min_amount: number;
  max_discount?: number;
  valid_days: number;
  is_active: boolean;
  total_quantity?: number;
  claimed_quantity: number;
  points_required?: number;
  created_at: string;
}

export interface UserCoupon {
  id: number;
  coupon_id: number;
  status: string; // "available", "used", "expired"
  source?: string;
  obtained_at: string;
  expires_at: string;
  used_at?: string;
  coupon: Coupon;
}

class CouponsService {
  /**
   * Get all available coupons
   */
  async getAvailableCoupons(skip: number = 0, limit: number = 50): Promise<Coupon[]> {
    const response = await axios.get(`${API_BASE_URL}/coupons/available`, {
      params: { skip, limit },
    });
    return response.data;
  }

  /**
   * Get coupons that can be exchanged with points
   */
  async getExchangeableCoupons(token: string): Promise<Coupon[]> {
    const response = await axios.get(`${API_BASE_URL}/coupons/exchangeable`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  /**
   * Get user's coupons
   */
  async getMyCoupons(
    token: string,
    status?: string,
    skip: number = 0,
    limit: number = 50
  ): Promise<UserCoupon[]> {
    const params: any = { skip, limit };
    if (status) {
      params.status = status;
    }

    const response = await axios.get(`${API_BASE_URL}/coupons/my-coupons`, {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  /**
   * Claim a coupon
   */
  async claimCoupon(token: string, couponId: number, source: string = 'system'): Promise<UserCoupon> {
    const response = await axios.post(
      `${API_BASE_URL}/coupons/claim`,
      { coupon_id: couponId, source },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }

  /**
   * Exchange points for coupon
   */
  async exchangeCoupon(token: string, couponId: number): Promise<UserCoupon> {
    const response = await axios.post(
      `${API_BASE_URL}/coupons/exchange/${couponId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }

  /**
   * Get coupon details
   */
  async getCouponDetails(couponId: number): Promise<Coupon> {
    const response = await axios.get(`${API_BASE_URL}/coupons/${couponId}`);
    return response.data;
  }
}

export default new CouponsService();
