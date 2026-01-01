import { ArrowLeft, Ticket, Clock, Percent } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Loader } from './ui/Loader';

interface MyCouponsProps {
  onBack: () => void;
}

const COUPONS = [
  { id: 1, title: 'New Member Gift', discount: '$10 OFF', desc: 'Min. spend $50', expiry: '2024-01-30', color: 'from-purple-900/50 to-blue-900/50' },
  { id: 2, title: 'VIP Exclusive', discount: '20% OFF', desc: 'Nail Art Services', expiry: '2024-02-15', color: 'from-[#D4AF37]/40 to-[#b5952f]/20' },
  { id: 3, title: 'Holiday Special', discount: '$25 OFF', desc: 'Full Set + Pedicure', expiry: '2023-12-31', color: 'from-red-900/40 to-pink-900/40' },
];

export function MyCoupons({ onBack }: MyCouponsProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-safe animate-in fade-in duration-300">
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-[#333]">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-lg font-bold">My Coupons</h1>
        <div className="w-8" />
      </div>

      <div className="px-4 py-6 space-y-4">
        {COUPONS.map((coupon) => (
          <div key={coupon.id} className={`relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r ${coupon.color} p-4 flex justify-between items-stretch h-32`}>
            {/* Left Side */}
            <div className="flex flex-col justify-center gap-1 z-10 w-2/3">
              <h3 className="text-2xl font-bold text-white tracking-tight">{coupon.discount}</h3>
              <p className="text-sm font-semibold text-white/90">{coupon.title}</p>
              <p className="text-xs text-white/60">{coupon.desc}</p>
            </div>

            {/* Divider */}
            <div className="w-[1px] bg-white/20 mx-2 border-l border-dashed border-white/30 relative">
               <div className="absolute -top-6 -left-3 w-6 h-6 rounded-full bg-black" />
               <div className="absolute -bottom-6 -left-3 w-6 h-6 rounded-full bg-black" />
            </div>

            {/* Right Side */}
            <div className="flex flex-col justify-center items-center z-10 flex-1 pl-2">
               <p className="text-[10px] text-white/70 mb-2 text-center">Expires</p>
               <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {coupon.expiry}
               </div>
               <button className="mt-3 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors">
                 Use
               </button>
            </div>
            
            {/* Decor */}
            <Ticket className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 rotate-12" />
          </div>
        ))}
      </div>
    </div>
  );
}