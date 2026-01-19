import { Heart, Plus, Search, Loader2, ArrowDown, Sparkles } from 'lucide-react';
import Masonry from 'react-responsive-masonry';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader } from './ui/Loader';
import { motion } from 'framer-motion';
import { getPins, Pin } from '../api/pins';

interface HomeProps {
  onNavigate: (page: 'home' | 'services' | 'appointments' | 'profile' | 'deals') => void;
  onPinClick?: (pinData: any) => void;
}

const TAGS = ['All', 'French', 'Chrome', 'Y2K', 'Minimalist'];
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&auto=format&fit=crop&q=80';

const pickTags = (seed: number) => {
  const tagPool = TAGS.filter(tag => tag !== 'All');
  const first = tagPool[seed % tagPool.length];
  const second = tagPool[(seed + 2) % tagPool.length];
  return first === second ? [first] : [first, second];
};

export function Home({ onNavigate, onPinClick }: HomeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTag, setActiveTag] = useState('All');
  const [images, setImages] = useState<Pin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Infinite Scroll State
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);

  // Pull to Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStart = useRef(0);
  const isPulling = useRef(false);

  const tags = TAGS;

  const loadPins = async (options?: { reset?: boolean; tag?: string; query?: string }) => {
    const reset = options?.reset ?? false;
    const tag = options?.tag ?? activeTag;
    const query = options?.query ?? searchQuery;
    const nextOffset = reset ? 0 : offset;

    try {
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError('');

      const pins = await getPins({
        skip: nextOffset,
        limit: 8,
        search: query || undefined,
        tag: tag === 'All' ? undefined : tag
      });
      setImages(prev => reset ? pins : [...prev, ...pins]);
      setOffset(nextOffset + pins.length);
      setHasMore(pins.length > 0);
    } catch (err) {
      console.error('Failed to load home feed:', err);
      setError('Unable to load feed. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Initial Load
  useEffect(() => {
    loadPins({ reset: true, tag: activeTag });
  }, []);

  // Update images when tag changes
  useEffect(() => {
    if (!isLoading) {
      loadPins({ reset: true, tag: activeTag });
    }
  }, [activeTag]);

  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      loadPins({ reset: true, query: searchQuery });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Infinite Scroll Logic
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || isLoading || !hasMore) return;
    loadPins();
  }, [isLoadingMore, isLoading, hasMore, activeTag, searchQuery, offset]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [handleLoadMore]);

  // Pull to Refresh Logic
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStart.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current) return;
    
    const touchY = e.touches[0].clientY;
    const delta = touchY - touchStart.current;

    if (window.scrollY === 0 && delta > 0) {
      // Add resistance
      const distance = delta * 0.4;
      if (distance < 150) { // Max pull distance
        setPullDistance(distance);
      }
    } else {
       setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    isPulling.current = false;
    if (pullDistance > 60) {
      handleRefresh();
    }
    setPullDistance(0);
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    
    await loadPins({ reset: true });
    setIsRefreshing(false);
  };

  const handleUploadClick = () => {
    alert('Upload your nail design!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-24">
        <Loader />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      <div 
        className="fixed top-20 left-0 right-0 z-30 flex justify-center pointer-events-none transition-all duration-200"
        style={{ 
          transform: `translateY(${isRefreshing ? 20 : pullDistance}px)`,
          opacity: pullDistance > 0 || isRefreshing ? 1 : 0 
        }}
      >
        <div className="bg-[#1a1a1a] p-2 rounded-full shadow-lg border border-[#D4AF37]/20">
          {isRefreshing ? (
            <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
          ) : (
            <ArrowDown 
              className="w-6 h-6 text-[#D4AF37] transition-transform" 
              style={{ transform: `rotate(${pullDistance * 2}deg)` }}
            />
          )}
        </div>
      </div>

      {/* Sticky Header Container */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md pb-2 transition-all pt-[env(safe-area-inset-top)]">
        {/* Search Bar */}
        <div className="px-4 py-3">
          <div className="relative group">
              <input
                type="text"
                placeholder="Search for inspiration..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1a1a] border-none rounded-full py-3.5 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all shadow-lg"
              />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[#D4AF37] transition-colors" />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="px-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-2">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`relative px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeTag === tag
                    ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20'
                    : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#333]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Masonry Grid */}
      <div className="px-2 pb-24 pt-2">
        {error && (
          <div className="mx-4 mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        <Masonry columnsCount={2} gutter="10px">
          {images.map((image, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx % 6 * 0.1 }}
              key={image.id}
              className="mb-4 break-inside-avoid cursor-pointer group active:scale-[0.98] transition-transform"
              onClick={() => onPinClick?.(image)}
            >
              {/* Image Card */}
              <div className="relative overflow-hidden rounded-2xl bg-[#1a1a1a] shadow-xl">
                <img
                  src={image.image_url || FALLBACK_IMAGE}
                  alt={image.title}
                  className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                    idx % 3 === 0 ? 'aspect-[4/5]' : idx % 2 === 0 ? 'aspect-[2/3]' : 'aspect-[3/4]'
                  }`}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <button className="absolute right-3 top-3 h-9 w-9 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Heart className="w-4 h-4 text-[#D4AF37]" />
                </button>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-sm font-semibold">{image.title}</p>
                  <p className="text-xs text-gray-300">Curated by admin</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-[#D4AF37] uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    {image.tags?.slice(0, 2).join(' · ')}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </Masonry>
        
        {/* Load More Indicator */}
        <div ref={observerTarget} className="flex justify-center py-6 h-20 w-full">
          {isLoadingMore && (
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
          )}
        </div>
      </div>

      {/* Floating Action Button (Main) */}
      <button
        onClick={handleUploadClick}
        className="fixed bottom-24 right-5 w-14 h-14 bg-[#1a1a1a] border border-[#D4AF37]/30 rounded-full flex items-center justify-center shadow-2xl hover:bg-[#252525] transition-all hover:scale-105 active:scale-95 z-50 group"
        aria-label="Create Pin"
      >
        <Plus className="w-7 h-7 text-[#D4AF37]" strokeWidth={2.5} />
      </button>
    </div>
  );
}
