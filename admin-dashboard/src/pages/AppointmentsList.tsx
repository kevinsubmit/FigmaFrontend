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
  AppointmentGroupResponse,
  AppointmentStaffSplitSummary,
  getAppointmentGroup,
  getAppointments,
  getAppointmentStaffSplits,
  markAppointmentNoShow,
  refundAppointment,
  rescheduleAppointment,
  settleAppointment,
  updateAppointmentAmount,
  updateAppointmentGuestOwner,
  updateAppointmentNotes,
  updateAppointmentStaffSplits,
  updateAppointmentStatus,
  updateAppointmentTechnician,
} from '../api/appointments';
import { CustomerCouponItem, CustomerGiftCardItem, getCustomerRewards } from '../api/customers';
import { getServiceCatalog, getStoreServices, Service } from '../api/services';
import { getTechnicians, Technician } from '../api/technicians';
import { useAuth } from '../context/AuthContext';
import { formatApiDateTimeET, formatYmdAsETDate, getTodayYmdET } from '../utils/time';

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
  all: 'border-blue-200 text-slate-700 bg-blue-100/50',
  pending: 'border-amber-300 text-amber-700 bg-amber-50',
  confirmed: 'border-blue-300 text-blue-700 bg-blue-50',
  completed: 'border-emerald-300 text-emerald-700 bg-emerald-50',
  cancelled: 'border-slate-300 text-slate-600 bg-slate-100',
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
  return formatYmdAsETDate(value, {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  });
};

const formatDateTitle = (value: string) => {
  return formatYmdAsETDate(value, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });
};

const formatCreatedAt = (value?: string | null) => {
  return formatApiDateTimeET(value, true);
};

const normalizeStatus = (status?: string | null): StatusOption => {
  const value = String(status || '').toLowerCase();
  if (value === 'confirmed') return 'confirmed';
  if (value === 'completed') return 'completed';
  if (value === 'cancelled' || value === 'canceled') return 'cancelled';
  return 'pending';
};

const canEditSplitByStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status);
  return normalized === 'pending' || normalized === 'confirmed' || normalized === 'completed';
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

const toTelHref = (phone?: string | null) => {
  if (!phone) return '';
  const sanitized = phone.replace(/[^\d+]/g, '');
  return sanitized ? `tel:${sanitized}` : '';
};

