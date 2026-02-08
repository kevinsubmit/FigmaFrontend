import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Phone,
  Save,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import {
  Appointment,
  getAppointments,
  markAppointmentNoShow,
  rescheduleAppointment,
  updateAppointmentNotes,
  updateAppointmentStatus,
} from '../api/appointments';
import { getServiceCatalog } from '../api/services';
import { useAuth } from '../context/AuthContext';

type ViewMode = 'day' | 'week';
type StatusOption = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
type AppointmentGroup = {
  key: string;
  date: string;
  startTime: string;
  count: number;
  items: Appointment[];
};

const statusOrder: StatusOption[] = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

const statusText: Record<StatusOption, string> = {
  all: 'All',
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusBadgeClass: Record<StatusOption, string> = {
  all: 'border-neutral-700 text-gray-300 bg-neutral-800/50',
  pending: 'border-amber-500/50 text-amber-200 bg-amber-500/10',
  confirmed: 'border-blue-500/50 text-blue-200 bg-blue-500/10',
  completed: 'border-emerald-500/50 text-emerald-200 bg-emerald-500/10',
  cancelled: 'border-neutral-600 text-gray-300 bg-neutral-700/30',
};

const timelineHours = Array.from({ length: 13 }, (_, idx) => 8 + idx);
const conflictTrackStatuses = new Set<StatusOption>(['pending', 'confirmed']);

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const safeParseDate = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseDateTime = (date: string, time: string) => {
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDayHeader = (value: string) => {
  const date = safeParseDate(value);
  if (!date) return value;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  });
};

const formatDateTitle = (value: string) => {
  const date = safeParseDate(value);
  if (!date) return value;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });
};

const normalizeStatus = (status?: string | null): StatusOption => {
  const value = String(status || '').toLowerCase();
  if (value === 'confirmed') return 'confirmed';
  if (value === 'completed') return 'completed';
  if (value === 'cancelled' || value === 'canceled') return 'cancelled';
  return 'pending';
};

const getEndDateTime = (apt: Appointment) => {
  const startDate = parseDateTime(apt.appointment_date, apt.appointment_time);
  if (!startDate) return null;

  if (apt.end_time) {
    return parseDateTime(apt.appointment_date, apt.end_time);
  }

  const duration = apt.duration_minutes ?? apt.service_duration ?? 60;
  return new Date(startDate.getTime() + duration * 60_000);
};

const formatTimeRange = (apt: Appointment) => {
  const start = apt.appointment_time || '--:--';
  if (apt.end_time) return `${start} - ${apt.end_time}`;

  const endDate = getEndDateTime(apt);
  if (!endDate) return start;

  const end = `${`${endDate.getHours()}`.padStart(2, '0')}:${`${endDate.getMinutes()}`.padStart(2, '0')}`;
  return `${start} - ${end}`;
};

const maskPhone = (phone?: string | null) => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.length <= 4) return cleaned;
  return `${cleaned.slice(0, Math.min(3, cleaned.length - 4))}****${cleaned.slice(-4)}`;
};

const getCustomerName = (apt: Appointment) => apt.customer_name || apt.user_name || `User #${apt.user_id}`;
const getPhone = (apt: Appointment) => apt.customer_phone || apt.user_phone || apt.phone || '';
const getServiceLabel = (apt: Appointment) => apt.service_name || `Service #${apt.service_id}`;
const getStaffLabel = (apt: Appointment) => apt.staff_name || apt.stylist_name || apt.technician_name || '-';
const getStoreLabel = (apt: Appointment) => apt.store_name || `Store #${apt.store_id}`;
const getStartTimeLabel = (time: string) => (time || '--:--').slice(0, 5);

