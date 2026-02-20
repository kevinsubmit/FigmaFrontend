import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { useAuth } from '../context/AuthContext';
import {
  approveStoreAdminApplication,
  getStoreAdminApplications,
  rejectStoreAdminApplication,
  StoreAdminApplication,
} from '../api/storeAdminApplications';
import { toast } from 'react-toastify';
import { maskPhone } from '../utils/privacy';

const Applications: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<StoreAdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await getStoreAdminApplications({ status: statusFilter });
      setApplications(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.is_admin) return;
    load();
  }, [statusFilter, user?.is_admin]);

  const handleApprove = async (id: number) => {
    try {
      await approveStoreAdminApplication(id);
      toast.success('Approved');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to approve');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectStoreAdminApplication(id, rejectReasons[id]);
      toast.success('Rejected');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to reject');
    }
  };

  if (!user?.is_admin) {
    return (
      <AdminLayout>
        <TopBar title="Applications" />
        <div className="px-4 py-6 text-slate-500">Super admin only.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <TopBar title="Applications" />
      <div className="px-4 py-6 space-y-4">
        <div className="flex items-center gap-2">
          {['pending_review', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest border ${
                statusFilter === status
                  ? 'bg-gold-500 text-white border-gold-500'
                  : 'border-blue-100 text-slate-500'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-slate-500">Loading applications...</div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <div key={application.id} className="card-surface p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-slate-900">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Store</p>
                    <h3 className="text-lg font-semibold text-slate-900">{application.store_name}</h3>
                    <p className="text-xs text-slate-500">{maskPhone(application.phone)}</p>
                  </div>
                  <span className="badge">{application.status}</span>
                </div>
                <div className="text-sm text-slate-800 space-y-1">
                  <p>{application.store_address || 'No address yet'}</p>
                  <p>{application.store_phone || 'No phone yet'}</p>
                  <p>{application.opening_hours || 'No hours yet'}</p>
                </div>
                {statusFilter === 'pending_review' && (
                  <div className="space-y-3">
                    <textarea
                      rows={2}
                      value={rejectReasons[application.id] || ''}
                      onChange={(event) =>
                        setRejectReasons((prev) => ({
                          ...prev,
                          [application.id]: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-900"
                      placeholder="Reject reason (optional)"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleApprove(application.id)}
                        className="rounded-xl bg-gold-500 py-2 text-sm font-semibold text-white"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(application.id)}
                        className="rounded-xl border border-red-500/50 py-2 text-sm font-semibold text-red-200"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!applications.length && (
              <div className="text-slate-500 text-sm">No applications found.</div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Applications;
