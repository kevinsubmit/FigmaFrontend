import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Search, UserRound, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import {
  CustomerAppointmentItem,
  CustomerDetail,
  CustomerListItem,
  getCustomerAppointments,
  getCustomerDetail,
  getCustomers,
} from '../api/customers';
import { formatApiDateTimeET } from '../utils/time';

const formatDateTime = (value?: string | null) => {
  return formatApiDateTimeET(value, true);
};

const maskPhone = (phone?: string | null) => {
  if (!phone) return '-';
  if (phone.length <= 4) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
};

const Customers: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [riskLevel, setRiskLevel] = useState('all');
  const [restrictedOnly, setRestrictedOnly] = useState(false);
  const [hasUpcoming, setHasUpcoming] = useState('all');
  const [registerFrom, setRegisterFrom] = useState('');
  const [registerTo, setRegisterTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pageInput, setPageInput] = useState('1');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [appointments, setAppointments] = useState<CustomerAppointmentItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const totalAppointments = useMemo(
    () => customers.reduce((sum, customer) => sum + customer.total_appointments, 0),
    [customers],
  );

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomers({
        keyword: keyword.trim() || undefined,
        risk_level: riskLevel !== 'all' ? riskLevel : undefined,
        restricted_only: restrictedOnly || undefined,
        has_upcoming: hasUpcoming === 'all' ? undefined : hasUpcoming === 'yes',
        register_from: registerFrom || undefined,
        register_to: registerTo || undefined,
        skip: (page - 1) * pageSize,
        limit: pageSize,
      });
      setCustomers(data.items);
      setTotal(data.total);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (customerId: number) => {
    setDetailLoading(true);
    try {
      const [profile, rows] = await Promise.all([
        getCustomerDetail(customerId),
        getCustomerAppointments(customerId, { limit: 50 }),
      ]);
      setSelectedId(customerId);
      setDetail(profile);
      setAppointments(rows);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load customer detail');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page, pageSize]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  return (
    <AdminLayout>
      <TopBar title="Customers" subtitle="Customer profile, booking history and risk overview" />
      <div className="px-4 py-5 space-y-4 lg:px-6">
        <div className="card-surface p-4 grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-7">
          <label className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Search name / phone / order number"
              className="w-full rounded-xl border border-blue-100 bg-white py-2.5 pl-9 pr-3 text-sm !text-slate-900 placeholder:text-slate-500 outline-none focus:border-gold-500"
            />
          </label>
          <input
            type="date"
            value={registerFrom}
            onChange={(event) => setRegisterFrom(event.target.value)}
            className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 outline-none focus:border-gold-500"
          />
          <input
            type="date"
            value={registerTo}
            onChange={(event) => setRegisterTo(event.target.value)}
            className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 outline-none focus:border-gold-500"
          />
          <select
            value={riskLevel}
            onChange={(event) => setRiskLevel(event.target.value)}
            className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 [&>option]:text-slate-900 outline-none focus:border-gold-500"
          >
            <option value="all">All risk levels</option>
            <option value="normal">Normal</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <select
            value={hasUpcoming}
            onChange={(event) => setHasUpcoming(event.target.value)}
            className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900 [&>option]:text-slate-900 outline-none focus:border-gold-500"
          >
            <option value="all">Upcoming: All</option>
            <option value="yes">Upcoming: Yes</option>
            <option value="no">Upcoming: No</option>
          </select>
          <button
            onClick={() => {
              if (page !== 1) {
                setPage(1);
                return;
              }
              loadCustomers();
            }}
            className="rounded-xl border border-gold-500/50 px-3 py-2.5 text-sm text-slate-900 hover:bg-blue-50"
          >
            Search
          </button>
          <label className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm text-slate-900 xl:col-span-2">
            <input
              type="checkbox"
              checked={restrictedOnly}
              onChange={(event) => setRestrictedOnly(event.target.checked)}
            />
            Restricted only
          </label>
        </div>

        <div className="card-surface p-4 flex items-center justify-between">
          <div className="text-sm text-slate-800">
            <p className="font-semibold">{total} customers</p>
            <p className="text-xs text-slate-500 mt-1">Total appointments (visible scope): {totalAppointments}</p>
          </div>
          <button onClick={loadCustomers} className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-slate-900">
            Refresh
          </button>
        </div>

        <div className="card-surface overflow-auto">
          {loading ? (
            <div className="p-6 text-sm text-slate-600">Loading customers...</div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-blue-50">
                <tr className="text-xs uppercase tracking-[0.15em] text-slate-500 border-b border-blue-100">
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Register</th>
                  <th className="px-3 py-2 font-medium">Last Login</th>
                  <th className="px-3 py-2 font-medium">Bookings</th>
                  <th className="px-3 py-2 font-medium">Next Booking</th>
                  <th className="px-3 py-2 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => loadDetail(customer.id)}
                    className={`cursor-pointer border-b border-blue-100/80 hover:bg-blue-100/40 ${
                      selectedId === customer.id ? 'bg-blue-100/60' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-900">{customer.name}</p>
                      <p className="text-xs text-slate-600">{maskPhone(customer.phone)}</p>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{formatDateTime(customer.registered_at)}</td>
                    <td className="px-3 py-2.5 text-slate-700">{formatDateTime(customer.last_login_at)}</td>
                    <td className="px-3 py-2.5 text-slate-700">
                      total {customer.total_appointments} | done {customer.completed_count} | cancel {customer.cancelled_count} | no-show {customer.no_show_count}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{formatDateTime(customer.next_appointment_at)}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        {customer.status === 'restricted' ? 'Restricted' : customer.risk_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && customers.length === 0 && <div className="p-6 text-center text-sm text-slate-500">No customers found.</div>}
        </div>

        <div className="card-surface p-3 flex items-center justify-between text-sm text-slate-700">
          <span>
            Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
          </span>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(event) => {
                const nextSize = Number(event.target.value) || 20;
                setPageSize(nextSize);
                setPage(1);
              }}
              className="rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-sm !text-slate-900 [&>option]:text-slate-900"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <button
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-lg border border-blue-200 px-3 py-1.5 disabled:opacity-40"
            >
              Prev
            </button>
            <div className="flex items-center gap-1">
              <input
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value.replace(/[^\d]/g, ''))}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  const maxPage = Math.max(1, Math.ceil(total / pageSize));
                  const nextPage = Math.min(maxPage, Math.max(1, Number(pageInput) || 1));
                  setPage(nextPage);
                }}
                className="w-16 rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-center text-sm !text-slate-900"
              />
              <button
                onClick={() => {
                  const maxPage = Math.max(1, Math.ceil(total / pageSize));
                  const nextPage = Math.min(maxPage, Math.max(1, Number(pageInput) || 1));
                  setPage(nextPage);
                }}
                className="rounded-lg border border-blue-200 px-2 py-1.5 text-xs"
              >
                Go
              </button>
            </div>
            <button
              disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
              onClick={() => setPage((prev) => prev + 1)}
              className="rounded-lg border border-blue-200 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedId && (
        <div className="fixed inset-0 z-50 bg-slate-900/30">
          <div className="absolute inset-y-0 right-0 w-full max-w-lg border-l border-blue-100 bg-white shadow-2xl overflow-auto">
            <div className="sticky top-0 z-10 border-b border-blue-100 bg-white/95 backdrop-blur">
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-base font-semibold text-slate-900">Customer Detail</h2>
                <button
                  onClick={() => {
                    setSelectedId(null);
                    setDetail(null);
                    setAppointments([]);
                  }}
                  className="rounded-full border border-blue-200 p-1.5 text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 px-4 py-4">
              {detailLoading || !detail ? (
                <div className="text-sm text-slate-600">Loading detail...</div>
              ) : (
                <>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Profile</p>
                    <div className="flex items-center gap-2 text-sm text-slate-900">
                      <UserRound className="h-4 w-4 text-gold-500" />
                      <span className="font-medium">{detail.name}</span>
                    </div>
                    <p className="text-sm text-slate-700">Phone: {detail.phone}</p>
                    <p className="text-sm text-slate-700">Registered: {formatDateTime(detail.registered_at)}</p>
                    <p className="text-sm text-slate-700">Last Login: {formatDateTime(detail.last_login_at)}</p>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 space-y-2 text-sm text-slate-700">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Stats</p>
                    <p>Total: {detail.total_appointments}</p>
                    <p>Completed: {detail.completed_count}</p>
                    <p>Cancelled: {detail.cancelled_count}</p>
                    <p>No-show: {detail.no_show_count}</p>
                    <p>Cancel Rate: {(detail.cancel_rate * 100).toFixed(1)}%</p>
                    <p>Lifetime Spent: ${detail.lifetime_spent.toFixed(2)}</p>
                    <p>Next Booking: {formatDateTime(detail.next_appointment_at)}</p>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Appointments</p>
                    <div className="space-y-2">
                      {appointments.map((appointment) => (
                        <div key={appointment.id} className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm">
                          <p className="font-medium text-slate-900">#{appointment.order_number || appointment.id}</p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {appointment.store_name || `Store ${appointment.store_id}`} | {appointment.service_name || '-'}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            <CalendarDays className="inline h-3.5 w-3.5 mr-1 text-gold-500" />
                            {appointment.appointment_date} {appointment.appointment_time}
                          </p>
                          <p className="text-xs text-slate-700 mt-0.5">
                            Status: {appointment.status}
                            {appointment.cancel_reason ? ` | ${appointment.cancel_reason}` : ''}
                          </p>
                          <button
                            onClick={() => navigate(`/admin/appointments/${appointment.id}`)}
                            className="mt-2 rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                          >
                            Open Appointment Detail
                          </button>
                        </div>
                      ))}
                      {appointments.length === 0 && <div className="text-sm text-slate-500">No appointment history.</div>}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Customers;
