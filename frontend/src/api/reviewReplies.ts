import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

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
  const response = await axios.post(`${API_BASE_URL}/review-replies/`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

// 更新回复
export const updateReply = async (replyId: number, data: UpdateReplyData, token: string): Promise<ReviewReply> => {
  const response = await axios.put(`${API_BASE_URL}/review-replies/${replyId}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

// 删除回复
export const deleteReply = async (replyId: number, token: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/review-replies/${replyId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

// 获取评价的回复
export const getReviewReply = async (reviewId: number): Promise<ReviewReply> => {
  const response = await axios.get(`${API_BASE_URL}/review-replies/review/${reviewId}`);
  return response.data;
};
