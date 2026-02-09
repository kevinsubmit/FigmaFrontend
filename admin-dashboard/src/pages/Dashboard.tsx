import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Coins, Sparkles, Store } from 'lucide-react';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { useAuth } from '../context/AuthContext';
import { getStoreById } from '../api/stores';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [storeName, setStoreName] = useState<string | null>(null);

  useEffect(() => {
    const loadStoreName = async () => {
      if (role !== 'store_admin' || !user?.store_id) {
        setStoreName(null);
        return;
      }
      try {
        const store = await getStoreById(user.store_id);
        setStoreName(store.name);
      } catch (error) {
        setStoreName(null);
      }
    };
    loadStoreName();
  }, [role, user?.store_id]);

  return (
    <AdminLayout>
      <TopBar title="Dashboard" />
      <div className="px-4 pt-6 space-y-6">
        <div className="card-surface p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Welcome</p>
          <h2 className="mt-2 text-2xl font-semibold">
            {storeName || user?.full_name || user?.username || 'Admin'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Role: {role === 'super_admin' ? 'Super Admin' : 'Store Admin'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="card-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Today</span>
              <CalendarCheck className="w-5 h-5 text-gold-500" />
            </div>
            <p className="mt-3 text-2xl font-semibold">18</p>
            <p className="text-xs text-slate-500">Appointments</p>
          </div>
          <div className="card-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Revenue</span>
              <Coins className="w-5 h-5 text-gold-500" />
            </div>
            <p className="mt-3 text-2xl font-semibold">$1,240</p>
            <p className="text-xs text-slate-500">Today</p>
          </div>
        </div>

        <div className="card-surface p-5 space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Quick Actions</p>
          <button
            onClick={() => navigate('/admin/appointments')}
            className="w-full flex items-center justify-between rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm"
          >
            <span>Manage Orders</span>
            <CalendarCheck className="w-4 h-4 text-gold-500" />
          </button>
          <button
            onClick={() => navigate('/admin/stores')}
            className="w-full flex items-center justify-between rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm"
          >
            <span>Manage Stores</span>
            <Store className="w-4 h-4 text-gold-500" />
          </button>
          <button
            onClick={() => navigate('/admin/promotions')}
            className="w-full flex items-center justify-between rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm"
          >
            <span>Manage Promotions</span>
            <Sparkles className="w-4 h-4 text-gold-500" />
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
