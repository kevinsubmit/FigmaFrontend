import { ChevronDown, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Loader } from './ui/Loader';
import { StoreDetails } from './StoreDetails';
import { getStores as getStoresAPI, Store, addStoreToFavorites, removeStoreFromFavorites, checkIfStoreFavorited } from '../api/stores';
import { Search, SlidersHorizontal, Heart, X } from 'lucide-react';

type SortOption = 'recommended' | 'distance' | 'reviews';

interface ServicesProps {
  onBookingSuccess?: (booking: any) => void;
  initialStep?: number;
  initialSelectedStore?: any;
  onStoreDetailsChange?: (isViewingDetails: boolean) => void;
}

export function Services({ onBookingSuccess, initialStep, initialSelectedStore, onStoreDetailsChange }: ServicesProps) {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(initialStep || 1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAppliedOffer, setHasAppliedOffer] = useState(!!initialSelectedStore);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [favoriteStores, setFavoriteStores] = useState<Set<number>>(new Set());
  const [selectedStore, setSelectedStore] = useState<Store | null>(initialSelectedStore || null);
  const [stores, setStores] = useState<Store[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    // Load cached location from localStorage
    const cached = localStorage.getItem('userLocation');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Check if cache is less than 1 hour old
        if (Date.now() - parsed.timestamp < 3600000) {
          return { lat: parsed.lat, lng: parsed.lng };
        }
      } catch (e) {
        console.error('Failed to parse cached location:', e);
      }
    }
    return null;
  });

  // Get user location
  useEffect(() => {
    // Always try to get location if we don't have it cached
    if (!userLocation) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(location);
            // Cache location with timestamp
            localStorage.setItem('userLocation', JSON.stringify({
              ...location,
              timestamp: Date.now()
            }));
          },
          (error) => {
            console.error('Failed to get user location:', error);
            // Only fallback if user is trying to sort by distance
            if (sortBy === 'distance') {
              setSortBy('recommended');
            }
          }
        );
      } else {
        console.error('Geolocation is not supported');
        if (sortBy === 'distance') {
          setSortBy('recommended');
        }
      }
    }
  }, [userLocation, sortBy]);

  // Fetch stores from API
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setIsLoading(true);
        const data = await getStoresAPI({
          search: searchQuery || undefined,
          min_rating: minRating,
          sort_by: getSortByParam(),
          // Always pass user location if available to get distance info
          user_lat: userLocation ? userLocation.lat : undefined,
          user_lng: userLocation ? userLocation.lng : undefined
        });
        setStores(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch stores:', err);
        setError('Failed to load stores. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStores();
  }, [searchQuery, minRating, sortBy, userLocation]);
  
  // Convert sortBy to API parameter
  const getSortByParam = () => {
    switch (sortBy) {
      case 'reviews': return 'top_rated';
      case 'distance': return 'distance';
      default: return 'recommended';
    }
  };
  
  // Toggle favorite
  const toggleFavorite = async (storeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to add favorites');
      return;
    }
    
    try {
      if (favoriteStores.has(storeId)) {
        await removeStoreFromFavorites(storeId, token);
        setFavoriteStores(prev => {
          const newSet = new Set(prev);
          newSet.delete(storeId);
          return newSet;
        });
      } else {
        await addStoreToFavorites(storeId, token);
        setFavoriteStores(prev => new Set(prev).add(storeId));
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Load store from URL parameter
  useEffect(() => {
    if (storeId && stores.length > 0) {
      const store = stores.find(s => s.id === parseInt(storeId));
      if (store) {
        setSelectedStore(store);
      } else {
        // Invalid store ID, redirect to services list
        navigate('/services', { replace: true });
      }
    } else if (!storeId) {
      // No storeId in URL, reset to list view
      setSelectedStore(null);
    }
  }, [storeId, stores, navigate]);

  // Sync state with props since the component stays mounted
  useEffect(() => {
    if (initialSelectedStore) {
      setSelectedStore(initialSelectedStore);
      setHasAppliedOffer(true);
    }
  }, [initialSelectedStore]);

  // Notify parent component when store details view changes
  useEffect(() => {
    if (onStoreDetailsChange) {
      onStoreDetailsChange(selectedStore !== null);
    }
  }, [selectedStore, onStoreDetailsChange]);

  const getSortedStores = () => {
    const storesCopy = [...stores];
    switch (sortBy) {
      case 'distance':
        // Sort by distance (if available, otherwise keep original order)
        return storesCopy.sort((a, b) => {
          // For now, keep original order as we don't have user location
          return 0;
        });
      case 'reviews':
        return storesCopy.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      default:
        return storesCopy; // Recommended (default order)
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

  // Helper function to get primary image or first image
  const getPrimaryImage = (store: Store): string => {
    if (store.images && store.images.length > 0) {
      const primaryImage = store.images.find(img => img.is_primary === 1);
      return primaryImage?.image_url || store.images[0].image_url;
    }
    return 'https://images.unsplash.com/photo-1619607146034-5a05296c8f9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
  };

  // Helper function to get thumbnail images (excluding primary)
  const getThumbnailImages = (store: Store): string[] => {
    if (store.images && store.images.length > 1) {
      return store.images
        .filter(img => img.is_primary !== 1)
        .sort((a, b) => a.display_order - b.display_order)
        .slice(0, 4)
        .map(img => img.image_url);
    }
    // Fallback thumbnails
    return [
      "https://images.unsplash.com/photo-1673985402265-46c4d2e53982?w=400&q=80",
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80",
      "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&q=80",
      "https://images.unsplash.com/photo-1519017713917-9807534d0b0b?w=400&q=80"
    ].slice(0, 4);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black pt-20 px-6">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#D4AF37] text-black rounded-lg font-semibold"
          >
            Retry
          </button>
        </div>
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
            
            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search salons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333] text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>
            
            {/* Sort and Filter Buttons */}
            <div className="flex gap-2">
              <button 
                onClick={() => setIsSortOpen(true)}
                className="flex-1 flex items-center justify-between bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-sm font-medium text-white hover:bg-[#333] transition-colors"
              >
                <span className="text-gray-400">Sort: <span className="text-white ml-1">{getSortLabel()}</span></span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              <button 
                onClick={() => setIsFilterOpen(true)}
                className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-sm font-medium text-white hover:bg-[#333] transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {minRating && <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>}
              </button>
            </div>
          </div>

          {/* Stores List */}
          <div className="px-4 py-6 space-y-8">
            {getSortedStores().map((store) => (
              <div key={store.id} onClick={() => navigate(`/services/${store.id}`)} className="group cursor-pointer">
                {/* Main Image */}
                <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-3 bg-gray-900 border border-[#333]">
                  <img 
                    src={getPrimaryImage(store)} 
                    alt={store.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Favorite Button */}
                  <button
                    onClick={(e) => toggleFavorite(store.id, e)}
                    className="absolute top-3 left-3 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors z-10"
                  >
                    <Heart 
                      className={`w-5 h-5 ${favoriteStores.has(store.id) ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-white'}`}
                    />
                  </button>
                  
                  {/* Rating Badge */}
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white flex flex-col items-center min-w-[60px]">
                     <span className="text-lg font-bold leading-none">{store.rating?.toFixed(1) || 'N/A'}</span>
                     <span className="text-[10px] text-gray-300">{store.review_count || 0} reviews</span>
                  </div>
                </div>

                {/* Thumbnails */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                    {getThumbnailImages(store).map((thumb, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-900 border border-[#333]">
                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>

                {/* Info */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors">{store.name}</h3>
                    <div className="flex items-center text-sm text-gray-400">
                        <span className="truncate">{store.address}, {store.city}, {store.state}</span>
                        {store.distance !== undefined && store.distance !== null && (
                          <>
                            <span className="mx-1.5">·</span>
                            <span className="text-[#D4AF37]">{store.distance} mi</span>
                          </>
                        )}
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
                            ? 'border-[#D4AF37] bg-transparent'
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
          
          {/* Filter Side Drawer */}
          <AnimatePresence>
            {isFilterOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsFilterOpen(false)}
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
                    <h2 className="text-xl font-bold text-white">Filters</h2>
                    <button 
                      onClick={() => setIsFilterOpen(false)}
                      className="text-[#D4AF37] font-semibold text-base"
                    >
                      Done
                    </button>
                  </div>

                  {/* Filter Options */}
                  <div className="px-6 py-4 flex-1 overflow-y-auto">
                    {/* Minimum Rating */}
                    <div className="mb-6">
                      <label className="block text-white font-medium mb-3">Minimum Rating</label>
                      <div className="space-y-2">
                        {[undefined, 4.5, 4.0, 3.5, 3.0].map((rating) => (
                          <button
                            key={rating || 'all'}
                            onClick={() => setMinRating(rating)}
                            className="w-full flex items-center justify-between py-3 border-b border-[#333] last:border-0"
                          >
                            <span className={`text-base ${minRating === rating ? 'text-white font-medium' : 'text-gray-400'}`}>
                              {rating ? `${rating}+ Stars` : 'All Ratings'}
                            </span>
                            
                            {/* Radio Button */}
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              minRating === rating 
                                ? 'border-[#D4AF37] bg-transparent'
                                : 'border-gray-600 bg-transparent'
                            }`}>
                              {minRating === rating && (
                                <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Clear Filters */}
                    {minRating && (
                      <button
                        onClick={() => setMinRating(undefined)}
                        className="w-full py-3 rounded-lg bg-white/5 border border-[#333] text-[#D4AF37] font-semibold hover:bg-white/10 transition-colors"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          
          {/* Store Details Overlay */}
          {selectedStore && (
            <StoreDetails 
                store={selectedStore} 
                onBack={() => navigate('/services')} 
                onBookingComplete={(booking) => {
                  onBookingSuccess?.(booking);
                  navigate('/appointments');
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