const getCustomerName = (apt: Appointment) => apt.customer_name || apt.user_name || `User #${apt.user_id}`;
const resolvePhone = (apt: Appointment) => {
  return `${apt.customer_phone || ''}`.trim() || '-';
};
const getServiceLabel = (apt: Appointment) => apt.service_name || `Service #${apt.service_id}`;
const getStaffLabel = (apt: Appointment) => apt.staff_name || apt.stylist_name || apt.technician_name || '-';
const hasBookedTechnician = (apt: Appointment) => typeof apt.technician_id === 'number' && apt.technician_id > 0;
const getBookedTechnicianBadgeLabel = (apt: Appointment) => {
  const label = getStaffLabel(apt);
  if (!label || label === '-') return 'Assigned';
  return label;
};
const getStoreLabel = (apt: Appointment) => apt.store_name || `Store #${apt.store_id}`;
const getStartTimeLabel = (time: string) => (time || '--:--').slice(0, 5);
const getOrderAmount = (apt: Appointment) => {
  if (typeof apt.order_amount === 'number') return apt.order_amount;
  if (typeof apt.service_price === 'number') return apt.service_price;
  return null;
};
const asNumberOrZero = (value?: number | null) => (typeof value === 'number' ? value : 0);
const getSettlementOriginalAmount = (apt: Appointment) => {
  const settlementStatus = (apt.settlement_status || 'unsettled').toLowerCase();
  if (settlementStatus === 'unsettled' && typeof apt.order_amount === 'number') {
    return apt.order_amount;
  }
  if (typeof apt.original_amount === 'number') return apt.original_amount;
  return getOrderAmount(apt) ?? 0;
};
const formatCurrency = (value?: number | null) => (typeof value === 'number' ? `$${Math.floor(value)}` : '-');
const toGroupRoleLabel = (apt: Appointment) => {
  if (!apt.group_id) return '';
  return apt.is_group_host ? 'Host' : 'Guest';
};
const normalizeAmountInput = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const cleaned = trimmed.replace(/[^\d.]/g, '');
  if (!cleaned) return '';
  const integerPart = cleaned.split('.')[0];
  return integerPart.replace(/^0+(?=\d)/, '');
};
const parseAmountOrZero = (raw: string) => {
  const n = Number.parseInt(raw.trim() || '0', 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
};
const formatShortDate = (value?: string | null) => {
  if (!value) return 'No expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No expiry';
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'America/New_York',
  });
};
const formatCouponRuleLabel = (coupon: CustomerCouponItem) => {
  const type = (coupon.discount_type || '').toLowerCase();
  if (type === 'percentage') {
    const maxText = typeof coupon.max_discount === 'number' && coupon.max_discount > 0 ? `, max $${Math.floor(coupon.max_discount)}` : '';
    return `${Math.floor(coupon.discount_value)}% off${maxText}`;
  }
  return `$${Math.floor(coupon.discount_value)} off`;
};
const formatCouponOptionLabel = (coupon: CustomerCouponItem) => {
  const minText = Number(coupon.min_amount || 0) > 0 ? `, min $${Math.floor(coupon.min_amount)}` : '';
  return `#${coupon.id} ${coupon.coupon_name} (${formatCouponRuleLabel(coupon)}${minText}) · Exp ${formatShortDate(coupon.expires_at)}`;
};
const formatGiftCardOptionLabel = (card: CustomerGiftCardItem) => {
  const cardTail = String(card.card_number || '').slice(-4) || String(card.id);
  return `#${card.id} ****${cardTail} · Balance $${Math.floor(Number(card.balance || 0))} · Exp ${formatShortDate(card.expires_at)}`;
};
const calculateCouponDiscountAmount = (orderAmount: number, coupon: CustomerCouponItem) => {
  const minAmount = Number(coupon.min_amount || 0);
  if (orderAmount < minAmount) return 0;
  const discountType = (coupon.discount_type || '').toLowerCase();
  if (discountType === 'percentage') {
    let value = orderAmount * (Number(coupon.discount_value || 0) / 100);
    if (typeof coupon.max_discount === 'number' && coupon.max_discount > 0) {
      value = Math.min(value, Number(coupon.max_discount));
    }
    return Math.max(0, Math.floor(value));
  }
  return Math.max(0, Math.floor(Number(coupon.discount_value || 0)));
};

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
  const [dateCursor, setDateCursor] = useState(getTodayYmdET());
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<StatusOption | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingAmount, setSavingAmount] = useState(false);
  const [showAmountEditor, setShowAmountEditor] = useState(false);
  const [savingGuestOwner, setSavingGuestOwner] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [settling, setSettling] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [settlementUserCouponId, setSettlementUserCouponId] = useState('');
  const [settlementCouponDiscount, setSettlementCouponDiscount] = useState('');
  const [settlementGiftCardId, setSettlementGiftCardId] = useState('');
  const [settlementGiftAmount, setSettlementGiftAmount] = useState('');
  const [settlementCashPaid, setSettlementCashPaid] = useState('');
  const [settlementIdemKey, setSettlementIdemKey] = useState('');
  const [settlementCoupons, setSettlementCoupons] = useState<CustomerCouponItem[]>([]);
  const [settlementGiftCards, setSettlementGiftCards] = useState<CustomerGiftCardItem[]>([]);
  const [settlementOptionsLoading, setSettlementOptionsLoading] = useState(false);
  const [refundCashAmount, setRefundCashAmount] = useState('');
  const [refundGiftAmount, setRefundGiftAmount] = useState('');
  const [refundGiftCardId, setRefundGiftCardId] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundIdemKey, setRefundIdemKey] = useState('');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [guestOwnerPhone, setGuestOwnerPhone] = useState('');
  const [staffOptionsForSelected, setStaffOptionsForSelected] = useState<Technician[]>([]);
  const [splitRows, setSplitRows] = useState<Array<{ technician_id: string; service_id: string; amount: string }>>([]);
  const [splitServiceOptions, setSplitServiceOptions] = useState<Service[]>([]);
  const [splitSaving, setSplitSaving] = useState(false);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitSummary, setSplitSummary] = useState<AppointmentStaffSplitSummary | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AppointmentGroupResponse | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);
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
          resolvePhone(apt),
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
    const amount = getOrderAmount(next);
    setEditAmount(typeof amount === 'number' ? String(Math.floor(amount)) : '');
    setShowAmountEditor(false);
    setSelectedTechnicianId(next.technician_id ? String(next.technician_id) : '');
    setGuestOwnerPhone(next.guest_phone || '');
    setSettlementUserCouponId('');
    setSettlementCouponDiscount(String(Math.floor(asNumberOrZero(next.coupon_discount_amount))));
    setSettlementGiftCardId('');
    setSettlementGiftAmount('');
    const cashPreview = asNumberOrZero(next.cash_paid_amount);
    setSettlementCashPaid(cashPreview > 0 ? String(Math.floor(cashPreview)) : '');
    setSettlementIdemKey(`settle-${next.id}-${Date.now()}`);
    setRefundCashAmount('');
    setRefundGiftAmount('');
    setRefundGiftCardId('');
    setRefundReason('');
    setRefundIdemKey(`refund-${next.id}-${Date.now()}`);
  };

  useEffect(() => {
    const loadSettlementOptions = async () => {
      if (!selected?.user_id) {
        setSettlementCoupons([]);
        setSettlementGiftCards([]);
        return;
      }
      setSettlementOptionsLoading(true);
      try {
        const rewards = await getCustomerRewards(selected.user_id, {
          coupon_limit: 100,
          coupon_status: 'available',
          coupon_validity: 'valid',
          gift_card_limit: 100,
          gift_card_status: 'active',
        });
        setSettlementCoupons((rewards.coupons || []).filter((item) => String(item.status).toLowerCase() === 'available'));
        setSettlementGiftCards((rewards.gift_cards || []).filter((item) => String(item.status).toLowerCase() === 'active' && Number(item.balance || 0) > 0));
      } catch {
        setSettlementCoupons([]);
        setSettlementGiftCards([]);
      } finally {
        setSettlementOptionsLoading(false);
      }
    };

    loadSettlementOptions();
  }, [selected?.id, selected?.user_id]);

  const handleSettlementCouponChange = (value: string) => {
    setSettlementUserCouponId(value);
    if (!selected || !value) {
      setSettlementCouponDiscount('0');
      if (selected && settlementGiftCardId) {
        handleSettlementGiftCardChange(settlementGiftCardId);
      }
      return;
    }
    const coupon = settlementCoupons.find((item) => item.id === Number.parseInt(value, 10));
    if (!coupon) {
      setSettlementCouponDiscount('0');
      return;
    }
    const orderAmount = Math.max(0, Number(getOrderAmount(selected) || 0));
    const discountAmount = calculateCouponDiscountAmount(orderAmount, coupon);
    setSettlementCouponDiscount(String(discountAmount));
    if (settlementGiftCardId) {
      handleSettlementGiftCardChange(settlementGiftCardId);
      return;
    }
    setSettlementCashPaid(String(Math.max(0, orderAmount - discountAmount)));
  };

  const handleSettlementGiftCardChange = (value: string) => {
    setSettlementGiftCardId(value);
    if (!selected || !value) {
      setSettlementGiftAmount('');
      return;
    }
    const card = settlementGiftCards.find((item) => item.id === Number.parseInt(value, 10));
    if (!card) {
      setSettlementGiftAmount('');
      return;
    }
    const orderAmount = Math.max(0, Number(getOrderAmount(selected) || 0));
    const couponDiscount = parseAmountOrZero(settlementCouponDiscount);
    const remainingAfterCoupon = Math.max(0, orderAmount - couponDiscount);
    const usableGiftAmount = Math.max(0, Math.floor(Math.min(Number(card.balance || 0), remainingAfterCoupon)));
    setSettlementGiftAmount(String(usableGiftAmount));
    setSettlementCashPaid(String(Math.max(0, remainingAfterCoupon - usableGiftAmount)));
  };

  useEffect(() => {
    const loadStaffForSelected = async () => {
      if (!selected?.store_id) {
        setStaffOptionsForSelected([]);
        return;
      }
      try {
        const rows = await getTechnicians({ store_id: selected.store_id, skip: 0, limit: 100 });
        setStaffOptionsForSelected(rows.filter((row) => row.is_active === 1));
      } catch {
        setStaffOptionsForSelected([]);
      }
    };
    loadStaffForSelected();
  }, [selected?.id, selected?.store_id]);

  useEffect(() => {
    const loadSplitServices = async () => {
      if (!selected?.store_id) {
        setSplitServiceOptions([]);
        return;
      }
      try {
        const rows = await getStoreServices(selected.store_id);
        setSplitServiceOptions(rows.filter((item) => item.is_active !== 0));
      } catch {
        setSplitServiceOptions([]);
      }
    };
    loadSplitServices();
  }, [selected?.id, selected?.store_id]);

  useEffect(() => {
    const loadGroup = async () => {
      if (!selected?.group_id) {
        setSelectedGroup(null);
        setGroupLoading(false);
        return;
      }
      setGroupLoading(true);
      try {
        const data = await getAppointmentGroup(selected.group_id);
        setSelectedGroup(data);
      } catch {
        setSelectedGroup(null);
      } finally {
        setGroupLoading(false);
      }
    };
    loadGroup();
  }, [selected?.id, selected?.group_id]);

  useEffect(() => {
    const loadSplits = async () => {
      if (!selected?.id) {
        setSplitSummary(null);
        setSplitRows([]);
        return;
      }
      setSplitLoading(true);
      try {
        const summary = await getAppointmentStaffSplits(selected.id);
        setSplitSummary(summary);
        if (summary.splits.length > 0) {
          setSplitRows(
            summary.splits.map((item) => ({
              technician_id: String(item.technician_id),
              service_id: String(item.service_id || selected.service_id),
              amount: String(item.amount),
            })),
          );
        } else {
          setSplitRows([
            {
              technician_id: selected.technician_id ? String(selected.technician_id) : '',
              service_id: selected.service_id ? String(selected.service_id) : '',
              amount: '',
            },
          ]);
        }
      } catch {
        setSplitSummary(null);
        setSplitRows([]);
      } finally {
        setSplitLoading(false);
      }
    };
    loadSplits();
  }, [selected?.id, selected?.technician_id]);

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
      if (!error?.__api_toast_shown) {
        toast.error(error?.response?.data?.detail || 'Failed to update status');
      }
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
      if (!error?.__api_toast_shown) {
        toast.error(error?.response?.data?.detail || 'Failed to reschedule appointment');
      }
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
      if (!error?.__api_toast_shown) {
        toast.error(error?.response?.data?.detail || 'Failed to update notes');
      }
    } finally {
      setSavingNotes(false);
    }
  };

  const saveAmount = async () => {
    if (!selected) return;
    if (!editAmount.trim()) {
      toast.error('Amount is required');
      return;
    }
    const parsed = Number.parseInt(editAmount, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      toast.error('Amount must be greater than or equal to 1');
      return;
    }

    setSavingAmount(true);
    try {
      const updated = await updateAppointmentAmount(selected.id, { order_amount: parsed });
      setAppointments((prev) => prev.map((apt) => (apt.id === updated.id ? { ...apt, ...updated } : apt)));
      syncSelected({ ...selected, ...updated });
      try {
        const refreshedSummary = await getAppointmentStaffSplits(selected.id);
        setSplitSummary(refreshedSummary);
      } catch {
        // Keep previous split summary when refresh fails.
      }
      toast.success('Order amount updated');
    } catch (error: any) {
      if (!error?.__api_toast_shown) {
        toast.error(error?.response?.data?.detail || 'Failed to update order amount');
      }
    } finally {
      setSavingAmount(false);
    }
  };

  const saveSettlement = async () => {
    if (!selected) return;
    if (!settlementIdemKey.trim()) {
      toast.error('Idempotency key is required');
      return;
    }
    const userCouponId = settlementUserCouponId.trim()
      ? Number.parseInt(settlementUserCouponId.trim(), 10)
      : undefined;
    const couponDiscount = parseAmountOrZero(settlementCouponDiscount);
    const giftAmount = parseAmountOrZero(settlementGiftAmount);
    const cashPaid = parseAmountOrZero(settlementCashPaid);
    const giftCardId = settlementGiftCardId.trim() ? Number.parseInt(settlementGiftCardId, 10) : undefined;

    if (giftAmount > 0 && (!giftCardId || Number.isNaN(giftCardId))) {
      toast.error('Gift card id is required when gift amount > 0');
      return;
    }
    if (settlementUserCouponId.trim() && (!userCouponId || Number.isNaN(userCouponId))) {
      toast.error('User coupon id is invalid');
      return;
    }

    setSettling(true);
    try {
      const updated = await settleAppointment(selected.id, {
        idempotency_key: settlementIdemKey.trim(),
        user_coupon_id: userCouponId,
        coupon_discount_amount: couponDiscount,
        gift_card_id: giftCardId,
        gift_card_amount: giftAmount,
        cash_paid_amount: cashPaid,
      });
      setAppointments((prev) => prev.map((apt) => (apt.id === updated.id ? { ...apt, ...updated } : apt)));
      syncSelected({ ...selected, ...updated });
      toast.success('Settlement saved');
    } catch (error: any) {
      if (!error?.__api_toast_shown) {
        toast.error(error?.response?.data?.detail || 'Failed to settle appointment');
      }
    } finally {
      setSettling(false);
    }
  };

  const saveRefund = async () => {
    if (!selected) return;
    if (!refundIdemKey.trim()) {
      toast.error('Idempotency key is required');
      return;
    }
    const refundCash = parseAmountOrZero(refundCashAmount);
    const refundGift = parseAmountOrZero(refundGiftAmount);
    const giftCardId = refundGiftCardId.trim() ? Number.parseInt(refundGiftCardId, 10) : undefined;

    if (refundCash <= 0 && refundGift <= 0) {
      toast.error('Refund amount must be greater than 0');
      return;
    }
    if (refundGift > 0 && (!giftCardId || Number.isNaN(giftCardId))) {
      toast.error('Gift card id is required when refund gift amount > 0');
      return;
    }

    setRefunding(true);
    try {
      const updated = await refundAppointment(selected.id, {
        idempotency_key: refundIdemKey.trim(),
        refund_cash_amount: refundCash,
        refund_gift_card_amount: refundGift,
        gift_card_id: giftCardId,
        reason: refundReason.trim() || undefined,
      });
      setAppointments((prev) => prev.map((apt) => (apt.id === updated.id ? { ...apt, ...updated } : apt)));
      syncSelected({ ...selected, ...updated });
      toast.success('Refund saved');
    } catch (error: any) {
      if (!error?.__api_toast_shown) {
        toast.error(error?.response?.data?.detail || 'Failed to refund appointment');
      }
    } finally {
      setRefunding(false);
    }
  };

  const saveGuestOwner = async () => {
    if (!selected) return;
    if (!selected.group_id || selected.is_group_host) {
      toast.error('Only group guest orders support guest owner assignment');
      return;
    }

    setSavingGuestOwner(true);
    try {
      const updated = await updateAppointmentGuestOwner(selected.id, {
        guest_phone: guestOwnerPhone.trim() || null,
      });
      setAppointments((prev) => prev.map((apt) => (apt.id === updated.id ? { ...apt, ...updated } : apt)));
      syncSelected({ ...selected, ...updated });
      toast.success('Guest owner updated');
    } catch (error: any) {
      if (!error?.__api_toast_shown) {
        toast.error(error?.response?.data?.detail || 'Failed to update guest owner');
      }
    } finally {
      setSavingGuestOwner(false);
    }
  };

  const saveStaffBinding = async () => {
    if (!selected) return;
    if (!canEditSplitByStatus(selected.status)) {
      toast.error('Only pending, confirmed, or completed appointments can bind staff');
      return;
    }

    setSavingStaff(true);
    try {
      const technicianId = selectedTechnicianId ? Number(selectedTechnicianId) : null;
      const updated = await updateAppointmentTechnician(selected.id, { technician_id: technicianId });
      const selectedStaffName =
        technicianId == null
          ? null
          : staffOptionsForSelected.find((row) => row.id === technicianId)?.name || selected.technician_name || null;
      const merged = { ...selected, ...updated, technician_name: selectedStaffName };
      setAppointments((prev) => prev.map((apt) => (apt.id === updated.id ? { ...apt, ...merged } : apt)));
      syncSelected(merged);
      toast.success('Staff binding updated');
    } catch (error: any) {
      if (!error?.__api_toast_shown) {
        toast.error(error?.response?.data?.detail || 'Failed to update staff binding');
      }
    } finally {
      setSavingStaff(false);
    }
  };

  const updateSplitRow = (index: number, key: 'technician_id' | 'service_id' | 'amount', value: string) => {
    setSplitRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, [key]: value } : row)));
  };

  const addSplitRow = () => {
    setSplitRows((prev) => [
      ...prev,
      { technician_id: '', service_id: selected?.service_id ? String(selected.service_id) : '', amount: '' },
    ]);
  };

  const removeSplitRow = (index: number) => {
    setSplitRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const splitTotalLocal = useMemo(() => {
    return splitRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  }, [splitRows]);

  const saveSplits = async () => {
    if (!selected) return;
    if (!canEditSplitByStatus(selected.status)) {
      toast.error('Only pending, confirmed, or completed appointments can set staff amount split');
      return;
    }

    const payloadRows: Array<{ technician_id: number; service_id: number; amount: number }> = [];
    for (const row of splitRows) {
      const technicianId = Number(row.technician_id);
      const serviceId = Number(row.service_id);
      const amount = Number.parseInt(row.amount, 10);
      if (!technicianId || Number.isNaN(technicianId)) {
        toast.error('请选择技师 / Please select technician for each split line');
        return;
      }
      if (!serviceId || Number.isNaN(serviceId)) {
        toast.error('请选择服务 / Please select service for each split line');
        return;
      }
      if (!amount || Number.isNaN(amount) || amount < 1) {
        toast.error('拆分金额最小为 1 / Split amount must be greater than or equal to 1');
        return;
      }
      payloadRows.push({
        technician_id: technicianId,
        service_id: serviceId,
        amount,
      });
    }

    setSplitSaving(true);
    try {
      const summary = await updateAppointmentStaffSplits(selected.id, { splits: payloadRows });
      setSplitSummary(summary);
      const nextRows = summary.splits.map((item) => ({
        technician_id: String(item.technician_id),
        service_id: String(item.service_id || selected.service_id),
        amount: String(item.amount),
      }));
      setSplitRows(nextRows);
      if (nextRows.length === 0) {
        toast.success('已清空拆分，当前订单为非拆分单 / Split cleared');
      } else {
        toast.success('技师金额拆分已更新 / Staff amount split updated');
      }
    } catch (error: any) {
      if (!error?.__api_toast_shown) {
        toast.error(error?.response?.data?.detail || 'Failed to update staff amount split');
      }
    } finally {
      setSplitSaving(false);
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
      if (!error?.__api_toast_shown) {
        toast.error(error?.response?.data?.detail || 'Failed to mark no-show');
      }
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
      <TopBar title="预约管理" subtitle="按日期、服务、店铺快速检索和排班" />
      <div className="px-4 pt-4 pb-4 space-y-4 lg:px-6">
        <div className="card-surface p-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => moveDate(-1)}
                className="rounded-lg border border-blue-100 p-2 text-slate-700 hover:border-gold-500"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDateCursor(getTodayYmdET())}
                className="rounded-lg border border-blue-100 px-2.5 py-2 text-xs text-slate-700 hover:border-gold-500"
              >
                Today
              </button>
              <button
                onClick={() => moveDate(1)}
                className="rounded-lg border border-blue-100 p-2 text-slate-700 hover:border-gold-500"
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="ml-1 flex items-center gap-2 text-sm text-slate-700">
                <CalendarDays className="h-4 w-4 text-gold-500" />
                <span>{formatDateTitle(dateCursor)}</span>
              </div>
              <input
                type="date"
                value={dateCursor}
                onChange={(e) => setDateCursor(e.target.value)}
                className="ml-1 rounded-lg border border-blue-100 bg-white px-2.5 py-2 text-xs !text-slate-900 outline-none focus:border-gold-500"
              />
            </div>

            <div className="inline-flex rounded-xl border border-blue-100 bg-blue-50 p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`rounded-lg px-3 py-1.5 text-xs uppercase tracking-[0.15em] ${
                  viewMode === 'day' ? 'bg-gold-500 text-white' : 'text-slate-600'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`rounded-lg px-3 py-1.5 text-xs uppercase tracking-[0.15em] ${
                  viewMode === 'week' ? 'bg-gold-500 text-white' : 'text-slate-600'
                }`}
              >
                Week
              </button>
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-2 md:grid-cols-2 ${role === 'super_admin' ? 'xl:grid-cols-7' : 'xl:grid-cols-6'}`}>
            <label className="relative xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search name / phone / service"
                className="w-full rounded-xl border border-blue-100 bg-white py-2.5 pl-9 pr-3 text-sm !text-slate-900 placeholder:text-slate-500 outline-none focus:border-gold-500"
              />
            </label>

            <input
              value={orderKeyword}
              onChange={(e) => setOrderKeyword(e.target.value)}
              placeholder="Search by order number"
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 placeholder:text-slate-500 outline-none focus:border-gold-500"
            />

            {role === 'super_admin' && (
              <input
                value={storeKeyword}
                onChange={(e) => setStoreKeyword(e.target.value)}
                placeholder="Search by store name"
                className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 placeholder:text-slate-500 outline-none focus:border-gold-500"
              />
            )}

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusOption)}
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 [&>option]:text-slate-900 outline-none focus:border-gold-500"
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
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 [&>option]:text-slate-900 outline-none focus:border-gold-500"
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
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 [&>option]:text-slate-900 outline-none focus:border-gold-500"
            >
              <option value="all">All Staff</option>
              {staffOptions.map((staff) => (
                <option key={staff} value={staff}>
                  {staff}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 border-t border-blue-100 pt-2">
            <span>{filteredAppointments.length} appointments</span>
            <button onClick={resetFilters} className="rounded-md border border-blue-200 px-2 py-1 hover:border-gold-500">
              Reset Filters
            </button>
          </div>
        </div>

        <div className="card-surface p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            <span className="text-slate-500">订单颜色说明 / Color Legend:</span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 ${statusBadgeClass.pending}`}>
              待处理 Pending
            </span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 ${statusBadgeClass.confirmed}`}>
              已确认 Confirmed
            </span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 ${statusBadgeClass.completed}`}>
              已完成 Completed
            </span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 ${statusBadgeClass.cancelled}`}>
              已取消 Cancelled
            </span>
            <span className="inline-flex rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-rose-700">
              冲突 Conflict
            </span>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-slate-600">Loading appointments...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <section className="card-surface p-4 xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <Clock3 className="h-4 w-4" />
                  Timeline
                </div>
                <span className="text-xs text-slate-500">支持同一时段多预约并列展示</span>
              </div>

              <div className="space-y-3 max-h-[540px] overflow-auto pr-1">
                {visibleDates.map((date) => (
                  <div key={date} className="space-y-2">
                    {viewMode === 'week' && (
                      <p className="text-xs font-semibold tracking-wide text-blue-600">{formatDayHeader(date)}</p>
                    )}
                    {timelineHours.map((hour) => {
                      const hourLabel = `${`${hour}`.padStart(2, '0')}:00`;
                      const bucket = timelineMap[date]?.[hour] || [];
                      return (
                        <div key={`${date}-${hour}`} className="rounded-xl border border-blue-100 bg-white/60 p-2.5">
                          <p className="text-[11px] uppercase tracking-widest text-slate-500">{hourLabel}</p>
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
                                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                                        : statusBadgeClass[aptStatus]
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-xs font-medium">{getCustomerName(apt)}</p>
                                      <div className="flex items-center gap-1">
                                        {hasBookedTechnician(apt) && (
                                          <span className="inline-flex max-w-[140px] truncate rounded-full border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">
                                            {getBookedTechnicianBadgeLabel(apt)}
                                          </span>
                                        )}
                                        {apt.is_new_customer && (
                                          <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-emerald-700">
                                            New
                                          </span>
                                        )}
                                        {hasConflict && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
                                      </div>
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

            <section className="card-surface p-4 overflow-hidden xl:col-span-1">
              <div className="overflow-auto max-h-[540px]">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-blue-50">
                    <tr className="text-xs uppercase tracking-[0.15em] text-slate-500 border-b border-blue-100">
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Customer</th>
                      <th className="px-3 py-2 font-medium">Phone</th>
                      <th className="px-3 py-2 font-medium">Service</th>
                      <th className="px-3 py-2 font-medium">Staff</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Created At</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedAppointments.map((group) => {
                      const isCollapsed = !!collapsedGroupKeys[group.key];
                      return (
                        <React.Fragment key={group.key}>
                          <tr className="border-b border-blue-100 bg-blue-50/70">
                            <td colSpan={8} className="px-3 py-2">
                              <button
                                onClick={() => toggleGroup(group.key)}
                                className="w-full text-left flex items-center justify-between text-xs"
                              >
                                <span className="font-semibold text-blue-600">
                                  {group.date} {group.startTime}
                                </span>
                                <span className="text-slate-700">
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
                                  className={`cursor-pointer border-b border-blue-100/80 hover:bg-blue-100/50 ${
                                    hasConflict ? 'bg-rose-500/5' : ''
                                  }`}
                                >
                                  <td className="px-3 py-2.5 align-top whitespace-nowrap">
                                    <p className="text-slate-900">{formatTimeRange(apt)}</p>
                                    <p className="text-xs text-slate-700">
                                      {apt.appointment_date} · concurrent {group.count}
                                    </p>
                                  </td>
                                  <td className="px-3 py-2.5 align-top">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="font-medium text-slate-900">{getCustomerName(apt)}</p>
                                      <div className="flex items-center gap-1">
                                        {hasBookedTechnician(apt) && (
                                          <span className="inline-flex max-w-[140px] truncate rounded-full border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">
                                            {getBookedTechnicianBadgeLabel(apt)}
                                          </span>
                                        )}
                                        {apt.is_new_customer && (
                                          <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-emerald-700">
                                            New
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-xs text-slate-700">#{apt.order_number || apt.id}</p>
                                    {!!apt.group_id && (
                                      <p className="mt-1 text-[10px] uppercase tracking-wide text-blue-700">
                                        Group #{apt.group_id} · {toGroupRoleLabel(apt)}
                                      </p>
                                    )}
                                    {hasConflict && (
                                      <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Conflict
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 align-top text-slate-900">
                                    {resolvePhone(apt) !== '-' ? (
                                      <a
                                        href={toTelHref(resolvePhone(apt))}
                                        onClick={(event) => event.stopPropagation()}
                                        className="hover:text-blue-600 underline-offset-2 hover:underline"
                                      >
                                        {maskPhone(resolvePhone(apt))}
                                      </a>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 align-top text-slate-900">{getServiceLabel(apt)}</td>
                                  <td className="px-3 py-2.5 align-top text-slate-900">{getStaffLabel(apt)}</td>
                                  <td className="px-3 py-2.5 align-top whitespace-nowrap text-slate-900">
                                    {formatCurrency(getOrderAmount(apt))}
                                  </td>
                                  <td className="px-3 py-2.5 align-top whitespace-nowrap text-slate-700 text-xs">
                                    {formatCreatedAt(apt.created_at)}
                                  </td>
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
                  <div className="p-6 text-center text-sm text-slate-500">No appointments in this range.</div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/30">
          <div className="absolute inset-y-0 right-0 w-full max-w-md border-l border-blue-100 bg-white shadow-2xl overflow-auto">
            <div className="sticky top-0 z-10 border-b border-blue-100 bg-white/95 backdrop-blur">
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-base font-semibold">Appointment Detail</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded-full border border-blue-200 p-1.5 text-slate-700 hover:border-gold-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Customer</p>
                <div className="flex items-center gap-2 text-sm">
                  <UserRound className="h-4 w-4 text-gold-500" />
                  <span className="font-medium text-slate-900">{getCustomerName(selected)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Phone className="h-4 w-4 text-gold-500" />
                  {resolvePhone(selected) !== '-' ? (
                    <a href={toTelHref(resolvePhone(selected))} className="text-slate-900 hover:text-blue-600 underline-offset-2 hover:underline">
                      {resolvePhone(selected)}
                    </a>
                  ) : (
                    <span>-</span>
                  )}
                </div>
                <p className="text-xs text-slate-600">Order: #{selected.order_number || selected.id}</p>
                <p className="text-xs text-slate-600">Created At: {formatCreatedAt(selected.created_at)}</p>
                <p className="text-xs text-slate-600">Completed At: {formatCreatedAt(selected.completed_at)}</p>
                {selected.group_id && (
                  <p className="text-xs text-slate-600">
                    Group: #{selected.group_id} · {toGroupRoleLabel(selected)}
                  </p>
                )}
                {selected.group_id && !selected.is_group_host && (
                  <div className="pt-2 space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Guest Phone (Owner)</p>
                    <div className="flex items-center gap-2">
                      <input
                        value={guestOwnerPhone}
                        onChange={(event) => setGuestOwnerPhone(event.target.value)}
                        placeholder="e.g. 14155550123"
                        className="w-full rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-sm !text-slate-900 placeholder:text-slate-500 outline-none focus:border-gold-500"
                      />
                      <button
                        onClick={saveGuestOwner}
                        disabled={savingGuestOwner}
                        className="rounded-lg border border-gold-500/50 px-3 py-2 text-sm text-blue-700 disabled:opacity-50 whitespace-nowrap"
                      >
                        Save
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      录入手机号后：若该手机号已注册，订单会归属到该账号；未注册则先按手机号挂账，注册后自动认领。
                    </p>
                  </div>
                )}
              </div>

              {selected.group_id && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 space-y-2 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Group Booking</p>
                  {groupLoading ? (
                    <p className="text-xs text-slate-600">Loading group...</p>
                  ) : selectedGroup ? (
                    <>
                      <p className="text-xs text-slate-600">
                        Group Code: {selectedGroup.group_code || `GRP-${selectedGroup.group_id}`}
                      </p>
                      <div className="space-y-1">
                        {[selectedGroup.host_appointment, ...selectedGroup.guest_appointments].map((member) => {
                          const isCurrent = member.id === selected.id;
                          const memberRole = member.is_group_host ? 'Host' : 'Guest';
                          return (
                            <div
                              key={member.id}
                              className={`rounded-lg border px-2.5 py-2 ${
                                isCurrent ? 'border-blue-400 bg-blue-100/60' : 'border-blue-200 bg-white'
                              }`}
                            >
                              <p className="text-xs text-slate-900">
                                #{member.order_number || member.id} · {memberRole}
                              </p>
                              <p className="text-xs text-slate-700">
                                {member.customer_name || member.user_name || `User #${member.user_id}`} · {member.status}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-600">Group detail unavailable</p>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 space-y-2 text-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Service</p>
                <p className="text-slate-900">{getServiceLabel(selected)}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-slate-600">Amount: {formatCurrency(getOrderAmount(selected))}</p>
                  <button
                    onClick={() => setShowAmountEditor((prev) => !prev)}
                    className="rounded-md border border-gold-500/60 px-2.5 py-1 text-xs font-semibold text-blue-700"
                  >
                    {showAmountEditor ? 'Hide' : 'Edit Amount'}
                  </button>
                </div>
                {showAmountEditor && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      step="1"
                      value={editAmount}
                      onChange={(event) => setEditAmount(normalizeAmountInput(event.target.value))}
                      className="w-full rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-gold-500"
                      placeholder="1"
                    />
                    <button
                      onClick={saveAmount}
                      disabled={savingAmount}
                      className="rounded-lg border border-gold-500/50 px-3 py-2 text-sm text-blue-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      Save
                    </button>
                  </div>
                )}
                <p className="text-slate-600">Current: {formatTimeRange(selected)}</p>
                <p className="text-slate-600">Staff: {getStaffLabel(selected)}</p>
                {conflictInfo.ids.has(selected.id) && (
                  <p className="text-xs text-rose-300 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {conflictInfo.messages[selected.id]}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 space-y-1.5 text-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Settlement (Preview)</p>
                <p className="text-slate-700">Original: ${getSettlementOriginalAmount(selected).toFixed(2)}</p>
                <p className="text-slate-700">Coupon Discount: ${asNumberOrZero(selected.coupon_discount_amount).toFixed(2)}</p>
                <p className="text-slate-700">Gift Card Used: ${asNumberOrZero(selected.gift_card_used_amount).toFixed(2)}</p>
                <p className="text-slate-700">Cash Paid: ${asNumberOrZero(selected.cash_paid_amount).toFixed(2)}</p>
                <p className="text-slate-700">Final Paid: ${asNumberOrZero(selected.final_paid_amount).toFixed(2)}</p>
                <p className="text-slate-700">Points Earned: {Math.floor(asNumberOrZero(selected.points_earned))}</p>
                <p className="text-slate-700">Points Reverted: {Math.floor(asNumberOrZero(selected.points_reverted))}</p>
                <p className="text-slate-700">Settlement Status: {selected.settlement_status || 'unsettled'}</p>
                <p className="text-slate-700">Settled At: {formatCreatedAt(selected.settled_at)}</p>
                <div className="pt-2 space-y-2 border-t border-blue-100">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Settle</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={settlementUserCouponId}
                      onChange={(event) => handleSettlementCouponChange(event.target.value)}
                      className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-xs !text-slate-900"
                    >
                      <option value="">{settlementOptionsLoading ? 'Loading coupons...' : 'Select Coupon'}</option>
                      {settlementCoupons.map((coupon) => (
                        <option key={coupon.id} value={coupon.id}>
                          {formatCouponOptionLabel(coupon)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={settlementCouponDiscount}
                      onChange={(event) => setSettlementCouponDiscount(normalizeAmountInput(event.target.value))}
                      placeholder="Coupon Discount"
                      className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-xs !text-slate-900"
                    />
                    <select
                      value={settlementGiftCardId}
                      onChange={(event) => handleSettlementGiftCardChange(event.target.value)}
                      className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-xs !text-slate-900"
                    >
                      <option value="">{settlementOptionsLoading ? 'Loading gift cards...' : 'Select Gift Card'}</option>
                      {settlementGiftCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {formatGiftCardOptionLabel(card)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={settlementGiftAmount}
                      onChange={(event) => setSettlementGiftAmount(normalizeAmountInput(event.target.value))}
                      placeholder="Gift Amount"
                      className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-xs !text-slate-900"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={settlementCashPaid}
                      onChange={(event) => setSettlementCashPaid(normalizeAmountInput(event.target.value))}
                      placeholder="Cash Paid"
                      className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-xs !text-slate-900"
                    />
                    <input
                      value={settlementIdemKey}
                      onChange={(event) => setSettlementIdemKey(event.target.value)}
                      placeholder="Idempotency Key"
                      className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-xs !text-slate-900"
                    />
                  </div>
                  <button
                    onClick={saveSettlement}
                    disabled={settling}
                    className="w-full rounded-lg border border-gold-500/50 px-3 py-2 text-sm text-blue-700 disabled:opacity-50"
                  >
                    Save Settlement
                  </button>
                </div>

                <div className="pt-2 space-y-2 border-t border-blue-100">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Refund</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={refundCashAmount}
                      onChange={(event) => setRefundCashAmount(normalizeAmountInput(event.target.value))}
                      placeholder="Refund Cash"
                      className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-xs !text-slate-900"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={refundGiftAmount}
                      onChange={(event) => setRefundGiftAmount(normalizeAmountInput(event.target.value))}
                      placeholder="Refund Gift"
                      className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-xs !text-slate-900"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={refundGiftCardId}
                      onChange={(event) => setRefundGiftCardId(event.target.value.replace(/[^\d]/g, ''))}
                      placeholder="Gift Card ID"
                      className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-xs !text-slate-900"
                    />
                    <input
                      value={refundIdemKey}
                      onChange={(event) => setRefundIdemKey(event.target.value)}
                      placeholder="Idempotency Key"
                      className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-xs !text-slate-900"
                    />
                    <input
                      value={refundReason}
                      onChange={(event) => setRefundReason(event.target.value)}
                      placeholder="Refund Reason"
                      className="col-span-2 rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-xs !text-slate-900"
                    />
                  </div>
                  <button
                    onClick={saveRefund}
                    disabled={refunding}
                    className="w-full rounded-lg border border-rose-500/50 px-3 py-2 text-sm text-rose-700 disabled:opacity-50"
                  >
                    Save Refund
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Bind Staff (Pending / Confirmed / Completed)</p>
                {splitSummary && splitSummary.splits.length > 0 ? (
                  <div className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-sm text-slate-900">
                    拆分绑定技师 / Split-bound staff:
                    {' '}
                    {Array.from(new Set(splitSummary.splits.map((item) => item.technician_name || `#${item.technician_id}`))).join(', ')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTechnicianId}
                      onChange={(event) => setSelectedTechnicianId(event.target.value)}
                      className="w-full rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-sm !text-slate-900 [&>option]:text-slate-900 outline-none focus:border-gold-500"
                      disabled={!canEditSplitByStatus(selected.status)}
                    >
                      <option value="">Unassigned</option>
                      {staffOptionsForSelected.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={saveStaffBinding}
                      disabled={savingStaff || !canEditSplitByStatus(selected.status)}
                      className="rounded-lg border border-gold-500/50 px-3 py-2 text-sm text-blue-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      Save Staff
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 space-y-2 text-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Status</p>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                    statusBadgeClass[normalizeStatus(selected.status)]
                  }`}
                >
                  {statusText[normalizeStatus(selected.status)]}
                </span>
                {selected.cancel_reason && <p className="text-xs text-slate-600">Cancel reason: {selected.cancel_reason}</p>}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">技师金额拆分 Staff Amount Split</p>
                <p className="text-xs text-slate-600">
                  订单总金额：${(splitSummary?.order_amount ?? getOrderAmount(selected) ?? 0).toFixed(2)} | 当前拆分：$
                  {splitTotalLocal.toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-600">
                  支持同一订单多个服务、多位技师拆分；若加做服务，请先在 Service 区域修改订单总金额，再保存拆分。
                </p>
                {splitLoading ? (
                  <p className="text-xs text-slate-500">Loading split...</p>
                ) : (
                  <div className="space-y-2">
                    {splitRows.map((row, idx) => (
                      <div key={`split-${idx}`} className="grid grid-cols-12 gap-2">
                        <select
                          value={row.technician_id}
                          onChange={(event) => updateSplitRow(idx, 'technician_id', event.target.value)}
                          className="col-span-4 rounded-lg border border-blue-200 bg-white px-2 py-2 text-xs !text-slate-900 [&>option]:text-slate-900"
                          disabled={!canEditSplitByStatus(selected.status)}
                        >
                          <option value="">技师 Staff</option>
                          {staffOptionsForSelected.map((staff) => (
                            <option key={staff.id} value={staff.id}>
                              {staff.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={row.service_id}
                          onChange={(event) => updateSplitRow(idx, 'service_id', event.target.value)}
                          className="col-span-4 rounded-lg border border-blue-200 bg-white px-2 py-2 text-xs !text-slate-900 [&>option]:text-slate-900"
                          disabled={!canEditSplitByStatus(selected.status)}
                        >
                          <option value="">服务 Service</option>
                          {splitServiceOptions.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          step="1"
                          value={row.amount}
                          onChange={(event) => updateSplitRow(idx, 'amount', normalizeAmountInput(event.target.value))}
                          className="col-span-3 rounded-lg border border-blue-200 bg-white px-2 py-2 text-xs !text-slate-900 placeholder:text-slate-500"
                          placeholder="金额 Amount"
                          disabled={!canEditSplitByStatus(selected.status)}
                        />
                        <button
                          onClick={() => removeSplitRow(idx)}
                          className="col-span-1 rounded-lg border border-rose-300 text-rose-600 text-xs"
                          disabled={!canEditSplitByStatus(selected.status)}
                        >
                          -
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={addSplitRow}
                        disabled={!canEditSplitByStatus(selected.status)}
                        className="rounded-lg border border-blue-200 px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
                      >
                        添加一行 Add Line
                      </button>
                      <button
                        onClick={saveSplits}
                        disabled={splitSaving || !canEditSplitByStatus(selected.status)}
                        className="rounded-lg border border-gold-500/50 px-3 py-1.5 text-xs text-blue-700 disabled:opacity-50"
                      >
                        保存拆分 Save Split
                      </button>
                      {splitSummary && (
                        <span className={`text-xs ${splitSummary.is_balanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {splitSummary.is_balanced ? 'Balanced' : 'Not Balanced'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Reschedule</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-gold-500"
                  />
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-gold-500"
                  />
                </div>
                <button
                  onClick={saveSchedule}
                  disabled={savingSchedule}
                  className="w-full rounded-lg border border-gold-500/50 px-3 py-2 text-sm text-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Time
                </button>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 space-y-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Notes</p>
                <textarea
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-gold-500"
                  placeholder="Notes"
                />
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm text-slate-800 disabled:opacity-50"
                >
                  Save Notes
                </button>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cancel reason</label>
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-gold-500"
                  placeholder="Optional"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateStatus('confirmed')}
                  disabled={!!updatingStatus}
                  className="rounded-lg border border-blue-500/50 px-3 py-2 text-sm text-blue-700 disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => updateStatus('completed')}
                  disabled={!!updatingStatus}
                  className="rounded-lg border border-emerald-500/50 px-3 py-2 text-sm text-emerald-700 disabled:opacity-50"
                >
                  Complete
                </button>
                <button
                  onClick={() => updateStatus('cancelled')}
                  disabled={!!updatingStatus}
                  className="rounded-lg border border-blue-300 px-3 py-2 text-sm text-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={markNoShow}
                  disabled={!!updatingStatus}
                  className="rounded-lg border border-rose-500/50 px-3 py-2 text-sm text-rose-700 disabled:opacity-50"
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
