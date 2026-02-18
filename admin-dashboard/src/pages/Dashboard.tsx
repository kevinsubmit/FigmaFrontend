import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Coins, Eye, Sparkles, Store, TrendingUp } from 'lucide-react';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { useAuth } from '../context/AuthContext';
import { getStoreById } from '../api/stores';
import { getDashboardRealtimeNotifications, getDashboardSummary } from '../api/dashboard';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [storeName, setStoreName] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [realtimeNotifications, setRealtimeNotifications] = useState<Array<{
    id: number;
    message: string;
    created_at: string;
  }>>([]);
  const [summary, setSummary] = useState({
    today_appointments: 0,
    today_revenue: 0,
    active_customers_week: 0,
    avg_ticket_week: 0,
    avg_ticket_change_pct: 0,
    scope: 'all_stores' as 'all_stores' | 'store',
  });

  const formatMoney = (amount: number) =>
    `$${Math.round(amount).toLocaleString('en-US')}`;

  const formatRelativeTime = (value: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.max(1, Math.floor(diffMs / 60000));
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  useEffect(() => {
    const loadStoreName = async () => {
      if (role !== 'store_admin' || !user?.store_id) {
        setStoreName(null);
        return;
      }
      try {
        const store = await getStoreById(user.store_id);
        setStoreName(store.name);
      } catch (error) {
        setStoreName(null);
      }
    };
    loadStoreName();
  }, [role, user?.store_id]);

  useEffect(() => {
    const loadSummary = async () => {
      setSummaryLoading(true);
      try {
        const data = await getDashboardSummary();
        setSummary({
          today_appointments: Number(data.today_appointments || 0),
          today_revenue: Number(data.today_revenue || 0),
          active_customers_week: Number(data.active_customers_week || 0),
          avg_ticket_week: Number(data.avg_ticket_week || 0),
          avg_ticket_change_pct: Number(data.avg_ticket_change_pct || 0),
          scope: data.scope === 'store' ? 'store' : 'all_stores',
        });
      } catch (error) {
        setSummary({
          today_appointments: 0,
          today_revenue: 0,
          active_customers_week: 0,
          avg_ticket_week: 0,
          avg_ticket_change_pct: 0,
          scope: role === 'super_admin' ? 'all_stores' : 'store',
        });
      } finally {
        setSummaryLoading(false);
      }
    };
    loadSummary();
  }, [role]);

  useEffect(() => {
    const loadRealtimeNotifications = async () => {
      setNotificationsLoading(true);
      try {
        const payload = await getDashboardRealtimeNotifications(9);
        setRealtimeNotifications(
          (payload.items || []).map((item) => ({
            id: item.id,
            message: item.message,
            created_at: item.created_at,
          })),
        );
      } catch {
        setRealtimeNotifications([]);
      } finally {
        setNotificationsLoading(false);
      }
    };
    loadRealtimeNotifications();
  }, [role]);

  return (
    <AdminLayout>
      <TopBar title="仪表盘" subtitle="实时数据概览与运营分析" />
      <div className="px-4 pt-5 pb-4 space-y-5 lg:px-6">
        <div className="card-surface p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Welcome back</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            {storeName || user?.full_name || user?.username || 'Admin'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Role: {role === 'super_admin' ? 'Super Admin' : 'Store Admin'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Scope: {summary.scope === 'all_stores' ? 'All stores total' : 'Current store only'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="card-surface p-4 border-t-4 border-t-cyan-400">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Today appointments</span>
              <CalendarCheck className="w-5 h-5 text-cyan-500" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{summaryLoading ? '-' : summary.today_appointments}</p>
            <p className="text-xs text-slate-500">Appointments</p>
          </div>
          <div className="card-surface p-4 border-t-4 border-t-violet-400">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Revenue</span>
              <Coins className="w-5 h-5 text-violet-500" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{summaryLoading ? '-' : formatMoney(summary.today_revenue)}</p>
            <p className="text-xs text-slate-500">Today</p>
          </div>
          <div className="card-surface p-4 border-t-4 border-t-emerald-400">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Customers</span>
              <Eye className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{summaryLoading ? '-' : summary.active_customers_week}</p>
            <p className="text-xs text-slate-500">Active this week</p>
          </div>
          <div className="card-surface p-4 border-t-4 border-t-pink-400">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Avg ticket</span>
              <TrendingUp className="w-5 h-5 text-pink-500" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{summaryLoading ? '-' : formatMoney(summary.avg_ticket_week)}</p>
            <p className="text-xs text-slate-500">
              {summaryLoading
                ? '-'
                : `${summary.avg_ticket_change_pct >= 0 ? '+' : ''}${summary.avg_ticket_change_pct.toFixed(1)}% vs last week`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="card-surface p-5 xl:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">实时通知</h3>
              <span className="text-xs text-slate-500">{notificationsLoading ? '-' : `${realtimeNotifications.length} total`}</span>
            </div>
            <div className="space-y-2">
              {notificationsLoading ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-700">Loading...</div>
              ) : realtimeNotifications.length ? (
                realtimeNotifications.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3 ${
                      idx % 2 === 0
                        ? 'border-emerald-100 bg-emerald-50/60'
                        : 'border-cyan-100 bg-cyan-50/60'
                    }`}
                  >
                    <p className="text-sm text-slate-800">{item.message}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatRelativeTime(item.created_at)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-700">No realtime notifications</div>
              )}
            </div>
          </div>

          <div className="card-surface p-5 space-y-3">
            <h3 className="text-base font-semibold text-slate-900">快捷操作</h3>
            <button
              onClick={() => navigate('/admin/appointments')}
              className="w-full flex items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-slate-800 hover:bg-cyan-100"
            >
              <span>查看日程</span>
              <CalendarCheck className="w-4 h-4 text-cyan-600" />
            </button>
            <button
              onClick={() => navigate('/admin/stores')}
              className="w-full flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-slate-800 hover:bg-violet-100"
            >
              <span>管理店铺</span>
              <Store className="w-4 h-4 text-violet-600" />
            </button>
            <button
              onClick={() => navigate('/admin/promotions')}
              className="w-full flex items-center justify-between rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm text-slate-800 hover:bg-pink-100"
            >
              <span>管理活动</span>
              <Sparkles className="w-4 h-4 text-pink-600" />
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
