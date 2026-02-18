import { Share, MoreHorizontal, Crown, Coins, Ticket, Receipt, UserCog, Settings, TrendingUp, Camera, Gift, Users, Pencil, Check, X, Sparkles, ChevronRight, Bell, Star, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '../lib/api';
import { notificationsService } from '../services/notifications.service';
import pointsService from '../services/points.service';
import couponsService from '../services/coupons.service';
import giftCardsService from '../services/gift-cards.service';
import vipService, { type VipStatus } from '../services/vip.service';
import { getMyAppointments } from '../api/appointments';
import { getMyReviews } from '../api/reviews';
import { getMyFavoritePinsCount } from '../api/pins';
import usersService from '../services/users.service';
import { Loader } from './ui/Loader';
import { Progress } from "./ui/progress";
import { useAuth } from '../contexts/AuthContext';

interface ProfileProps {
  onNavigate?: (page: 'edit-profile' | 'order-history' | 'my-points' | 'my-coupons' | 'my-gift-cards' | 'settings' | 'vip-description' | 'notifications' | 'my-reviews' | 'my-favorites', subPage?: 'referral') => void;
}

const USER_INFO = {
  name: "Jessica Glam",
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
  vipLevel: 0,
};

const VIP_LEVELS = [
  { level: 0, min_spend: 0, min_visits: 0, benefit: "Member Access" },
  { level: 1, min_spend: 35, min_visits: 1, benefit: "Priority Service (No Waiting)" },
  { level: 2, min_spend: 2000, min_visits: 5, benefit: "Free Nail Care Kit" },
  { level: 3, min_spend: 5000, min_visits: 15, benefit: "5% Discount on Services" },
  { level: 4, min_spend: 10000, min_visits: 30, benefit: "10% Discount on Services" },
  { level: 5, min_spend: 20000, min_visits: 50, benefit: "15% Discount + Personal Assistant" },
  { level: 6, min_spend: 35000, min_visits: 80, benefit: "18% Discount + Birthday Gift" },
  { level: 7, min_spend: 50000, min_visits: 120, benefit: "20% Discount + Exclusive Events" },
  { level: 8, min_spend: 80000, min_visits: 180, benefit: "25% Discount + Home Service" },
  { level: 9, min_spend: 120000, min_visits: 250, benefit: "30% Discount + Quarterly Luxury Gift" },
  { level: 10, min_spend: 200000, min_visits: 350, benefit: "40% Discount + Black Card Status" },
];

export function Profile({ onNavigate }: ProfileProps) {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [avatar, setAvatar] = useState(USER_INFO.avatar);
  const [name, setName] = useState(USER_INFO.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(USER_INFO.name);
  const [nameError, setNameError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [vipLoaded, setVipLoaded] = useState(false);
  const [stats, setStats] = useState({
    points: 0,
    coupons: 0,
    giftCardBalance: 0,
    orders: 0,
    reviews: 0,
    favorites: 0,
  });

  const buildFallbackVipStatus = (appointments: any[]): VipStatus => {
    const completed = appointments.filter((apt) => apt?.status === 'completed');
    const totalVisits = completed.length;
    const totalSpend = completed.reduce((sum, apt) => {
      const finalPaid = Number(apt?.final_paid_amount ?? 0);
      const orderAmount = Number(apt?.order_amount ?? apt?.amount ?? 0);
      return sum + (finalPaid > 0 ? finalPaid : Math.max(orderAmount, 0));
    }, 0);
    let current = VIP_LEVELS[0];
    for (const level of VIP_LEVELS) {
      if (totalSpend >= level.min_spend && totalVisits >= level.min_visits) current = level;
    }
    const next = VIP_LEVELS.find((v) => v.level > current.level) ?? null;
    const spendRequired = next ? next.min_spend : Math.max(totalSpend, 0);
    const visitsRequired = next ? next.min_visits : Math.max(totalVisits, 0);
    const spendPercent = spendRequired > 0 ? Math.min(100, (totalSpend / spendRequired) * 100) : 100;
    const visitsPercent = visitsRequired > 0 ? Math.min(100, (totalVisits / visitsRequired) * 100) : 100;
    return {
      current_level: current,
      total_spend: Number(totalSpend.toFixed(2)),
      total_visits: totalVisits,
      spend_progress: { current: totalSpend, required: spendRequired, percent: spendPercent },
      visits_progress: { current: totalVisits, required: visitsRequired, percent: visitsPercent },
      next_level: next,
    };
  };
  
  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await notificationsService.getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };
    
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (!user || isEditingName) {
      return;
    }

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const nextName = user.full_name || user.username || USER_INFO.name;
    const nextAvatar = user.avatar_url
      ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${apiBaseUrl}${user.avatar_url}`)
      : USER_INFO.avatar;

    setAvatar(nextAvatar);
    setName(nextName);
    setTempName(nextName);
  }, [user]);


  useEffect(() => {
    const loadProfileStats = async () => {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        return;
      }

      try {
        const results = await Promise.allSettled([
          pointsService.getBalance(token),
          couponsService.getMyCoupons(token, 'available'),
          getMyAppointments(),
          getMyReviews(token),
          getMyFavoritePinsCount(token),
          giftCardsService.getSummary(token),
          vipService.getStatus(),
        ]);

        const pointsResult = results[0].status === 'fulfilled' ? results[0].value : null;
        const couponsResult = results[1].status === 'fulfilled' ? results[1].value : [];
        const appointmentsResult = results[2].status === 'fulfilled' ? results[2].value : [];
        const completedAppointments = appointmentsResult.filter((apt) => apt.status === 'completed');
        const reviewsResult = results[3].status === 'fulfilled' ? results[3].value : [];
        const favoritesResult = results[4].status === 'fulfilled' ? results[4].value : null;
        const giftSummaryResult = results[5].status === 'fulfilled' ? results[5].value : null;
        const vipStatusResult = results[6].status === 'fulfilled' ? results[6].value : null;

        setStats({
          points: pointsResult?.available_points ?? 0,
          coupons: couponsResult.length,
          giftCardBalance: giftSummaryResult?.total_balance ?? 0,
          orders: completedAppointments.length,
          reviews: reviewsResult.length,
          favorites: favoritesResult?.count ?? 0,
        });
        setVipStatus(vipStatusResult ?? buildFallbackVipStatus(appointmentsResult));
        setVipLoaded(true);
      } catch (error) {
        console.error('Failed to load profile stats:', error);
        try {
          const appointments = await getMyAppointments();
          setVipStatus(buildFallbackVipStatus(appointments));
        } catch (fallbackError) {
          console.error('Failed to build fallback VIP status:', fallbackError);
        }
        setVipLoaded(true);
      }
    };

    loadProfileStats();
  }, []);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload an image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/auth/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const uploadedAvatar = response.data?.avatar_url
        ? (response.data.avatar_url.startsWith('http')
            ? response.data.avatar_url
            : `${apiBaseUrl}${response.data.avatar_url}`)
        : avatar;

      setAvatar(uploadedAvatar);
      await refreshUser();
      toast.success('Avatar updated successfully', { duration: 1200 });
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast.error('Failed to update avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveName = async () => {
    const trimmedName = tempName.trim();
    
    // Validation
    if (!trimmedName) {
      setNameError('Name cannot be empty');
      return;
    }
    
    if (trimmedName.length < 2 || trimmedName.length > 20) {
      setNameError('Name must be 2-20 characters');
      return;
    }

    if (/[0-9]/.test(trimmedName)) {
      setNameError('Numbers are not allowed');
      return;
    }

    if (/[^a-zA-Z\s]/.test(trimmedName)) {
      setNameError('Special characters are not allowed');
      return;
    }

    try {
      await usersService.updateProfile({ full_name: trimmedName });
      setName(trimmedName);
      setIsEditingName(false);
      setNameError('');
      await refreshUser();
      toast.success('Name updated successfully', { duration: 1200 });
    } catch (error) {
      console.error('Failed to update name:', error);
      toast.error('Failed to update name');
    }
  };

  const handleCancelName = () => {
    setTempName(name);
    setIsEditingName(false);
    setNameError('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <Loader />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-black text-white pb-24 animate-in fade-in duration-500">
      {/* Top Bar */}
      <div className="flex justify-between items-center px-4 py-2 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div /> {/* Spacer */}
        <div className="flex gap-2">
          <button 
            onClick={() => onNavigate?.('notifications')}
            className="relative p-2 rounded-full bg-[#1a1a1a] border border-[#333] hover:bg-[#333] text-white transition-colors"
          >
            <Bell className="w-4 h-4" />
            {/* Dynamic unread badge */}
            {unreadCount > 0 && (
              <div className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#D4AF37] rounded-full border border-black flex items-center justify-center">
                <span className="text-[9px] font-bold text-black">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </div>
            )}
          </button>
          <button 
            onClick={() => onNavigate?.('settings')}
            className="p-2 rounded-full bg-[#1a1a1a] border border-[#333] hover:bg-[#333] text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

        <div className="flex flex-col items-center px-6 mt-2">
        <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#D4AF37]">
              <img 
                src={avatar} 
                alt={name} 
                className="w-full h-full object-cover"
              />
            </div>
        </div>

        <div className="w-full max-w-[280px] flex flex-col items-center mb-4">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
          </div>
        </div>
        
        {/* VIP Membership Section */}
        <div className="w-full max-w-md mt-4 mb-6"> 
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate?.('vip-description')}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] border border-[#D4AF37]/40 rounded-xl p-5 relative overflow-hidden group cursor-pointer"
              >
                 {/* Premium Shine Animation */}
                 <motion.div 
                    animate={{ 
                      x: ['-100%', '200%'],
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity, 
                      ease: "linear",
                      repeatDelay: 4
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/10 to-transparent skew-x-12 pointer-events-none"
                 />

                 {/* Floating Decorative Glow */}
                 <motion.div 
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.05, 0.1, 0.05],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] blur-3xl rounded-full pointer-events-none -mr-10 -mt-10" 
                 />
                 
                 <div className="relative z-10 flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-black text-white tracking-tighter italic">VIP {vipStatus?.current_level.level ?? USER_INFO.vipLevel}</span>
                            <motion.span 
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              className="bg-[#D4AF37] text-black text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                            >
                              Current
                            </motion.span>
                        </div>
                        <p className="text-[#D4AF37] text-sm font-medium">
                            {vipStatus?.current_level.benefit ?? "Member Access"}
                        </p>
                    </div>
                    <motion.div 
                      animate={{ 
                        rotateY: [0, 360],
                      }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/30"
                    >
                        <Crown className="w-5 h-5 text-[#D4AF37]" fill="#D4AF37" fillOpacity={0.2} />
                    </motion.div>
                 </div>

                 {/* Progress to Next Level */}
                 {!vipLoaded ? (
                    <p className="text-sm text-gray-400">Loading VIP status...</p>
                 ) : vipStatus?.next_level ? (
                    <div className="space-y-3">
                        {(() => {
                            if (!vipStatus || !vipStatus.next_level) return null;
                            const nextLevel = vipStatus.next_level;
                            const spendProgress = vipStatus.spend_progress.percent;
                            const visitProgress = vipStatus.visits_progress.percent;
                            
                            return (
                                <>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-gray-400">
                                            <span>Spend Amount</span>
                                            <span className={vipStatus.total_spend >= nextLevel.min_spend ? "text-[#D4AF37]" : ""}>
                                                ${vipStatus.total_spend.toFixed(2)} / ${nextLevel.min_spend.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-[#333]">
                                          <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${spendProgress}%` }}
                                            transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
                                            className="h-full bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                                          />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-gray-400">
                                            <span>Visits</span>
                                            <span className={vipStatus.total_visits >= nextLevel.min_visits ? "text-[#D4AF37]" : ""}>
                                                {vipStatus.total_visits} / {nextLevel.min_visits}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-[#333]">
                                          <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${visitProgress}%` }}
                                            transition={{ duration: 1.5, delay: 0.8, ease: "circOut" }}
                                            className="h-full bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                                          />
                                        </div>
                                    </div>
                                    
                                    <p className="text-[10px] text-gray-500 pt-1 flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        Next level to <span className="text-[#D4AF37] font-bold">VIP {nextLevel.level}</span>
                                    </p>
                                </>
                            );
                        })()}
                    </div>
                 ) : vipStatus ? (
                    <p className="text-sm text-[#D4AF37] font-medium">You have reached the highest VIP level!</p>
                 ) : (
                    <p className="text-sm text-gray-400">Loading VIP status...</p>
                 )}
              </motion.div>
            </div>

        {/* Referral / Invite Banner (Optimization) */}
        <div className="w-full max-w-md mb-6">
            <button 
                onClick={() => onNavigate?.('referral')}
                className="w-full bg-gradient-to-r from-[#1a1a1a] to-[#252525] border border-[#D4AF37]/20 rounded-2xl p-4 flex items-center justify-between group active:scale-[0.98] transition-all"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20 group-hover:bg-[#D4AF37]/20 transition-colors">
                        <Gift className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                    <div className="text-left">
                        <h4 className="text-white font-bold text-sm">Invite Friends, Get $10</h4>
                        <p className="text-gray-400 text-xs">Share your love for nails and save</p>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-[#D4AF37] transition-colors" />
            </button>
        </div>

        {/* Member Stats / Dashboard (Redesigned) */}
        <div className="w-full max-w-md grid grid-cols-2 gap-3 mb-4">
             {/* Points */}
             <motion.button 
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate?.('my-points')} 
                className="relative bg-[#1a1a1a] border border-[#333] hover:border-[#D4AF37]/50 rounded-2xl py-5 px-3 flex flex-col items-center gap-3 group transition-all overflow-hidden shadow-lg"
             >
                <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex flex-col items-center relative z-10 w-full">
                   <div className="w-12 h-12 rounded-2xl bg-[#2a2a2a] flex items-center justify-center group-hover:bg-[#D4AF37] group-hover:rotate-12 transition-all duration-500 shadow-inner mb-2">
                       <Coins className="w-6 h-6 text-[#D4AF37] group-hover:text-black transition-colors" />
                   </div>
                   <div className="text-center">
                       <p className="text-2xl font-black text-white leading-tight group-hover:scale-110 transition-transform">{stats.points.toLocaleString()}</p>
                       <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] group-hover:text-[#D4AF37] transition-colors">Total Points</p>
                   </div>

                </div>
             </motion.button>

             {/* Coupons */}
             <motion.button 
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate?.('my-coupons')} 
                className="relative bg-[#1a1a1a] border border-[#333] hover:border-[#D4AF37]/50 rounded-2xl py-5 px-2 flex flex-col items-center gap-2 group transition-all overflow-hidden shadow-lg"
             >
                <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-2xl bg-[#2a2a2a] flex items-center justify-center group-hover:bg-[#D4AF37] group-hover:-rotate-12 transition-all duration-500 shadow-inner">
                    <Ticket className="w-6 h-6 text-[#D4AF37] group-hover:text-black transition-colors" />
                </div>
                <div className="text-center relative z-10">
                    <p className="text-2xl font-black text-white leading-tight mb-0.5 group-hover:scale-110 transition-transform">{stats.coupons}</p>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] group-hover:text-[#D4AF37] transition-colors">Coupons</p>
                </div>
             </motion.button>
        </div>

        <div className="w-full max-w-md grid grid-cols-2 gap-3 mb-8">
             {/* Gift Cards */}
             <motion.button 
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate?.('my-gift-cards')} 
                className="relative bg-gradient-to-br from-[#1a1a1a] to-[#252525] border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-2xl py-5 px-2 flex flex-col items-center gap-2 group transition-all overflow-hidden shadow-2xl"
             >
                <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center group-hover:bg-[#D4AF37] group-hover:scale-110 transition-all duration-500 shadow-inner">
                    <Gift className="w-6 h-6 text-[#D4AF37] group-hover:text-black transition-colors" />
                </div>
                <div className="text-center relative z-10">
                    <p className="text-2xl font-black text-white leading-tight mb-0.5 group-hover:scale-110 transition-transform">${stats.giftCardBalance.toFixed(2)}</p>
                    <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-[0.2em]">Gift Cards</p>
                </div>
             </motion.button>

             {/* Orders */}
             <motion.button 
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate?.('order-history')} 
                className="relative bg-[#1a1a1a] border border-[#333] hover:border-[#D4AF37]/50 rounded-2xl py-5 px-2 flex flex-col items-center gap-2 group transition-all overflow-hidden shadow-lg"
             >
                <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-2xl bg-[#2a2a2a] flex items-center justify-center group-hover:bg-[#D4AF37] group-hover:scale-110 transition-all duration-500 shadow-inner">
                    <Receipt className="w-6 h-6 text-[#D4AF37] group-hover:text-black transition-colors" />
                </div>
                <div className="text-center relative z-10">
                    <p className="text-2xl font-black text-white leading-tight mb-0.5 group-hover:scale-110 transition-transform">{stats.orders}</p>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] group-hover:text-[#D4AF37] transition-colors">Orders</p>
                </div>
             </motion.button>

             {/* Reviews */}
             <motion.button 
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate?.('my-reviews')} 
                className="relative bg-[#1a1a1a] border border-[#333] hover:border-[#D4AF37]/50 rounded-2xl py-5 px-2 flex flex-col items-center gap-2 group transition-all overflow-hidden shadow-lg"
             >
                <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-2xl bg-[#2a2a2a] flex items-center justify-center group-hover:bg-[#D4AF37] group-hover:rotate-12 transition-all duration-500 shadow-inner">
                    <Star className="w-6 h-6 text-[#D4AF37] group-hover:text-black transition-colors" />
                </div>
                <div className="text-center relative z-10">
                    <p className="text-2xl font-black text-white leading-tight mb-0.5 group-hover:scale-110 transition-transform">{stats.reviews}</p>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] group-hover:text-[#D4AF37] transition-colors">Reviews</p>
                </div>
             </motion.button>
             
             {/* Favorites */}
             <motion.button 
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate?.('my-favorites')} 
                className="relative bg-[#1a1a1a] border border-[#333] hover:border-[#D4AF37]/50 rounded-2xl py-5 px-2 flex flex-col items-center gap-2 group transition-all overflow-hidden shadow-lg"
             >
                <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-2xl bg-[#2a2a2a] flex items-center justify-center group-hover:bg-[#D4AF37] group-hover:rotate-12 transition-all duration-500 shadow-inner">
                    <Heart className="w-6 h-6 text-[#D4AF37] group-hover:text-black transition-colors" />
                </div>
                <div className="text-center relative z-10">
                    <p className="text-2xl font-black text-white leading-tight mb-0.5 group-hover:scale-110 transition-transform">{stats.favorites}</p>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] group-hover:text-[#D4AF37] transition-colors">Favorites</p>
                </div>
             </motion.button>
             
        </div>
      </div>

      

    </div>
  );
}
