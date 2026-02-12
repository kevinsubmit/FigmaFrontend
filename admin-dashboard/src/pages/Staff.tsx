import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, Trash2, UserRound, X } from 'lucide-react';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { useAuth } from '../context/AuthContext';
import { getStores, Store } from '../api/stores';
import {
  createTechnician,
  deleteTechnician,
  getTechnicianPerformanceDetail,
  getTechnicianPerformanceSummary,
  getTechnicians,
  Technician,
  TechnicianPerformanceDetail,
  TechnicianPerformanceSummary,
  updateTechnician,
} from '../api/technicians';
import { getTodayYmdET } from '../utils/time';

const Staff: React.FC = () => {
  const { role, user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [staff, setStaff] = useState<Technician[]>([]);
  const [summaryRows, setSummaryRows] = useState<TechnicianPerformanceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [storeId, setStoreId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTech, setDetailTech] = useState<TechnicianPerformanceSummary | null>(null);
  const [detailData, setDetailData] = useState<TechnicianPerformanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  const effectiveStoreId = useMemo(() => {
    if (role === 'store_admin') return user?.store_id || null;
    return typeof storeId === 'number' ? storeId : null;
  }, [role, user?.store_id, storeId]);

  const summaryMap = useMemo(() => {
    const map = new Map<number, TechnicianPerformanceSummary>();
    summaryRows.forEach((row) => map.set(row.technician_id, row));
    return map;
  }, [summaryRows]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setHireDate('');
    setPhone('');
    setEmail('');
  };

  const loadStores = async () => {
    if (role !== 'super_admin') return;
    try {
      const rows = await getStores({ skip: 0, limit: 100 });
      setStores(rows);
      if (!storeId && rows.length) setStoreId(rows[0].id);
    } catch {
      setStores([]);
    }
  };

  const loadStaff = async () => {
    if (!effectiveStoreId) {
      setStaff([]);
      setSummaryRows([]);
      return;
    }
    setLoading(true);
    try {
      const [staffRows, perfRows] = await Promise.all([
        getTechnicians({ skip: 0, limit: 100, store_id: effectiveStoreId }),
        getTechnicianPerformanceSummary({ store_id: effectiveStoreId }),
      ]);
      setStaff(staffRows);
      setSummaryRows(perfRows);
    } catch {
      setStaff([]);
      setSummaryRows([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceDetail = async (technicianId: number, params?: { date_from?: string; date_to?: string }) => {
    setDetailLoading(true);
    try {
      const data = await getTechnicianPerformanceDetail(technicianId, {
        skip: 0,
        limit: 100,
        ...params,
      });
      setDetailData(data);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, [role]);

  useEffect(() => {
    loadStaff();
  }, [role, storeId, user?.store_id]);

  const submit = async () => {
    if (!effectiveStoreId) {
      window.alert('请先选择店铺');
      return;
    }
    if (!name.trim()) {
      window.alert('技师名称不能为空');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateTechnician(editingId, {
          name: name.trim(),
          hire_date: hireDate || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
        });
      } else {
        await createTechnician({
          store_id: effectiveStoreId,
          name: name.trim(),
          hire_date: hireDate || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
        });
      }
      resetForm();
      await loadStaff();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: Technician) => {
    setEditingId(row.id);
    setName(row.name || '');
    setHireDate(row.hire_date || '');
    setPhone(row.phone || '');
    setEmail(row.email || '');
    if (role === 'super_admin') setStoreId(row.store_id);
  };

  const deactivate = async (id: number) => {
    if (!window.confirm('确认删除该技师吗？删除后将标记为离职。')) return;
    await deleteTechnician(id);
    if (editingId === id) resetForm();
    await loadStaff();
  };

  const openDetail = async (row: Technician) => {
    const perf =
      summaryMap.get(row.id) ||
      ({
        technician_id: row.id,
        technician_name: row.name,
        store_id: row.store_id,
        today_order_count: 0,
        today_amount: 0,
        today_commission: 0,
        total_order_count: 0,
        total_amount: 0,
        total_commission: 0,
      } as TechnicianPerformanceSummary);
    setDetailTech(perf);
    setDetailOpen(true);
    setRangeFrom('');
    setRangeTo('');
    await loadPerformanceDetail(row.id);
  };

  const applyToday = async () => {
    if (!detailTech) return;
    const today = getTodayYmdET();
    setRangeFrom(today);
    setRangeTo(today);
    await loadPerformanceDetail(detailTech.technician_id, { date_from: today, date_to: today });
  };

  const applyHistory = async () => {
    if (!detailTech) return;
    setRangeFrom('');
    setRangeTo('');
    await loadPerformanceDetail(detailTech.technician_id);
  };

  const applyCustomRange = async () => {
    if (!detailTech) return;
    await loadPerformanceDetail(detailTech.technician_id, {
      date_from: rangeFrom || undefined,
      date_to: rangeTo || undefined,
    });
  };

  const formatAmount = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <AdminLayout>
      <TopBar title="Staff / 技师管理" subtitle="每个店铺可独立管理技师；同店铺技师名不可重复" />
      <div className="px-4 py-5 space-y-4 lg:px-6">
        <div className="card-surface p-4 grid grid-cols-1 gap-2 lg:grid-cols-6">
          {role === 'super_admin' && (
            <select
              value={storeId}
              onChange={(event) => setStoreId(event.target.value ? Number(event.target.value) : '')}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 [&>option]:text-slate-900 outline-none focus:border-gold-500 lg:col-span-2"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          )}

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="技师名称"
            className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 placeholder:text-slate-500 outline-none focus:border-gold-500 lg:col-span-2"
          />
          <input
            type="date"
            value={hireDate}
            onChange={(event) => setHireDate(event.target.value)}
            className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 outline-none focus:border-gold-500"
          />
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="手机号（可选）"
            className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 placeholder:text-slate-500 outline-none focus:border-gold-500"
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="邮箱（可选）"
            className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 placeholder:text-slate-500 outline-none focus:border-gold-500 lg:col-span-2"
          />

          <div className="flex items-center gap-2 lg:col-span-2">
            <button
              onClick={submit}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gold-500/60 px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {editingId ? '保存修改' : '新增技师'}
            </button>
            <button
              onClick={resetForm}
              className="rounded-xl border border-blue-200 px-3 py-2 text-sm text-slate-700"
            >
              重置
            </button>
            <button
              onClick={loadStaff}
              className="inline-flex items-center gap-1 rounded-xl border border-blue-200 px-3 py-2 text-sm text-slate-700"
            >
              <RefreshCcw className="h-4 w-4" /> 刷新
            </button>
          </div>
        </div>

        <div className="card-surface overflow-auto">
          {loading ? (
            <div className="p-6 text-sm text-slate-600">Loading staff...</div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-blue-50">
                <tr className="text-xs uppercase tracking-[0.15em] text-slate-500 border-b border-blue-100">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Store</th>
                  <th className="px-3 py-2 font-medium">Hire Date</th>
                  <th className="px-3 py-2 font-medium">Today Orders</th>
                  <th className="px-3 py-2 font-medium">Today Amount</th>
                  <th className="px-3 py-2 font-medium">Today Commission</th>
                  <th className="px-3 py-2 font-medium">History Orders</th>
                  <th className="px-3 py-2 font-medium">History Amount</th>
                  <th className="px-3 py-2 font-medium">History Commission</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((row) => {
                  const storeName = stores.find((store) => store.id === row.store_id)?.name || `Store #${row.store_id}`;
                  const perf = summaryMap.get(row.id);
                  return (
                    <tr key={row.id} className="border-b border-blue-100/80 hover:bg-blue-100/30">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 text-slate-900">
                          <UserRound className="h-4 w-4 text-gold-500" />
                          <span className="font-medium">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{storeName}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.hire_date || '-'}</td>
                      <td className="px-3 py-2.5 text-slate-700">{perf?.today_order_count || 0}</td>
                      <td className="px-3 py-2.5 text-slate-700">{formatAmount(perf?.today_amount || 0)}</td>
                      <td className="px-3 py-2.5 text-slate-700">{formatAmount(perf?.today_commission || 0)}</td>
                      <td className="px-3 py-2.5 text-slate-700">{perf?.total_order_count || 0}</td>
                      <td className="px-3 py-2.5 text-slate-700">{formatAmount(perf?.total_amount || 0)}</td>
                      <td className="px-3 py-2.5 text-slate-700">{formatAmount(perf?.total_commission || 0)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetail(row)}
                            className="rounded-lg border border-blue-200 px-2 py-1 text-xs text-slate-800"
                          >
                            业绩明细
                          </button>
                          <button
                            onClick={() => startEdit(row)}
                            className="rounded-lg border border-blue-200 px-2 py-1 text-xs text-slate-800"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => deactivate(row.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> 删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && staff.length === 0 && <div className="p-6 text-center text-sm text-slate-500">暂无技师数据</div>}
        </div>
      </div>

      {detailOpen && detailTech && (
        <div className="fixed inset-0 z-50 bg-slate-900/30">
          <div className="absolute inset-y-0 right-0 w-full max-w-3xl border-l border-blue-100 bg-white shadow-2xl overflow-auto">
            <div className="sticky top-0 z-10 border-b border-blue-100 bg-white/95 backdrop-blur">
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-base font-semibold text-slate-900">技师业绩明细 · {detailTech.technician_name}</h2>
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    setDetailTech(null);
                    setDetailData(null);
                  }}
                  className="rounded-full border border-blue-200 p-1.5 text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
                <button onClick={applyToday} className="rounded-lg border border-blue-200 px-3 py-2 text-sm text-slate-700">
                  今天
                </button>
                <button onClick={applyHistory} className="rounded-lg border border-blue-200 px-3 py-2 text-sm text-slate-700">
                  历史全部
                </button>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(event) => setRangeFrom(event.target.value)}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm !text-slate-900 md:col-span-2"
                />
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(event) => setRangeTo(event.target.value)}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm !text-slate-900 md:col-span-2"
                />
                <button onClick={applyCustomRange} className="rounded-lg border border-gold-500/60 px-3 py-2 text-sm text-slate-900 md:col-span-2">
                  按日期筛选
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <div className="card-surface p-3">
                  <p className="text-xs text-slate-500">本次筛选订单</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{detailData?.period_order_count || 0}</p>
                </div>
                <div className="card-surface p-3">
                  <p className="text-xs text-slate-500">本次筛选金额</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{formatAmount(detailData?.period_amount || 0)}</p>
                </div>
                <div className="card-surface p-3">
                  <p className="text-xs text-slate-500">本次筛选提成</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{formatAmount(detailData?.period_commission || 0)}</p>
                </div>
                <div className="card-surface p-3">
                  <p className="text-xs text-slate-500">历史总订单</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{detailData?.total_order_count || 0}</p>
                </div>
                <div className="card-surface p-3">
                  <p className="text-xs text-slate-500">历史总金额</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{formatAmount(detailData?.total_amount || 0)}</p>
                </div>
                <div className="card-surface p-3">
                  <p className="text-xs text-slate-500">历史总提成</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{formatAmount(detailData?.total_commission || 0)}</p>
                </div>
              </div>

              <div className="card-surface overflow-auto">
                {detailLoading ? (
                  <div className="p-6 text-sm text-slate-600">Loading...</div>
                ) : (
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-blue-50">
                      <tr className="text-xs uppercase tracking-[0.15em] text-slate-500 border-b border-blue-100">
                        <th className="px-3 py-2 font-medium">Order</th>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Service</th>
                        <th className="px-3 py-2 font-medium">Work Type</th>
                        <th className="px-3 py-2 font-medium">Customer</th>
                        <th className="px-3 py-2 font-medium">Amount</th>
                        <th className="px-3 py-2 font-medium">Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData?.items.map((item) => (
                        <tr key={item.split_id} className="border-b border-blue-100/80">
                          <td className="px-3 py-2.5 text-slate-900">#{item.order_number || item.appointment_id}</td>
                          <td className="px-3 py-2.5 text-slate-700">{item.appointment_date} {item.appointment_time?.slice(0, 5)}</td>
                          <td className="px-3 py-2.5 text-slate-700">{item.service_name || '-'}</td>
                          <td className="px-3 py-2.5 text-slate-700">{item.work_type || '-'}</td>
                          <td className="px-3 py-2.5 text-slate-700">{item.customer_name || '-'}</td>
                          <td className="px-3 py-2.5 text-slate-900">{formatAmount(item.amount)}</td>
                          <td className="px-3 py-2.5 text-slate-900">{formatAmount(item.commission_amount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {!detailLoading && (!detailData?.items?.length) && (
                  <div className="p-6 text-center text-sm text-slate-500">当前筛选暂无订单</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Staff;
