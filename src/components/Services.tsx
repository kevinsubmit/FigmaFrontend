import { ChevronDown, Check, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader } from './ui/Loader';
import { StoreDetails } from './StoreDetails';

// Mock Data
const STORES = [
  {
    id: 1,
    name: "JM Nails By Michelle",
    rating: 5.0,
    reviewCount: 9,
    distance: "8.0 mi",
    address: "573 State St, Springfield, 01109",
    coverImage: "https://images.unsplash.com/photo-1619607146034-5a05296c8f9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    thumbnails: [
      "https://images.unsplash.com/photo-1673985402265-46c4d2e53982?w=400&q=80",
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80",
      "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&q=80",
      "https://images.unsplash.com/photo-1519017713917-9807534d0b0b?w=400&q=80"
    ]
  },
  {
    id: 2,
    name: "Luxe Nail Spa",
    rating: 4.8,
    reviewCount: 124,
    distance: "2.5 mi",
    address: "123 Main St, Downtown, 01103",
    coverImage: "https://images.unsplash.com/photo-1758225490983-0fae7961e425?w=1080&q=80",
    thumbnails: [
        "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=400&q=80",
        "https://images.unsplash.com/photo-1595854341625-f33ee1043f76?w=400&q=80",
        "https://images.unsplash.com/photo-1562940215-4314619607a2?w=400&q=80",
        "https://images.unsplash.com/photo-1698181842119-a5283dea1440?w=400&q=80"
    ]
  },
  {
    id: 3,
    name: "Golden Touch Salon",
    rating: 4.9,
    reviewCount: 56,
    distance: "5.1 mi",
    address: "442 Broadway, West Side, 01105",
    coverImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1080&q=80",
    thumbnails: [
        "https://images.unsplash.com/photo-1522337360705-2b5163795267?w=400&q=80",
        "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=400&q=80",
        "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80",
        "https://images.unsplash.com/photo-1519017713917-9807534d0b0b?w=400&q=80"
    ]
  }
];

type SortOption = 'recommended' | 'distance' | 'reviews';

interface ServicesProps {
  onBookingSuccess?: (booking: any) => void;
  initialStep?: number;
  initialSelectedStore?: any;
}

export function Services({ onBookingSuccess, initialStep, initialSelectedStore }: ServicesProps) {
  const [step, setStep] = useState(initialStep || 1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAppliedOffer, setHasAppliedOffer] = useState(!!initialSelectedStore);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [selectedStore, setSelectedStore] = useState<typeof STORES[0] | null>(initialSelectedStore || null);

  // Sync state with props since the component stays mounted
  useEffect(() => {
    if (initialSelectedStore) {
      setSelectedStore(initialSelectedStore);
      setHasAppliedOffer(true);
      // Ensure we are logically in the details view
    }
  }, [initialSelectedStore]);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const getSortedStores = () => {
    const stores = [...STORES];
    switch (sortBy) {
      case 'distance':
        return stores.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      case 'reviews':
        return stores.sort((a, b) => b.rating - a.rating); // Sort by rating for 'reviews' option
      default:
        return stores; // Recommended (default order)
    }
  };

  const sortOptions = [
    { id: 'recommended', label: 'Recommended first' },
    { id: 'distance', label: 'Distance (nearest first)' },
    { id: 'reviews', label: 'Reviews (top-rated first)' }
  ];

  const getSortLabel = () => {
    switch (sortBy) {
      case 'distance': return 'Distance';
      case 'reviews': return 'Reviews';
      default: return 'Recommended';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <Loader />
      </div>
    );
  }

  // Store List View (Always rendered, StoreDetails overlays it)
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Exclusive Offer Banner - Only shows if coming from Deals */}
      {hasAppliedOffer && step > 1 && (
        <div className="bg-[#D4AF37] text-black px-6 py-2 flex justify-between items-center animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Exclusive $20 Offer Applied</span>
          </div>
          <button 
            onClick={() => setHasAppliedOffer(false)}
            className="text-[10px] underline uppercase font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {step === 1 ? (
        <>
          {/* Header Area */}
          <div className="bg-black/95 backdrop-blur-md text-white px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))] sticky top-0 z-10 border-b border-[#333]">
            <div className="mb-4">
              <p className="text-[#D4AF37] text-[10px] font-bold tracking-[0.2em] uppercase mb-1 opacity-90">Step 01</p>
              <h1 className="text-2xl font-bold text-white tracking-tight">Select Salon</h1>
            </div>
            
            {/* Sort Button */}
            <button 
              onClick={() => setIsSortOpen(true)}
              className="w-full flex items-center justify-between bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-sm font-medium text-white hover:bg-[#333] transition-colors"
            >
              <span className="text-gray-400">Sort by: <span className="text-white ml-1">{getSortLabel()}</span></span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Stores List */}
          <div className="px-4 py-6 space-y-8">
            {getSortedStores().map((store) => (
              <div key={store.id} onClick={() => setSelectedStore(store)} className="group cursor-pointer">
                {/* Main Image */}
                <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-gray-900 border border-[#333]">
                  <img 
                    src={store.coverImage} 
                    alt={store.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white flex flex-col items-center min-w-[60px]">
                     <span className="text-lg font-bold leading-none">{store.rating}</span>
                     <span className="text-[10px] text-gray-300">{store.reviewCount} reviews</span>
                  </div>
                </div>

                {/* Thumbnails */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                    {store.thumbnails.map((thumb, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-900 border border-[#333]">
                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>

                {/* Info */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors">{store.name}</h3>
                    <div className="flex items-center text-sm text-gray-400">
                        <span>{store.distance}</span>
                        <span className="mx-1.5">·</span>
                        <span className="truncate">{store.address}</span>
                    </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sort Side Drawer (From Right) */}
          <AnimatePresence>
            {isSortOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSortOpen(false)}
                  className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
                />
                
                {/* Sheet (Side Drawer) */}
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-0 right-0 h-full w-[85%] max-w-sm bg-[#1a1a1a] rounded-l-3xl z-50 border-l border-[#333] pt-[env(safe-area-inset-top)] shadow-2xl flex flex-col"
                >
                  {/* Sheet Header */}
                  <div className="flex justify-between items-center px-6 py-5 border-b border-[#333] mt-2">
                    <h2 className="text-xl font-bold text-white">Sort by</h2>
                    <button 
                      onClick={() => setIsSortOpen(false)}
                      className="text-[#D4AF37] font-semibold text-base"
                    >
                      Done
                    </button>
                  </div>

                  {/* Options */}
                  <div className="px-6 py-2 flex-1">
                    {sortOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSortBy(option.id as SortOption)}
                        className="w-full flex items-center justify-between py-4 border-b border-[#333] last:border-0"
                      >
                        <span className={`text-base ${sortBy === option.id ? 'text-white font-medium' : 'text-gray-400'}`}>
                          {option.label}
                        </span>
                        
                        {/* Radio Button Custom */}
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          sortBy === option.id 
                            ? 'border-[#D4AF37] bg-transparent' // Standard radio often has dot inside. Image showed filled circle.
                            : 'border-gray-600 bg-transparent'
                        }`}>
                          {sortBy === option.id && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          
          {/* Store Details Overlay */}
          {selectedStore && (
            <StoreDetails 
                store={selectedStore} 
                onBack={() => setSelectedStore(null)} 
                onBookingComplete={(booking) => {
                  onBookingSuccess?.(booking);
                  setSelectedStore(null);
                }}
            />
          )}
        </>
      ) : (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white">Step {step}</h2>
          <p className="text-gray-400">Content for step {step}</p>
        </div>
      )}
    </div>
  );
}