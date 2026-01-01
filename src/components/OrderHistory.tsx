import { ArrowLeft, ShoppingBag, MapPin, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Loader } from './ui/Loader';

interface OrderHistoryProps {
  onBack: () => void;
}

interface Order {
  id: string;
  shopName: string;
  date: string;
  time: string;
  service: string;
  amount: number;
  status: 'completed' | 'upcoming' | 'cancelled';
  location: string;
}

// Mock Data
const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-2023-001',
    shopName: 'Luxe Nail Spa',
    date: '2023-12-10',
    time: '14:30',
    service: 'Gel Manicure & Pedicure',
    amount: 128.00,
    status: 'completed',
    location: 'Downtown'
  },
  {
    id: 'ORD-2023-002',
    shopName: 'Golden Glow Studio',
    date: '2023-11-25',
    time: '11:00',
    service: 'Acrylic Full Set',
    amount: 85.00,
    status: 'completed',
    location: 'Westside'
  },
  {
    id: 'ORD-2023-003',
    shopName: 'Luxe Nail Spa',
    date: '2023-11-05',
    time: '16:15',
    service: 'Nail Art - Custom Design',
    amount: 45.00,
    status: 'completed',
    location: 'Downtown'
  },
  {
    id: 'ORD-2023-004',
    shopName: 'Pure Beauty Lounge',
    date: '2023-10-18',
    time: '10:00',
    service: 'Classic Manicure',
    amount: 35.00,
    status: 'completed',
    location: 'North Hills'
  },
  {
    id: 'ORD-2023-005',
    shopName: 'Luxe Nail Spa',
    date: '2023-12-20',
    time: '13:00',
    service: 'Holiday Special Set',
    amount: 150.00,
    status: 'upcoming',
    location: 'Downtown'
  }
];

export function OrderHistory({ onBack }: OrderHistoryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Simulate fetching data
    const timer = setTimeout(() => {
      // Sort orders by date descending
      const sorted = [...MOCK_ORDERS].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setOrders(sorted);
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const totalSpend = orders
    .filter(o => o.status === 'completed')
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const totalVisits = orders.filter(o => o.status === 'completed').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-safe animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-[#333]">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-lg font-bold">Transaction History</h1>
        <div className="w-8" /> {/* Spacer for centering */}
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#333] relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Total Spend</p>
                <p className="text-2xl font-bold text-[#D4AF37]">${totalSpend.toFixed(2)}</p>
             </div>
             <div className="absolute right-0 bottom-0 p-2 opacity-10">
                <ShoppingBag className="w-12 h-12 text-[#D4AF37]" />
             </div>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#333] relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Total Visits</p>
                <p className="text-2xl font-bold text-white">{totalVisits}</p>
             </div>
             <div className="absolute right-0 bottom-0 p-2 opacity-10">
                <Calendar className="w-12 h-12 text-white" />
             </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider pl-1">Recent Activity</h2>
          
          {orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4 flex flex-col gap-3 group hover:border-[#D4AF37]/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#252525] flex items-center justify-center border border-[#333] shrink-0">
                         <ShoppingBag className="w-5 h-5 text-gray-400 group-hover:text-[#D4AF37] transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{order.shopName}</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{order.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#D4AF37]">${order.amount.toFixed(2)}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        order.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                        order.status === 'upcoming' ? 'bg-blue-900/30 text-blue-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-full h-px bg-[#333]" />
                  
                  <div className="flex justify-between items-center text-sm">
                    <p className="text-gray-300">{order.service}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{order.date}</span>
                      <Clock className="w-3 h-3 ml-1" />
                      <span>{order.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-10 text-gray-500">
                <p>No transactions found.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
