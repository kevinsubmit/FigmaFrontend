import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { Ticket, Gift, MessageSquare, LogOut, Scissors, ShieldAlert, Image, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const More: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  return (
    <AdminLayout>
      <TopBar title="更多功能" subtitle="运营与系统管理入口" />
      <div className="px-4 py-5 space-y-3 lg:px-6">
        <div className="card-surface p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tools</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">管理工具中心</h2>
        </div>
        <button
          onClick={() => navigate('/admin/coupons')}
          className="w-full text-left card-surface p-4 flex items-center justify-between hover:bg-blue-50/40 text-slate-900"
        >
          <div className="flex items-center gap-3">
            <Ticket className="w-5 h-5 text-gold-500" />
            <span className="text-slate-900">Coupons</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>
        <button
          onClick={() => navigate('/admin/gift-cards')}
          className="w-full text-left card-surface p-4 flex items-center justify-between hover:bg-blue-50/40 text-slate-900"
        >
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 text-gold-500" />
            <span className="text-slate-900">Gift Cards</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>
        <button
          onClick={() => navigate('/admin/reviews')}
          className="w-full text-left card-surface p-4 flex items-center justify-between hover:bg-blue-50/40 text-slate-900"
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-gold-500" />
            <span className="text-slate-900">Reviews</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>
        {user?.is_admin && (
          <button
            onClick={() => navigate('/admin/home-feed')}
            className="w-full text-left card-surface p-4 flex items-center justify-between hover:bg-blue-50/40 text-slate-900"
          >
            <div className="flex items-center gap-3">
              <Image className="w-5 h-5 text-gold-500" />
              <span className="text-slate-900">Home Feed</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        )}
        {user?.is_admin && (
          <button
            onClick={() => navigate('/admin/risk-control')}
            className="w-full text-left card-surface p-4 flex items-center justify-between hover:bg-blue-50/40 text-slate-900"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-gold-500" />
              <span className="text-slate-900">Risk Control</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        )}
        {user?.is_admin && (
          <button
            onClick={() => navigate('/admin/service-catalog')}
            className="w-full text-left card-surface p-4 flex items-center justify-between hover:bg-blue-50/40 text-slate-900"
          >
            <div className="flex items-center gap-3">
              <Scissors className="w-5 h-5 text-gold-500" />
              <span className="text-slate-900">Service Catalog</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        )}
        {user?.is_admin && (
          <button
            onClick={() => navigate('/admin/applications')}
            className="w-full text-left card-surface p-4 flex items-center justify-between hover:bg-blue-50/40 text-slate-900"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-gold-500" />
              <span className="text-slate-900">Store Applications</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        )}
        <button
          onClick={() => {
            logout();
            navigate('/admin/login');
          }}
          className="w-full text-left card-surface p-4 flex items-center justify-between text-red-600 hover:bg-red-50/60"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </div>
          <ChevronRight className="h-4 w-4 text-red-400" />
        </button>
      </div>
    </AdminLayout>
  );
};

export default More;
