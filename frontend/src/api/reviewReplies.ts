import apiClient from '../lib/api';

export interface ReviewReply {
  id: number;
  review_id: number;
  admin_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  admin_name?: string | null;
}

export interface CreateReplyData {
  review_id: number;
  content: string;
}

export interface UpdateReplyData {
  content: string;
}

// 创建回复
export const createReply = async (data: CreateReplyData, token: string): Promise<ReviewReply> => {
  const response = await apiClient.post<ReviewReply>('/review-replies/', data);
  return response.data;
};

// 更新回复
export const updateReply = async (replyId: number, data: UpdateReplyData, token: string): Promise<ReviewReply> => {
  const response = await apiClient.put<ReviewReply>(`/review-replies/${replyId}`, data);
  return response.data;
};

// 删除回复
export const deleteReply = async (replyId: number, token: string): Promise<void> => {
  await apiClient.delete(`/review-replies/${replyId}`);
};

// 获取评价的回复
export const getReviewReply = async (reviewId: number): Promise<ReviewReply> => {
  const response = await apiClient.get<ReviewReply>(`/review-replies/review/${reviewId}`);
  return response.data;
};
