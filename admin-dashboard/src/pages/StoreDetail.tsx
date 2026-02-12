import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, Clock3, ImagePlus, Mail, MapPin, Phone, Scissors, Star, Trash2 } from 'lucide-react';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import {
  addStoreImage,
  deleteStoreImage,
  getStoreById,
  getStoreHours,
  getStoreImages,
  setStoreHours,
  Store,
  StoreHours,
  StoreImage,
  updateStore,
} from '../api/stores';
import { uploadImages } from '../api/upload';
import { toast } from 'react-toastify';
import {
  addServiceToStore,
  getServiceCatalog,
  getStoreServices,
  removeStoreService,
  Service,
  ServiceCatalogItem,
  updateStoreService,
} from '../api/services';
import {
  deleteStorePortfolioImage,
  getStorePortfolio,
  PortfolioItem,
  uploadStorePortfolioImage,
} from '../api/storePortfolio';

const PORTFOLIO_PAGE_SIZE = 24;
const DAY_ROWS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
] as const;
type DayKey = (typeof DAY_ROWS)[number]['key'];
type DaySchedule = { isClosed: boolean; openTime: string; closeTime: string };

const TIME_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const minutes = (i + 12) * 30; // 06:00 - 23:30
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
});

const buildDefaultSchedule = (): Record<DayKey, DaySchedule> => ({
  mon: { isClosed: false, openTime: '09:00', closeTime: '18:00' },
  tue: { isClosed: false, openTime: '09:00', closeTime: '18:00' },
  wed: { isClosed: false, openTime: '09:00', closeTime: '18:00' },
  thu: { isClosed: false, openTime: '09:00', closeTime: '18:00' },
  fri: { isClosed: false, openTime: '09:00', closeTime: '18:00' },
  sat: { isClosed: false, openTime: '09:00', closeTime: '18:00' },
  sun: { isClosed: false, openTime: '09:00', closeTime: '18:00' },
});

