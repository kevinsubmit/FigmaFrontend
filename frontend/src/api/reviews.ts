import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface Review {
  id: number;
  user_id: number;
  store_id: number;
  appointment_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_avatar?: string;
}

export interface StoreRating {
  store_id: number;
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    [key: number]: number;
  };
}

export interface CreateReviewData {
  appointment_id: number;
  rating: number;
  comment?: string;
}

// 创建评价
export const createReview = async (data: CreateReviewData, token: string): Promise<Review> => {
  const response = await axios.post(`${API_BASE_URL}/reviews/`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

// 获取店铺评价列表
export const getStoreReviews = async (
  storeId: number,
  skip: number = 0,
  limit: number = 20
): Promise<Review[]> => {
  const response = await axios.get(`${API_BASE_URL}/reviews/stores/${storeId}`, {
    params: { skip, limit },
  });
  return response.data;
};

// 获取店铺评分统计
export const getStoreRating = async (storeId: number): Promise<StoreRating> => {
  const response = await axios.get(`${API_BASE_URL}/reviews/stores/${storeId}/rating`);
  return response.data;
};

// 获取当前用户的评价列表
export const getMyReviews = async (
  token: string,
  skip: number = 0,
  limit: number = 20
): Promise<Review[]> => {
  const response = await axios.get(`${API_BASE_URL}/reviews/my-reviews`, {
    params: { skip, limit },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

// 更新评价
export const updateReview = async (
  reviewId: number,
  data: CreateReviewData,
  token: string
): Promise<Review> => {
  const response = await axios.put(`${API_BASE_URL}/reviews/${reviewId}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

// 删除评价
export const deleteReview = async (reviewId: number, token: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/reviews/${reviewId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
