import { Share, Plus, MoreHorizontal, Crown, Coins, Ticket, Receipt, UserCog, Settings, TrendingUp, Camera, Gift, Users, Pencil, Check, X, AlertCircle, Sparkles, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Masonry from 'react-responsive-masonry';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader } from './ui/Loader';
import { Progress } from "./ui/progress";
import { Settings as SettingsView } from './Settings';

interface ProfileProps {
  onNavigate?: (page: 'edit-profile' | 'order-history' | 'my-points' | 'my-coupons' | 'my-gift-cards' | 'settings' | 'vip-description', subPage?: 'referral') => void;
  onPinClick?: (pinData: any) => void;
}

// Mock Data
const USER_INFO = {
  name: "Jessica Glam",
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
  vipLevel: 1,
  spendAmount: 20,
  visitCount: 0
};

// VIP Levels Config
const VIP_LEVELS = [
  { level: 0, minSpend: 0, minVisits: 0, benefit: "Member Access" },
  { level: 1, minSpend: 35, minVisits: 1, benefit: "Priority Service (No Waiting)" },
  { level: 2, minSpend: 2000, minVisits: 5, benefit: "Free Nail Care Kit" },
  { level: 3, minSpend: 5000, minVisits: 15, benefit: "5% Discount on Services" },
  { level: 4, minSpend: 10000, minVisits: 30, benefit: "10% Discount on Services" },
  { level: 5, minSpend: 20000, minVisits: 50, benefit: "15% Discount + Personal Assistant" },
  { level: 6, minSpend: 35000, minVisits: 80, benefit: "18% Discount + Birthday Gift" },
  { level: 7, minSpend: 50000, minVisits: 120, benefit: "20% Discount + Exclusive Events" },
  { level: 8, minSpend: 80000, minVisits: 180, benefit: "25% Discount + Home Service" },
  { level: 9, minSpend: 120000, minVisits: 250, benefit: "30% Discount + Quarterly Luxury Gift" },
  { level: 10, minSpend: 200000, minVisits: 350, benefit: "40% Discount + Black Card Status" },
];

const CREATED_PINS = [
  {
    id: 101,
    url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&auto=format&fit=crop&q=60',
    title: 'My Latest Art',
    likes: 234
  },
  {
    id: 102,
    url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&auto=format&fit=crop&q=60',
    title: 'Pastel Dream',
    likes: 156
  },
  {
    id: 103,
    url: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&auto=format&fit=crop&q=60',
    title: 'Summer Vibes',
    likes: 89
  },
  {
    id: 104,
    url: 'https://images.unsplash.com/photo-1595854341625-f33ee1043f76?w=800&auto=format&fit=crop&q=60',
    title: 'Client Work',
    likes: 412
  }
];

const SAVED_PINS = [
  {
    id: 201,
    url: 'https://images.unsplash.com/photo-1519017713917-9807534d0b0b?w=800&auto=format&fit=crop&q=60',
    title: 'Inspo #1',
    likes: 1200
  },
  {
    id: 202,
    url: 'https://images.unsplash.com/photo-1754799670410-b282791342c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaW5rJTIwbmFpbHMlMjBtYW5pY3VyZXxlbnwxfHx8fDE3NjUxNjI2NDF8MA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Pink Idea',
    likes: 340
  },
  {
    id: 203,
    url: 'https://images.unsplash.com/photo-1763063556535-5f6174a5c5d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnbGl0dGVyJTIwbmFpbHMlMjBkZXNpZ258ZW58MXx8fHwxNzY1MTYyNjQxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Glitter',
    likes: 560
  },
  {
    id: 204,
    url: 'https://images.unsplash.com/photo-1562940215-4314619607a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBoYWlyJTIwYmxvd291dCUyMHNhbG9ufGVufDF8fHx8MTc2NTE2MDgwOXww&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Hair Inspo',
    likes: 230
  },
  {
    id: 205,
    url: 'https://images.unsplash.com/photo-1698181842119-a5283dea1440?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWtldXAlMjBhcnRpc3QlMjBiZWF1dHl8ZW58MXx8fHwxNzY1MDgwNjQwfDA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Makeup Look',
    likes: 890
  }
];

