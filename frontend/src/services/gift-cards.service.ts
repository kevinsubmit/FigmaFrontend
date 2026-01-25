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
  purchaser_id: number;
  card_number: string;
  balance: number;
  initial_balance: number;
  status: 'active' | 'expired' | 'used' | 'pending_transfer' | 'revoked';
  expires_at: string | null;
  claim_expires_at?: string | null;
  recipient_phone?: string | null;
  recipient_message?: string | null;
  claimed_by_user_id?: number | null;
  claimed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GiftCardPurchaseRequest {
  amount: number;
  recipient_phone?: string;
  message?: string;
}

export interface GiftCardPurchaseResponse {
  gift_card: GiftCard;
  sms_sent: boolean;
  claim_expires_at?: string | null;
  claim_code?: string | null;
}

export interface GiftCardTransferRequest {
  recipient_phone: string;
  message?: string;
}

export interface GiftCardClaimResponse {
  gift_card: GiftCard;
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

  async purchaseGiftCard(token: string, payload: GiftCardPurchaseRequest): Promise<GiftCardPurchaseResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/gift-cards/purchase`,
      payload,
      this.getAuthHeader(token)
    );
    return response.data;
  }

  async transferGiftCard(token: string, giftCardId: number, payload: GiftCardTransferRequest): Promise<GiftCardPurchaseResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/gift-cards/${giftCardId}/transfer`,
      payload,
      this.getAuthHeader(token)
    );
    return response.data;
  }

  async revokeGiftCard(token: string, giftCardId: number): Promise<{ gift_card: GiftCard }> {
    const response = await axios.post(
      `${API_BASE_URL}/gift-cards/${giftCardId}/revoke`,
      {},
      this.getAuthHeader(token)
    );
    return response.data;
  }

  async claimGiftCard(token: string, claimCode: string): Promise<GiftCardClaimResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/gift-cards/claim`,
      { claim_code: claimCode },
      this.getAuthHeader(token)
    );
    return response.data;
  }

  async getTransferStatus(token: string, giftCardId: number): Promise<{
    gift_card_id: number;
    status: string;
    recipient_phone?: string | null;
    claim_expires_at?: string | null;
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/gift-cards/${giftCardId}/transfer-status`,
      this.getAuthHeader(token)
    );
    return response.data;
  }
}

export default new GiftCardsService();
