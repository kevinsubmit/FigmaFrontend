import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { getAppointments, Appointment } from '../api/appointments';
import { useAuth } from '../context/AuthContext';

const statusOptions = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

const AppointmentsList: React.FC = () => {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('all');

  const queryParams = useMemo(() => {
    const params: Record<string, any> = { limit: 50 };
    if (status !== 'all') params.status = status;
    if (role === 'store_admin' && user?.store_id) {
      params.store_id = user.store_id;
    }
    return params;
  }, [status, role, user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAppointments(queryParams);
        setAppointments(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [queryParams]);

  return (
    <AdminLayout>
      <TopBar title="Appointments" />
      <div className="px-4 pt-6 space-y-5">
        <div className="flex items-center gap-2 overflow-x-auto">
          {statusOptions.map((option) => (
            <button
              key={option}
              onClick={() => setStatus(option)}
              className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest border ${
                status === option
                  ? 'bg-gold-500 text-black border-gold-500'
                  : 'border-neutral-800 text-gray-500'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-gray-500">Loading appointments...</div>
        ) : (
          <div className="space-y-4">
            {appointments.map((apt) => (
              <button
                key={apt.id}
                onClick={() => navigate(`/admin/appointments/${apt.id}`)}
                className="w-full text-left card-surface p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                      {apt.order_number || `Order #${apt.id}`}
                    </p>
                    <h3 className="mt-1 text-base font-semibold">
                      {apt.store_name || `Store ${apt.store_id}`} · {apt.service_name || `Service ${apt.service_id}`}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {apt.appointment_date} · {apt.appointment_time}
                    </p>
                  </div>
                  <span className="badge">{apt.status}</span>
                </div>
              </button>
            ))}
            {!appointments.length && (
              <div className="text-gray-500 text-sm">No appointments found.</div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AppointmentsList;
