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
