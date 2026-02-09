import { api } from './client';

export interface SystemLogItem {
  id: number;
  log_type: string;
  level: string;
  module?: string | null;
  action?: string | null;
  message?: string | null;
  operator_user_id?: number | null;
  operator_phone?: string | null;
  store_id?: number | null;
  target_type?: string | null;
  target_id?: string | null;
  request_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  path?: string | null;
  method?: string | null;
  status_code?: number | null;
  latency_ms?: number | null;
  before_json?: string | null;
  after_json?: string | null;
  meta_json?: string | null;
  created_at: string;
}

export interface SystemLogListResponse {
  total: number;
  skip: number;
  limit: number;
  items: SystemLogItem[];
}

export interface SystemLogDetail extends SystemLogItem {
  before?: any;
  after?: any;
  meta?: any;
}

export interface SystemLogStats {
  today_total: number;
  today_error_count: number;
  today_security_count: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  top_modules: { module: string; count: number }[];
  top_actions: { action: string; count: number }[];
  top_error_paths: { path: string; count: number }[];
}

export const getSystemLogs = async (params?: Record<string, any>) => {
  const response = await api.get('/logs/admin', { params });
  return response.data as SystemLogListResponse;
};

export const getSystemLogDetail = async (id: number) => {
  const response = await api.get(`/logs/admin/${id}`);
  return response.data as SystemLogDetail;
};

export const getSystemLogStats = async () => {
  const response = await api.get('/logs/admin/stats');
  return response.data as SystemLogStats;
};
