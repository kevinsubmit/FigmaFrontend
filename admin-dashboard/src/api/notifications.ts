import { api } from './client';

export interface AdminTestPushPayload {
  title?: string;
  message?: string;
  user_id?: number;
}

export interface AdminTestPushResponse {
  detail: string;
  target_user_id: number;
  sent: number;
  failed: number;
  deactivated: number;
}

export const sendAdminTestPush = async (payload: AdminTestPushPayload = {}) => {
  const response = await api.post('/notifications/admin/test-push', payload);
  return response.data as AdminTestPushResponse;
};

export interface AdminPushPayload {
  user_id: number;
  title: string;
  message: string;
  custom_data?: Record<string, any>;
}

export interface AdminPushResponse {
  detail: string;
  target_user_id: number;
  sent: number;
  failed: number;
  deactivated: number;
}

export interface AdminPushBatchPayload {
  user_ids?: number[];
  store_id?: number;
  title: string;
  message: string;
  max_users?: number;
  custom_data?: Record<string, any>;
}

export interface AdminPushBatchResponse {
  detail: string;
  target_user_count: number;
  sent_user_count: number;
  failed_user_count: number;
  skipped_user_count: number;
  sent: number;
  failed: number;
  deactivated: number;
  truncated: boolean;
}

export const sendAdminPush = async (payload: AdminPushPayload) => {
  const response = await api.post('/notifications/admin/send', payload);
  return response.data as AdminPushResponse;
};

export const sendAdminPushBatch = async (payload: AdminPushBatchPayload) => {
  const response = await api.post('/notifications/admin/send-batch', payload);
  return response.data as AdminPushBatchResponse;
};
