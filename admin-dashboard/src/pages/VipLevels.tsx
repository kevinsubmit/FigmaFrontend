import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { getAdminVipLevels, updateAdminVipLevels, VipLevelItem } from '../api/vip';
import { useAuth } from '../context/AuthContext';

const createDefaultLevels = (): VipLevelItem[] => ([
  { level: 0, min_spend: 0, min_visits: 0, benefit: 'Member Access', is_active: true },
  { level: 1, min_spend: 35, min_visits: 1, benefit: 'Priority Service (No Waiting)', is_active: true },
]);

const VipLevels: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<VipLevelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAdminVipLevels();
      setRows(data.length ? data : createDefaultLevels());
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '加载VIP等级配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.is_admin) return;
    loadData();
  }, [user?.is_admin]);

  const setCell = <K extends keyof VipLevelItem>(index: number, key: K, value: VipLevelItem[K]) => {
    setRows((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const addLevel = () => {
    const maxLevel = rows.reduce((max, item) => Math.max(max, item.level), 0);
    setRows((prev) => [...prev, { level: maxLevel + 1, min_spend: 0, min_visits: 0, benefit: '', is_active: true }]);
  };

  const removeLevel = (index: number) => {
    const target = rows[index];
    if (target?.level === 0) {
      toast.error('Level 0 不能删除');
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const validateRows = (list: VipLevelItem[]) => {
    if (!list.length) return '至少保留一个等级';
    const sorted = [...list].sort((a, b) => a.level - b.level);
    if (sorted[0].level !== 0) return '必须存在 Level 0';

    const seen = new Set<number>();
    let prevSpend = -1;
    let prevVisits = -1;
    for (const item of sorted) {
      if (seen.has(item.level)) return `Level ${item.level} 重复`;
      seen.add(item.level);
      if (item.min_spend < 0 || item.min_visits < 0) return '消费金额和到店次数不能小于0';
      if (!item.benefit.trim()) return `Level ${item.level} 的权益说明不能为空`;
      if (item.min_spend < prevSpend || item.min_visits < prevVisits) {
        return '等级阈值需递增（金额、次数都不能比上一档小）';
      }
      prevSpend = item.min_spend;
      prevVisits = item.min_visits;
    }
    return null;
  };

  const handleSave = async () => {
    const normalized = [...rows]
      .map((item) => ({
        level: Number(item.level),
        min_spend: Number(item.min_spend),
        min_visits: Number(item.min_visits),
        benefit: String(item.benefit || '').trim(),
        is_active: Boolean(item.is_active),
      }))
      .sort((a, b) => a.level - b.level);

    const errorMsg = validateRows(normalized);
    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateAdminVipLevels({ levels: normalized });
      setRows(updated);
      toast.success('VIP等级配置已保存');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!user?.is_admin) {
    return (
      <AdminLayout>
        <TopBar title="VIP等级配置" subtitle="仅超级管理员可操作" />
        <div className="px-4 py-6 text-sm text-slate-900">只有超级管理员可以管理 VIP 升级规则。</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <TopBar title="VIP等级配置" subtitle="配置升级所需消费金额、到店次数与权益文案（实时生效）" />
      <div className="px-4 py-5 space-y-4 lg:px-6">
        <div className="card-surface p-4 text-sm text-slate-700 space-y-1">
          <p>1. 升级规则采用“双条件”：达到该档的消费金额 + 到店次数。</p>
          <p>2. 等级按 Level 从小到大判断，阈值必须递增。</p>
          <p>3. Level 0 为基础等级，建议始终保留。</p>
        </div>

        <div className="card-surface overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-blue-50">
              <tr className="text-xs uppercase tracking-[0.15em] text-slate-500 border-b border-blue-100">
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">最低消费金额($)</th>
                <th className="px-3 py-2">最低到店次数</th>
                <th className="px-3 py-2">权益说明</th>
                <th className="px-3 py-2">启用</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {(loading ? [] : rows).map((row, index) => (
                <tr key={`${row.level}-${index}`} className="border-b border-blue-100">
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.level}
                      onChange={(e) => setCell(index, 'level', Number(e.target.value))}
                      className="w-24 rounded-lg border border-blue-100 bg-white px-2 py-2 !text-slate-900"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.min_spend}
                      onChange={(e) => setCell(index, 'min_spend', Number(e.target.value))}
                      className="w-40 rounded-lg border border-blue-100 bg-white px-2 py-2 !text-slate-900"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={row.min_visits}
                      onChange={(e) => setCell(index, 'min_visits', Number(e.target.value))}
                      className="w-32 rounded-lg border border-blue-100 bg-white px-2 py-2 !text-slate-900"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.benefit}
                      onChange={(e) => setCell(index, 'benefit', e.target.value)}
                      className="w-full min-w-[280px] rounded-lg border border-blue-100 bg-white px-2 py-2 !text-slate-900"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={(e) => setCell(index, 'is_active', e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => removeLevel(index)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-rose-600"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-4 text-sm text-slate-600">加载中...</div>}
        </div>

        <div className="flex gap-2">
          <button
            onClick={addLevel}
            className="rounded-xl border border-blue-200 px-4 py-2.5 text-sm text-slate-900"
          >
            新增等级
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl border border-gold-500/50 px-4 py-2.5 text-sm text-slate-900 disabled:opacity-60"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
          <button
            onClick={loadData}
            className="rounded-xl border border-blue-200 px-4 py-2.5 text-sm text-slate-900"
          >
            重新加载
          </button>
        </div>

        <div className="card-surface p-4 text-sm text-slate-700">
          配置保存后，H5 Profile 页面会自动按新规则计算与展示 VIP 等级。
        </div>
      </div>
    </AdminLayout>
  );
};

export default VipLevels;
