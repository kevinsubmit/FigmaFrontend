import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { Appointment, getAppointments, updateAppointmentStatus } from '../api/appointments';
import { toast } from 'react-toastify';

const AppointmentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAppointments({ limit: 100 });
        const found = data.find((apt) => String(apt.id) === String(id));
        setAppointment(found || null);
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

  if (loading) {
    return (
      <AdminLayout>
        <TopBar title="Appointment" />
        <div className="px-4 py-6 text-slate-500">Loading...</div>
      </AdminLayout>
    );
  }

  if (!appointment) {
    return (
      <AdminLayout>
        <TopBar title="Appointment" />
        <div className="px-4 py-6 text-slate-500">Appointment not found.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <TopBar title="Appointment Detail" />
      <div className="px-4 py-6 space-y-4">
        <div className="card-surface p-4 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Order</p>
          <h2 className="text-xl font-semibold">{appointment.order_number || `#${appointment.id}`}</h2>
          <p className="text-sm text-slate-500">
            {appointment.appointment_date} · {appointment.appointment_time}
          </p>
        </div>
        <div className="card-surface p-4 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Store & Service</p>
          <p className="text-sm">{appointment.store_name || `Store ${appointment.store_id}`}</p>
          <p className="text-sm">{appointment.service_name || `Service ${appointment.service_id}`}</p>
          <p className="text-sm text-slate-500">${appointment.service_price ?? '-'}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Status</p>
          <span className="badge">{appointment.status}</span>
          {appointment.cancel_reason && (
            <p className="mt-3 text-sm text-slate-700">
              Cancel reason: <span className="text-slate-600">{appointment.cancel_reason}</span>
            </p>
          )}
        </div>
        <div className="card-surface p-4 space-y-3">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Cancel Reason</label>
          <textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </div>
        {appointment.status === 'pending' && (
          <button
            onClick={() => updateStatus('confirmed')}
            className="w-full rounded-xl border border-gold-500/60 py-3 text-sm font-semibold text-gold-300"
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
            className="rounded-xl border border-red-500/50 py-3 text-sm font-semibold text-red-200"
          >
            Cancel Order
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AppointmentDetail;
