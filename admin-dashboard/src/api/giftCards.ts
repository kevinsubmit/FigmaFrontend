import { api } from './client';

export interface GiftCard {
  id: number;
  card_number: string;
  balance: number;
  status: string;
  recipient_phone?: string | null;
  claim_expires_at?: string | null;
}

export const getGiftCards = async (params?: Record<string, any>) => {
  const response = await api.get('/gift-cards', { params });
  return response.data as GiftCard[];
};

export const revokeGiftCard = async (id: number) => {
  const response = await api.post(`/gift-cards/${id}/revoke`);
  return response.data;
};
