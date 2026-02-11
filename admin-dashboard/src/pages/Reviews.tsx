import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Search, Star } from 'lucide-react';
import { toast } from 'react-toastify';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { useAuth } from '../context/AuthContext';
import { getStores, Store } from '../api/stores';
import {
  AdminReviewItem,
  createReviewReply,
  deleteReviewReply,
  getAdminReviews,
  updateReviewReply,
} from '../api/reviews';

const Reviews: React.FC = () => {
  const { role } = useAuth();
  const [rows, setRows] = useState<AdminReviewItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [storeId, setStoreId] = useState<string>('all');
  const [rating, setRating] = useState<string>('all');
  const [replyStatus, setReplyStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const [editingReview, setEditingReview] = useState<AdminReviewItem | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const queryParams = useMemo(() => {
    const params: Record<string, string | number | boolean> = {
      skip: (page - 1) * limit,
      limit,
    };
    const kw = keyword.trim();
    if (kw) params.keyword = kw;
    if (storeId !== 'all') params.store_id = Number(storeId);
    if (rating !== 'all') params.rating = Number(rating);
    if (replyStatus === 'replied') params.replied = true;
    if (replyStatus === 'unreplied') params.replied = false;
    return params;
  }, [keyword, storeId, rating, replyStatus, page, limit]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reviewData, storeData] = await Promise.all([
        getAdminReviews(queryParams),
        role === 'super_admin' ? getStores({ limit: 100 }) : Promise.resolve([] as Store[]),
      ]);
      setRows(reviewData.items);
      setTotal(reviewData.total);
      setStores(storeData);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [queryParams, role]);

  const openReplyEditor = (item: AdminReviewItem) => {
    setEditingReview(item);
    setReplyContent(item.reply?.content || '');
  };

  const saveReply = async () => {
    if (!editingReview) return;
    const content = replyContent.trim();
    if (!content) {
      toast.error('Reply content is required');
      return;
    }

    setSaving(true);
    try {
      if (editingReview.reply?.id) {
        await updateReviewReply(editingReview.reply.id, { content });
      } else {
        await createReviewReply({ review_id: editingReview.id, content });
      }
      setEditingReview(null);
      setReplyContent('');
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const removeReply = async (item: AdminReviewItem) => {
    if (!item.reply?.id) return;
    if (!window.confirm('Delete this reply?')) return;
    try {
      await deleteReviewReply(item.reply.id);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete reply');
    }
  };

  return (
    <AdminLayout>
      <TopBar title="评价管理" subtitle="筛选、查看评价并处理商家回复" />
      <div className="px-4 py-5 lg:px-6 space-y-4">
        <div className="card-surface p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2">
          <div className="xl:col-span-2 rounded-xl border border-blue-200 bg-white px-3 py-2 flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
              placeholder="Search by customer / comment / order"
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-500 outline-none"
            />
          </div>

          {role === 'super_admin' && (
            <select
              value={storeId}
              onChange={(event) => {
                setStoreId(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All stores</option>
              {stores.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={rating}
            onChange={(event) => {
              setRating(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="all">All ratings</option>
            <option value="5">5 stars</option>
            <option value="4">4 stars</option>
            <option value="3">3 stars</option>
            <option value="2">2 stars</option>
            <option value="1">1 star</option>
          </select>

          <select
            value={replyStatus}
            onChange={(event) => {
              setReplyStatus(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="all">All reply status</option>
            <option value="replied">Replied</option>
            <option value="unreplied">Unreplied</option>
          </select>

          <select
            value={String(limit)}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
          </select>
        </div>

        <div className="card-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-blue-100 text-sm text-slate-700 flex items-center justify-between">
            <span>Total {total} reviews</span>
            <span>Page {page} / {totalPages}</span>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-600">Loading reviews...</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">No reviews found.</div>
          ) : (
            <div className="divide-y divide-blue-100">
              {rows.map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-semibold text-slate-900">{item.user_name || `User #${item.user_id}`}</span>
                    {item.store_name && <span className="text-slate-700">@ {item.store_name}</span>}
                    <span className="text-slate-600">Order #{item.order_number || item.appointment_id}</span>
                    <span className="text-slate-600">{new Date(item.created_at).toLocaleString('en-US')}</span>
                  </div>

                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`h-4 w-4 ${star <= Math.round(item.rating) ? 'fill-current' : ''}`} />
                    ))}
                    <span className="ml-2 text-sm text-slate-700">{item.rating.toFixed(1)}</span>
                  </div>

                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{item.comment || 'No comment'}</p>

                  {!!item.images?.length && (
                    <div className="flex flex-wrap gap-2">
                      {item.images.map((url, idx) => (
                        <a key={`${item.id}-${idx}`} href={url.startsWith('http') ? url : `${window.location.protocol}//${window.location.hostname}:8000${url}`} target="_blank" rel="noreferrer">
                          <img
                            src={url.startsWith('http') ? url : `${window.location.protocol}//${window.location.hostname}:8000${url}`}
                            alt={`review-${idx}`}
                            className="h-16 w-16 rounded-lg object-cover border border-blue-100"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Reply</p>
                        {item.reply ? (
                          <>
                            <p className="mt-1 text-sm text-slate-900">{item.reply.content}</p>
                            <p className="mt-1 text-xs text-slate-600">
                              by {item.reply.admin_name || 'Admin'} · {new Date(item.reply.created_at).toLocaleString('en-US')}
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 text-sm text-slate-600">No reply yet</p>
                        )}
                      </div>
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => openReplyEditor(item)}
                        className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs text-slate-900"
                      >
                        {item.reply ? 'Edit Reply' : 'Reply'}
                      </button>
                      {item.reply && (
                        <button
                          onClick={() => removeReply(item)}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-700"
                        >
                          Delete Reply
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-3 border-t border-blue-100 flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-slate-900 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-slate-900 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {editingReview && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-blue-100 bg-white p-4 space-y-3">
            <h3 className="text-base font-semibold text-slate-900">{editingReview.reply ? 'Edit Reply' : 'New Reply'}</h3>
            <textarea
              rows={5}
              value={replyContent}
              onChange={(event) => setReplyContent(event.target.value)}
              className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="Enter reply..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditingReview(null);
                  setReplyContent('');
                }}
                className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={saveReply}
                disabled={saving}
                className="rounded-lg border border-blue-200 bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Reviews;
