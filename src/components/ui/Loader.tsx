import { Loader2 } from 'lucide-react';

export function Loader() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[50vh] animate-in fade-in duration-300">
      <div className="relative">
        {/* Outer Glow */}
        <div className="absolute inset-0 bg-[#D4AF37] blur-2xl opacity-20 rounded-full animate-pulse"></div>
        {/* Main Spinner */}
        <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" strokeWidth={1.5} />
      </div>
    </div>
  );
}