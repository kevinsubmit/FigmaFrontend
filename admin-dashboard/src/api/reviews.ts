import { api } from './client';

export interface ReviewReply {
  id: number;
  content: string;
  admin_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminReviewItem {
  id: number;
  user_id: number;
  store_id: number;
  appointment_id: number;
  rating: number;
  comment?: string | null;
  images?: string[] | null;
  created_at: string;
  updated_at: string;
  user_name?: string | null;
  user_avatar?: string | null;
  store_name?: string | null;
  order_number?: string | null;
  has_reply: boolean;
  reply?: ReviewReply | null;
}

export interface AdminReviewList {
  total: number;
  skip: number;
  limit: number;
  items: AdminReviewItem[];
}

export const getAdminReviews = async (params?: {
  skip?: number;
  limit?: number;
  store_id?: number;
  replied?: boolean;
  rating?: number;
  keyword?: string;
}) => {
  const response = await api.get('/reviews/admin', { params });
  return response.data as AdminReviewList;
};

export const createReviewReply = async (payload: { review_id: number; content: string }) => {
  const response = await api.post('/review-replies', payload);
  return response.data as ReviewReply;
};

export const updateReviewReply = async (replyId: number, payload: { content: string }) => {
  const response = await api.put(`/review-replies/${replyId}`, payload);
  return response.data as ReviewReply;
};

export const deleteReviewReply = async (replyId: number) => {
  await api.delete(`/review-replies/${replyId}`);
};
