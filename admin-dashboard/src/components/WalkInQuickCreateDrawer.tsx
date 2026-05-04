import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, Phone, Search, UserRound, X } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  Appointment,
  createWalkInAppointment,
  searchWalkInCustomer,
  WalkInCustomerSearchItem,
} from '../api/appointments';
import { getStoreServices, Service } from '../api/services';
import { Store, getStores } from '../api/stores';
import { Technician, getTechnicians } from '../api/technicians';

const normalizeUsPhone = (value: string): string | null => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return null;
};

const maskPhone = (phone?: string | null) => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.length <= 4) return cleaned;
  return `${cleaned.slice(0, Math.min(3, cleaned.length - 4))}****${cleaned.slice(-4)}`;
};

const getRoundedNowForTimeZone = (timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const read = (type: string) => Number(parts.find((item) => item.type === type)?.value || '0');
  const wallClock = new Date(Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'), 0));
  const minute = wallClock.getUTCMinutes();
  const rounded = minute % 5 === 0 ? minute : minute + (5 - (minute % 5));
  wallClock.setUTCMinutes(rounded, 0, 0);

  const y = `${wallClock.getUTCFullYear()}`;
  const m = `${wallClock.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${wallClock.getUTCDate()}`.padStart(2, '0');
  const hh = `${wallClock.getUTCHours()}`.padStart(2, '0');
  const mm = `${wallClock.getUTCMinutes()}`.padStart(2, '0');
  return {
    date: `${y}-${m}-${d}`,
    time: `${hh}:${mm}:00`,
  };
};

const formatDateTimeInline = (value?: string | null) => {
  if (!value) return '-';
  return value.replace('T', ' ').slice(0, 16);
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (appointment: Appointment) => Promise<void> | void;
  isSuperAdmin: boolean;
  currentUserStoreId?: number | null;
}

export const WalkInQuickCreateDrawer: React.FC<Props> = ({
  open,
  onClose,
  onCreated,
  isSuperAdmin,
  currentUserStoreId,
}) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [techniciansLoading, setTechniciansLoading] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [notes, setNotes] = useState('');
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [customerSearched, setCustomerSearched] = useState(false);
  const [matchedCustomer, setMatchedCustomer] = useState<WalkInCustomerSearchItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedStore = useMemo(
    () => stores.find((item) => item.id === Number(selectedStoreId)) || null,
    [stores, selectedStoreId],
  );
  const selectedTimeZone = selectedStore?.time_zone || 'America/New_York';

  const resetForm = () => {
    setPhone('');
    setFullName('');
    setServiceId('');
    setTechnicianId('');
    setNotes('');
    setMatchedCustomer(null);
    setCustomerSearched(false);
    setErrors({});
  };

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setStoresLoading(true);
      try {
        const rows = await getStores({ limit: 100 });
        setStores(rows);
        const nextStoreId = !isSuperAdmin && currentUserStoreId ? String(currentUserStoreId) : String(rows[0]?.id || '');
        setSelectedStoreId(nextStoreId);
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || 'Failed to load stores');
      } finally {
        setStoresLoading(false);
      }
    };
    load();
    resetForm();
  }, [open, isSuperAdmin, currentUserStoreId]);

  useEffect(() => {
    if (!open || !selectedStoreId) return;
    const { date, time } = getRoundedNowForTimeZone(selectedTimeZone);
    setAppointmentDate(date);
    setAppointmentTime(time);
  }, [open, selectedStoreId, selectedTimeZone]);

  useEffect(() => {
    if (!open || !selectedStoreId) {
      setServices([]);
      setTechnicians([]);
      return;
    }
    const load = async () => {
      setServicesLoading(true);
      setTechniciansLoading(true);
      try {
        const [serviceRows, technicianRows] = await Promise.all([
          getStoreServices(Number(selectedStoreId), { include_inactive: false }),
          getTechnicians({ store_id: Number(selectedStoreId), skip: 0, limit: 100 }),
        ]);
        setServices(serviceRows.filter((item) => item.is_active !== 0));
        setTechnicians(technicianRows.filter((item) => item.is_active !== 0));
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || 'Failed to load walk-in options');
      } finally {
        setServicesLoading(false);
        setTechniciansLoading(false);
      }
    };
    setServiceId('');
    setTechnicianId('');
    load();
  }, [open, selectedStoreId]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const normalizedPhone = normalizeUsPhone(phone);
    if (!normalizedPhone) nextErrors.phone = 'Please enter a valid US phone number.';
    if (!selectedStoreId) nextErrors.store = 'Please select a store.';
    if (!serviceId) nextErrors.service = 'Please select a service.';
    if (!appointmentDate) nextErrors.date = 'Please select a date.';
    if (!appointmentTime) nextErrors.time = 'Please select a time.';
    if (!matchedCustomer && !fullName.trim()) nextErrors.full_name = 'Full name is required for a new customer.';
    setErrors(nextErrors);
    return { valid: Object.keys(nextErrors).length === 0, normalizedPhone };
  };

  const runCustomerSearch = async () => {
    const normalizedPhone = normalizeUsPhone(phone);
    if (!normalizedPhone) {
      setErrors((prev) => ({ ...prev, phone: 'Please enter a valid US phone number.' }));
      return;
    }
    if (!selectedStoreId) {
      setErrors((prev) => ({ ...prev, store: 'Please select a store.' }));
      return;
    }
    setSearchingCustomer(true);
    setCustomerSearched(false);
    try {
      const payload = await searchWalkInCustomer({
        phone: normalizedPhone,
        store_id: Number(selectedStoreId),
      });
      const nextCustomer = payload.customer || null;
      setMatchedCustomer(nextCustomer);
      setCustomerSearched(true);
      setErrors((prev) => {
        const { phone: _phoneError, ...rest } = prev;
        return rest;
      });
      if (nextCustomer && !fullName.trim()) {
        setFullName(nextCustomer.full_name || nextCustomer.username || '');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to search customer');
    } finally {
      setSearchingCustomer(false);
    }
  };

  const saveWalkIn = async () => {
    const { valid, normalizedPhone } = validate();
    if (!valid || !normalizedPhone) return;
    setSaving(true);
    try {
      const created = await createWalkInAppointment({
        phone: normalizedPhone,
        full_name: fullName.trim() || undefined,
        store_id: Number(selectedStoreId),
        service_id: Number(serviceId),
        technician_id: technicianId ? Number(technicianId) : null,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        notes: notes.trim() || undefined,
        skip_notifications: true,
      });
      await onCreated(created);
      onClose();
      resetForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create walk-in appointment');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40">
      <div className="absolute inset-y-0 right-0 w-full max-w-lg border-l border-blue-100 bg-white shadow-2xl overflow-auto">
        <div className="sticky top-0 z-10 border-b border-blue-100 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">New Walk-in</h2>
              <p className="text-xs text-slate-500 mt-1">Quick front-desk appointment entry for customers already in store.</p>
            </div>
            <button onClick={onClose} className="rounded-full border border-blue-200 p-1.5 text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Customer</p>
            <div>
              <label className="text-xs font-medium text-slate-700">Recipient / Customer Phone</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="4151234567"
                  className="flex-1 rounded-lg border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 placeholder:text-slate-400"
                />
                <button
                  onClick={runCustomerSearch}
                  disabled={searchingCustomer || !selectedStoreId}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-50"
                >
                  {searchingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </button>
              </div>
              {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700">Full Name</label>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Customer name"
                className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 placeholder:text-slate-400"
              />
              {errors.full_name && <p className="mt-1 text-xs text-rose-600">{errors.full_name}</p>}
            </div>

            {matchedCustomer ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-slate-700">
                <div className="flex items-center gap-2 text-slate-900 font-medium">
                  <UserRound className="h-4 w-4 text-emerald-600" />
                  <span>{matchedCustomer.full_name || matchedCustomer.username}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">Existing customer · {maskPhone(matchedCustomer.phone)}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Total visits {matchedCustomer.total_appointments} · This store {matchedCustomer.store_visit_count} · Completed {matchedCustomer.completed_count}
                </p>
                <p className="mt-1 text-xs text-slate-500">Last appointment: {formatDateTimeInline(matchedCustomer.last_appointment_at)}</p>
              </div>
            ) : customerSearched ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                No existing customer found. Saving this walk-in will create a lightweight customer profile for this phone number.
              </div>
            ) : (
              <div className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs text-slate-500">
                Search by phone first. If no customer exists, this flow will create a lightweight customer profile automatically.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Booking</p>
            <div>
              <label className="text-xs font-medium text-slate-700">Store</label>
              <select
                value={selectedStoreId}
                onChange={(event) => setSelectedStoreId(event.target.value)}
                disabled={!isSuperAdmin || storesLoading}
                className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">Select a store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
              {errors.store && <p className="mt-1 text-xs text-rose-600">{errors.store}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700">Service</label>
              <select
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                disabled={servicesLoading || !selectedStoreId}
                className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
              >
                <option value="">Select a service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · ${Math.round(Number(service.price || 0))} · {service.duration_minutes} min
                  </option>
                ))}
              </select>
              {errors.service && <p className="mt-1 text-xs text-rose-600">{errors.service}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700">Technician</label>
              <select
                value={technicianId}
                onChange={(event) => setTechnicianId(event.target.value)}
                disabled={techniciansLoading || !selectedStoreId}
                className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
              >
                <option value="">Assign later</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>{technician.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Date</label>
                <div className="relative mt-1">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(event) => setAppointmentDate(event.target.value)}
                    className="w-full rounded-lg border border-blue-100 bg-white py-2.5 pl-9 pr-3 text-sm !text-slate-900"
                  />
                </div>
                {errors.date && <p className="mt-1 text-xs text-rose-600">{errors.date}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Time</label>
                <input
                  type="time"
                  step={300}
                  value={appointmentTime.slice(0, 5)}
                  onChange={(event) => setAppointmentTime(`${event.target.value}:00`)}
                  className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
                />
                {errors.time && <p className="mt-1 text-xs text-rose-600">{errors.time}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700">Notes</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Optional front-desk notes"
                className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-blue-100 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Phone className="h-4 w-4 text-gold-500" />
              Walk-in orders are created as confirmed and tagged as admin walk-in.
            </div>
            <button
              onClick={saveWalkIn}
              disabled={saving || storesLoading || servicesLoading}
              className="rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {saving ? 'Creating...' : 'Create Walk-in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
