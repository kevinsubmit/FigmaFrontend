import { ArrowLeft, Info } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function AboutUs() {
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
          <h1 className="text-lg font-bold">About Us</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="px-6 pt-6 space-y-6">
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Info className="w-6 h-6 text-[#D4AF37]" />
            <h2 className="text-lg font-bold">NailsDash</h2>
          </div>
          <p className="text-sm text-gray-400">
            NailsDash connects customers with top-rated nail salons, helping you discover styles,
            book appointments, and enjoy exclusive deals in one place.
          </p>
        </div>

        <div className="text-sm text-gray-500">
          <p>Version: v1.2.0</p>
          <p>Made for nail lovers in the U.S.</p>
        </div>
      </div>
    </div>
  );
}

export default AboutUs;