const parseOpeningHours = (value?: string | null): Record<DayKey, DaySchedule> => {
  const schedule = buildDefaultSchedule();
  if (!value || !value.trim()) return schedule;

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      DAY_ROWS.forEach(({ key }) => {
        const raw = (parsed as Record<string, string | null | undefined>)[key];
        if (!raw) return;
        if (raw.toLowerCase() === 'closed') {
          schedule[key] = { ...schedule[key], isClosed: true };
          return;
        }
        const [openTime, closeTime] = raw.split('-');
        if (openTime && closeTime) {
          schedule[key] = {
            isClosed: false,
            openTime: openTime.trim(),
            closeTime: closeTime.trim(),
          };
        }
      });
      return schedule;
    }
  } catch {
    // ignore and try legacy format below
  }

  const legacy = value.match(/^(.+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (!legacy) return schedule;
  const daysPart = legacy[1].trim();
  const openTime = legacy[2];
  const closeTime = legacy[3];
  const tokenToKey: Record<string, DayKey> = {
    Mon: 'mon',
    Tue: 'tue',
    Wed: 'wed',
    Thu: 'thu',
    Fri: 'fri',
    Sat: 'sat',
    Sun: 'sun',
  };
  const tokens = daysPart.split(',').map((d) => d.trim()).filter(Boolean);
  tokens.forEach((token) => {
    const key = tokenToKey[token];
    if (key) {
      schedule[key] = { isClosed: false, openTime, closeTime };
    }
  });
  return schedule;
};

const mapStoreHoursToSchedule = (hours: StoreHours[]): Record<DayKey, DaySchedule> => {
  const schedule = buildDefaultSchedule();
  const indexToKey: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  hours.forEach((row) => {
    const key = indexToKey[row.day_of_week];
    if (!key) return;
    schedule[key] = {
      isClosed: !!row.is_closed,
      openTime: row.open_time ? row.open_time.slice(0, 5) : schedule[key].openTime,
      closeTime: row.close_time ? row.close_time.slice(0, 5) : schedule[key].closeTime,
    };
  });
  return schedule;
};

const serializeOpeningHours = (schedule: Record<DayKey, DaySchedule>) => {
  const payload: Record<string, string> = {};
  DAY_ROWS.forEach(({ key }) => {
    const row = schedule[key];
    payload[key] = row.isClosed ? 'closed' : `${row.openTime}-${row.closeTime}`;
  });
  return JSON.stringify(payload);
};

const StoreDetail: React.FC = () => {
  const { id } = useParams();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<StoreImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [addingCatalogId, setAddingCatalogId] = useState<number | null>(null);
  const [newServicePrice, setNewServicePrice] = useState<string>('50');
  const [newServiceCommission, setNewServiceCommission] = useState<string>('0');
  const [newServiceDuration, setNewServiceDuration] = useState<string>('60');
  const [serviceSavingId, setServiceSavingId] = useState<number | null>(null);
  const [serviceDeletingId, setServiceDeletingId] = useState<number | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [portfolioSkip, setPortfolioSkip] = useState(0);
  const [hasMorePortfolio, setHasMorePortfolio] = useState(true);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<DayKey, DaySchedule>>(buildDefaultSchedule());
  const [activeTab, setActiveTab] = useState<'services' | 'portfolio' | 'information'>('information');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const portfolioFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    description: '',
    opening_hours: '',
  });
  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
    'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
    'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
    'WI', 'WY',
  ];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (id) {
          const data = await getStoreById(Number(id));
          setStore(data);
          setForm({
            name: data.name || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            zip_code: data.zip_code || '',
            phone: data.phone || '',
            email: data.email || '',
            description: data.description || '',
            opening_hours: data.opening_hours || '',
          });
          const storeHoursRows = await getStoreHours(Number(id));
          if (storeHoursRows.length > 0) {
            setWeeklySchedule(mapStoreHoursToSchedule(storeHoursRows));
          } else {
            setWeeklySchedule(parseOpeningHours(data.opening_hours || ''));
          }
          const storeImages = await getStoreImages(Number(id));
          setImages(storeImages);
          setServicesLoading(true);
          try {
            const serviceRows = await getStoreServices(Number(id), { include_inactive: true });
            setServices(serviceRows);
          } finally {
            setServicesLoading(false);
          }
          setCatalogLoading(true);
          try {
            const catalogRows = await getServiceCatalog({ active_only: true, limit: 200 });
            setCatalog(catalogRows);
          } finally {
            setCatalogLoading(false);
          }
          setPortfolioLoading(true);
          try {
            const portfolioRows = await getStorePortfolio(Number(id), { skip: 0, limit: PORTFOLIO_PAGE_SIZE });
            setPortfolioItems(portfolioRows);
            setPortfolioSkip(portfolioRows.length);
            setHasMorePortfolio(portfolioRows.length === PORTFOLIO_PAGE_SIZE);
          } finally {
            setPortfolioLoading(false);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const updateField = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const saveChanges = async () => {
    if (!store) return;
    setSaving(true);
    try {
      const invalidDay = DAY_ROWS.find(({ key }) => {
        const row = weeklySchedule[key];
        return !row.isClosed && row.openTime >= row.closeTime;
      });
      if (invalidDay) {
        toast.error(`${invalidDay.label}: close time must be later than open time`);
        return;
      }

      const hoursPayload = DAY_ROWS.map(({ key }, dayIndex) => {
        const row = weeklySchedule[key];
        return {
          day_of_week: dayIndex,
          is_closed: row.isClosed,
          open_time: row.isClosed ? null : `${row.openTime}:00`,
          close_time: row.isClosed ? null : `${row.closeTime}:00`,
        };
      });

      await setStoreHours(store.id, hoursPayload);

      const updated = await updateStore(store.id, {
        name: form.name,
        address: form.address,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        phone: form.phone || null,
        email: form.email || null,
        description: form.description || null,
        opening_hours: serializeOpeningHours(weeklySchedule),
      });
      setStore(updated);
      toast.success('Store updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update store');
    } finally {
      setSaving(false);
    }
  };

  const addImage = async (imageUrl: string, displayOrder: number) => {
    if (!store || !imageUrl.trim()) return;
    if (images.length >= 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    try {
      const created = await addStoreImage(store.id, imageUrl.trim(), displayOrder);
      setImages((prev) => [...prev, created]);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to add image');
    }
  };

  const isAllowedImageFile = (file: File) => {
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const lowerName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some((ext) => lowerName.endsWith(ext));
    const hasValidMime = validMimeTypes.includes((file.type || '').toLowerCase());
    return hasValidExtension && hasValidMime;
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!store) return;
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const remainingSlots = Math.max(0, 5 - images.length);
    const selected = files.slice(0, remainingSlots);
    if (selected.length === 0) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    const invalidFile = selected.find((file) => !isAllowedImageFile(file));
    if (invalidFile) {
      toast.error('Only JPG/JPEG/PNG files are allowed');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    setUploading(true);
    try {
      const uploadedUrls = await uploadImages(selected);
      const sorted = [...images].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      let nextOrder = sorted.length;
      for (const [index, url] of uploadedUrls.entries()) {
        await addImage(url, nextOrder + index);
      }
      if (files.length > selected.length) {
        toast.info('Only 5 images are allowed. Extra images were skipped.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to upload images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = async (imageId: number) => {
    if (!store) return;
    try {
      await deleteStoreImage(store.id, imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete image');
    }
  };

  const handlePortfolioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!store) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isAllowedImageFile(file)) {
      toast.error('Only JPG/JPEG/PNG files are allowed');
      if (portfolioFileInputRef.current) {
        portfolioFileInputRef.current.value = '';
      }
      return;
    }

    setPortfolioUploading(true);
    try {
      const created = await uploadStorePortfolioImage(store.id, file);
      setPortfolioItems((prev) => [created, ...prev]);
      setPortfolioSkip((prev) => prev + 1);
      toast.success('Portfolio image uploaded');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to upload portfolio image');
    } finally {
      setPortfolioUploading(false);
      if (portfolioFileInputRef.current) {
        portfolioFileInputRef.current.value = '';
      }
    }
  };

  const removePortfolioImage = async (portfolioId: number) => {
    try {
      await deleteStorePortfolioImage(portfolioId);
      setPortfolioItems((prev) => prev.filter((item) => item.id !== portfolioId));
      toast.success('Portfolio image removed');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete portfolio image');
    }
  };

  const loadMorePortfolio = async () => {
    if (!store || portfolioLoading || !hasMorePortfolio) return;
    setPortfolioLoading(true);
    try {
      const nextRows = await getStorePortfolio(store.id, { skip: portfolioSkip, limit: PORTFOLIO_PAGE_SIZE });
      setPortfolioItems((prev) => [...prev, ...nextRows]);
      setPortfolioSkip((prev) => prev + nextRows.length);
      setHasMorePortfolio(nextRows.length === PORTFOLIO_PAGE_SIZE);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load more portfolio images');
    } finally {
      setPortfolioLoading(false);
    }
  };

  const mediaBaseUrl =
    (import.meta.env.VITE_ADMIN_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

  const resolveImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${mediaBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleAddCatalogService = async (catalogItem: ServiceCatalogItem) => {
    if (!store) return;
    const price = Number.parseInt(newServicePrice, 10);
    const duration = Number(newServiceDuration);
    const commission = Number.parseInt(newServiceCommission, 10);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      toast.error('Duration must be greater than 0');
      return;
    }
    if (!Number.isFinite(commission) || commission < 0) {
      toast.error('Commission must be greater than or equal to 0');
      return;
    }
    setAddingCatalogId(catalogItem.id);
    try {
      const created = await addServiceToStore(store.id, {
        catalog_id: catalogItem.id,
        price,
        commission_amount: commission,
        duration_minutes: duration,
      });
      setServices((prev) => [created, ...prev]);
      toast.success('Service added');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to add service');
    } finally {
      setAddingCatalogId(null);
    }
  };

  const handleQuickUpdateService = async (
    service: Service,
    patch: { price?: number; commission_amount?: number; duration_minutes?: number; is_active?: number }
  ) => {
    if (!store) return;
    setServiceSavingId(service.id);
    try {
      const updated = await updateStoreService(store.id, service.id, patch);
      setServices((prev) => prev.map((row) => (row.id === service.id ? updated : row)));
      toast.success('Service updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update service');
    } finally {
      setServiceSavingId(null);
    }
  };

  const handleDeleteStoreService = async (serviceId: number) => {
    if (!store) return;
    setServiceDeletingId(serviceId);
    try {
      await removeStoreService(store.id, serviceId);
      setServices((prev) =>
        prev.map((row) => (row.id === serviceId ? { ...row, is_active: 0 } : row))
      );
      toast.success('Service deactivated');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to deactivate service');
    } finally {
      setServiceDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <TopBar title="店铺详情" subtitle="统一管理店铺信息、服务和图片内容" />
      <div className="mx-auto w-full max-w-6xl px-4 py-5 space-y-4">
        {loading && <div className="text-slate-500">Loading...</div>}
        {!loading && store && (
          <div className="space-y-4">
            <div className="card-surface border border-gold-500/20 p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Store Overview</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{store.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">Manage storefront details and customer-facing content.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge inline-flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {store.rating ?? 'N/A'}
                  </span>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-slate-700">
                    Reviews
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span>{store.address}, {store.city}, {store.state} {store.zip_code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <span>{store.phone || 'No phone listed'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>{store.email || 'No email listed'}</span>
                </div>
              </div>
            </div>

            <div className="card-surface p-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('services')}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === 'services'
                      ? 'bg-gold-500 text-white shadow-glow'
                      : 'bg-blue-50 text-slate-700 hover:bg-blue-100'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Scissors className="h-4 w-4" />
                    Services
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('portfolio')}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === 'portfolio'
                      ? 'bg-gold-500 text-white shadow-glow'
                      : 'bg-blue-50 text-slate-700 hover:bg-blue-100'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <ImagePlus className="h-4 w-4" />
                    Portfolio
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('information')}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === 'information'
                      ? 'bg-gold-500 text-white shadow-glow'
                      : 'bg-blue-50 text-slate-700 hover:bg-blue-100'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Information
                  </span>
                </button>
              </div>
            </div>

            {activeTab === 'services' && (
              <div className="card-surface p-5 md:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Services</p>
                    <p className="text-xs text-slate-500">Pick from super-admin catalog, then set store-specific price and duration.</p>
                  </div>
                  <span className="badge">{services.length} items</span>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-blue-100 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-900">可选服务目录</p>
                      <span className="text-xs text-slate-500">{catalog.length} templates</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Price ($)</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={newServicePrice}
                          onChange={(event) => setNewServicePrice(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Commission ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={newServiceCommission}
                          onChange={(event) => setNewServiceCommission(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Duration (min)</label>
                        <input
                          type="number"
                          min="1"
                          step="5"
                          value={newServiceDuration}
                          onChange={(event) => setNewServiceDuration(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                        />
                      </div>
                    </div>

                    {catalogLoading && <p className="text-sm text-slate-500">Loading catalog...</p>}
                    {!catalogLoading && (
                      <div className="space-y-2 max-h-80 overflow-auto pr-1">
                        {catalog.map((item) => {
                          const existingService = services.find((service) => service.catalog_id === item.id);
                          const existsActive = !!existingService && existingService.is_active === 1;
                          return (
                            <div key={item.id} className="rounded-lg border border-blue-100 bg-white px-3 py-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{item.name}</p>
                                  <p className="text-xs text-slate-500">{item.category || 'General'}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddCatalogService(item)}
                                  disabled={existsActive || addingCatalogId === item.id}
                                  className="rounded-lg border border-blue-200 px-2 py-1 text-xs text-slate-800 disabled:opacity-50"
                                >
                                  {existsActive ? 'Added' : addingCatalogId === item.id ? 'Adding...' : existingService ? 'Re-Add' : 'Add'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-blue-100 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-900">本店服务</p>
                      <span className="text-xs text-slate-500">{services.length} configured</span>
                    </div>
                    {servicesLoading && <p className="text-sm text-slate-500">Loading store services...</p>}
                    {!servicesLoading && services.length === 0 && (
                      <div className="rounded-xl border border-dashed border-blue-200 p-8 text-center text-sm text-slate-500">
                        No services configured yet.
                      </div>
                    )}
                    {!servicesLoading &&
                      services.map((service) => (
                        <div key={service.id} className="rounded-xl border border-blue-100 bg-white p-3 space-y-2">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">{service.name}</h3>
                            <p className="mt-1 text-xs text-slate-500">{service.category || 'General'}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Price</label>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                defaultValue={service.price}
                                onBlur={(event) => {
                                  const nextPrice = Number.parseInt(event.target.value, 10);
                                  if (!Number.isFinite(nextPrice) || nextPrice <= 0 || nextPrice === service.price) return;
                                  event.target.value = String(nextPrice);
                                  handleQuickUpdateService(service, { price: nextPrice });
                                }}
                                className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Commission</label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                defaultValue={service.commission_amount ?? 0}
                                onBlur={(event) => {
                                  const nextCommission = Number.parseInt(event.target.value, 10);
                                  if (
                                    !Number.isFinite(nextCommission) ||
                                    nextCommission < 0 ||
                                    nextCommission === (service.commission_amount ?? 0)
                                  )
                                    return;
                                  event.target.value = String(nextCommission);
                                  handleQuickUpdateService(service, { commission_amount: nextCommission });
                                }}
                                className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Duration</label>
                              <input
                                type="number"
                                min="1"
                                step="5"
                                defaultValue={service.duration_minutes}
                                onBlur={(event) => {
                                  const nextDuration = Number(event.target.value);
                                  if (
                                    !Number.isFinite(nextDuration) ||
                                    nextDuration <= 0 ||
                                    nextDuration === service.duration_minutes
                                  )
                                    return;
                                  handleQuickUpdateService(service, { duration_minutes: nextDuration });
                                }}
                                className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleQuickUpdateService(service, { is_active: service.is_active === 1 ? 0 : 1 })}
                              disabled={serviceSavingId === service.id}
                              className="rounded-lg border border-blue-200 px-2 py-1 text-xs text-slate-800 disabled:opacity-50"
                            >
                              {service.is_active === 1 ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStoreService(service.id)}
                              disabled={serviceDeletingId === service.id}
                              className="rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
                            >
                              {serviceDeletingId === service.id ? 'Deactivating...' : 'Deactivate'}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div className="card-surface p-5 md:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Portfolio</p>
                    <p className="text-xs text-slate-500">Store work showcase. Upload one image at a time.</p>
                  </div>
                  <span className="badge">{portfolioItems.length} images</span>
                </div>

                {portfolioLoading && portfolioItems.length === 0 && <p className="text-sm text-slate-500">Loading portfolio images...</p>}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {portfolioItems.map((item) => (
                    <div key={item.id} className="group relative overflow-hidden rounded-xl border border-blue-100">
                      <img
                        src={resolveImageUrl(item.image_url)}
                        alt="Portfolio"
                        className="h-36 w-full object-cover transition group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => removePortfolioImage(item.id)}
                        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] text-slate-900 border border-blue-100"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </button>
                    </div>
                  ))}
                  {portfolioItems.length === 0 && !portfolioLoading && (
                    <div className="col-span-full rounded-xl border border-dashed border-blue-200 p-8 text-center text-sm text-slate-500">
                      No portfolio images yet.
                    </div>
                  )}
                </div>

                {hasMorePortfolio && (
                  <button
                    type="button"
                    onClick={loadMorePortfolio}
                    disabled={portfolioLoading}
                    className="w-full rounded-xl border border-blue-100 px-4 py-2 text-sm text-slate-800 disabled:opacity-60"
                  >
                    {portfolioLoading ? 'Loading...' : 'Load More Portfolio Images'}
                  </button>
                )}

                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Upload portfolio image</label>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      ref={portfolioFileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      onChange={handlePortfolioUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => portfolioFileInputRef.current?.click()}
                      disabled={portfolioUploading}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-100 px-4 py-2 text-sm text-slate-800 disabled:opacity-60"
                    >
                      <ImagePlus className="h-4 w-4 text-blue-600" />
                      {portfolioUploading ? 'Uploading...' : 'Upload One Photo'}
                    </button>
                    <span className="text-xs text-slate-500">Only JPG/JPEG/PNG</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'information' && (
              <div className="card-surface p-5 md:p-6 space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Store Information</p>
                  </div>
                  <span className="text-xs text-slate-500">Visible on customer app</span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Store Name</label>
                    <input
                      value={form.name}
                      onChange={updateField('name')}
                      className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-gold-500"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Street Address</label>
                    <input
                      value={form.address}
                      onChange={updateField('address')}
                      className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-gold-500"
                      placeholder="123 Market St"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">City</label>
                    <input
                      value={form.city}
                      onChange={updateField('city')}
                      className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                      placeholder="San Francisco"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">State</label>
                    <select
                      value={form.state}
                      onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
                      className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                      required
                    >
                      <option value="">Select</option>
                      {usStates.map((abbr) => (
                        <option key={abbr} value={abbr}>
                          {abbr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">ZIP Code</label>
                    <input
                      value={form.zip_code}
                      onChange={updateField('zip_code')}
                      className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                      placeholder="94103"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Phone</label>
                    <input
                      value={form.phone}
                      onChange={updateField('phone')}
                      className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                      placeholder="4151234567"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Email</label>
                    <input
                      value={form.email}
                      onChange={updateField('email')}
                      className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-gold-500"
                      placeholder="owner@shop.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-blue-600" />
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Opening Hours</label>
                  </div>
                  <div className="rounded-xl border border-blue-100 p-3 space-y-2">
                    {DAY_ROWS.map(({ key, label }) => {
                      const row = weeklySchedule[key];
                      return (
                        <div key={key} className="grid grid-cols-[52px_88px_1fr_1fr] items-center gap-2">
                          <span className="text-xs text-slate-600">{label}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setWeeklySchedule((prev) => ({
                                ...prev,
                                [key]: { ...prev[key], isClosed: !prev[key].isClosed },
                              }))
                            }
                            className={`rounded-lg border px-2 py-1 text-xs ${
                              row.isClosed
                                ? 'border-blue-200 bg-blue-50 text-slate-700'
                                : 'border-gold-500/40 bg-gold-500/10 text-gold-300'
                            }`}
                          >
                            {row.isClosed ? 'Closed' : 'Open'}
                          </button>
                          <select
                            value={row.openTime}
                            onChange={(event) =>
                              setWeeklySchedule((prev) => ({
                                ...prev,
                                [key]: { ...prev[key], openTime: event.target.value },
                              }))
                            }
                            disabled={row.isClosed}
                            className="rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-gold-500 disabled:opacity-40"
                          >
                            {TIME_OPTIONS.map((option) => (
                              <option key={`${key}-open-${option}`} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <select
                            value={row.closeTime}
                            onChange={(event) =>
                              setWeeklySchedule((prev) => ({
                                ...prev,
                                [key]: { ...prev[key], closeTime: event.target.value },
                              }))
                            }
                            disabled={row.isClosed}
                            className="rounded-lg border border-blue-100 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-gold-500 disabled:opacity-40"
                          >
                            {TIME_OPTIONS.map((option) => (
                              <option key={`${key}-close-${option}`} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Saved as structured weekly hours.</p>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Description</label>
                  <textarea
                    value={form.description}
                    onChange={updateField('description')}
                    className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-gold-500"
                    rows={3}
                    placeholder="Short description"
                  />
                </div>

                <div className="space-y-3 rounded-xl border border-blue-100 p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Storefront Images</p>
                      <p className="text-xs text-slate-500">Shown in H5 store list/detail cards (max 5 images).</p>
                    </div>
                    <span className="badge">{images.length}/5</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {images.map((image) => (
                      <div key={image.id} className="group relative overflow-hidden rounded-xl border border-blue-100">
                        <img
                          src={resolveImageUrl(image.image_url)}
                          alt="Storefront"
                          className="h-36 w-full object-cover transition group-hover:scale-105"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] text-slate-900 border border-blue-100"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                        <span className="absolute bottom-2 left-2 rounded-full bg-white/70 px-2 py-0.5 text-[10px] text-slate-800">
                          Photo {(image.display_order ?? 0) + 1}
                        </span>
                      </div>
                    ))}
                    {images.length === 0 && (
                      <div className="col-span-full rounded-xl border border-dashed border-blue-200 p-8 text-center text-sm text-slate-500">
                        No storefront images uploaded yet.
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Upload storefront image</label>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                        multiple
                        onChange={handleUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || images.length >= 5}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-100 px-4 py-2 text-sm text-slate-800 disabled:opacity-60"
                      >
                        <ImagePlus className="h-4 w-4 text-blue-600" />
                        {uploading ? 'Uploading...' : 'Choose Photos'}
                      </button>
                      <span className="text-xs text-slate-500">Only JPG/JPEG/PNG, max 5 images</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-blue-100 pt-4">
                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-white shadow-glow disabled:opacity-60 sm:w-auto sm:px-6"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StoreDetail;
