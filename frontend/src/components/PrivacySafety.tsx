import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function PrivacySafety() {
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
          <h1 className="text-lg font-bold">Privacy & Safety</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="px-6 pt-6 space-y-6">
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
            <h2 className="text-lg font-bold">Your Data, Your Control</h2>
          </div>
          <p className="text-sm text-gray-400">
            We only collect the information required to manage your bookings and improve the service experience.
          </p>
        </div>

        <div className="space-y-3 text-sm text-gray-400">
          <p>• We never sell your personal information.</p>
          <p>• You can request data deletion by contacting support.</p>
          <p>• Booking details are shared only with the selected salon.</p>
          <p>• Payments and sensitive data are encrypted in transit.</p>
        </div>
      </div>
    </div>
  );
}

export default PrivacySafety;
