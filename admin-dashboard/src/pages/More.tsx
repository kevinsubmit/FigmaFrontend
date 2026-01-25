import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { Ticket, Gift, MessageSquare, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const More: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <AdminLayout>
      <TopBar title="More" />
      <div className="px-4 py-6 space-y-3">
        <button
          onClick={() => navigate('/admin/coupons')}
          className="w-full text-left card-surface p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Ticket className="w-5 h-5 text-gold-500" />
            <span>Coupons</span>
          </div>
        </button>
        <button
          onClick={() => navigate('/admin/gift-cards')}
          className="w-full text-left card-surface p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 text-gold-500" />
            <span>Gift Cards</span>
          </div>
        </button>
        <button
          onClick={() => navigate('/admin/reviews')}
          className="w-full text-left card-surface p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-gold-500" />
            <span>Reviews</span>
          </div>
        </button>
        <button
          onClick={() => {
            logout();
            navigate('/admin/login');
          }}
          className="w-full text-left card-surface p-4 flex items-center justify-between text-red-200"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </div>
        </button>
      </div>
    </AdminLayout>
  );
};

export default More;
