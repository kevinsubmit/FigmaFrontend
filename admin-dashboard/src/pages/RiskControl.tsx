import React, { useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { getRiskUsers, RiskUserItem, updateRiskUser } from '../api/risk';
import { formatApiDateTimeET, isFutureThanNowByApiTimestamp } from '../utils/time';
import { maskPhone } from '../utils/privacy';

const RiskControl: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [riskLevel, setRiskLevel] = useState('all');
  const [restrictedOnly, setRestrictedOnly] = useState(false);
  const [users, setUsers] = useState<RiskUserItem[]>([]);
  const [actionLoadingUserId, setActionLoadingUserId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: 200 };
      if (keyword.trim()) params.keyword = keyword.trim();
      if (riskLevel !== 'all') params.risk_level = riskLevel;
      if (restrictedOnly) params.restricted_only = true;
      const data = await getRiskUsers(params);
      setUsers(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load risk users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const restrictedCount = useMemo(
    () => users.filter((u) => isFutureThanNowByApiTimestamp(u.restricted_until)).length,
    [users],
  );

  const runAction = async (
    userId: number,
    action: 'restrict_24h' | 'unrestrict' | 'ban_permanent' | 'unban_permanent',
    note?: string,
  ) => {
    setActionLoadingUserId(userId);
    try {
      const updated = await updateRiskUser(userId, { action, note });
      setUsers((prev) => prev.map((user) => (user.user_id === userId ? updated : user)));
      if (action === 'restrict_24h') toast.success('User restricted for 24h');
      else if (action === 'unrestrict') toast.success('User restriction removed');
      else if (action === 'ban_permanent') toast.success('Account permanently banned');
      else toast.success('Permanent ban removed');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoadingUserId(null);
    }
  };

  return (
    <AdminLayout>
      <TopBar title="风控管理" subtitle="识别高风险用户并执行限制策略" />
      <div className="px-4 py-5 space-y-4 lg:px-6">
        <div className="card-surface p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Current restricted users</p>
              <p className="text-xs text-slate-700">Users blocked from new bookings</p>
            </div>
          </div>
          <span className="text-blue-700 font-semibold text-lg">{restrictedCount}</span>
        </div>

        <div className="card-surface p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by username/phone"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 placeholder:text-slate-500 outline-none focus:border-gold-500"
            />
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 [&>option]:text-slate-900 outline-none focus:border-gold-500"
            >
              <option value="all">All Levels</option>
              <option value="normal">Normal</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <label className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900">
              <input
                type="checkbox"
                checked={restrictedOnly}
                onChange={(e) => setRestrictedOnly(e.target.checked)}
              />
              Restricted only
            </label>
            <button
              onClick={load}
              className="rounded-xl border border-gold-500/50 px-3 py-2.5 text-sm text-slate-900 hover:bg-blue-50"
            >
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-500 text-sm">Loading risk users...</div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => {
              const isRestricted = isFutureThanNowByApiTimestamp(user.restricted_until);
              const isPermanentlyBanned = user.is_active === false || user.account_status === 'permanently_banned';
              return (
                <div key={user.user_id} className="card-surface p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {user.full_name || user.username} <span className="text-slate-700">({maskPhone(user.phone)})</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        risk={user.risk_level} | cancel_7d={user.cancel_7d} | no_show_30d={user.no_show_30d}
                      </p>
                      <p className={`text-xs mt-1 ${isPermanentlyBanned ? 'text-rose-600' : 'text-emerald-700'}`}>
                        Account: {isPermanentlyBanned ? 'Permanently Banned' : 'Active'}
                      </p>
                      {isRestricted && (
                        <p className="text-xs text-rose-600 mt-1">Restricted until: {formatApiDateTimeET(user.restricted_until, true)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={actionLoadingUserId === user.user_id || isRestricted || isPermanentlyBanned}
                        onClick={() => runAction(user.user_id, 'restrict_24h', 'manual restriction by admin')}
                        className="rounded-lg border border-rose-500/50 px-3 py-1.5 text-xs text-rose-700 disabled:opacity-50"
                      >
                        Restrict 24h
                      </button>
                      <button
                        disabled={actionLoadingUserId === user.user_id || !isRestricted || isPermanentlyBanned}
                        onClick={() => runAction(user.user_id, 'unrestrict', 'manual unrestrict by admin')}
                        className="rounded-lg border border-emerald-500/50 px-3 py-1.5 text-xs text-emerald-700 disabled:opacity-50"
                      >
                        Unrestrict
                      </button>
                      {!isPermanentlyBanned ? (
                        <button
                          disabled={actionLoadingUserId === user.user_id}
                          onClick={() => runAction(user.user_id, 'ban_permanent', 'manual permanent ban by super admin')}
                          className="rounded-lg border border-rose-600/50 px-3 py-1.5 text-xs text-rose-700 disabled:opacity-50"
                        >
                          Permanent Ban
                        </button>
                      ) : (
                        <button
                          disabled={actionLoadingUserId === user.user_id}
                          onClick={() => runAction(user.user_id, 'unban_permanent', 'manual unban by super admin')}
                          className="rounded-lg border border-emerald-600/50 px-3 py-1.5 text-xs text-emerald-700 disabled:opacity-50"
                        >
                          Remove Ban
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {!users.length && <div className="text-sm text-slate-500">No risk users found.</div>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RiskControl;
