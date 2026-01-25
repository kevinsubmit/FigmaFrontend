import { ArrowLeft, Bell, MessageSquare, Share2, Store } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function PartnershipInquiry() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-safe animate-in fade-in duration-300">
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-[#333]">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-lg font-bold">Partner with Us</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="px-6 pt-6">
        <p className="text-gray-400 mb-8 leading-relaxed">
          Are you a salon owner? Join our network and reach thousands of new customers in your area.
        </p>

        <div className="space-y-6">
          <div className="bg-[#111] border border-[#222] p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-bold text-white">List Your Salon</h4>
                <p className="text-xs text-gray-500">Get discovered by local beauty seekers</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-bold text-white">Advanced Booking</h4>
                <p className="text-xs text-gray-500">Manage appointments with ease</p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <p className="text-xs font-bold text-gray-500 uppercase mb-4 text-center">
              Contact our Partnership Team
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button className="flex flex-col items-center gap-3 p-6 bg-[#111] border border-[#222] rounded-2xl hover:border-[#25D366]/50 transition-all active:scale-95 group">
                <div className="w-12 h-12 bg-[#25D366]/10 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-[#25D366]" />
                </div>
                <span className="text-sm font-bold">WhatsApp</span>
              </button>
              <button className="flex flex-col items-center gap-3 p-6 bg-[#111] border border-[#222] rounded-2xl hover:border-white/50 transition-all active:scale-95 group">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-bold">iMessage</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PartnershipInquiry;
