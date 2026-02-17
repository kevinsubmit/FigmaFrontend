import { ArrowLeft, Coins, TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Loader } from './ui/Loader';
import pointsService, { PointsBalance, PointTransaction } from '../services/points.service';
import couponsService, { Coupon } from '../services/coupons.service';

interface MyPointsProps {
  onBack: () => void;
}

export function MyPoints({ onBack }: MyPointsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [exchangeableCoupons, setExchangeableCoupons] = useState<Coupon[]>([]);
  const [exchangingCouponId, setExchangingCouponId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPointsData();
  }, []);

  const loadPointsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        setError('Please login to view points');
        setIsLoading(false);
        return;
      }

      // Load balance and transactions
      const [balanceData, transactionsData] = await Promise.all([
        pointsService.getBalance(token),
        pointsService.getTransactions(token, 0, 50),
      ]);

      setBalance(balanceData);
      setTransactions(transactionsData);

      const couponsData = await couponsService.getExchangeableCoupons(token);
      setExchangeableCoupons(couponsData);
    } catch (err: any) {
      console.error('Error loading points data:', err);
      setError(err.response?.data?.detail || 'Failed to load points data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExchangeCoupon = async (couponId: number) => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        setError('Please login to exchange coupons');
        return;
      }
      setExchangingCouponId(couponId);
      await couponsService.exchangeCoupon(token, couponId);
      await loadPointsData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to exchange coupon');
    } finally {
      setExchangingCouponId(null);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <Loader />
      </div>
    );
  }

  const totalPoints = balance?.available_points || 0;

  return (
    <div className="min-h-screen bg-black text-white pb-safe animate-in fade-in duration-300">
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-[#333]">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-lg font-bold">My Points</h1>
        <div className="w-8" />
      </div>

      <div className="px-6 py-8 flex flex-col items-center border-b border-[#333] bg-gradient-to-b from-[#1a1a1a] to-black">
        <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/30 mb-4">
          <Coins className="w-8 h-8 text-[#D4AF37]" />
        </div>
        <h2 className="text-4xl font-bold text-[#D4AF37] mb-1">{totalPoints.toLocaleString()}</h2>
        <p className="text-gray-400 text-sm">Available Points</p>
        {balance && (
          <p className="text-gray-500 text-xs mt-2">
            Total Earned: {balance.total_points.toLocaleString()}
          </p>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="px-4 py-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 pl-1">Exchange Coupons</h3>
        {exchangeableCoupons.length === 0 ? (
          <div className="mb-6 text-center py-6 rounded-xl border border-[#333] bg-[#0f0f0f]">
            <p className="text-sm text-gray-500">No exchangeable coupons right now</p>
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            {exchangeableCoupons.map((coupon) => {
              const requiredPoints = coupon.points_required ?? 0;
              const canExchange = totalPoints >= requiredPoints;
              return (
                <div key={coupon.id} className="rounded-xl border border-[#333] bg-[#111] p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{coupon.name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Need {requiredPoints} pts • Min spend ${coupon.min_amount}
                    </p>
                  </div>
                  <button
                    onClick={() => handleExchangeCoupon(coupon.id)}
                    disabled={!canExchange || exchangingCouponId === coupon.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#D4AF37]/40 text-[#D4AF37] disabled:opacity-50"
                  >
                    {exchangingCouponId === coupon.id ? 'Exchanging...' : 'Exchange'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 pl-1">History</h3>
        
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <Coins className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-500">No transactions yet</p>
            <p className="text-sm text-gray-600 mt-2">
              Complete appointments to earn points
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-[#333] last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.type === 'earn' ? 'bg-green-900/20 text-green-500' : 'bg-red-900/20 text-red-500'}`}>
                    {item.type === 'earn' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.reason}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    )}
                    <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
                  </div>
                </div>
                <span className={`font-bold ${item.type === 'earn' ? 'text-green-500' : 'text-white'}`}>
                  {item.amount > 0 ? '+' : ''}{item.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
