import apiClient from '../lib/api';

export interface Review {
  id: number;
  user_id: number;
  store_id: number;
  appointment_id: number;
  rating: number;
  comment: string | null;
  images?: string[];  // 评价图片URL列表
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_avatar?: string | null;
  user_avatar_updated_at?: string | null;
  reply?: ReviewReply | null;  // 管理员回复
}

export interface ReviewReply {
  id: number;
  content: string;
  admin_name: string | null;
  created_at: string;
  updated_at: string;
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
  images?: string[];  // 评价图片URL列表
}

// 创建评价
export const createReview = async (data: CreateReviewData, token: string): Promise<Review> => {
  const response = await apiClient.post<Review>('/reviews/', data);
  return response.data;
};

// 获取店铺评价列表
export const getStoreReviews = async (
  storeId: number,
  skip: number = 0,
  limit: number = 20
): Promise<Review[]> => {
  const response = await apiClient.get<Review[]>(
    `/reviews/stores/${storeId}`,
    { params: { skip, limit } }
  );
  return response.data;
};

// 获取店铺评分统计
export const getStoreRating = async (storeId: number): Promise<StoreRating> => {
  const response = await apiClient.get<StoreRating>(`/reviews/stores/${storeId}/rating`);
  return response.data;
};

// 获取当前用户的评价列表
export const getMyReviews = async (
  token: string,
  skip: number = 0,
  limit: number = 20
): Promise<Review[]> => {
  const response = await apiClient.get<Review[]>(
    '/reviews/my-reviews',
    { params: { skip, limit } }
  );
  return response.data;
};

// 更新评价
export const updateReview = async (
  reviewId: number,
  data: CreateReviewData,
  token: string
): Promise<Review> => {
  const response = await apiClient.put<Review>(`/reviews/${reviewId}`, data);
  return response.data;
};

// 删除评价
export const deleteReview = async (reviewId: number, token: string): Promise<void> => {
  await apiClient.delete(`/reviews/${reviewId}`);
};

// 上传图片
export const uploadImages = async (files: File[], token: string): Promise<string[]> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await apiClient.post<string[]>('/upload/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
