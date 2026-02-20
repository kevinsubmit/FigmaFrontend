import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { Appointment, getAppointments, updateAppointmentAmount, updateAppointmentStatus } from '../api/appointments';
import { toast } from 'react-toastify';
import { maskPhone } from '../utils/privacy';

const AppointmentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelReason, setCancelReason] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [savingAmount, setSavingAmount] = useState(false);

  const getCustomerName = (apt: Appointment) => apt.customer_name || apt.user_name || `User #${apt.user_id}`;
  const getCustomerPhone = (apt: Appointment) => `${apt.customer_phone || ''}`.trim() || '-';
  const getCustomerPhoneDisplay = (apt: Appointment) => maskPhone(getCustomerPhone(apt));
  const getTelHref = (phone: string) => {
    if (!phone || phone === '-') return '';
    const sanitized = phone.replace(/[^\d+]/g, '');
    return sanitized ? `tel:${sanitized}` : '';
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAppointments({ limit: 100 });
        const found = data.find((apt) => String(apt.id) === String(id));
        setAppointment(found || null);
        if (found) {
          const amount = typeof found.order_amount === 'number' ? found.order_amount : found.service_price;
          setEditAmount(typeof amount === 'number' ? String(Math.floor(amount)) : '');
        } else {
          setEditAmount('');
        }
      } catch (error) {
        toast.error('Failed to load appointment');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!appointment) return;
    try {
      await updateAppointmentStatus(appointment.id, { status, cancel_reason: cancelReason || undefined });
      toast.success(`Appointment ${status}`);
      navigate('/admin/appointments');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update status');
    }
  };

  const saveAmount = async () => {
    if (!appointment) return;
    const parsed = Number.parseInt(editAmount, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      toast.error('Amount must be greater than or equal to 1');
      return;
    }
    setSavingAmount(true);
    try {
      const updated = await updateAppointmentAmount(appointment.id, { order_amount: parsed });
      setAppointment((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditAmount(String(parsed));
      toast.success('Order amount updated');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update order amount');
    } finally {
      setSavingAmount(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <TopBar title="Appointment" />
        <div className="px-4 py-6 text-slate-700">Loading...</div>
      </AdminLayout>
    );
  }

  if (!appointment) {
    return (
      <AdminLayout>
        <TopBar title="Appointment" />
        <div className="px-4 py-6 text-slate-700">Appointment not found.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <TopBar title="Appointment Detail" />
      <div className="px-4 py-6 space-y-4 text-slate-900">
        <div className="card-surface p-4 space-y-2 text-slate-900">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-700">Order</p>
          <h2 className="text-xl font-semibold text-slate-900">{appointment.order_number || `#${appointment.id}`}</h2>
          <p className="text-sm text-slate-700">
            {appointment.appointment_date} · {appointment.appointment_time}
          </p>
        </div>
        <div className="card-surface p-4 space-y-2 text-slate-900">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-700">Store & Service</p>
          <p className="text-sm text-slate-900">{appointment.store_name || `Store ${appointment.store_id}`}</p>
          <p className="text-sm text-slate-900">{appointment.service_name || `Service ${appointment.service_id}`}</p>
          <p className="text-sm text-slate-700">
            ${typeof appointment.order_amount === 'number' ? appointment.order_amount : appointment.service_price ?? '-'}
          </p>
        </div>
        <div className="card-surface p-4 space-y-3 text-slate-900">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-700">Order Amount</p>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              step="1"
              value={editAmount}
              onChange={(event) => setEditAmount(event.target.value)}
              className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm !text-slate-900"
              placeholder="1"
            />
            <button
              onClick={saveAmount}
              disabled={savingAmount}
              className="rounded-xl border border-gold-500/60 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50 whitespace-nowrap"
            >
              Save Amount
            </button>
          </div>
        </div>
        <div className="card-surface p-4 space-y-2 text-slate-900">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-700">Customer</p>
          <p className="text-sm text-slate-900">{getCustomerName(appointment)}</p>
          {getCustomerPhone(appointment) !== '-' ? (
            <a href={getTelHref(getCustomerPhone(appointment))} className="text-sm text-slate-900 hover:text-blue-600 underline-offset-2 hover:underline">
              {getCustomerPhoneDisplay(appointment)}
            </a>
          ) : (
            <p className="text-sm text-slate-900">-</p>
          )}
        </div>
        <div className="card-surface p-4 text-slate-900">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-700 mb-2">Status</p>
          <span className="badge">{appointment.status}</span>
          {appointment.cancel_reason && (
            <p className="mt-3 text-sm text-slate-800">
              Cancel reason: <span className="text-slate-900">{appointment.cancel_reason}</span>
            </p>
          )}
        </div>
        <div className="card-surface p-4 space-y-3 text-slate-900">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-700">Cancel Reason</label>
          <textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm !text-slate-900 placeholder:text-slate-500"
            placeholder="Optional"
          />
        </div>
        {appointment.status === 'pending' && (
          <button
            onClick={() => updateStatus('confirmed')}
            className="w-full rounded-xl border border-gold-500/60 py-3 text-sm font-semibold text-slate-900"
          >
            Confirm Appointment
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => updateStatus('completed')}
            className="rounded-xl bg-gold-500 py-3 text-sm font-semibold text-white"
          >
            Mark Completed
          </button>
          <button
            onClick={() => updateStatus('cancelled')}
            className="rounded-xl border border-red-500/50 py-3 text-sm font-semibold text-red-700"
          >
            Cancel Order
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AppointmentDetail;
