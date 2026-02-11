import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, MapPin, Store as StoreIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { getStoreById, getStores, Store, updateStoreRanking, updateStoreVisibility } from '../api/stores';
import { useAuth } from '../context/AuthContext';

type RankingDraft = {
  manual_rank: string;
  boost_score: string;
  featured_until: string;
};

const StoresList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStoreId, setUpdatingStoreId] = useState<number | null>(null);
  const [rankingDrafts, setRankingDrafts] = useState<Record<number, RankingDraft>>({});

  const toLocalDateTimeInput = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => `${n}`.padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const queryParams = useMemo(() => {
    return { limit: 100 };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (user?.store_id) {
          const store = await getStoreById(user.store_id);
          const nextStores = store ? [store] : [];
          setStores(nextStores);
          setRankingDrafts(
            Object.fromEntries(
              nextStores.map((item) => [
                item.id,
                {
                  manual_rank: item.manual_rank == null ? '' : String(item.manual_rank),
                  boost_score: item.boost_score == null ? '0' : String(item.boost_score),
                  featured_until: toLocalDateTimeInput(item.featured_until),
                },
              ]),
            ),
          );
        } else {
          const data = await getStores(queryParams);
          setStores(data);
          setRankingDrafts(
            Object.fromEntries(
              data.map((item) => [
                item.id,
                {
                  manual_rank: item.manual_rank == null ? '' : String(item.manual_rank),
                  boost_score: item.boost_score == null ? '0' : String(item.boost_score),
                  featured_until: toLocalDateTimeInput(item.featured_until),
                },
              ]),
            ),
          );
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [queryParams, user?.store_id]);

  return (
    <AdminLayout>
      <TopBar title="店铺管理" subtitle="查看并进入店铺详情配置" />
      <div className="px-4 pt-5 pb-4 space-y-4 lg:px-6">
        <div className="card-surface p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Stores overview</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">共 {stores.length} 家店铺</h2>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <StoreIcon className="h-5 w-5 text-blue-600" />
          </div>
        </div>

        {user?.is_admin && (
          <div className="card-surface p-4 text-sm text-slate-700 space-y-2">
            <p className="font-semibold text-slate-900">排序参数说明（运营配置）</p>
            <p>1. `手动排序值`：数字越小，在推荐排序中越靠前（建议从 1 开始）。</p>
            <p>2. `运营加权分`：可填正负值，正数提高曝光，负数降低曝光（推荐范围 -1.0 ~ +1.0）。</p>
            <p>3. `置顶截止时间`：截止时间前额外加权，适合节日活动或门店短期推广。</p>
          </div>
        )}

        {loading ? (
          <div className="card-surface p-6 text-slate-500">Loading stores...</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stores.map((store) => {
              const draft = rankingDrafts[store.id] || { manual_rank: '', boost_score: '0', featured_until: '' };
              return (
              <div
                key={store.id}
                className="w-full text-left card-surface p-4 hover:border-blue-200 hover:bg-blue-50/40 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{store.name}</h3>
                    <p className="mt-2 text-xs text-slate-500 inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-blue-500" />
                      {store.address}
                    </p>
                    <p className="mt-2 text-xs text-slate-600">
                      Visible on H5: {store.is_visible === false ? 'No' : 'Yes'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">
                      #{store.id}
                    </span>
                    {user?.is_admin && (
                      <button
                        type="button"
                        onClick={async (event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          if (updatingStoreId === store.id) return;
                          setUpdatingStoreId(store.id);
                          try {
                            const updated = await updateStoreVisibility(store.id, !(store.is_visible ?? true));
                            setStores((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
                            toast.success(updated.is_visible ? 'Store is now visible on H5' : 'Store hidden from H5');
                          } catch (error: any) {
                            toast.error(error?.response?.data?.detail || 'Failed to update store visibility');
                          } finally {
                            setUpdatingStoreId(null);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-gold-500 disabled:opacity-50"
                        disabled={updatingStoreId === store.id}
                      >
                        {(store.is_visible ?? true) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {(store.is_visible ?? true) ? 'Hide' : 'Show'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/stores/${store.id}`)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-gold-500"
                    >
                      进入详情
                    </button>
                  </div>
                </div>

                {user?.is_admin && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-white p-3 space-y-2">
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-500">推荐排序参数</p>
                    <div className="grid grid-cols-1 gap-2">
                      <label className="text-xs text-slate-600">
                        手动排序值（越小越靠前）
                        <input
                          type="number"
                          min={0}
                          value={draft.manual_rank}
                          onChange={(event) =>
                            setRankingDrafts((prev) => ({
                              ...prev,
                              [store.id]: { ...draft, manual_rank: event.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-2 py-2 text-sm text-slate-900"
                          placeholder="例如 1"
                        />
                      </label>
                      <label className="text-xs text-slate-600">
                        运营加权分（可正可负）
                        <input
                          type="number"
                          step="0.01"
                          value={draft.boost_score}
                          onChange={(event) =>
                            setRankingDrafts((prev) => ({
                              ...prev,
                              [store.id]: { ...draft, boost_score: event.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-2 py-2 text-sm text-slate-900"
                          placeholder="例如 0.2"
                        />
                      </label>
                      <label className="text-xs text-slate-600">
                        置顶截止时间（可选）
                        <input
                          type="datetime-local"
                          value={draft.featured_until}
                          onChange={(event) =>
                            setRankingDrafts((prev) => ({
                              ...prev,
                              [store.id]: { ...draft, featured_until: event.target.value },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-2 py-2 text-sm text-slate-900"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={updatingStoreId === store.id}
                      onClick={async () => {
                        if (updatingStoreId === store.id) return;
                        const rank = draft.manual_rank.trim();
                        const boost = draft.boost_score.trim();
                        if (rank && (Number.isNaN(Number(rank)) || Number(rank) < 0)) {
                          toast.error('手动排序值必须是大于等于 0 的数字');
                          return;
                        }
                        if (boost && Number.isNaN(Number(boost))) {
                          toast.error('运营加权分必须是数字');
                          return;
                        }

                        setUpdatingStoreId(store.id);
                        try {
                          const updated = await updateStoreRanking(store.id, {
                            manual_rank: rank ? Number(rank) : null,
                            boost_score: boost ? Number(boost) : 0,
                            featured_until: draft.featured_until ? new Date(draft.featured_until).toISOString() : null,
                          });
                          setStores((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
                          setRankingDrafts((prev) => ({
                            ...prev,
                            [store.id]: {
                              manual_rank: updated.manual_rank == null ? '' : String(updated.manual_rank),
                              boost_score: updated.boost_score == null ? '0' : String(updated.boost_score),
                              featured_until: toLocalDateTimeInput(updated.featured_until),
                            },
                          }));
                          toast.success('排序参数已更新');
                        } catch (error: any) {
                          toast.error(error?.response?.data?.detail || '更新排序参数失败');
                        } finally {
                          setUpdatingStoreId(null);
                        }
                      }}
                      className="w-full rounded-lg border border-blue-200 px-3 py-2 text-xs text-slate-800 hover:border-gold-500 disabled:opacity-50"
                    >
                      保存排序参数
                    </button>
                  </div>
                )}
              </div>
            );})}
          </div>
        )}
        {!loading && stores.length === 0 && (
          <div className="card-surface p-6 text-slate-500 text-sm">No stores found.</div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StoresList;
