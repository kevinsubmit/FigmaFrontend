import { ArrowLeft, Coins, TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Loader } from './ui/Loader';

interface MyPointsProps {
  onBack: () => void;
}

const POINTS_HISTORY = [
  { id: 1, title: 'Service Payment - Luxe Nail Spa', points: 128, type: 'earn', date: '2023-12-10' },
  { id: 2, title: 'New Member Bonus', points: 500, type: 'earn', date: '2023-11-01' },
  { id: 3, title: 'Redeemed: $10 Off Coupon', points: -1000, type: 'spend', date: '2023-11-15' },
  { id: 4, title: 'Review Bonus', points: 50, type: 'earn', date: '2023-10-20' },
  { id: 5, title: 'Service Payment - Golden Glow', points: 85, type: 'earn', date: '2023-11-25' },
];

export function MyPoints({ onBack }: MyPointsProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const totalPoints = POINTS_HISTORY.reduce((acc, curr) => acc + curr.points, 1240); // Starting balance mock

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
        <h1 className="text-lg font-bold">My Points</h1>
        <div className="w-8" />
      </div>

      <div className="px-6 py-8 flex flex-col items-center border-b border-[#333] bg-gradient-to-b from-[#1a1a1a] to-black">
        <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/30 mb-4">
          <Coins className="w-8 h-8 text-[#D4AF37]" />
        </div>
        <h2 className="text-4xl font-bold text-[#D4AF37] mb-1">{totalPoints}</h2>
        <p className="text-gray-400 text-sm">Available Points</p>
      </div>

      <div className="px-4 py-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 pl-1">History</h3>
        <div className="space-y-4">
          {POINTS_HISTORY.map((item) => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b border-[#333] last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.type === 'earn' ? 'bg-green-900/20 text-green-500' : 'bg-red-900/20 text-red-500'}`}>
                  {item.type === 'earn' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.date}</p>
                </div>
              </div>
              <span className={`font-bold ${item.type === 'earn' ? 'text-green-500' : 'text-white'}`}>
                {item.type === 'earn' ? '+' : ''}{item.points}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}