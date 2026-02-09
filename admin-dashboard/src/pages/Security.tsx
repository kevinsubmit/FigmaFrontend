import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import {
  createSecurityIPRule,
  getSecurityBlockLogs,
  getSecurityIPRules,
  getSecuritySummary,
  quickBlockSecurityTarget,
  SecurityBlockLog,
  SecurityIPRule,
  SecuritySummary,
  updateSecurityIPRule,
} from '../api/security';

type RuleForm = {
  rule_type: 'allow' | 'deny';
  target_type: 'ip' | 'cidr';
  target_value: string;
  scope: 'admin_api' | 'admin_login' | 'all';
  status: 'active' | 'inactive';
  priority: number;
  reason: string;
  expires_at: string;
};

const defaultRuleForm: RuleForm = {
  rule_type: 'deny',
  target_type: 'ip',
  target_value: '',
  scope: 'admin_api',
  status: 'active',
  priority: 100,
  reason: '',
  expires_at: '',
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const Security: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [rules, setRules] = useState<SecurityIPRule[]>([]);
  const [logs, setLogs] = useState<SecurityBlockLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [ruleForm, setRuleForm] = useState<RuleForm>(defaultRuleForm);
  const [savingRule, setSavingRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [quickBlockValue, setQuickBlockValue] = useState('');
  const [logSkip, setLogSkip] = useState(0);
  const [logLimit, setLogLimit] = useState(20);
  const [logPageInput, setLogPageInput] = useState('1');
  const [logFilters, setLogFilters] = useState({
    ip_address: '',
    block_reason: 'all',
    scope: 'all',
    path_keyword: '',
  });

  const loadBlockLogs = async (
    nextSkip = logSkip,
    nextLimit = logLimit,
    nextFilters = logFilters,
  ) => {
    setLogsLoading(true);
    try {
      const response = await getSecurityBlockLogs({
        skip: nextSkip,
        limit: nextLimit,
        ip_address: nextFilters.ip_address.trim() || undefined,
        block_reason: nextFilters.block_reason === 'all' ? undefined : nextFilters.block_reason,
        scope: nextFilters.scope === 'all' ? undefined : nextFilters.scope,
        path_keyword: nextFilters.path_keyword.trim() || undefined,
      });
      setLogs(Array.isArray(response.items) ? response.items : []);
      setLogsTotal(response.total);
      const currentPage = Math.floor(nextSkip / nextLimit) + 1;
      setLogPageInput(String(currentPage));
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load block logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [nextSummary, nextRules] = await Promise.all([
        getSecuritySummary(),
        getSecurityIPRules({ limit: 200 }),
      ]);
      setSummary(nextSummary);
      setRules(nextRules);
      await loadBlockLogs(0, logLimit);
      setLogSkip(0);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveRule = async () => {
    if (!ruleForm.target_value.trim()) {
      toast.error('Target value is required');
      return;
    }
    setSavingRule(true);
    try {
      const payload = {
        ...ruleForm,
        target_value: ruleForm.target_value.trim(),
        expires_at: ruleForm.expires_at || undefined,
        reason: ruleForm.reason.trim() || undefined,
      };
      if (editingRuleId) {
        await updateSecurityIPRule(editingRuleId, payload);
      } else {
        await createSecurityIPRule(payload);
      }
      setRuleForm(defaultRuleForm);
      setEditingRuleId(null);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save rule');
    } finally {
      setSavingRule(false);
    }
  };

  const editRule = (rule: SecurityIPRule) => {
    setEditingRuleId(rule.id);
    setRuleForm({
      rule_type: rule.rule_type,
      target_type: rule.target_type,
      target_value: rule.target_value,
      scope: rule.scope,
      status: rule.status,
      priority: rule.priority,
      reason: rule.reason || '',
      expires_at: rule.expires_at ? rule.expires_at.slice(0, 16) : '',
    });
  };

  const toggleRule = async (rule: SecurityIPRule) => {
    try {
      await updateSecurityIPRule(rule.id, {
        ...rule,
        status: rule.status === 'active' ? 'inactive' : 'active',
        reason: rule.reason || undefined,
        expires_at: rule.expires_at || undefined,
      });
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update rule status');
    }
  };

  const quickBlock = async () => {
    if (!quickBlockValue.trim()) {
      toast.error('IP/CIDR is required');
      return;
    }
    try {
      await quickBlockSecurityTarget({
        target_type: quickBlockValue.includes('/') ? 'cidr' : 'ip',
        target_value: quickBlockValue.trim(),
        scope: 'admin_api',
        duration_hours: 24,
        reason: 'Quick block from security console',
      });
      setQuickBlockValue('');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Quick block failed');
    }
  };

  return (
    <AdminLayout>
      <TopBar title="Security" subtitle="IP access policy, block logs and quick control" />
      <div className="px-4 py-5 space-y-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="card-surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Today Blocks</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary?.today_block_count ?? 0}</p>
          </div>
          <div className="card-surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Last 24h Blocks</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary?.last_24h_block_count ?? 0}</p>
          </div>
          <div className="card-surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active Deny Rules</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary?.active_deny_rule_count ?? 0}</p>
          </div>
          <div className="card-surface p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active Allow Rules</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary?.active_allow_rule_count ?? 0}</p>
          </div>
        </div>

        <div className="card-surface p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900">Quick Block</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]">
            <input
              value={quickBlockValue}
              onChange={(event) => setQuickBlockValue(event.target.value)}
              placeholder="IP or CIDR, e.g. 1.2.3.4 or 1.2.3.0/24"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 placeholder:text-slate-500 outline-none focus:border-gold-500"
            />
            <button onClick={quickBlock} className="rounded-xl border border-rose-500/40 px-4 py-2.5 text-sm text-slate-900">
              Block 24h
            </button>
            <button onClick={loadData} className="rounded-xl border border-blue-200 px-4 py-2.5 text-sm text-slate-900">
              Refresh
            </button>
          </div>
        </div>

        <div className="card-surface p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900">{editingRuleId ? 'Edit Rule' : 'Create Rule'}</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <select
              value={ruleForm.rule_type}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, rule_type: event.target.value as RuleForm['rule_type'] }))}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
            >
              <option value="deny">Deny</option>
              <option value="allow">Allow</option>
            </select>
            <select
              value={ruleForm.target_type}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, target_type: event.target.value as RuleForm['target_type'] }))}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
            >
              <option value="ip">IP</option>
              <option value="cidr">CIDR</option>
            </select>
            <select
              value={ruleForm.scope}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, scope: event.target.value as RuleForm['scope'] }))}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
            >
              <option value="admin_api">Admin API</option>
              <option value="admin_login">Admin Login</option>
              <option value="all">All</option>
            </select>
            <select
              value={ruleForm.status}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, status: event.target.value as RuleForm['status'] }))}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <input
              value={ruleForm.target_value}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, target_value: event.target.value }))}
              placeholder="Target value"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
            />
            <input
              type="number"
              value={ruleForm.priority}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, priority: Number(event.target.value) || 100 }))}
              placeholder="Priority"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
            />
            <input
              type="datetime-local"
              value={ruleForm.expires_at}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, expires_at: event.target.value }))}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
            />
            <input
              value={ruleForm.reason}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="Reason"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveRule}
              disabled={savingRule}
              className="rounded-xl border border-gold-500/60 px-4 py-2 text-sm text-slate-900 disabled:opacity-50"
            >
              {savingRule ? 'Saving...' : editingRuleId ? 'Update Rule' : 'Create Rule'}
            </button>
            <button
              onClick={() => {
                setEditingRuleId(null);
                setRuleForm(defaultRuleForm);
              }}
              className="rounded-xl border border-blue-200 px-4 py-2 text-sm text-slate-900"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="card-surface p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900">IP Rules</p>
          {loading ? (
            <div className="text-sm text-slate-600">Loading...</div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="rounded-xl border border-blue-100 p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-slate-900">
                    <p className="font-semibold">
                      [{rule.rule_type.toUpperCase()}] {rule.target_value}
                    </p>
                    <p className="text-xs text-slate-600">
                      scope={rule.scope} | status={rule.status} | priority={rule.priority} | expires={formatDateTime(rule.expires_at)}
                    </p>
                    <p className="text-xs text-slate-600">{rule.reason || '-'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editRule(rule)} className="rounded border border-blue-200 px-2 py-1 text-xs text-slate-900">
                      Edit
                    </button>
                    <button onClick={() => toggleRule(rule)} className="rounded border border-blue-200 px-2 py-1 text-xs text-slate-900">
                      {rule.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))}
              {!rules.length && <div className="text-sm text-slate-500">No rules found.</div>}
            </div>
          )}
        </div>

        <div className="card-surface p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900">Block Logs</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            <input
              value={logFilters.ip_address}
              onChange={(event) => setLogFilters((prev) => ({ ...prev, ip_address: event.target.value }))}
              placeholder="Filter by IP"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm !text-slate-900"
            />
            <input
              value={logFilters.path_keyword}
              onChange={(event) => setLogFilters((prev) => ({ ...prev, path_keyword: event.target.value }))}
              placeholder="Filter by path"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm !text-slate-900"
            />
            <select
              value={logFilters.block_reason}
              onChange={(event) => setLogFilters((prev) => ({ ...prev, block_reason: event.target.value }))}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm !text-slate-900"
            >
              <option value="all">All Reasons</option>
              <option value="ip_deny">ip_deny</option>
              <option value="rate_limit">rate_limit</option>
              <option value="auth_fail_limit">auth_fail_limit</option>
            </select>
            <select
              value={logFilters.scope}
              onChange={(event) => setLogFilters((prev) => ({ ...prev, scope: event.target.value }))}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm !text-slate-900"
            >
              <option value="all">All Scopes</option>
              <option value="admin_api">admin_api</option>
              <option value="admin_login">admin_login</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setLogSkip(0);
                  await loadBlockLogs(0, logLimit);
                }}
                className="rounded-xl border border-blue-200 px-3 py-2 text-sm text-slate-900"
              >
                Search
              </button>
              <button
                onClick={async () => {
                  const resetFilters = { ip_address: '', block_reason: 'all', scope: 'all', path_keyword: '' };
                  setLogFilters(resetFilters);
                  setLogSkip(0);
                  setLogPageInput('1');
                  await loadBlockLogs(0, logLimit, resetFilters);
                }}
                className="rounded-xl border border-blue-200 px-3 py-2 text-sm text-slate-900"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-auto pr-1">
            {logsLoading ? (
              <div className="text-sm text-slate-600">Loading logs...</div>
            ) : (
              <>
                {(logs || []).map((log) => (
                  <div key={log.id} className="rounded-xl border border-blue-100 p-3">
                    <p className="text-sm font-medium text-slate-900">
                      {log.ip_address} · {log.method} {log.path}
                    </p>
                    <p className="text-xs text-slate-600">
                      reason={log.block_reason} | scope={log.scope} | rule={log.matched_rule_id || '-'} | at={formatDateTime(log.created_at)}
                    </p>
                  </div>
                ))}
                {!logs.length && <div className="text-sm text-slate-500">No block logs.</div>}
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-slate-600">
              Total {logsTotal} · {logsTotal ? `${logSkip + 1}-${Math.min(logSkip + logLimit, logsTotal)}` : '0-0'}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={logLimit}
                onChange={async (event) => {
                  const nextLimit = Number(event.target.value) || 20;
                  setLogLimit(nextLimit);
                  setLogSkip(0);
                  await loadBlockLogs(0, nextLimit);
                }}
                className="rounded-lg border border-blue-200 bg-white px-2 py-1 text-xs text-slate-900"
              >
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              <button
                disabled={logSkip <= 0 || logsLoading}
                onClick={async () => {
                  const nextSkip = Math.max(0, logSkip - logLimit);
                  setLogSkip(nextSkip);
                  await loadBlockLogs(nextSkip, logLimit);
                }}
                className="rounded-lg border border-blue-200 px-2 py-1 text-xs text-slate-900 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={logSkip + logLimit >= logsTotal || logsLoading}
                onClick={async () => {
                  const nextSkip = logSkip + logLimit;
                  setLogSkip(nextSkip);
                  await loadBlockLogs(nextSkip, logLimit);
                }}
                className="rounded-lg border border-blue-200 px-2 py-1 text-xs text-slate-900 disabled:opacity-40"
              >
                Next
              </button>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-600">Page</span>
                <input
                  value={logPageInput}
                  onChange={(event) => setLogPageInput(event.target.value)}
                  onKeyDown={async (event) => {
                    if (event.key !== 'Enter') return;
                    const totalPages = Math.max(1, Math.ceil(logsTotal / logLimit));
                    const parsed = Number(logPageInput);
                    if (!Number.isFinite(parsed)) return;
                    const targetPage = Math.min(totalPages, Math.max(1, Math.floor(parsed)));
                    const nextSkip = (targetPage - 1) * logLimit;
                    setLogSkip(nextSkip);
                    await loadBlockLogs(nextSkip, logLimit);
                  }}
                  className="w-14 rounded-lg border border-blue-200 bg-white px-2 py-1 text-xs text-slate-900"
                />
                <span className="text-xs text-slate-600">/ {Math.max(1, Math.ceil(logsTotal / logLimit))}</span>
                <button
                  onClick={async () => {
                    const totalPages = Math.max(1, Math.ceil(logsTotal / logLimit));
                    const parsed = Number(logPageInput);
                    if (!Number.isFinite(parsed)) {
                      toast.error('Invalid page number');
                      return;
                    }
                    const targetPage = Math.min(totalPages, Math.max(1, Math.floor(parsed)));
                    const nextSkip = (targetPage - 1) * logLimit;
                    setLogSkip(nextSkip);
                    await loadBlockLogs(nextSkip, logLimit);
                  }}
                  disabled={logsLoading}
                  className="rounded-lg border border-blue-200 px-2 py-1 text-xs text-slate-900 disabled:opacity-40"
                >
                  Go
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Security;
