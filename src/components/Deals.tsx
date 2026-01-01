import { ArrowLeft, Star, MapPin, Tag, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface DealsProps {
  onBack: () => void;
  onSelectSalon: (salon: any) => void;
}

const MOCK_DEALS = [
  {
    id: 1,
    name: 'Gilded Nails Studio',
    rating: 4.9,
    reviews: 124,
    location: 'Beverly Hills, CA',
    distance: '1.2 mi',
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&auto=format&fit=crop&q=60',
    offer: '15% OFF First Visit',
    expiry: 'Ends in 2 days',
    tags: ['Luxury', 'Gel']
  },
  {
    id: 2,
    name: 'The Chrome Bar',
    rating: 4.7,
    reviews: 89,
    location: 'West Hollywood, CA',
    distance: '2.5 mi',
    image: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&auto=format&fit=crop&q=60',
    offer: 'Free Paraffin Wax with Mani',
    expiry: 'Weekly Special',
    tags: ['Chrome', 'Y2K']
  },
  {
    id: 3,
    name: 'Minimalist Mani',
    rating: 5.0,
    reviews: 56,
    location: 'Santa Monica, CA',
    distance: '4.8 mi',
    image: 'https://images.unsplash.com/photo-1519017713917-9807534d0b0b?w=800&auto=format&fit=crop&q=60',
    offer: 'Happy Hour: $10 Off 2pm-4pm',
    expiry: 'Mon-Thu only',
    tags: ['Minimalist', 'French']
  }
];

export function Deals({ onBack, onSelectSalon }: DealsProps) {
  const [activeTab, setActiveTab] = useState<'exclusive' | 'limited'>('exclusive');

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header - Consistent with Home/Services style */}
      <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-lg border-b border-[#D4AF37]/10 px-6 py-5">
        <div className="flex flex-col">
          <h1 className="text-2xl font-light tracking-widest text-[#D4AF37]">
            EXCLUSIVE DEALS
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">
            Members only benefits
          </p>
        </div>
      </header>

      <div className="p-6 space-y-8">
        {/* Seasonal Promo Card - Pinterest style visual depth */}
        <div 
          onClick={() => onSelectSalon({
            id: 1,
            name: 'Gilded Nails Studio',
            rating: 4.9,
            reviews: 124,
            location: 'Beverly Hills, CA',
            image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&auto=format&fit=crop&q=60'
          })}
          className="group relative bg-[#111] rounded-3xl overflow-hidden border border-[#D4AF37]/10 hover:border-[#D4AF37]/30 transition-all cursor-pointer active:scale-[0.98]"
        >
          <div className="relative h-56 w-full overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&auto=format&fit=crop&q=60" 
              alt="Seasonal Promo"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            {/* Badge */}
            <div className="absolute top-4 left-4 bg-[#D4AF37] text-black px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              15% OFF First Visit
            </div>

            {/* Distance */}
            <div className="absolute bottom-4 left-4 flex items-center gap-1 text-white/90 text-sm">
              <MapPin className="w-4 h-4 text-[#D4AF37]" />
              1.2 mi
            </div>
          </div>

          {/* Info Section */}
          <div className="p-5">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-medium group-hover:text-[#D4AF37] transition-colors">Gilded Nails Studio</h3>
                <p className="text-sm text-gray-400">Beverly Hills, CA</p>
              </div>
              <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                <span className="text-sm font-medium">4.9</span>
              </div>
            </div>

            {/* Tags & Expiry */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 border border-gray-800 px-2 py-0.5 rounded-md">
                  Luxury
                </span>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 border border-gray-800 px-2 py-0.5 rounded-md">
                  Gel
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#D4AF37]/80">
                <Clock className="w-3.5 h-3.5" />
                Ends in 2 days
              </div>
            </div>

            {/* CTA */}
            <button 
              className="w-full mt-6 bg-white/5 group-hover:bg-[#D4AF37] group-hover:text-black py-3 rounded-2xl text-sm font-medium transition-all duration-300 border border-white/10 group-hover:border-[#D4AF37]"
            >
              Claim Offer & Book
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}