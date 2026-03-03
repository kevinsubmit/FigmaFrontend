import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, Send, Store, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import {
  AdminPushBatchResponse,
  AdminPushResponse,
  sendAdminPush,
  sendAdminPushBatch,
} from '../api/notifications';
import { getStores, Store as StoreItem } from '../api/stores';

const DEFAULT_SINGLE_TITLE = 'NailsDash Notice';
const DEFAULT_SINGLE_MESSAGE = 'You have a new update from NailsDash.';
const DEFAULT_BATCH_TITLE = 'NailsDash Update';
const DEFAULT_BATCH_MESSAGE = 'Please check your latest updates in NailsDash.';

type BatchTargetMode = 'user_ids' | 'store';

const parseUserIds = (value: string): number[] => {
  const ids = value
    .split(/[\n,;\s]+/)
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item) && item > 0);
  return Array.from(new Set(ids));
};

const PushCenter: React.FC = () => {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);

  const [singleUserId, setSingleUserId] = useState('');
  const [singleTitle, setSingleTitle] = useState(DEFAULT_SINGLE_TITLE);
  const [singleMessage, setSingleMessage] = useState(DEFAULT_SINGLE_MESSAGE);
  const [singleSending, setSingleSending] = useState(false);
  const [singleResult, setSingleResult] = useState<AdminPushResponse | null>(null);

  const [batchMode, setBatchMode] = useState<BatchTargetMode>('user_ids');
  const [batchUserIds, setBatchUserIds] = useState('');
  const [batchStoreId, setBatchStoreId] = useState('');
  const [batchTitle, setBatchTitle] = useState(DEFAULT_BATCH_TITLE);
  const [batchMessage, setBatchMessage] = useState(DEFAULT_BATCH_MESSAGE);
  const [batchMaxUsers, setBatchMaxUsers] = useState('200');
  const [batchSending, setBatchSending] = useState(false);
  const [batchResult, setBatchResult] = useState<AdminPushBatchResponse | null>(null);

  useEffect(() => {
    const loadStores = async () => {
      setStoresLoading(true);
      try {
        const rows = await getStores({ limit: 100 });
        setStores(Array.isArray(rows) ? rows : []);
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || 'Failed to load stores');
      } finally {
        setStoresLoading(false);
      }
    };

    loadStores();
  }, []);

  const parsedBatchUserIds = useMemo(() => parseUserIds(batchUserIds), [batchUserIds]);

  const handleSendSingle = async () => {
    const userId = Number.parseInt(singleUserId, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      toast.error('Please input a valid user ID');
      return;
    }
    if (!singleTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!singleMessage.trim()) {
      toast.error('Message is required');
      return;
    }

    setSingleSending(true);
    try {
      const result = await sendAdminPush({
        user_id: userId,
        title: singleTitle.trim(),
        message: singleMessage.trim(),
      });
      setSingleResult(result);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to send single push');
    } finally {
      setSingleSending(false);
    }
  };

  const handleSendBatch = async () => {
    if (!batchTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!batchMessage.trim()) {
      toast.error('Message is required');
      return;
    }

    const maxUsers = Number.parseInt(batchMaxUsers, 10);
    if (!Number.isInteger(maxUsers) || maxUsers < 1 || maxUsers > 500) {
      toast.error('Max users must be between 1 and 500');
      return;
    }

    const payload: {
      user_ids?: number[];
      store_id?: number;
      title: string;
      message: string;
      max_users: number;
    } = {
      title: batchTitle.trim(),
      message: batchMessage.trim(),
      max_users: maxUsers,
    };

    if (batchMode === 'user_ids') {
      if (parsedBatchUserIds.length === 0) {
        toast.error('Please input at least one valid user ID');
        return;
      }
      payload.user_ids = parsedBatchUserIds;
    } else {
      const storeId = Number.parseInt(batchStoreId, 10);
      if (!Number.isInteger(storeId) || storeId <= 0) {
        toast.error('Please select a store');
        return;
      }
      payload.store_id = storeId;
    }

    setBatchSending(true);
    try {
      const result = await sendAdminPushBatch(payload);
      setBatchResult(result);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to send batch push');
    } finally {
      setBatchSending(false);
    }
  };

  return (
    <AdminLayout>
      <TopBar title="推送中心" subtitle="单用户推送 + 批量推送（仅超管）" />
      <div className="px-4 py-5 space-y-4 lg:px-6">
        <div className="card-surface p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Push center</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">APNs 运营推送台</h2>
            <p className="mt-1 text-xs text-slate-500">仅支持超管操作；会按用户设备 Token 实际发送。</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <BellRing className="h-5 w-5 text-blue-600" />
          </div>
        </div>

        <div className="card-surface p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-gold-500" />
            <p className="text-sm font-semibold text-slate-900">单用户推送</p>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              type="number"
              min={1}
              step={1}
              value={singleUserId}
              onChange={(event) => setSingleUserId(event.target.value)}
              placeholder="User ID"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
            />
            <input
              value={singleTitle}
              onChange={(event) => setSingleTitle(event.target.value)}
              placeholder="Push title"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
            />
          </div>
          <textarea
            value={singleMessage}
            onChange={(event) => setSingleMessage(event.target.value)}
            rows={3}
            placeholder="Push message"
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
          />
          <button
            onClick={handleSendSingle}
            disabled={singleSending}
            className="rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {singleSending ? 'Sending...' : 'Send Single Push'}
          </button>

          {singleResult && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Last Result</p>
              <p className="mt-1">Target user: {singleResult.target_user_id}</p>
              <p>
                Token result: sent {singleResult.sent} / failed {singleResult.failed} / deactivated {singleResult.deactivated}
              </p>
            </div>
          )}
        </div>

        <div className="card-surface p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gold-500" />
            <p className="text-sm font-semibold text-slate-900">批量推送</p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <button
              onClick={() => setBatchMode('user_ids')}
              className={`rounded-xl border px-3 py-2 text-sm ${
                batchMode === 'user_ids'
                  ? 'border-gold-500 bg-gold-50 text-slate-900'
                  : 'border-blue-100 text-slate-600'
              }`}
            >
              按用户ID列表
            </button>
            <button
              onClick={() => setBatchMode('store')}
              className={`rounded-xl border px-3 py-2 text-sm ${
                batchMode === 'store'
                  ? 'border-gold-500 bg-gold-50 text-slate-900'
                  : 'border-blue-100 text-slate-600'
              }`}
            >
              按店铺用户
            </button>
            <input
              type="number"
              min={1}
              max={500}
              step={1}
              value={batchMaxUsers}
              onChange={(event) => setBatchMaxUsers(event.target.value)}
              placeholder="Max users"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm !text-slate-900"
            />
            <div className="flex items-center rounded-xl border border-blue-100 bg-blue-50/40 px-3 text-xs text-slate-600">
              最大支持 500 用户
            </div>
          </div>

          {batchMode === 'user_ids' ? (
            <div className="space-y-1">
              <textarea
                value={batchUserIds}
                onChange={(event) => setBatchUserIds(event.target.value)}
                rows={4}
                placeholder="输入 user_id，支持逗号、空格、换行分隔"
                className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
              />
              <p className="text-xs text-slate-500">已解析 {parsedBatchUserIds.length} 个有效用户ID</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="relative">
                <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={batchStoreId}
                  onChange={(event) => setBatchStoreId(event.target.value)}
                  className="w-full rounded-xl border border-blue-100 bg-white py-2.5 pl-9 pr-3 text-sm !text-slate-900"
                >
                  <option value="">Select store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      #{store.id} {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-500">
                {storesLoading ? 'Loading stores...' : '将推送给该店铺有历史预约记录的用户'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              value={batchTitle}
              onChange={(event) => setBatchTitle(event.target.value)}
              placeholder="Push title"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
            />
            <input
              value={batchMessage}
              onChange={(event) => setBatchMessage(event.target.value)}
              placeholder="Push message"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
            />
          </div>

          <button
            onClick={handleSendBatch}
            disabled={batchSending}
            className="rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {batchSending ? 'Sending...' : 'Send Batch Push'}
          </button>

          {batchResult && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-sm text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">Last Batch Result</p>
              <p>
                Users: target {batchResult.target_user_count}, sent {batchResult.sent_user_count}, failed {batchResult.failed_user_count}, skipped {batchResult.skipped_user_count}
              </p>
              <p>
                Tokens: sent {batchResult.sent}, failed {batchResult.failed}, deactivated {batchResult.deactivated}
              </p>
              {batchResult.truncated && (
                <p className="text-amber-700">Recipient list exceeded max users and was truncated.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default PushCenter;
