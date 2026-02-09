import React, { useEffect, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { getRiskUsers, RiskUserItem, updateRiskUser } from '../api/risk';

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
    () => users.filter((u) => u.restricted_until && new Date(u.restricted_until) > new Date()).length,
    [users],
  );

  const runAction = async (userId: number, action: 'restrict_24h' | 'unrestrict', note?: string) => {
    setActionLoadingUserId(userId);
    try {
      const updated = await updateRiskUser(userId, { action, note });
      setUsers((prev) => prev.map((user) => (user.user_id === userId ? updated : user)));
      toast.success(action === 'restrict_24h' ? 'User restricted for 24h' : 'User restriction removed');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoadingUserId(null);
    }
  };

  return (
    <AdminLayout>
      <TopBar title="Risk Control" />
      <div className="px-4 py-6 space-y-4">
        <div className="card-surface p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-gold-500" />
            <div>
              <p className="text-sm font-semibold">Current restricted users</p>
              <p className="text-xs text-slate-500">Users blocked from new bookings</p>
            </div>
          </div>
          <span className="text-gold-300 font-semibold">{restrictedCount}</span>
        </div>

        <div className="card-surface p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by username/phone"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            >
              <option value="all">All Levels</option>
              <option value="normal">Normal</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <label className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={restrictedOnly}
                onChange={(e) => setRestrictedOnly(e.target.checked)}
              />
              Restricted only
            </label>
            <button
              onClick={load}
              className="rounded-xl border border-gold-500/50 px-3 py-2.5 text-sm text-gold-200 hover:bg-gold-500/10"
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
              const isRestricted = !!(user.restricted_until && new Date(user.restricted_until) > new Date());
              return (
                <div key={user.user_id} className="card-surface p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {user.full_name || user.username} <span className="text-slate-500">({user.phone})</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        risk={user.risk_level} | cancel_7d={user.cancel_7d} | no_show_30d={user.no_show_30d}
                      </p>
                      {isRestricted && (
                        <p className="text-xs text-rose-300 mt-1">Restricted until: {user.restricted_until}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={actionLoadingUserId === user.user_id || isRestricted}
                        onClick={() => runAction(user.user_id, 'restrict_24h', 'manual restriction by admin')}
                        className="rounded-lg border border-rose-500/50 px-3 py-1.5 text-xs text-rose-200 disabled:opacity-50"
                      >
                        Restrict 24h
                      </button>
                      <button
                        disabled={actionLoadingUserId === user.user_id || !isRestricted}
                        onClick={() => runAction(user.user_id, 'unrestrict', 'manual unrestrict by admin')}
                        className="rounded-lg border border-emerald-500/50 px-3 py-1.5 text-xs text-emerald-200 disabled:opacity-50"
                      >
                        Unrestrict
                      </button>
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
