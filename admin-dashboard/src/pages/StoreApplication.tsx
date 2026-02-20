import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { useAuth } from '../context/AuthContext';
import {
  getMyStoreAdminApplication,
  submitStoreAdminReview,
  updateMyStoreAdminApplication,
} from '../api/storeAdminApplications';
import { toast } from 'react-toastify';
import { maskPhone } from '../utils/privacy';

const StoreApplication: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dayOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeOptions = Array.from({ length: 31 }, (_, i) => {
    const minutes = (i + 14) * 30;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  });

  const [applicationStatus, setApplicationStatus] = useState<string>('pending_profile');
  const [form, setForm] = useState({
    store_name: '',
    store_address: '',
    address_line1: '',
    city: '',
    state: '',
    zip_code: '',
    store_phone: '',
    opening_days: [] as string[],
    open_time: '09:00',
    close_time: '18:00',
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getMyStoreAdminApplication();
        const parsed = parseOpeningHours(data.opening_hours || '');
        setApplicationStatus(data.status || 'pending_profile');
        const addressParts = (data.store_address || '').split(',').map((part) => part.trim());
        const addressLine = addressParts[0] || '';
        const city = addressParts[1] || '';
        const stateZip = addressParts[2] || '';
        const stateZipParts = stateZip.split(' ').filter(Boolean);
        const state = stateZipParts[0] || '';
        const zip_code = stateZipParts[1] || '';

        setForm({
          store_name: data.store_name || '',
          store_address: data.store_address || '',
          address_line1: addressLine,
          city,
          state,
          zip_code,
          store_phone: data.store_phone || '',
          opening_days: parsed.days,
          open_time: parsed.openTime,
          close_time: parsed.closeTime,
        });
      } catch (error) {
        toast.error('Failed to load application');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateField = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const parseOpeningHours = (value: string) => {
    if (!value) {
      return { days: [] as string[], openTime: '09:00', closeTime: '18:00' };
    }

    const match = value.match(/^(.+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!match) {
      return { days: [] as string[], openTime: '09:00', closeTime: '18:00' };
    }

    const daysPart = match[1].trim();
    const openTime = match[2];
    const closeTime = match[3];
    const order = dayOptions;
    let days: string[] = [];

    if (daysPart.includes('-') && !daysPart.includes(',')) {
      const [start, end] = daysPart.split('-').map((d) => d.trim());
      const startIndex = order.indexOf(start);
      const endIndex = order.indexOf(end);
      if (startIndex >= 0 && endIndex >= 0 && startIndex <= endIndex) {
        days = order.slice(startIndex, endIndex + 1);
      }
    } else {
      days = daysPart.split(',').map((d) => d.trim()).filter(Boolean);
    }

    return { days, openTime, closeTime };
  };

  const buildOpeningHours = () => {
    if (!form.opening_days.length) return '';
    return `${form.opening_days.join(',')} ${form.open_time}-${form.close_time}`;
  };

  const buildStoreAddress = () => {
    if (!form.address_line1 || !form.city || !form.state || !form.zip_code) {
      return '';
    }
    return `${form.address_line1}, ${form.city}, ${form.state} ${form.zip_code}`;
  };

  const isValidHours = () => {
    return form.open_time < form.close_time;
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      if (!isValidHours()) {
        toast.error('Close time must be later than open time');
        return;
      }
      const address = buildStoreAddress();
      if (!address) {
        toast.error('Please complete address details');
        return;
      }
      await updateMyStoreAdminApplication({
        store_name: form.store_name,
        store_address: address,
        store_phone: form.store_phone,
        opening_hours: buildOpeningHours() || undefined,
      });
      setApplicationStatus((prev) => (prev === 'pending' ? 'pending_profile' : prev));
      toast.success('Saved');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async () => {
    setSubmitting(true);
    try {
      if (!isValidHours()) {
        toast.error('Close time must be later than open time');
        return;
      }
      if (!form.opening_days.length) {
        toast.error('Please select open days');
        return;
      }
      if (!buildStoreAddress()) {
        toast.error('Please complete address details');
        return;
      }
      await submitStoreAdminReview();
      toast.success('Submitted for review');
      setApplicationStatus('pending_review');
      await refreshUser();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <TopBar title="Store Setup" />
        <div className="px-4 py-6 text-slate-500">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <TopBar title="Store Setup" />
      <div className="px-4 py-6 space-y-6">
        <div className="card-surface p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Account</p>
          <p className="text-sm text-slate-700">{maskPhone(user?.phone)}</p>
          <p className="text-xs text-slate-500">
            Status: {applicationStatus === 'pending_review' ? 'Under Review' : 'Profile Setup'}
          </p>
        </div>

        <div className="card-surface p-4 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Store Name</label>
            <input
              value={form.store_name}
              onChange={updateField('store_name')}
              className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-gold-500"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Street Address</label>
            <input
              value={form.address_line1}
              onChange={updateField('address_line1')}
              className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-gold-500"
              placeholder="123 Market St"
              required
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">City</label>
                <input
                  value={form.city}
                  onChange={updateField('city')}
                  className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-gold-500"
                  placeholder="San Francisco"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">State</label>
                <select
                  value={form.state}
                  onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-gold-500"
                  required
                >
                  <option value="">Select</option>
                  {[
                    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
                  ].map((abbr) => (
                    <option key={abbr} value={abbr}>{abbr}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">ZIP</label>
              <input
                value={form.zip_code}
                onChange={updateField('zip_code')}
                className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-gold-500"
                placeholder="94103"
                inputMode="numeric"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Store Phone</label>
            <input
              value={form.store_phone}
              onChange={updateField('store_phone')}
              className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-gold-500"
              inputMode="tel"
              placeholder="4159876543"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Opening Hours</label>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {dayOptions.map((day) => {
                const active = form.opening_days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        opening_days: active
                          ? prev.opening_days.filter((d) => d !== day)
                          : [...prev.opening_days, day],
                      }))
                    }
                    className={`rounded-lg border px-2 py-2 text-xs ${
                      active
                        ? 'border-gold-500 bg-gold-500 text-white'
                        : 'border-blue-100 text-slate-600'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Open</label>
                <select
                  value={form.open_time}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, open_time: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-gold-500"
                >
                  {timeOptions.map((option) => (
                    <option key={`open-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Close</label>
                <select
                  value={form.close_time}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, close_time: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-gold-500"
                >
                  {timeOptions.map((option) => (
                    <option key={`close-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Preview: {buildOpeningHours() || 'Select days and hours'}
            </p>
          </div>
          <button
            onClick={saveChanges}
            disabled={saving || applicationStatus === 'pending_review'}
            className="w-full rounded-xl border border-blue-100 py-3 text-sm font-semibold text-slate-800"
          >
            {saving ? 'Saving...' : 'Save Store Info'}
          </button>
        </div>

        <div className="card-surface p-4 space-y-3">
          <p className="text-sm text-slate-600">
            Please submit for review after completing store details. Approval is required to access
            the rest of the admin system.
          </p>
          <button
            onClick={submitReview}
            disabled={submitting || applicationStatus === 'pending_review'}
            className="w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-white"
          >
            {applicationStatus === 'pending_review'
              ? 'Under Review'
              : submitting
              ? 'Submitting...'
              : 'Submit for Review'}
          </button>
        </div>

        <button
          onClick={logout}
          className="w-full rounded-xl border border-red-500/50 py-3 text-sm font-semibold text-red-200"
        >
          Log out
        </button>
      </div>
    </AdminLayout>
  );
};

export default StoreApplication;