const AppointmentsList: React.FC = () => {
  const { role, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [catalogServiceNames, setCatalogServiceNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [orderKeyword, setOrderKeyword] = useState('');
  const [storeKeyword, setStoreKeyword] = useState('');
  const [status, setStatus] = useState<StatusOption>('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [dateCursor, setDateCursor] = useState(toDateInput(new Date()));
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<StatusOption | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { limit: 200 };
        if (role === 'store_admin' && user?.store_id) params.store_id = user.store_id;
        const [data, catalog] = await Promise.all([
          getAppointments(params),
          getServiceCatalog({ active_only: true, limit: 200 }),
        ]);
        setAppointments(data);
        setCatalogServiceNames(
          Array.from(new Set(catalog.map((item) => item.name).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
        );
      } catch (error) {
        toast.error('Failed to load appointments');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [role, user]);

  const weekDates = useMemo(() => {
    const anchor = safeParseDate(dateCursor);
    if (!anchor) return [dateCursor];

    const day = anchor.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() + mondayOffset);

    return Array.from({ length: 7 }, (_, idx) => {
      const next = new Date(monday);
      next.setDate(monday.getDate() + idx);
      return toDateInput(next);
    });
  }, [dateCursor]);

  const visibleDates = viewMode === 'week' ? weekDates : [dateCursor];

  const serviceOptions = useMemo(() => {
    return catalogServiceNames;
  }, [catalogServiceNames]);

  const staffOptions = useMemo(() => {
    return Array.from(new Set(appointments.map(getStaffLabel).filter((v) => v && v !== '-'))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();
    const lowerOrderKeyword = orderKeyword.trim().toLowerCase();
    const lowerStoreKeyword = storeKeyword.trim().toLowerCase();

    return appointments
      .filter((apt) => visibleDates.includes(apt.appointment_date))
      .filter((apt) => {
        const aptStatus = normalizeStatus(apt.status);
        if (status !== 'all' && aptStatus !== status) return false;
        if (serviceFilter !== 'all' && getServiceLabel(apt) !== serviceFilter) return false;
        if (staffFilter !== 'all' && getStaffLabel(apt) !== staffFilter) return false;
        if (lowerOrderKeyword) {
          const orderText = String(apt.order_number || apt.id).toLowerCase();
          if (!orderText.includes(lowerOrderKeyword)) return false;
        }
        if (role === 'super_admin' && lowerStoreKeyword) {
          if (!getStoreLabel(apt).toLowerCase().includes(lowerStoreKeyword)) return false;
        }

        if (!lowerKeyword) return true;
        const text = [
          getCustomerName(apt),
          getPhone(apt),
          getServiceLabel(apt),
          getStaffLabel(apt),
          apt.order_number || String(apt.id),
        ]
          .join(' ')
          .toLowerCase();
        return text.includes(lowerKeyword);
      })
      .sort((a, b) => {
        if (a.appointment_date !== b.appointment_date) return a.appointment_date.localeCompare(b.appointment_date);
        return a.appointment_time.localeCompare(b.appointment_time);
      });
  }, [appointments, visibleDates, status, serviceFilter, staffFilter, keyword, orderKeyword, role, storeKeyword]);

  const conflictInfo = useMemo(() => {
    const byKey: Record<string, Appointment[]> = {};
    for (const apt of filteredAppointments) {
      const aptStatus = normalizeStatus(apt.status);
      if (!conflictTrackStatuses.has(aptStatus)) continue;
      const staff = getStaffLabel(apt);
      if (staff === '-') continue;
      const key = `${apt.appointment_date}__${staff}`;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(apt);
    }

    const ids = new Set<number>();
    const messages: Record<number, string> = {};

    Object.values(byKey).forEach((list) => {
      const sorted = [...list].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
      for (let i = 0; i < sorted.length; i += 1) {
        const current = sorted[i];
        const currentEnd = getEndDateTime(current);
        const currentStart = parseDateTime(current.appointment_date, current.appointment_time);
        if (!currentEnd || !currentStart) continue;

        for (let j = i + 1; j < sorted.length; j += 1) {
          const next = sorted[j];
          const nextStart = parseDateTime(next.appointment_date, next.appointment_time);
          if (!nextStart) continue;
          if (nextStart >= currentEnd) break;

          ids.add(current.id);
          ids.add(next.id);
          const msg = `Time conflict: ${getStaffLabel(current)} has overlapping bookings`;
          messages[current.id] = msg;
          messages[next.id] = msg;
        }
      }
    });

    return { ids, messages };
  }, [filteredAppointments]);

  const groupedAppointments = useMemo<AppointmentGroup[]>(() => {
    const groups: AppointmentGroup[] = [];
    let currentGroup: AppointmentGroup | null = null;

    for (const apt of filteredAppointments) {
      const startTime = getStartTimeLabel(apt.appointment_time);
      const key = `${apt.appointment_date}__${startTime}`;
      if (!currentGroup || currentGroup.key !== key) {
        currentGroup = {
          key,
          date: apt.appointment_date,
          startTime,
          count: 0,
          items: [],
        };
        groups.push(currentGroup);
      }

      currentGroup.items.push(apt);
      currentGroup.count += 1;
    }

    return groups;
  }, [filteredAppointments]);

  const timelineMap = useMemo(() => {
    const map: Record<string, Record<number, Appointment[]>> = {};
    for (const date of visibleDates) {
      map[date] = {};
      for (const hour of timelineHours) map[date][hour] = [];
    }

    for (const apt of filteredAppointments) {
      const hour = Number((apt.appointment_time || '00:00').split(':')[0]);
      if (!Number.isNaN(hour) && map[apt.appointment_date] && map[apt.appointment_date][hour]) {
        map[apt.appointment_date][hour].push(apt);
      }
    }

    return map;
  }, [filteredAppointments, visibleDates]);

  const syncSelected = (next: Appointment) => {
    setSelected(next);
    setCancelReason(next.cancel_reason || '');
    setEditDate(next.appointment_date || '');
    setEditTime(next.appointment_time || '');
    setEditNotes(next.notes || '');
  };

  const updateStatus = async (nextStatus: StatusOption) => {
    if (!selected || nextStatus === 'all') return;

    setUpdatingStatus(nextStatus);
    try {
      const updated = await updateAppointmentStatus(selected.id, {
        status: nextStatus,
        cancel_reason: nextStatus === 'cancelled' ? cancelReason.trim() || undefined : undefined,
      });

      setAppointments((prev) => prev.map((apt) => (apt.id === updated.id ? { ...apt, ...updated } : apt)));
      syncSelected({ ...selected, ...updated });
      toast.success(`Status updated to ${statusText[nextStatus]}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const saveSchedule = async () => {
    if (!selected) return;
    if (!editDate || !editTime) {
      toast.error('Date and time are required');
      return;
    }

    setSavingSchedule(true);
    try {
      const updated = await rescheduleAppointment(selected.id, { new_date: editDate, new_time: editTime });
      setAppointments((prev) => prev.map((apt) => (apt.id === updated.id ? { ...apt, ...updated } : apt)));
      syncSelected({ ...selected, ...updated });
      toast.success('Appointment time updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to reschedule appointment');
    } finally {
      setSavingSchedule(false);
    }
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      const updated = await updateAppointmentNotes(selected.id, { notes: editNotes });
      setAppointments((prev) => prev.map((apt) => (apt.id === updated.id ? { ...apt, ...updated } : apt)));
      syncSelected({ ...selected, ...updated });
      toast.success('Notes updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const markNoShow = async () => {
    if (!selected) return;
    setUpdatingStatus('cancelled');
    try {
      const updated = await markAppointmentNoShow(selected.id);
      setAppointments((prev) => prev.map((apt) => (apt.id === updated.id ? { ...apt, ...updated } : apt)));
      syncSelected({ ...selected, ...updated });
      toast.success('Appointment marked as no-show');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to mark no-show');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const moveDate = (offsetDays: number) => {
    const date = safeParseDate(dateCursor);
    if (!date) return;
    date.setDate(date.getDate() + offsetDays);
    setDateCursor(toDateInput(date));
  };

  const resetFilters = () => {
    setKeyword('');
    setOrderKeyword('');
    setStoreKeyword('');
    setStatus('all');
    setServiceFilter('all');
    setStaffFilter('all');
  };

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroupKeys((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  return (
    <AdminLayout>
      <TopBar title="Appointments" />
      <div className="px-4 pt-4 pb-4 space-y-4">
        <div className="card-surface p-3 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => moveDate(-1)}
                className="rounded-lg border border-neutral-800 p-2 text-gray-300 hover:border-gold-500"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDateCursor(toDateInput(new Date()))}
                className="rounded-lg border border-neutral-800 px-2.5 py-2 text-xs text-gray-300 hover:border-gold-500"
              >
                Today
              </button>
              <button
                onClick={() => moveDate(1)}
                className="rounded-lg border border-neutral-800 p-2 text-gray-300 hover:border-gold-500"
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="ml-1 flex items-center gap-2 text-sm text-gray-300">
                <CalendarDays className="h-4 w-4 text-gold-500" />
                <span>{formatDateTitle(dateCursor)}</span>
              </div>
              <input
                type="date"
                value={dateCursor}
                onChange={(e) => setDateCursor(e.target.value)}
                className="ml-1 rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-2 text-xs text-gray-300 outline-none focus:border-gold-500"
              />
            </div>

            <div className="inline-flex rounded-xl border border-neutral-800 bg-neutral-900/70 p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`rounded-lg px-3 py-1.5 text-xs uppercase tracking-[0.15em] ${
                  viewMode === 'day' ? 'bg-gold-500 text-black' : 'text-gray-400'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`rounded-lg px-3 py-1.5 text-xs uppercase tracking-[0.15em] ${
                  viewMode === 'week' ? 'bg-gold-500 text-black' : 'text-gray-400'
                }`}
              >
                Week
              </button>
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-2 md:grid-cols-2 ${role === 'super_admin' ? 'xl:grid-cols-7' : 'xl:grid-cols-6'}`}>
            <label className="relative xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search name / phone / service"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gold-500"
              />
            </label>

            <input
              value={orderKeyword}
              onChange={(e) => setOrderKeyword(e.target.value)}
              placeholder="Search by order number"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            />

            {role === 'super_admin' && (
              <input
                value={storeKeyword}
                onChange={(e) => setStoreKeyword(e.target.value)}
                placeholder="Search by store name"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
              />
            )}

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusOption)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            >
              {statusOrder.map((option) => (
                <option key={option} value={option}>
                  {statusText[option]}
                </option>
              ))}
            </select>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            >
              <option value="all">All Services</option>
              {serviceOptions.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>

            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm outline-none focus:border-gold-500"
            >
              <option value="all">All Staff</option>
              {staffOptions.map((staff) => (
                <option key={staff} value={staff}>
                  {staff}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{filteredAppointments.length} appointments</span>
            <button onClick={resetFilters} className="rounded-md border border-neutral-700 px-2 py-1 hover:border-gold-500">
              Reset Filters
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400">Loading appointments...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <section className="card-surface p-3 xl:col-span-2">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
                <Clock3 className="h-4 w-4" />
                Timeline
              </div>

              <div className="space-y-3 max-h-[540px] overflow-auto pr-1">
                {visibleDates.map((date) => (
                  <div key={date} className="space-y-2">
                    {viewMode === 'week' && (
                      <p className="text-xs font-semibold tracking-wide text-gold-300">{formatDayHeader(date)}</p>
                    )}
                    {timelineHours.map((hour) => {
                      const hourLabel = `${`${hour}`.padStart(2, '0')}:00`;
                      const bucket = timelineMap[date]?.[hour] || [];
                      return (
                        <div key={`${date}-${hour}`} className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-2.5">
                          <p className="text-[11px] uppercase tracking-widest text-gray-500">{hourLabel}</p>
                          {!bucket.length ? (
                            <p className="mt-1 text-xs text-gray-600">-</p>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {bucket.map((apt) => {
                                const aptStatus = normalizeStatus(apt.status);
                                const hasConflict = conflictInfo.ids.has(apt.id);
                                return (
                                  <button
                                    key={apt.id}
                                    onClick={() => syncSelected(apt)}
                                    className={`w-full rounded-lg border px-2 py-2 text-left ${
                                      hasConflict
                                        ? 'border-rose-400/80 bg-rose-500/10 text-rose-100'
                                        : statusBadgeClass[aptStatus]
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-xs font-medium">{getCustomerName(apt)}</p>
                                      {hasConflict && <AlertTriangle className="h-3.5 w-3.5" />}
                                    </div>
                                    <p className="text-[11px] opacity-90">{getServiceLabel(apt)}</p>
                                    <p className="text-[10px] opacity-80">{formatTimeRange(apt)}</p>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>

            <section className="card-surface p-3 overflow-hidden xl:col-span-1">
              <div className="overflow-auto max-h-[540px]">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-neutral-900">
                    <tr className="text-xs uppercase tracking-[0.15em] text-gray-500 border-b border-neutral-800">
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Customer</th>
                      <th className="px-3 py-2 font-medium">Phone</th>
                      <th className="px-3 py-2 font-medium">Service</th>
                      <th className="px-3 py-2 font-medium">Staff</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedAppointments.map((group) => {
                      const isCollapsed = !!collapsedGroupKeys[group.key];
                      return (
                        <React.Fragment key={group.key}>
                          <tr className="border-b border-neutral-800 bg-neutral-900/70">
                            <td colSpan={6} className="px-3 py-2">
                              <button
                                onClick={() => toggleGroup(group.key)}
                                className="w-full text-left flex items-center justify-between text-xs"
                              >
                                <span className="font-semibold text-gold-300">
                                  {group.date} {group.startTime}
                                </span>
                                <span className="text-gray-300">
                                  {group.count} booking{group.count > 1 ? 's' : ''} {isCollapsed ? '(collapsed)' : '(expanded)'}
                                </span>
                              </button>
                            </td>
                          </tr>
                          {!isCollapsed &&
                            group.items.map((apt) => {
                              const aptStatus = normalizeStatus(apt.status);
                              const hasConflict = conflictInfo.ids.has(apt.id);
                              return (
                                <tr
                                  key={apt.id}
                                  onClick={() => syncSelected(apt)}
                                  className={`cursor-pointer border-b border-neutral-800/80 hover:bg-neutral-800/50 ${
                                    hasConflict ? 'bg-rose-500/5' : ''
                                  }`}
                                >
                                  <td className="px-3 py-2.5 align-top whitespace-nowrap">
                                    <p>{formatTimeRange(apt)}</p>
                                    <p className="text-xs text-gray-500">
                                      {apt.appointment_date} · concurrent {group.count}
                                    </p>
                                  </td>
                                  <td className="px-3 py-2.5 align-top">
                                    <p className="font-medium">{getCustomerName(apt)}</p>
                                    <p className="text-xs text-gray-500">#{apt.order_number || apt.id}</p>
                                    {hasConflict && (
                                      <p className="mt-1 text-[11px] text-rose-300 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Conflict
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 align-top text-gray-200">{maskPhone(getPhone(apt))}</td>
                                  <td className="px-3 py-2.5 align-top">{getServiceLabel(apt)}</td>
                                  <td className="px-3 py-2.5 align-top">{getStaffLabel(apt)}</td>
                                  <td className="px-3 py-2.5 align-top">
                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${statusBadgeClass[aptStatus]}`}>
                                      {statusText[aptStatus]}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                {!filteredAppointments.length && (
                  <div className="p-6 text-center text-sm text-gray-500">No appointments in this range.</div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60">
          <div className="absolute inset-y-0 right-0 w-full max-w-md border-l border-neutral-800 bg-neutral-950 shadow-2xl overflow-auto">
            <div className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur">
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-base font-semibold">Appointment Detail</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-full border border-neutral-700 p-1.5 text-gray-300 hover:border-gold-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Customer</p>
                <div className="flex items-center gap-2 text-sm">
                  <UserRound className="h-4 w-4 text-gold-500" />
                  <span className="font-medium">{getCustomerName(selected)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Phone className="h-4 w-4 text-gold-500" />
                  <span>{getPhone(selected) || '-'}</span>
                </div>
                <p className="text-xs text-gray-400">Order: #{selected.order_number || selected.id}</p>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 space-y-2 text-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Service</p>
                <p>{getServiceLabel(selected)}</p>
                <p className="text-gray-400">Current: {formatTimeRange(selected)}</p>
                <p className="text-gray-400">Staff: {getStaffLabel(selected)}</p>
                {conflictInfo.ids.has(selected.id) && (
                  <p className="text-xs text-rose-300 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {conflictInfo.messages[selected.id]}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 space-y-2 text-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Status</p>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                    statusBadgeClass[normalizeStatus(selected.status)]
                  }`}
                >
                  {statusText[normalizeStatus(selected.status)]}
                </span>
                {selected.cancel_reason && <p className="text-xs text-gray-400">Cancel reason: {selected.cancel_reason}</p>}
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Reschedule</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-2 text-sm outline-none focus:border-gold-500"
                  />
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-2 text-sm outline-none focus:border-gold-500"
                  />
                </div>
                <button
                  onClick={saveSchedule}
                  disabled={savingSchedule}
                  className="w-full rounded-lg border border-gold-500/50 px-3 py-2 text-sm text-gold-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Time
                </button>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Notes</p>
                <textarea
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-2 text-sm outline-none focus:border-gold-500"
                  placeholder="Notes"
                />
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="w-full rounded-lg border border-neutral-600 px-3 py-2 text-sm text-gray-200 disabled:opacity-50"
                >
                  Save Notes
                </button>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] text-gray-500">Cancel reason</label>
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-2 text-sm outline-none focus:border-gold-500"
                  placeholder="Optional"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateStatus('confirmed')}
                  disabled={!!updatingStatus}
                  className="rounded-lg border border-blue-500/50 px-3 py-2 text-sm text-blue-200 disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => updateStatus('completed')}
                  disabled={!!updatingStatus}
                  className="rounded-lg border border-emerald-500/50 px-3 py-2 text-sm text-emerald-200 disabled:opacity-50"
                >
                  Complete
                </button>
                <button
                  onClick={() => updateStatus('cancelled')}
                  disabled={!!updatingStatus}
                  className="rounded-lg border border-neutral-600 px-3 py-2 text-sm text-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={markNoShow}
                  disabled={!!updatingStatus}
                  className="rounded-lg border border-rose-500/50 px-3 py-2 text-sm text-rose-200 disabled:opacity-50"
                >
                  No Show
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AppointmentsList;
