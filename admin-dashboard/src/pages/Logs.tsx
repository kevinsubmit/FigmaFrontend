import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { getSystemLogDetail, getSystemLogs, getSystemLogStats, SystemLogDetail, SystemLogItem, SystemLogStats } from '../api/logs';
import { formatApiDateTimeET } from '../utils/time';

const formatDateTime = (value?: string | null) => {
  return formatApiDateTimeET(value, true);
};

const toPretty = (value: any) => {
  if (value == null) return '-';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const Logs: React.FC = () => {
  const [stats, setStats] = useState<SystemLogStats | null>(null);
  const [rows, setRows] = useState<SystemLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<SystemLogDetail | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [logType, setLogType] = useState('all');
  const [level, setLevel] = useState('all');
  const [moduleName, setModuleName] = useState('all');
  const [operatorRole, setOperatorRole] = useState('all');
  const [operatorKeyword, setOperatorKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageInput, setPageInput] = useState('1');

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const loadStats = async () => {
    try {
      const nextStats = await getSystemLogStats();
      setStats(nextStats);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '加载日志统计失败');
    }
  };

  const loadRows = async (overrides?: {
    logType?: string;
    level?: string;
    moduleName?: string;
    operatorRole?: string;
    operatorKeyword?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) => {
    setLoading(true);
    try {
      const queryLogType = overrides?.logType ?? logType;
      const queryLevel = overrides?.level ?? level;
      const queryModule = overrides?.moduleName ?? moduleName;
      const queryOperatorRole = overrides?.operatorRole ?? operatorRole;
      const queryOperatorKeyword = overrides?.operatorKeyword ?? operatorKeyword;
      const queryDateFrom = overrides?.dateFrom ?? dateFrom;
      const queryDateTo = overrides?.dateTo ?? dateTo;
      const queryPage = overrides?.page ?? page;
      const queryPageSize = overrides?.pageSize ?? pageSize;

      const response = await getSystemLogs({
        log_type: queryLogType !== 'all' ? queryLogType : undefined,
        level: queryLevel !== 'all' ? queryLevel : undefined,
        module: queryModule !== 'all' ? queryModule : undefined,
        operator_role: queryOperatorRole !== 'all' ? queryOperatorRole : undefined,
        operator: queryOperatorKeyword.trim() || undefined,
        date_from: queryDateFrom ? `${queryDateFrom}T00:00:00` : undefined,
        date_to: queryDateTo ? `${queryDateTo}T23:59:59` : undefined,
        skip: (queryPage - 1) * queryPageSize,
        limit: queryPageSize,
      });
      setRows(response.items || []);
      setTotal(response.total || 0);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '加载日志列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: number) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const data = await getSystemLogDetail(id);
      setDetail(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '加载日志详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadRows();
  }, [page, pageSize]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  return (
    <AdminLayout>
      <TopBar title="日志管理" subtitle="访问日志、错误日志与审计日志查询" />
      <div className="px-4 py-5 space-y-4 lg:px-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <div className="card-surface p-4">
            <p className="text-xs tracking-[0.15em] uppercase text-slate-500">今日总量</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stats?.today_total ?? 0}</p>
          </div>
          <div className="card-surface p-4">
            <p className="text-xs tracking-[0.15em] uppercase text-slate-500">今日错误</p>
            <p className="mt-2 text-2xl font-semibold text-rose-600">{stats?.today_error_count ?? 0}</p>
          </div>
          <div className="card-surface p-4">
            <p className="text-xs tracking-[0.15em] uppercase text-slate-500">今日安全事件</p>
            <p className="mt-2 text-2xl font-semibold text-amber-600">{stats?.today_security_count ?? 0}</p>
          </div>
          <div className="card-surface p-4">
            <p className="text-xs tracking-[0.15em] uppercase text-slate-500">平均耗时</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stats?.avg_latency_ms ?? 0} ms</p>
          </div>
          <div className="card-surface p-4">
            <p className="text-xs tracking-[0.15em] uppercase text-slate-500">P95耗时</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{stats?.p95_latency_ms ?? 0} ms</p>
          </div>
        </div>

        <div className="card-surface p-4 grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-9">
          <select value={logType} onChange={(e) => setLogType(e.target.value)} className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900">
            <option value="all">日志类型：全部</option>
            <option value="access">访问日志</option>
            <option value="audit">审计日志</option>
            <option value="security">安全日志</option>
            <option value="business">业务日志</option>
            <option value="error">错误日志</option>
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900">
            <option value="all">级别：全部</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
            <option value="critical">critical</option>
          </select>
          <select value={moduleName} onChange={(e) => setModuleName(e.target.value)} className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900">
            <option value="all">模块：全部</option>
            <option value="appointments">appointments</option>
            <option value="security">security</option>
            <option value="services">services</option>
            <option value="stores">stores</option>
            <option value="customers">customers</option>
            <option value="pins">pins</option>
          </select>
          <select value={operatorRole} onChange={(e) => setOperatorRole(e.target.value)} className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900">
            <option value="all">操作者：全部</option>
            <option value="super_admin">超级管理员</option>
            <option value="store_admin">店铺管理员</option>
            <option value="normal_user">普通用户</option>
          </select>
          <input
            value={operatorKeyword}
            onChange={(e) => setOperatorKeyword(e.target.value)}
            placeholder="操作者（手机号/ID）"
            className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 placeholder:text-slate-500"
          />
          <input value={dateFrom} type="date" onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900" />
          <input value={dateTo} type="date" onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900" />
          <button
            onClick={() => {
              if (page !== 1) {
                setPage(1);
                return;
              }
              loadRows();
            }}
            className="rounded-xl border border-gold-500/50 px-3 py-2.5 text-sm text-slate-900"
          >
            查询
          </button>
          <button
            onClick={() => {
              const resetValues = {
                logType: 'all',
                level: 'all',
                moduleName: 'all',
                operatorRole: 'all',
                operatorKeyword: '',
                dateFrom: '',
                dateTo: '',
              };
              setLogType(resetValues.logType);
              setLevel(resetValues.level);
              setModuleName(resetValues.moduleName);
              setOperatorRole(resetValues.operatorRole);
              setOperatorKeyword(resetValues.operatorKeyword);
              setDateFrom(resetValues.dateFrom);
              setDateTo(resetValues.dateTo);
              setPage(1);
              loadRows({ ...resetValues, page: 1, pageSize });
            }}
            className="rounded-xl border border-blue-200 px-3 py-2.5 text-sm text-slate-900"
          >
            重置
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
          <div className="card-surface overflow-auto">
            {loading ? (
              <div className="p-5 text-sm text-slate-600">加载中...</div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-blue-50">
                  <tr className="text-xs uppercase tracking-[0.15em] text-slate-500 border-b border-blue-100">
                    <th className="px-3 py-2">时间</th>
                    <th className="px-3 py-2">类型</th>
                    <th className="px-3 py-2">级别</th>
                    <th className="px-3 py-2">模块</th>
                    <th className="px-3 py-2">动作</th>
                    <th className="px-3 py-2">状态</th>
                    <th className="px-3 py-2">耗时</th>
                    <th className="px-3 py-2">操作者</th>
                    <th className="px-3 py-2">请求ID</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => loadDetail(item.id)}
                      className={`cursor-pointer border-b border-blue-100 hover:bg-blue-50/50 ${
                        selectedId === item.id ? 'bg-blue-100/60' : ''
                      }`}
                    >
                      <td className="px-3 py-2 text-slate-700">{formatDateTime(item.created_at)}</td>
                      <td className="px-3 py-2 text-slate-800">{item.log_type}</td>
                      <td className="px-3 py-2 text-slate-800">{item.level}</td>
                      <td className="px-3 py-2 text-slate-700">{item.module || '-'}</td>
                      <td className="px-3 py-2 text-slate-700">{item.action || '-'}</td>
                      <td className="px-3 py-2 text-slate-700">{item.status_code ?? '-'}</td>
                      <td className="px-3 py-2 text-slate-700">{item.latency_ms ?? '-'} ms</td>
                      <td className="px-3 py-2 text-slate-700">
                        {item.operator_phone ? item.operator_phone : (item.operator_user_id ? `ID ${item.operator_user_id}` : '-')}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{item.request_id || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && rows.length === 0 && <div className="p-6 text-center text-sm text-slate-500">暂无日志数据</div>}
          </div>

          <div className="card-surface p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">日志详情</h3>
            {detailLoading ? (
              <div className="text-sm text-slate-600">加载详情中...</div>
            ) : detail ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-blue-100 p-3 text-sm text-slate-800 space-y-1">
                  <p>时间：{formatDateTime(detail.created_at)}</p>
                  <p>类型：{detail.log_type} / {detail.level}</p>
                  <p>模块：{detail.module || '-'}</p>
                  <p>动作：{detail.action || '-'}</p>
                  <p>消息：{detail.message || '-'}</p>
                  <p>
                    操作人：{detail.operator_phone ? `${detail.operator_phone}` : (detail.operator_user_id ? `ID ${detail.operator_user_id}` : '-')}
                  </p>
                  <p>目标：{detail.target_type || '-'} / {detail.target_id || '-'}</p>
                  <p>请求：{detail.method || '-'} {detail.path || '-'}</p>
                  <p>状态码：{detail.status_code ?? '-'}</p>
                  <p>耗时：{detail.latency_ms ?? '-'} ms</p>
                  <p>IP：{detail.ip_address || '-'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500 mb-1">变更前</p>
                  <pre className="rounded-xl border border-blue-100 bg-slate-50 p-2 text-xs text-slate-800 overflow-auto max-h-40">{toPretty(detail.before)}</pre>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500 mb-1">变更后</p>
                  <pre className="rounded-xl border border-blue-100 bg-slate-50 p-2 text-xs text-slate-800 overflow-auto max-h-40">{toPretty(detail.after)}</pre>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-500 mb-1">扩展信息</p>
                  <pre className="rounded-xl border border-blue-100 bg-slate-50 p-2 text-xs text-slate-800 overflow-auto max-h-40">{toPretty(detail.meta)}</pre>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">点击左侧任意日志查看详情</div>
            )}
          </div>
        </div>

        <div className="card-surface p-3 flex items-center justify-between text-sm text-slate-700">
          <span>
            第 {page} / {totalPages} 页，共 {total} 条
          </span>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(event) => {
                const nextSize = Number(event.target.value) || 20;
                setPageSize(nextSize);
                setPage(1);
              }}
              className="rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-sm !text-slate-900"
            >
              <option value={20}>20 / 页</option>
              <option value={50}>50 / 页</option>
              <option value={100}>100 / 页</option>
            </select>
            <button disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="rounded-lg border border-blue-200 px-3 py-1.5 disabled:opacity-40">
              上一页
            </button>
            <div className="flex items-center gap-1">
              <input
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value.replace(/[^\d]/g, ''))}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  const next = Math.min(totalPages, Math.max(1, Number(pageInput) || 1));
                  setPage(next);
                }}
                className="w-16 rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-center text-sm !text-slate-900"
              />
              <button
                onClick={() => {
                  const next = Math.min(totalPages, Math.max(1, Number(pageInput) || 1));
                  setPage(next);
                }}
                className="rounded-lg border border-blue-200 px-2 py-1.5 text-xs"
              >
                跳转
              </button>
            </div>
            <button disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)} className="rounded-lg border border-blue-200 px-3 py-1.5 disabled:opacity-40">
              下一页
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Logs;
