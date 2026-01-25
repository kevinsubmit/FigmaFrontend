import { ArrowLeft, ChevronRight, MessageSquare, Star } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function FeedbackSupport() {
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
          <h1 className="text-lg font-bold">Feedback & Support</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="px-6 pt-6">
        <p className="text-gray-400 mb-10 leading-relaxed">
          How can we help you today? Select your preferred way to reach our support team.
        </p>

        <div className="space-y-4">
          <button className="w-full flex items-center gap-4 p-5 bg-[#111] border border-[#222] rounded-2xl hover:bg-[#1a1a1a] transition-all active:scale-[0.98]">
            <div className="w-12 h-12 bg-[#25D366]/10 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-[#25D366]" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-bold">WhatsApp Support</h4>
              <p className="text-xs text-gray-500">Fastest response time</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>

          <button className="w-full flex items-center gap-4 p-5 bg-[#111] border border-[#222] rounded-2xl hover:bg-[#1a1a1a] transition-all active:scale-[0.98]">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-bold">iMessage</h4>
              <p className="text-xs text-gray-500">Standard for iPhone users</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>

          <button className="w-full flex items-center gap-4 p-5 bg-[#111] border border-[#222] rounded-2xl hover:bg-[#1a1a1a] transition-all active:scale-[0.98]">
            <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-bold">Instagram DM</h4>
              <p className="text-xs text-gray-500">Follow us for nail inspo</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="mt-12 p-6 bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-2xl text-center">
          <p className="text-sm text-gray-400 italic">
            "Our team usually responds within 2 hours during business hours."
          </p>
        </div>
      </div>
    </div>
  );
}

export default FeedbackSupport;
