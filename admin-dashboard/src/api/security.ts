import { api } from './client';

export interface SecurityIPRule {
  id: number;
  rule_type: 'allow' | 'deny';
  target_type: 'ip' | 'cidr';
  target_value: string;
  scope: 'admin_api' | 'admin_login' | 'all';
  status: 'active' | 'inactive';
  priority: number;
  reason?: string | null;
  expires_at?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SecurityBlockLog {
  id: number;
  ip_address: string;
  path: string;
  method: string;
  scope: string;
  matched_rule_id?: number | null;
  block_reason: string;
  user_id?: number | null;
  user_agent?: string | null;
  meta_json?: string | null;
  created_at: string;
}

export interface SecurityBlockLogListResponse {
  total: number;
  skip: number;
  limit: number;
  items: SecurityBlockLog[];
}

export interface SecuritySummary {
  today_block_count: number;
  last_24h_block_count: number;
  active_deny_rule_count: number;
  active_allow_rule_count: number;
  top_blocked_ips: { ip: string; count: number }[];
  top_blocked_paths: { path: string; count: number }[];
}

export const getSecuritySummary = async () => {
  const response = await api.get('/security/summary');
  return response.data as SecuritySummary;
};

export const getSecurityIPRules = async (params?: Record<string, any>) => {
  const response = await api.get('/security/ip-rules', { params });
  return response.data as SecurityIPRule[];
};

export const createSecurityIPRule = async (payload: Omit<SecurityIPRule, 'id' | 'created_at' | 'updated_at'>) => {
  const response = await api.post('/security/ip-rules', payload);
  return response.data as SecurityIPRule;
};

export const updateSecurityIPRule = async (
  id: number,
  payload: Omit<SecurityIPRule, 'id' | 'created_at' | 'updated_at'>,
) => {
  const response = await api.patch(`/security/ip-rules/${id}`, payload);
  return response.data as SecurityIPRule;
};

export const getSecurityBlockLogs = async (params?: Record<string, any>) => {
  const response = await api.get('/security/block-logs', { params });
  const payload = response.data as any;
  if (Array.isArray(payload)) {
    return {
      total: payload.length,
      skip: Number(params?.skip ?? 0),
      limit: Number((params?.limit ?? payload.length) || 20),
      items: payload as SecurityBlockLog[],
    } as SecurityBlockLogListResponse;
  }
  return {
    total: Number(payload?.total ?? 0),
    skip: Number(payload?.skip ?? Number(params?.skip ?? 0)),
    limit: Number(payload?.limit ?? Number(params?.limit ?? 20)),
    items: Array.isArray(payload?.items) ? (payload.items as SecurityBlockLog[]) : [],
  } as SecurityBlockLogListResponse;
};

export const quickBlockSecurityTarget = async (payload: {
  target_type: 'ip' | 'cidr';
  target_value: string;
  scope: 'admin_api' | 'admin_login' | 'all';
  duration_hours?: number;
  reason?: string;
}) => {
  const response = await api.post('/security/quick-block', payload);
  return response.data as SecurityIPRule;
};