export function Profile({ onNavigate, onPinClick }: ProfileProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'created' | 'saved'>('saved');
  const [avatar, setAvatar] = useState(USER_INFO.avatar);
  const [name, setName] = useState(USER_INFO.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(USER_INFO.name);
  const [nameError, setNameError] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatar(url);
    }
  };

  const handleSaveName = () => {
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

    setName(trimmedName);
    setIsEditingName(false);
    setNameError('');
    toast.success('Name updated successfully');
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

  const currentPins = activeTab === 'created' ? CREATED_PINS : SAVED_PINS;

  return (
    <div className="min-h-screen bg-black text-white pb-24 animate-in fade-in duration-500">
      {/* Top Bar */}
      <div className="flex justify-between items-center px-4 py-2 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div /> {/* Spacer */}
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-full bg-[#1a1a1a] border border-[#333] hover:bg-[#333] text-white transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

        <div className="flex flex-col items-center px-6 mt-2">
        <div className="relative group mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#D4AF37]">
              <img 
                src={avatar} 
                alt={name} 
                className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
              />
            </div>
            <label className="absolute inset-0 flex items-center justify-center cursor-pointer">
                <div className="bg-black/50 rounded-full p-2 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarChange}
                />
            </label>
        </div>

        <div className="w-full max-w-[280px] flex flex-col items-center mb-4">
          {isEditingName ? (
            <div className="w-full space-y-2 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 w-full">
                <input
                  autoFocus
                  type="text"
                  value={tempName}
                  onChange={(e) => {
                    setTempName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelName();
                  }}
                  className={`w-full bg-[#1a1a1a] border ${nameError ? 'border-red-500' : 'border-[#D4AF37]'} rounded-lg px-3 py-1 text-white text-xl font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37] text-center`}
                />
                <div className="flex gap-1">
                  <button 
                    onClick={handleSaveName}
                    className="p-1.5 bg-[#D4AF37] rounded-md text-black hover:bg-[#b08d2d] transition-colors"
                  >
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </button>
                  <button 
                    onClick={handleCancelName}
                    className="p-1.5 bg-[#333] rounded-md text-white hover:bg-[#444] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {nameError && (
                <p className="text-red-500 text-[10px] font-medium flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {nameError}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
              <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
              <Pencil className="w-4 h-4 text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
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
                            <span className="text-2xl font-black text-white tracking-tighter italic">VIP {USER_INFO.vipLevel}</span>
                            <motion.span 
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              className="bg-[#D4AF37] text-black text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                            >
                              Current
                            </motion.span>
                        </div>
                        <p className="text-[#D4AF37] text-sm font-medium">
                            {VIP_LEVELS.find(l => l.level === USER_INFO.vipLevel)?.benefit}
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
                 {USER_INFO.vipLevel < 10 ? (
                    <div className="space-y-3">
                        {(() => {
                            const nextLevel = VIP_LEVELS.find(l => l.level === USER_INFO.vipLevel + 1);
                            if (!nextLevel) return null;
                            
                            const spendProgress = Math.min(100, (USER_INFO.spendAmount / nextLevel.minSpend) * 100);
                            const visitProgress = Math.min(100, (USER_INFO.visitCount / nextLevel.minVisits) * 100);
                            
                            return (
                                <>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[10px] text-gray-400">
                                            <span>Spend Amount</span>
                                            <span className={USER_INFO.spendAmount >= nextLevel.minSpend ? "text-[#D4AF37]" : ""}>
                                                ${USER_INFO.spendAmount} / ${nextLevel.minSpend}
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
                                            <span className={USER_INFO.visitCount >= nextLevel.minVisits ? "text-[#D4AF37]" : ""}>
                                                {USER_INFO.visitCount} / {nextLevel.minVisits}
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
                                        Next level to <span className="text-[#D4AF37] font-bold">VIP 2</span>
                                    </p>
                                </>
                            );
                        })()}
                    </div>
                 ) : (
                    <p className="text-sm text-[#D4AF37] font-medium">You have reached the highest VIP level!</p>
                 )}
              </motion.div>
            </div>

        {/* Referral / Invite Banner (Optimization) */}
        <div className="w-full max-w-md mb-6">
            <button 
                onClick={() => onNavigate?.('settings', 'referral')}
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
                       <p className="text-2xl font-black text-white leading-tight group-hover:scale-110 transition-transform">1,240</p>
                       <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] group-hover:text-[#D4AF37] transition-colors">Total Points</p>
                   </div>

                   {/* Redemption Rule Info */}
                   <div className="mt-3 flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                       <AlertCircle className="w-2.5 h-2.5 text-[#D4AF37]" />
                       <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
                           100 pts = $5 Discount
                       </p>
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
                    <p className="text-2xl font-black text-white leading-tight mb-0.5 group-hover:scale-110 transition-transform">3</p>
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
                    <p className="text-2xl font-black text-white leading-tight mb-0.5 group-hover:scale-110 transition-transform">$85.00</p>
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
                    <p className="text-2xl font-black text-white leading-tight mb-0.5 group-hover:scale-110 transition-transform">5</p>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] group-hover:text-[#D4AF37] transition-colors">Orders</p>
                </div>
             </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[calc(4.5rem+env(safe-area-inset-top))] z-10 bg-black/80 backdrop-blur-xl border-b border-[#333]">
        <div className="flex items-center justify-around px-12">
          <button 
            onClick={() => setActiveTab('created')}
            className={`flex flex-col items-center py-4 transition-all relative ${
              activeTab === 'created' ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-sm font-bold tracking-widest uppercase">My Styles</span>
            <span className="text-[10px] mt-0.5 opacity-60">12 Posts</span>
            {activeTab === 'created' && (
              <motion.div 
                layoutId="activeProfileTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.4)]" 
              />
            )}
          </button>
          
          <button 
            onClick={() => setActiveTab('saved')}
            className={`flex flex-col items-center py-4 transition-all relative ${
              activeTab === 'saved' ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-sm font-bold tracking-widest uppercase">Inspiration</span>
            <span className="text-[10px] mt-0.5 opacity-60">48 Saved</span>
            {activeTab === 'saved' && (
              <motion.div 
                layoutId="activeProfileTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.4)]" 
              />
            )}
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="px-2 pt-4">
        {currentPins.length > 0 ? (
          <Masonry columnsCount={2} gutter="8px">
            {currentPins.map((pin) => (
              <div 
                key={pin.id} 
                className="mb-2 relative group cursor-pointer"
                onClick={() => onPinClick?.({ ...pin, author: USER_INFO.name, authorAvatar: USER_INFO.avatar })}
              >
                 <div className="relative overflow-hidden rounded-xl bg-gray-900">
                  <img 
                    src={pin.url} 
                    alt={pin.title} 
                    className="w-full aspect-[3/4] object-cover"
                  />
                 </div>
              </div>
            ))}
          </Masonry>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <h3 className="text-white font-bold mb-2">Create your first Pin</h3>
            <p className="text-gray-400 text-sm max-w-[200px]">
              Upload photos to share your nail art designs with the world.
            </p>
          </div>
        )}
      </div>
      {/* Floating Action Button (Only for Created Tab) */}
      {activeTab === 'created' && (
        <button
          onClick={() => alert('Upload your nail design!')}
          className="fixed bottom-24 right-5 w-14 h-14 bg-[#1a1a1a] border border-[#D4AF37]/30 rounded-full flex items-center justify-center shadow-2xl hover:bg-[#252525] transition-all hover:scale-105 active:scale-95 z-50 group"
          aria-label="Create Pin"
        >
          <Plus className="w-7 h-7 text-[#D4AF37]" strokeWidth={2.5} />
        </button>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
            className="fixed inset-0 z-[60] bg-black"
          >
            <SettingsView onBack={() => setShowSettings(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}