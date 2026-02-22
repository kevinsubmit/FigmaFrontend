import { ArrowLeft, Ticket, Clock, Percent, Gift } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Loader } from './ui/Loader';
import couponsService, { UserCoupon } from '../services/coupons.service';
import { toast } from 'react-toastify';

interface MyCouponsProps {
  onBack: () => void;
}

export function MyCoupons({ onBack }: MyCouponsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'used' | 'expired'>('available');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCoupons();
  }, [activeTab]);

  const loadCoupons = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        setError('Please login to view coupons');
        setIsLoading(false);
        return;
      }

      const data = await couponsService.getMyCoupons(token, activeTab);
      setCoupons(data);
    } catch (err: any) {
      console.error('Error loading coupons:', err);
      setError(err.response?.data?.detail || 'Failed to load coupons');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getDiscountText = (coupon: UserCoupon) => {
    if (coupon.coupon.type === 'fixed_amount') {
      return `$${coupon.coupon.discount_value} OFF`;
    } else {
      return `${coupon.coupon.discount_value}% OFF`;
    }
  };

  const getCouponSubtitle = (coupon: UserCoupon) => {
    const discountText = getDiscountText(coupon).trim().toLowerCase();
    const nameText = (coupon.coupon.name || '').trim();
    const normalizedName = nameText.toLowerCase();
    if (nameText && normalizedName !== discountText) {
      return nameText;
    }
    if (coupon.coupon.description && coupon.coupon.description.trim()) {
      return coupon.coupon.description.trim();
    }
    if (coupon.source === 'points') return 'Points Exchange Coupon';
    if (coupon.source === 'referral') return 'Referral Reward Coupon';
    if (coupon.source === 'activity') return 'Activity Reward Coupon';
    return 'Store Coupon';
  };

  const getCouponColor = (category: string) => {
    switch (category) {
      case 'newcomer':
        return 'from-purple-900/50 to-blue-900/50';
      case 'birthday':
        return 'from-pink-900/50 to-red-900/50';
      case 'referral':
        return 'from-green-900/50 to-teal-900/50';
      case 'activity':
        return 'from-orange-900/50 to-yellow-900/50';
      default:
        return 'from-[#D4AF37]/40 to-[#b5952f]/20';
    }
  };

  const handleUseCoupon = async (userCoupon: UserCoupon) => {
    const userCouponId = String(userCoupon.id);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(userCouponId);
      }
      toast.info(`Show this to staff: User Coupon ID #${userCouponId}. Copied.`);
      return;
    } catch (_error) {
      // Fall through and still show guidance.
    }
    toast.info(`Show this to staff: User Coupon ID #${userCouponId}.`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-safe animate-in fade-in duration-300">
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-[#333]">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-lg font-bold">My Coupons</h1>
          <div className="w-8" />
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-2 pb-3">
          {(['available', 'used', 'expired'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="px-4 py-6 space-y-4">
        {coupons.length === 0 ? (
          <div className="text-center py-12">
            <Ticket className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-500">No {activeTab} coupons</p>
            {activeTab === 'available' && <p className="text-sm text-gray-600 mt-2">Claim coupons from store promotions</p>}
          </div>
        ) : (
          coupons.map((userCoupon) => (
            <div
              key={userCoupon.id}
              className={`relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r ${getCouponColor(
                userCoupon.coupon.category
              )} p-4 flex justify-between items-stretch h-32 ${
                userCoupon.status !== 'available' ? 'opacity-60' : ''
              }`}
            >
              {/* Left Side */}
              <div className="flex flex-col justify-center gap-1 z-10 w-2/3">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  {getDiscountText(userCoupon)}
                </h3>
                <p className="text-sm font-semibold text-white/90 line-clamp-1">{getCouponSubtitle(userCoupon)}</p>
                <p className="text-xs text-white/60">
                  Min. spend ${userCoupon.coupon.min_amount}
                </p>
                <p className="text-[11px] text-white/70">
                  User Coupon ID: #{userCoupon.id}
                </p>
                {userCoupon.source === 'points' && (
                  <div className="flex items-center gap-1 text-[10px] text-[#D4AF37] mt-1">
                    <Gift className="w-3 h-3" />
                    <span>Points Exchange</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="w-[1px] bg-white/20 mx-2 border-l border-dashed border-white/30 relative">
                <div className="absolute -top-6 -left-3 w-6 h-6 rounded-full bg-black" />
                <div className="absolute -bottom-6 -left-3 w-6 h-6 rounded-full bg-black" />
              </div>

              {/* Right Side */}
              <div className="flex flex-col justify-center items-center z-10 flex-1 pl-2">
                <p className="text-[10px] text-white/70 mb-2 text-center">
                  {userCoupon.status === 'used' ? 'Used' : 'Expires'}
                </p>
                <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {formatDate(userCoupon.status === 'used' && userCoupon.used_at ? userCoupon.used_at : userCoupon.expires_at)}
                </div>
                {userCoupon.status === 'available' && (
                  <button
                    onClick={() => handleUseCoupon(userCoupon)}
                    className="mt-3 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    Show to Staff
                  </button>
                )}
                {userCoupon.status === 'used' && (
                  <span className="mt-3 text-[10px] text-white/50">Used</span>
                )}
                {userCoupon.status === 'expired' && (
                  <span className="mt-3 text-[10px] text-red-400">Expired</span>
                )}
              </div>

              {/* Decor */}
              <Ticket className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 rotate-12" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
