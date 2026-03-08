import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Smartphone } from 'lucide-react';

import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { useAuth } from '../context/AuthContext';
import {
  AppPlatform,
  AppVersionPolicy,
  AppVersionPolicyUpdatePayload,
  getAdminAppVersionPolicies,
  getAdminAppVersionPolicy,
  updateAdminAppVersionPolicy,
} from '../api/appVersion';

type PolicyFormState = {
  latest_version: string;
  latest_build: string;
  min_supported_version: string;
  min_supported_build: string;
  app_store_url: string;
  update_title: string;
  update_message: string;
  release_notes: string;
  is_enabled: boolean;
};

const platformLabels: Record<AppPlatform, string> = {
  ios: 'iOS',
  android: 'Android',
  h5: 'H5',
};

const emptyForm: PolicyFormState = {
  latest_version: '',
  latest_build: '',
  min_supported_version: '',
  min_supported_build: '',
  app_store_url: '',
  update_title: '',
  update_message: '',
  release_notes: '',
  is_enabled: true,
};

const toNullableText = (value: string): string | null => {
  const normalized = value.trim();
  return normalized ? normalized : null;
};

const toNullableNumber = (value: string): number | null => {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const policyToForm = (policy: AppVersionPolicy): PolicyFormState => ({
  latest_version: policy.latest_version || '',
  latest_build: policy.latest_build == null ? '' : String(policy.latest_build),
  min_supported_version: policy.min_supported_version || '',
  min_supported_build: policy.min_supported_build == null ? '' : String(policy.min_supported_build),
  app_store_url: policy.app_store_url || '',
  update_title: policy.update_title || '',
  update_message: policy.update_message || '',
  release_notes: policy.release_notes || '',
  is_enabled: policy.is_enabled !== false,
});

const VersionCenter: React.FC = () => {
  const { user } = useAuth();
  const [selectedPlatform, setSelectedPlatform] = useState<AppPlatform>('ios');
  const [form, setForm] = useState<PolicyFormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allPolicies, setAllPolicies] = useState<AppVersionPolicy[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('');

  const summaryRows = useMemo(() => {
    const byPlatform = new Map<AppPlatform, AppVersionPolicy>();
    (allPolicies || []).forEach((policy) => {
      byPlatform.set(policy.platform, policy);
    });
    return (['ios', 'android', 'h5'] as AppPlatform[]).map((platform) => ({
      platform,
      policy: byPlatform.get(platform) || null,
    }));
  }, [allPolicies]);

  const loadAllPolicies = async () => {
    try {
      const rows = await getAdminAppVersionPolicies();
      setAllPolicies(Array.isArray(rows) ? rows : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '加载版本策略列表失败');
    }
  };

  const loadPlatformPolicy = async (platform: AppPlatform) => {
    setLoading(true);
    try {
      const policy = await getAdminAppVersionPolicy(platform);
      setForm(policyToForm(policy));
      setLastUpdatedAt(policy.updated_at || '');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '加载版本策略失败');
      setForm(emptyForm);
      setLastUpdatedAt('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.is_admin) return;
    loadAllPolicies();
  }, [user?.is_admin]);

  useEffect(() => {
    if (!user?.is_admin) return;
    loadPlatformPolicy(selectedPlatform);
  }, [selectedPlatform, user?.is_admin]);

  const setField = <K extends keyof PolicyFormState>(key: K, value: PolicyFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const latestBuild = toNullableNumber(form.latest_build);
    const minSupportedBuild = toNullableNumber(form.min_supported_build);

    if (form.latest_build.trim() && latestBuild == null) {
      toast.error('Latest build 必须是整数');
      return;
    }
    if (form.min_supported_build.trim() && minSupportedBuild == null) {
      toast.error('Min supported build 必须是整数');
      return;
    }
    if (latestBuild != null && minSupportedBuild != null && minSupportedBuild > latestBuild) {
      toast.error('最小支持 build 不能大于最新 build');
      return;
    }

    const payload: AppVersionPolicyUpdatePayload = {
      platform: selectedPlatform,
      latest_version: form.latest_version.trim(),
      latest_build: latestBuild,
      min_supported_version: form.min_supported_version.trim(),
      min_supported_build: minSupportedBuild,
      app_store_url: toNullableText(form.app_store_url),
      update_title: toNullableText(form.update_title),
      update_message: toNullableText(form.update_message),
      release_notes: toNullableText(form.release_notes),
      is_enabled: Boolean(form.is_enabled),
    };

    setSaving(true);
    try {
      const updated = await updateAdminAppVersionPolicy(payload);
      setForm(policyToForm(updated));
      setLastUpdatedAt(updated.updated_at || '');
      await loadAllPolicies();
      toast.success('版本策略已保存');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '保存版本策略失败');
    } finally {
      setSaving(false);
    }
  };

  if (!user?.is_admin) {
    return (
      <AdminLayout>
        <TopBar title="Version Center" subtitle="仅超级管理员可访问" />
        <div className="px-4 py-6 text-sm text-slate-900">只有超级管理员可以管理 App 版本更新策略。</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <TopBar title="Version Center" subtitle="配置 iOS / Android / H5 的建议更新与强制更新规则" />
      <div className="px-4 py-5 space-y-4 lg:px-6">
        <div className="card-surface p-4 text-sm text-slate-700 space-y-1">
          <p>1. 最小支持版本 / Build：低于该版本会触发强制更新（不可跳过）。</p>
          <p>2. 最新版本 / Build：低于该版本会提示建议更新（可稍后更新）。</p>
          <p>3. App Store URL 建议填写完整下载链接，iOS 会直接跳转更新。</p>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-gold-500" />
              <p className="text-sm font-semibold text-slate-900">平台策略</p>
            </div>
            <div className="text-xs text-slate-500">
              {lastUpdatedAt ? `Last updated: ${new Date(lastUpdatedAt).toLocaleString()}` : 'Last updated: -'}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(['ios', 'android', 'h5'] as AppPlatform[]).map((platform) => (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  selectedPlatform === platform
                    ? 'border-gold-500 bg-gold-50 text-slate-900'
                    : 'border-blue-100 text-slate-600'
                }`}
              >
                {platformLabels[platform]}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Latest Version</span>
              <input
                value={form.latest_version}
                onChange={(event) => setField('latest_version', event.target.value)}
                placeholder="e.g. 1.3.0"
                className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Latest Build</span>
              <input
                value={form.latest_build}
                onChange={(event) => setField('latest_build', event.target.value)}
                placeholder="e.g. 130"
                className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Min Supported Version</span>
              <input
                value={form.min_supported_version}
                onChange={(event) => setField('min_supported_version', event.target.value)}
                placeholder="e.g. 1.1.0"
                className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Min Supported Build</span>
              <input
                value={form.min_supported_build}
                onChange={(event) => setField('min_supported_build', event.target.value)}
                placeholder="e.g. 110"
                className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
              />
            </label>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">App Store URL</span>
              <input
                value={form.app_store_url}
                onChange={(event) => setField('app_store_url', event.target.value)}
                placeholder="https://apps.apple.com/app/..."
                className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Update Title</span>
              <input
                value={form.update_title}
                onChange={(event) => setField('update_title', event.target.value)}
                placeholder="Update Required / Update Available"
                className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Update Message</span>
              <textarea
                rows={3}
                value={form.update_message}
                onChange={(event) => setField('update_message', event.target.value)}
                placeholder="Message shown in app update modal"
                className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Release Notes</span>
              <textarea
                rows={4}
                value={form.release_notes}
                onChange={(event) => setField('release_notes', event.target.value)}
                placeholder="What's new"
                className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
              />
            </label>
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-900">
            <input
              type="checkbox"
              checked={form.is_enabled}
              onChange={(event) => setField('is_enabled', event.target.checked)}
            />
            Enable policy for {platformLabels[selectedPlatform]}
          </label>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="rounded-xl border border-gold-500/60 px-4 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Policy'}
            </button>
            <button
              onClick={() => loadPlatformPolicy(selectedPlatform)}
              disabled={saving || loading}
              className="rounded-xl border border-blue-200 px-4 py-2.5 text-sm text-slate-900 disabled:opacity-60"
            >
              {loading ? 'Loading...' : 'Reload'}
            </button>
          </div>
        </div>

        <div className="card-surface overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-blue-50">
              <tr className="text-xs uppercase tracking-[0.15em] text-slate-500 border-b border-blue-100">
                <th className="px-3 py-2">Platform</th>
                <th className="px-3 py-2">Enabled</th>
                <th className="px-3 py-2">Latest</th>
                <th className="px-3 py-2">Min Supported</th>
                <th className="px-3 py-2">Updated At</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map(({ platform, policy }) => (
                <tr key={platform} className="border-b border-blue-100">
                  <td className="px-3 py-2 text-slate-900">{platformLabels[platform]}</td>
                  <td className="px-3 py-2 text-slate-700">{policy ? (policy.is_enabled ? 'Yes' : 'No') : '-'}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {policy?.latest_version || '-'}
                    {policy?.latest_build != null ? ` (${policy.latest_build})` : ''}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {policy?.min_supported_version || '-'}
                    {policy?.min_supported_build != null ? ` (${policy.min_supported_build})` : ''}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {policy?.updated_at ? new Date(policy.updated_at).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default VersionCenter;
