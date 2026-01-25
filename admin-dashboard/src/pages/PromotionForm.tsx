import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { createPromotion, getPromotions, updatePromotion } from '../api/promotions';
import { getStores, Store } from '../api/stores';
import { getServices, Service } from '../api/services';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const PromotionForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { role, user } = useAuth();
  const isEdit = Boolean(id);
  const [stores, setStores] = useState<Store[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    scope: 'store',
    store_id: user?.store_id || '',
    title: '',
    type: 'promotion',
    discount_type: 'fixed_amount',
    discount_value: 10,
    start_at: '',
    end_at: '',
    service_id: '',
    min_price: '',
    max_price: '',
  });

  useEffect(() => {
    const loadInitial = async () => {
      const storeData = await getStores({ limit: 100 });
      setStores(storeData);
    };
    loadInitial();
  }, []);

  useEffect(() => {
    if (!formData.store_id) return;
    getServices({ store_id: formData.store_id, limit: 200 })
      .then(setServices)
      .catch(() => setServices([]));
  }, [formData.store_id]);

  useEffect(() => {
    if (!isEdit) return;
    const loadPromotion = async () => {
      const data = await getPromotions({ limit: 200 });
      const promotion = data.find((item) => String(item.id) === id);
      if (!promotion) return;
      setFormData((prev) => ({
        ...prev,
        scope: promotion.scope,
        store_id: promotion.store_id || '',
        title: promotion.title,
        type: promotion.type,
        discount_type: promotion.discount_type,
        discount_value: promotion.discount_value,
        start_at: promotion.start_at.slice(0, 16),
        end_at: promotion.end_at.slice(0, 16),
      }));
    };
    loadPromotion();
  }, [id, isEdit]);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        scope: formData.scope,
        store_id: formData.scope === 'store' ? Number(formData.store_id) : null,
        title: formData.title,
        type: formData.type,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        start_at: new Date(formData.start_at).toISOString(),
        end_at: new Date(formData.end_at).toISOString(),
        is_active: true,
        service_rules: formData.service_id
          ? [
              {
                service_id: Number(formData.service_id),
                min_price: formData.min_price ? Number(formData.min_price) : null,
                max_price: formData.max_price ? Number(formData.max_price) : null,
              },
            ]
          : [],
      };

      if (isEdit && id) {
        await updatePromotion(Number(id), payload);
        toast.success('Promotion updated');
      } else {
        await createPromotion(payload);
        toast.success('Promotion created');
      }
      navigate('/admin/promotions');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save promotion');
    } finally {
      setLoading(false);
    }
  };

  const canUsePlatform = role === 'super_admin';

  return (
    <AdminLayout>
      <TopBar title={isEdit ? 'Edit Promotion' : 'New Promotion'} />
      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-4">
        <div className="card-surface p-4 space-y-3">
          <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Scope</label>
          <select
            value={formData.scope}
            onChange={(event) => handleChange('scope', event.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            disabled={!canUsePlatform}
          >
            <option value="store">Store</option>
            <option value="platform">Platform</option>
          </select>
        </div>

        {formData.scope === 'store' && (
          <div className="card-surface p-4 space-y-3">
            <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Store</label>
            <select
              value={formData.store_id}
              onChange={(event) => handleChange('store_id', event.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              disabled={role === 'store_admin'}
            >
              <option value="">Select store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="card-surface p-4 space-y-3">
          <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Title</label>
          <input
            value={formData.title}
            onChange={(event) => handleChange('title', event.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card-surface p-4 space-y-3">
            <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Type</label>
            <input
              value={formData.type}
              onChange={(event) => handleChange('type', event.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            />
          </div>
          <div className="card-surface p-4 space-y-3">
            <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Discount Type</label>
            <select
              value={formData.discount_type}
              onChange={(event) => handleChange('discount_type', event.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            >
              <option value="fixed_amount">Fixed Amount</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>
        </div>

        <div className="card-surface p-4 space-y-3">
          <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Discount Value</label>
          <input
            type="number"
            value={formData.discount_value}
            onChange={(event) => handleChange('discount_value', event.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card-surface p-4 space-y-3">
            <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Start</label>
            <input
              type="datetime-local"
              value={formData.start_at}
              onChange={(event) => handleChange('start_at', event.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            />
          </div>
          <div className="card-surface p-4 space-y-3">
            <label className="text-xs uppercase tracking-[0.2em] text-gray-500">End</label>
            <input
              type="datetime-local"
              value={formData.end_at}
              onChange={(event) => handleChange('end_at', event.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="card-surface p-4 space-y-3">
          <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Service</label>
          <select
            value={formData.service_id}
            onChange={(event) => handleChange('service_id', event.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
          >
            <option value="">Select service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} (${service.price})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Min price"
              value={formData.min_price}
              onChange={(event) => handleChange('min_price', event.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Max price"
              value={formData.max_price}
              onChange={(event) => handleChange('max_price', event.target.value)}
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-black"
        >
          {loading ? 'Saving...' : 'Save Promotion'}
        </button>
      </form>
    </AdminLayout>
  );
};

export default PromotionForm;
