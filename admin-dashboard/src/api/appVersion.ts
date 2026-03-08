import { api } from './client';

export type AppPlatform = 'ios' | 'android' | 'h5';

export interface AppVersionPolicy {
  platform: AppPlatform;
  latest_version: string;
  latest_build: number | null;
  min_supported_version: string;
  min_supported_build: number | null;
  app_store_url: string | null;
  update_title: string | null;
  update_message: string | null;
  release_notes: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppVersionPolicyUpdatePayload {
  platform: AppPlatform;
  latest_version: string;
  latest_build: number | null;
  min_supported_version: string;
  min_supported_build: number | null;
  app_store_url: string | null;
  update_title: string | null;
  update_message: string | null;
  release_notes: string | null;
  is_enabled: boolean;
}

export const getAdminAppVersionPolicy = async (platform: AppPlatform) => {
  const response = await api.get('/app-version/admin/policy', { params: { platform } });
  return response.data as AppVersionPolicy;
};

export const getAdminAppVersionPolicies = async () => {
  const response = await api.get('/app-version/admin/policies');
  return (response.data || []) as AppVersionPolicy[];
};

export const updateAdminAppVersionPolicy = async (payload: AppVersionPolicyUpdatePayload) => {
  const response = await api.put('/app-version/admin/policy', payload);
  return response.data as AppVersionPolicy;
};
