import React, { useEffect, useMemo, useState } from 'react';
import { Ticket } from 'lucide-react';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import {
  Coupon,
  CouponPendingGrant,
  GrantCouponBatchResult,
  createCoupon,
  getCouponPendingGrants,
  getCoupons,
  grantCoupon,
  grantCouponBatch,
  revokeCouponPendingGrant,
  updateCoupon,
} from '../api/coupons';
import { toast } from 'react-toastify';

const Coupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingGrants, setPendingGrants] = useState<CouponPendingGrant[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState('');
  const [batchPhones, setBatchPhones] = useState('');
  const [batchGranting, setBatchGranting] = useState(false);
  const [batchResult, setBatchResult] = useState<GrantCouponBatchResult | null>(null);
  const [quickPhone, setQuickPhone] = useState('');
  const [quickAmount, setQuickAmount] = useState('10');
  const [quickMinSpend, setQuickMinSpend] = useState('20');
  const [quickValidDays, setQuickValidDays] = useState('30');
  const [quickGranting, setQuickGranting] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateType, setTemplateType] = useState<'fixed_amount' | 'percentage'>('fixed_amount');
  const [templateCategory, setTemplateCategory] = useState<'normal' | 'newcomer' | 'birthday' | 'referral' | 'activity'>('activity');
  const [templateDiscount, setTemplateDiscount] = useState('10');
  const [templateMinAmount, setTemplateMinAmount] = useState('20');
  const [templateMaxDiscount, setTemplateMaxDiscount] = useState('');
  const [templateValidDays, setTemplateValidDays] = useState('30');
  const [templateCreating, setTemplateCreating] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState<'fixed_amount' | 'percentage'>('fixed_amount');
  const [editCategory, setEditCategory] = useState<'normal' | 'newcomer' | 'birthday' | 'referral' | 'activity'>('activity');
  const [editDiscount, setEditDiscount] = useState('10');
  const [editMinAmount, setEditMinAmount] = useState('0');
  const [editMaxDiscount, setEditMaxDiscount] = useState('');
  const [editValidDays, setEditValidDays] = useState('30');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);
  const [togglingCouponId, setTogglingCouponId] = useState<number | null>(null);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const data = await getCoupons();
      setCoupons(data);
    } catch (error) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadPendingGrants = async () => {
    setPendingLoading(true);
    try {
      const rows = await getCouponPendingGrants({ status: 'pending', limit: 200 });
      setPendingGrants(rows);
    } catch (error) {
      toast.error('Failed to load pending phone grants');
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    loadPendingGrants();
  }, []);

  const formatCouponRule = (coupon: Coupon) => {
    if (coupon.type === 'percentage') {
      const maxText =
        typeof coupon.max_discount === 'number' && coupon.max_discount > 0
          ? ` (max $${Math.floor(coupon.max_discount)})`
          : '';
      return `${coupon.discount_value}% off${maxText}`;
    }
    return `$${coupon.discount_value} off`;
  };

  const duplicateMeta = useMemo(() => {
    const nameBuckets = new Map<string, number[]>();
    const ruleBuckets = new Map<string, number[]>();

    coupons.forEach((coupon) => {
      const nameKey = (coupon.name || '').trim().toLowerCase();
      if (nameKey) {
        const arr = nameBuckets.get(nameKey) || [];
        arr.push(coupon.id);
        nameBuckets.set(nameKey, arr);
      }

      const ruleKey = [
        coupon.type || '',
        coupon.category || '',
        Number(coupon.discount_value || 0),
        Number(coupon.min_amount || 0),
        coupon.max_discount == null ? 'null' : Number(coupon.max_discount),
        Number(coupon.valid_days || 0),
        coupon.points_required == null ? 'null' : Number(coupon.points_required),
      ].join('|');
      const ruleArr = ruleBuckets.get(ruleKey) || [];
      ruleArr.push(coupon.id);
      ruleBuckets.set(ruleKey, ruleArr);
    });

    const duplicateNameIds = new Set<number>();
    const duplicateRuleIds = new Set<number>();
    nameBuckets.forEach((ids) => {
      if (ids.length > 1) ids.forEach((id) => duplicateNameIds.add(id));
    });
    ruleBuckets.forEach((ids) => {
      if (ids.length > 1) ids.forEach((id) => duplicateRuleIds.add(id));
    });

    return {
      duplicateNameIds,
      duplicateRuleIds,
      duplicateNameCount: duplicateNameIds.size,
      duplicateRuleCount: duplicateRuleIds.size,
    };
  }, [coupons]);

  const handleRevokePending = async (grantId: number) => {
    try {
      await revokeCouponPendingGrant(grantId);
      toast.success('Pending grant revoked');
      loadPendingGrants();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to revoke pending grant');
    }
  };

  const parseBatchPhones = (value: string) => {
    return Array.from(new Set(
      value
        .split(/[\n,;\s]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ));
  };

  const handleBatchGrant = async () => {
    if (!selectedCoupon) {
      toast.error('Please select coupon first');
      return;
    }
    const phones = parseBatchPhones(batchPhones);
    if (phones.length === 0) {
      toast.error('Please input at least one phone number');
      return;
    }

    setBatchGranting(true);
    try {
      const result = await grantCouponBatch({ coupon_id: Number(selectedCoupon), phones });
      setBatchResult(result);
      toast.success(
        `Batch done: granted ${result.granted_count}, pending ${result.pending_count}, failed ${result.failed_count}`,
      );
      loadPendingGrants();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to batch grant coupons');
    } finally {
      setBatchGranting(false);
    }
  };

  const handleQuickCreateAndGrant = async () => {
    const amount = Number.parseInt(quickAmount, 10);
    const minSpend = Number.parseInt(quickMinSpend, 10);
    const validDays = Number.parseInt(quickValidDays, 10);
    if (!quickPhone.trim()) {
      toast.error('Phone is required');
      return;
    }
    if (Number.isNaN(amount) || amount < 1) {
      toast.error('Coupon amount must be at least 1');
      return;
    }
    if (Number.isNaN(minSpend) || minSpend < 0) {
      toast.error('Min spend must be 0 or greater');
      return;
    }
    if (Number.isNaN(validDays) || validDays < 1) {
      toast.error('Valid days must be at least 1');
      return;
    }

    setQuickGranting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      const created = await createCoupon({
        name: `$${amount} OFF ${stamp}`,
        description: `Admin quick issue $${amount} coupon`,
        type: 'fixed_amount',
        category: 'activity',
        discount_value: amount,
        min_amount: minSpend,
        valid_days: validDays,
        is_active: true,
      });
      const result = await grantCoupon({ phone: quickPhone.trim(), coupon_id: created.id });
      toast.success(`Created coupon #${created.id} and ${result.status === 'pending_claim' ? 'queued pending claim' : 'granted'}`);
      setQuickPhone('');
      await Promise.all([loadPendingGrants(), loadCoupons()]);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create and grant coupon');
    } finally {
      setQuickGranting(false);
    }
  };

  const handleCreateTemplate = async () => {
    const discount = Number.parseFloat(templateDiscount);
    const minAmount = Number.parseFloat(templateMinAmount);
    const validDays = Number.parseInt(templateValidDays, 10);
    const maxDiscount = templateType === 'percentage' && templateMaxDiscount.trim() ? Number.parseFloat(templateMaxDiscount) : undefined;

    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (Number.isNaN(discount) || discount <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }
    if (Number.isNaN(minAmount) || minAmount < 0) {
      toast.error('Min spend must be 0 or greater');
      return;
    }
    if (Number.isNaN(validDays) || validDays < 1) {
      toast.error('Valid days must be at least 1');
      return;
    }
    if (templateType === 'percentage' && templateMaxDiscount.trim() && (Number.isNaN(maxDiscount!) || maxDiscount! <= 0)) {
      toast.error('Max discount must be greater than 0');
      return;
    }

    setTemplateCreating(true);
    try {
      const created = await createCoupon({
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        type: templateType,
        category: templateCategory,
        discount_value: discount,
        min_amount: minAmount,
        max_discount: templateType === 'percentage' ? (templateMaxDiscount.trim() ? maxDiscount : null) : null,
        valid_days: validDays,
        is_active: true,
      });
      toast.success(`Template created: #${created.id}`);
      setTemplateName('');
      setTemplateDescription('');
      setTemplateDiscount('10');
      setTemplateMinAmount('20');
      setTemplateMaxDiscount('');
      setTemplateValidDays('30');
      await loadCoupons();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create coupon template');
    } finally {
      setTemplateCreating(false);
    }
  };

  const startEditCoupon = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setEditName(coupon.name || '');
    setEditDescription(coupon.description || '');
    setEditType((coupon.type as 'fixed_amount' | 'percentage') || 'fixed_amount');
    setEditCategory((coupon.category as 'normal' | 'newcomer' | 'birthday' | 'referral' | 'activity') || 'activity');
    setEditDiscount(String(coupon.discount_value ?? 10));
    setEditMinAmount(String(coupon.min_amount ?? 0));
    setEditMaxDiscount(coupon.max_discount == null ? '' : String(coupon.max_discount));
    setEditValidDays(String(coupon.valid_days ?? 30));
    setEditIsActive(coupon.is_active !== false);
  };

  const handleSaveCouponEdit = async () => {
    if (!editingCouponId) return;
    const discount = Number.parseFloat(editDiscount);
    const minAmount = Number.parseFloat(editMinAmount);
    const maxDiscount = editType === 'percentage' && editMaxDiscount.trim() ? Number.parseFloat(editMaxDiscount) : undefined;
    const validDays = Number.parseInt(editValidDays, 10);
    if (!editName.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (Number.isNaN(discount) || discount <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }
    if (Number.isNaN(minAmount) || minAmount < 0) {
      toast.error('Min spend must be 0 or greater');
      return;
    }
    if (editType === 'percentage' && editMaxDiscount.trim() && (Number.isNaN(maxDiscount!) || maxDiscount! <= 0)) {
      toast.error('Max discount must be greater than 0');
      return;
    }
    if (Number.isNaN(validDays) || validDays < 1) {
      toast.error('Valid days must be at least 1');
      return;
    }
    setEditSaving(true);
    try {
      await updateCoupon(editingCouponId, {
        name: editName.trim(),
        description: editDescription.trim(),
        type: editType,
        category: editCategory,
        discount_value: discount,
        min_amount: minAmount,
        max_discount: editType === 'percentage' ? (editMaxDiscount.trim() ? maxDiscount : null) : null,
        valid_days: validDays,
        is_active: editIsActive,
      });
      toast.success('Coupon template updated');
      setEditingCouponId(null);
      await loadCoupons();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update coupon template');
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleCouponActive = async (coupon: Coupon) => {
    setTogglingCouponId(coupon.id);
    try {
      await updateCoupon(coupon.id, { is_active: !(coupon.is_active !== false) });
      toast.success(`Coupon ${coupon.is_active !== false ? 'deactivated' : 'activated'}`);
      await loadCoupons();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update coupon status');
    } finally {
      setTogglingCouponId(null);
    }
  };

  return (
    <AdminLayout>
      <TopBar title="优惠券管理" subtitle="发放优惠券并查看模板列表" />
      <div className="px-4 py-5 space-y-4 lg:px-6">
        <div className="card-surface p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Coupons overview</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{coupons.length} 个优惠券模板</h2>
            <p className="mt-1 text-xs text-slate-600">
              重复名称: {duplicateMeta.duplicateNameCount} 条 | 重复规则: {duplicateMeta.duplicateRuleCount} 条
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <Ticket className="h-5 w-5 text-blue-600" />
          </div>
        </div>

        <div className="card-surface p-5 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Coupon Distribution</p>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Quick Create & Grant (Fixed Amount)</p>
            <input
              value={quickPhone}
              onChange={(event) => setQuickPhone(event.target.value)}
              placeholder="Recipient phone"
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min={1}
                step={1}
                value={quickAmount}
                onChange={(event) => setQuickAmount(event.target.value)}
                placeholder="Amount"
                className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
              <input
                type="number"
                min={0}
                step={1}
                value={quickMinSpend}
                onChange={(event) => setQuickMinSpend(event.target.value)}
                placeholder="Min Spend"
                className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
              <input
                type="number"
                min={1}
                step={1}
                value={quickValidDays}
                onChange={(event) => setQuickValidDays(event.target.value)}
                placeholder="Valid Days"
                className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
            </div>
            <button
              onClick={handleQuickCreateAndGrant}
              disabled={quickGranting}
              className="w-full rounded-xl border border-blue-300 py-3 text-sm font-semibold text-blue-700 disabled:opacity-60"
            >
              {quickGranting ? 'Processing...' : 'Create & Grant'}
            </button>
          </div>

          <div className="pt-2 border-t border-blue-100 space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Batch Grant (Phones)</p>
            <select
              value={selectedCoupon}
              onChange={(event) => setSelectedCoupon(event.target.value)}
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="">Select coupon template</option>
              {coupons.map((coupon) => (
                <option key={coupon.id} value={coupon.id}>
                  {coupon.name} ({formatCouponRule(coupon)}, min ${coupon.min_amount})
                </option>
              ))}
            </select>
            <textarea
              value={batchPhones}
              onChange={(event) => setBatchPhones(event.target.value)}
              placeholder={'Paste phone list, separated by newline/comma.\nExample:\n4151234567\n14151234568'}
              rows={5}
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
            />
            <button
              onClick={handleBatchGrant}
              disabled={batchGranting}
              className="w-full rounded-xl border border-blue-300 py-3 text-sm font-semibold text-blue-700 disabled:opacity-60"
            >
              {batchGranting ? 'Batch Granting...' : 'Batch Grant'}
            </button>
            {batchResult && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-700 space-y-2">
                <div>
                  <p>Total: {batchResult.total}</p>
                  <p>Granted: {batchResult.granted_count}</p>
                  <p>Pending Claim: {batchResult.pending_count}</p>
                  <p>Failed: {batchResult.failed_count}</p>
                </div>
                <div className="overflow-auto rounded-lg border border-blue-100 bg-white">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-blue-50">
                      <tr className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                        <th className="px-2 py-2 font-medium">Input Phone</th>
                        <th className="px-2 py-2 font-medium">Normalized</th>
                        <th className="px-2 py-2 font-medium">Status</th>
                        <th className="px-2 py-2 font-medium">Detail</th>
                        <th className="px-2 py-2 font-medium">SMS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchResult.items.map((item, idx) => (
                        <tr key={`${item.input_phone}-${idx}`} className="border-t border-blue-100">
                          <td className="px-2 py-2 text-slate-900">{item.input_phone}</td>
                          <td className="px-2 py-2 text-slate-700">{item.normalized_phone || '-'}</td>
                          <td className="px-2 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 ${
                                item.status === 'granted'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : item.status === 'pending_claim'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-slate-700">{item.detail}</td>
                          <td className="px-2 py-2 text-slate-700">
                            {item.sms_sent == null ? '-' : item.sms_sent ? 'sent' : 'not sent'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card-surface p-5 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Create Template</p>
          <input
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
            placeholder="Template name"
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
          />
          <input
            value={templateDescription}
            onChange={(event) => setTemplateDescription(event.target.value)}
            placeholder="Description"
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={templateType}
              onChange={(event) => setTemplateType(event.target.value as 'fixed_amount' | 'percentage')}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="fixed_amount">Fixed Amount</option>
              <option value="percentage">Percentage</option>
            </select>
            <select
              value={templateCategory}
              onChange={(event) =>
                setTemplateCategory(event.target.value as 'normal' | 'newcomer' | 'birthday' | 'referral' | 'activity')
              }
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="normal">normal</option>
              <option value="newcomer">newcomer</option>
              <option value="birthday">birthday</option>
              <option value="referral">referral</option>
              <option value="activity">activity</option>
            </select>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <input
              type="number"
              min={1}
              step={1}
              value={templateDiscount}
              onChange={(event) => setTemplateDiscount(event.target.value)}
              placeholder="Discount"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
            />
            <input
              type="number"
              min={0}
              step={1}
              value={templateMinAmount}
              onChange={(event) => setTemplateMinAmount(event.target.value)}
              placeholder="Min Spend"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
            />
            <input
              type="number"
              min={1}
              step={1}
              value={templateValidDays}
              onChange={(event) => setTemplateValidDays(event.target.value)}
              placeholder="Valid Days"
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
            />
            <input
              type="number"
              min={1}
              step={1}
              value={templateMaxDiscount}
              onChange={(event) => setTemplateMaxDiscount(event.target.value)}
              placeholder="Max Discount(optional)"
              disabled={templateType !== 'percentage'}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900 disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleCreateTemplate}
            disabled={templateCreating}
            className="w-full rounded-xl border border-blue-300 py-3 text-sm font-semibold text-blue-700 disabled:opacity-60"
          >
            {templateCreating ? 'Creating...' : 'Create Template'}
          </button>
        </div>

        <div className="card-surface p-5 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Templates</p>
          {loading ? (
            <div className="text-slate-500">Loading coupons...</div>
          ) : (
            <div className="overflow-auto rounded-xl border border-blue-100 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-blue-50">
                  <tr className="text-xs uppercase tracking-[0.15em] text-slate-500">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Value</th>
                    <th className="px-4 py-3 font-medium">Min Spend</th>
                    <th className="px-4 py-3 font-medium">Valid Days</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Edit</th>
                    <th className="px-4 py-3 font-medium">重复提示</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="border-t border-blue-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{coupon.name}</td>
                      <td className="px-4 py-3 text-slate-700">{coupon.description || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{coupon.type}</td>
                      <td className="px-4 py-3 text-slate-700">{formatCouponRule(coupon)}</td>
                      <td className="px-4 py-3 text-slate-700">${coupon.min_amount}</td>
                      <td className="px-4 py-3 text-slate-700">{coupon.valid_days} days</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleCouponActive(coupon)}
                          disabled={togglingCouponId === coupon.id}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${
                            coupon.is_active !== false
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-slate-300 bg-slate-100 text-slate-700'
                          }`}
                        >
                          {togglingCouponId === coupon.id
                            ? 'Updating...'
                            : coupon.is_active !== false
                            ? 'Active'
                            : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => startEditCoupon(coupon)}
                          className="rounded-lg border border-blue-300 px-2.5 py-1 text-xs font-semibold text-blue-700"
                        >
                          Edit
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {duplicateMeta.duplicateNameIds.has(coupon.id) && (
                          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-700 mr-1">
                            名称重复
                          </span>
                        )}
                        {duplicateMeta.duplicateRuleIds.has(coupon.id) && (
                          <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-rose-700">
                            规则重复
                          </span>
                        )}
                        {!duplicateMeta.duplicateNameIds.has(coupon.id) && !duplicateMeta.duplicateRuleIds.has(coupon.id) && (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {editingCouponId && (
          <div className="card-surface p-5 space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Edit Template #{editingCouponId}</p>
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Template name"
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
            />
            <input
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              placeholder="Description"
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={editType}
                onChange={(event) => setEditType(event.target.value as 'fixed_amount' | 'percentage')}
                className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
              >
                <option value="fixed_amount">Fixed Amount</option>
                <option value="percentage">Percentage</option>
              </select>
              <select
                value={editCategory}
                onChange={(event) =>
                  setEditCategory(event.target.value as 'normal' | 'newcomer' | 'birthday' | 'referral' | 'activity')
                }
                className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
              >
                <option value="normal">normal</option>
                <option value="newcomer">newcomer</option>
                <option value="birthday">birthday</option>
                <option value="referral">referral</option>
                <option value="activity">activity</option>
              </select>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="number"
                min={1}
                step={1}
                value={editDiscount}
                onChange={(event) => setEditDiscount(event.target.value)}
                placeholder="Discount"
                className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
              <input
                type="number"
                min={0}
                step={1}
                value={editMinAmount}
                onChange={(event) => setEditMinAmount(event.target.value)}
                placeholder="Min Spend"
                className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
              <input
                type="number"
                min={1}
                step={1}
                value={editMaxDiscount}
                onChange={(event) => setEditMaxDiscount(event.target.value)}
                placeholder="Max Discount(optional)"
                disabled={editType !== 'percentage'}
                className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900 disabled:opacity-50"
              />
              <input
                type="number"
                min={1}
                step={1}
                value={editValidDays}
                onChange={(event) => setEditValidDays(event.target.value)}
                placeholder="Valid Days"
                className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editIsActive}
                onChange={(event) => setEditIsActive(event.target.checked)}
              />
              Active
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSaveCouponEdit}
                disabled={editSaving}
                className="rounded-xl border border-blue-300 py-3 text-sm font-semibold text-blue-700 disabled:opacity-60"
              >
                {editSaving ? 'Saving...' : 'Save Template'}
              </button>
              <button
                onClick={() => setEditingCouponId(null)}
                className="rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="card-surface p-5 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pending Phone Claims</p>
          {pendingLoading ? (
            <div className="text-slate-500">Loading pending grants...</div>
          ) : pendingGrants.length === 0 ? (
            <div className="text-slate-500 text-sm">No pending phone coupon claims.</div>
          ) : (
            <div className="overflow-auto rounded-xl border border-blue-100 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-blue-50">
                  <tr className="text-xs uppercase tracking-[0.15em] text-slate-500">
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Coupon</th>
                    <th className="px-4 py-3 font-medium">Granted At</th>
                    <th className="px-4 py-3 font-medium">Claim Expires</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingGrants.map((row) => (
                    <tr key={row.id} className="border-t border-blue-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.phone}</td>
                      <td className="px-4 py-3 text-slate-700">{row.coupon_name || `#${row.coupon_id}`}</td>
                      <td className="px-4 py-3 text-slate-700">{new Date(row.granted_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">{row.claim_expires_at ? new Date(row.claim_expires_at).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{row.status}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRevokePending(row.id)}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-600"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Coupons;
