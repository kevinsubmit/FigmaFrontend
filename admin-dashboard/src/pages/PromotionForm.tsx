import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { createPromotion, getPromotion, updatePromotion } from '../api/promotions';
import { getStores, Store } from '../api/stores';
import { getStoreServices, Service } from '../api/services';
import { uploadImages } from '../api/upload';
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
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    scope: 'store',
    store_id: user?.store_id || '',
    title: '',
    type: 'promotion',
    image_url: '',
    discount_type: 'fixed_amount',
    discount_value: 10,
    start_at: '',
    end_at: '',
    service_ids: [] as string[],
    service_picker: '',
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
    if (!formData.store_id) {
      setServices([]);
      setFormData((prev) => ({ ...prev, service_ids: [], service_picker: '' }));
      return;
    }
    getStoreServices(Number(formData.store_id), { include_inactive: true })
      .then((data) => {
        setServices(data);
        setFormData((prev) => {
          const validIds = new Set(data.map((service) => String(service.id)));
          return {
            ...prev,
            service_ids: prev.service_ids.filter((serviceId) => validIds.has(serviceId)),
          };
        });
      })
      .catch(() => setServices([]));
  }, [formData.store_id]);

  useEffect(() => {
    if (!isEdit) return;
    const loadPromotion = async () => {
      if (!id) return;
      try {
        const promotion = await getPromotion(Number(id));
        const firstRule = promotion.service_rules?.[0];
        const selectedServiceIds = (promotion.service_rules ?? []).map((rule) =>
          String(rule.service_id)
        );

        setFormData((prev) => ({
          ...prev,
          scope: promotion.scope,
          store_id: promotion.store_id ? String(promotion.store_id) : '',
          title: promotion.title ?? '',
          type: promotion.type ?? 'promotion',
          image_url: promotion.image_url ?? '',
          discount_type: promotion.discount_type ?? 'fixed_amount',
          discount_value: promotion.discount_value ?? 10,
          start_at: promotion.start_at ? promotion.start_at.slice(0, 16) : '',
          end_at: promotion.end_at ? promotion.end_at.slice(0, 16) : '',
          service_ids: selectedServiceIds,
          service_picker: '',
          min_price:
            firstRule && firstRule.min_price != null ? String(firstRule.min_price) : '',
          max_price:
            firstRule && firstRule.max_price != null ? String(firstRule.max_price) : '',
        }));
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || 'Failed to load promotion');
      }
    };
    loadPromotion();
  }, [id, isEdit]);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStoreChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      store_id: value,
      service_ids: [],
      service_picker: '',
    }));
  };

  const handleAddService = (serviceId: string) => {
    if (!serviceId) return;
    setFormData((prev) => {
      if (prev.service_ids.includes(serviceId)) {
        return { ...prev, service_picker: '' };
      }
      return {
        ...prev,
        service_ids: [...prev.service_ids, serviceId],
        service_picker: '',
      };
    });
  };

  const handleRemoveService = (serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      service_ids: prev.service_ids.filter((id) => id !== serviceId),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        scope: formData.scope,
        store_id:
          formData.scope === 'store' && formData.store_id
            ? Number(formData.store_id)
            : null,
        title: formData.title,
        type: formData.type,
        image_url: formData.image_url.trim() || null,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        start_at: new Date(formData.start_at).toISOString(),
        end_at: new Date(formData.end_at).toISOString(),
        is_active: true,
        service_rules: formData.service_ids.map((serviceId) => ({
          service_id: Number(serviceId),
          min_price: formData.min_price ? Number(formData.min_price) : null,
          max_price: formData.max_price ? Number(formData.max_price) : null,
        })),
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
  const mediaBaseUrl =
    (import.meta.env.VITE_ADMIN_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

  const resolveImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${mediaBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handlePromotionImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const urls = await uploadImages([file]);
      if (!urls.length) {
        throw new Error('No uploaded image URL returned');
      }
      setFormData((prev) => ({ ...prev, image_url: urls[0] }));
      toast.success('Promotion image uploaded');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to upload promotion image');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  return (
    <AdminLayout>
      <TopBar title={isEdit ? 'Edit Promotion' : 'New Promotion'} />
      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-4">
        <div className="card-surface p-4 space-y-3">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Scope</label>
          <select
            value={formData.scope}
            onChange={(event) => handleChange('scope', event.target.value)}
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
            disabled={!canUsePlatform}
          >
            <option value="store">Store</option>
            <option value="platform">Platform</option>
          </select>
        </div>

        {formData.scope === 'store' && (
          <div className="card-surface p-4 space-y-3">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Store</label>
            <select
              value={formData.store_id}
              onChange={(event) => handleStoreChange(event.target.value)}
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
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
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Title</label>
          <input
            value={formData.title}
            onChange={(event) => handleChange('title', event.target.value)}
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
            required
          />
        </div>

        <div className="card-surface p-4 space-y-3">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Promotion Image</label>
          <div className="rounded-2xl border border-blue-100 bg-white p-2">
            {formData.image_url ? (
              <img
                src={resolveImageUrl(formData.image_url)}
                alt="Promotion"
                className="h-44 w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-44 w-full items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
                No image selected
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={formData.image_url}
              onChange={(event) => handleChange('image_url', event.target.value)}
              className="flex-1 rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
              placeholder="/uploads/xxx.jpg or https://..."
            />
            <button
              type="button"
              onClick={() => handleChange('image_url', '')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="promotion-image-upload"
              className="inline-flex cursor-pointer items-center rounded-xl bg-gold-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {uploadingImage ? 'Uploading...' : 'Upload image'}
            </label>
            <input
              id="promotion-image-upload"
              type="file"
              accept="image/png,image/jpeg"
              onChange={handlePromotionImageUpload}
              className="hidden"
              disabled={uploadingImage}
            />
            <p className="text-xs text-slate-500">JPG/PNG, up to 5MB.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card-surface p-4 space-y-3">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Type</label>
            <input
              value={formData.type}
              onChange={(event) => handleChange('type', event.target.value)}
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="card-surface p-4 space-y-3">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Discount Type</label>
            <select
              value={formData.discount_type}
              onChange={(event) => handleChange('discount_type', event.target.value)}
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
            >
              <option value="fixed_amount">Fixed Amount</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>
        </div>

        <div className="card-surface p-4 space-y-3">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Discount Value</label>
          <input
            type="number"
            value={formData.discount_value}
            onChange={(event) => handleChange('discount_value', event.target.value)}
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card-surface p-4 space-y-3">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Start</label>
            <input
              type="datetime-local"
              value={formData.start_at}
              onChange={(event) => handleChange('start_at', event.target.value)}
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="card-surface p-4 space-y-3">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">End</label>
            <input
              type="datetime-local"
              value={formData.end_at}
              onChange={(event) => handleChange('end_at', event.target.value)}
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="card-surface p-4 space-y-3">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Service</label>
          <select
            value={formData.service_picker}
            onChange={(event) => handleAddService(event.target.value)}
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
            disabled={formData.scope === 'store' && !formData.store_id}
          >
            <option value="">
              {formData.scope === 'store' && !formData.store_id
                ? 'Select store first'
                : 'Select service to add'}
            </option>
            {services
              .filter((service) => !formData.service_ids.includes(String(service.id)))
              .map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} (${service.price})
              </option>
              ))}
          </select>
          {formData.service_ids.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {formData.service_ids.map((serviceId) => {
                const service = services.find((item) => String(item.id) === serviceId);
                if (!service) return null;
                return (
                  <span
                    key={serviceId}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs text-slate-700"
                  >
                    {service.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveService(serviceId)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          ) : services.length === 0 && formData.scope === 'store' && formData.store_id ? (
            <p className="text-xs text-amber-600">
              No services found in this store. Please add services in Service Catalog first.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Select one or more services from this store.
            </p>
          )}
          <p className="text-xs text-slate-500">
            Min/Max price below applies to all selected services.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Min price"
              value={formData.min_price}
              onChange={(event) => handleChange('min_price', event.target.value)}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Max price"
              value={formData.max_price}
              onChange={(event) => handleChange('max_price', event.target.value)}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-white"
        >
          {loading ? 'Saving...' : 'Save Promotion'}
        </button>
      </form>
    </AdminLayout>
  );
};

export default PromotionForm;
