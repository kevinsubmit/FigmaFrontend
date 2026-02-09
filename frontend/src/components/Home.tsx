import { Heart, Search, Loader2, ArrowDown, Sparkles } from 'lucide-react';
import Masonry from 'react-responsive-masonry';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader } from './ui/Loader';
import { motion } from 'framer-motion';
import { getPinTags, getPins, Pin } from '../api/pins';

interface HomeProps {
  onNavigate: (page: 'home' | 'services' | 'appointments' | 'profile' | 'deals') => void;
  onPinClick?: (pinData: any) => void;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&auto=format&fit=crop&q=80';
const INITIAL_PAGE_SIZE = 12;
const LOAD_MORE_PAGE_SIZE = 8;
const HOME_CACHE_KEY = 'home_cache_v1';

export function Home({ onNavigate, onPinClick }: HomeProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTag, setActiveTag] = useState('All');
  const [images, setImages] = useState<Pin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [tags, setTags] = useState<string[]>(['All']);
  const hasSetSeasonal = useRef(false);
  const hasSetTagFromUrl = useRef(false);
  const hasInitialized = useRef(false);
  const skipNextLoad = useRef(false);
  
  // Infinite Scroll State
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);

  // Pull to Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStart = useRef(0);
  const isPulling = useRef(false);

  const loadPins = async (options?: { reset?: boolean; tag?: string; query?: string; background?: boolean }) => {
    const reset = options?.reset ?? false;
    const tag = options?.tag ?? activeTag;
    const query = options?.query ?? searchQuery;
    const background = options?.background ?? false;
    const nextOffset = reset ? 0 : offset;
    const pageSize = reset ? INITIAL_PAGE_SIZE : LOAD_MORE_PAGE_SIZE;

    try {
      if (reset && !background) {
        setIsLoading(true);
      } else if (!background) {
        setIsLoadingMore(true);
      }
      setError('');

      const rawPins = await getPins({
        skip: nextOffset,
        limit: pageSize,
        search: query || undefined,
        tag: tag === 'All' ? undefined : tag
      });
      const pins =
        tag === 'All'
          ? rawPins
          : rawPins.filter((pin) => Array.isArray(pin.tags) && pin.tags.includes(tag));
      setImages(prev => reset ? pins : [...prev, ...pins]);
      setOffset(prev => (reset ? pins.length : prev + pins.length));
      setHasMore(pins.length === pageSize);
    } catch (err) {
      console.error('Failed to load home feed:', err);
      if (!background) {
        setError('Unable to load feed. Please try again.');
      }
      setHasMore(false);
    } finally {
      if (!background) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tag = params.get('tag');
    if (tag && tag !== activeTag) {
      setActiveTag(tag);
      setSearchDraft(tag);
      setSearchQuery(tag);
    }
    if (!hasSetTagFromUrl.current) {
      hasSetTagFromUrl.current = true;
    }
  }, [location.search, activeTag]);

  useEffect(() => {
    let disposed = false;

    const loadTags = async () => {
      // Use cached tags for first paint, then always sync from backend config.
      const cached = sessionStorage.getItem(HOME_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.tags?.length > 1 && !disposed) {
            setTags(parsed.tags);
          }
        } catch (error) {
          console.error('Failed to parse home cache for tags:', error);
        }
      }

      try {
        const tagNames = await getPinTags();
        if (disposed) return;
        const nextTags = ['All', ...tagNames];
        setTags(nextTags);
        setActiveTag((prev) => (nextTags.includes(prev) ? prev : 'All'));
      } catch (err) {
        console.error('Failed to load tags:', err);
      }
    };

    loadTags();
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (hasSetSeasonal.current) return;
    if (tags.length > 1) {
      setActiveTag('All');
      hasSetSeasonal.current = true;
    }
  }, [tags]);

  useEffect(() => {
    if (!hasInitialized.current) {
      return;
    }
    if (skipNextLoad.current) {
      skipNextLoad.current = false;
      return;
    }
    loadPins({ reset: true, tag: activeTag, query: searchQuery });
  }, [activeTag, searchQuery]);

  // Infinite Scroll Logic
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || isLoading || !hasMore || error) return;
    loadPins();
  }, [isLoadingMore, isLoading, hasMore, error, activeTag, searchQuery, offset]);

  const applySearch = () => {
    setSearchQuery(searchDraft.trim());
  };

  const clearSearch = () => {
    setSearchDraft('');
    setSearchQuery('');
    setActiveTag('All');
    if (location.search) {
      navigate('/', { replace: true });
    }
  };

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
    sessionStorage.removeItem(HOME_CACHE_KEY);
    await loadPins({ reset: true });
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    const cached = sessionStorage.getItem(HOME_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.images?.length) {
          skipNextLoad.current = true;
          setImages(parsed.images);
          setTags(parsed.tags || ['All']);
          setActiveTag(parsed.activeTag || 'All');
          setSearchQuery(parsed.searchQuery || '');
          setSearchDraft(parsed.searchDraft || '');
          setOffset(parsed.offset || parsed.images.length || 0);
          setHasMore(parsed.hasMore ?? true);
          setIsLoading(false);
          setIsLoadingMore(false);
          hasInitialized.current = true;
          // Sync against latest server data to prevent stale/deleted cards.
          setTimeout(() => {
            loadPins({
              reset: true,
              tag: parsed.activeTag || 'All',
              query: parsed.searchQuery || '',
              background: true,
            });
          }, 0);
          return;
        }
      } catch (error) {
        console.error('Failed to restore home cache:', error);
      }
    }
    hasInitialized.current = true;
    loadPins({ reset: true, tag: activeTag, query: searchQuery });
  }, []);

  useEffect(() => {
    if (!hasInitialized.current || isLoading) {
      return;
    }
    const cachePayload = {
      images,
      tags,
      activeTag,
      searchQuery,
      searchDraft,
      offset,
      hasMore,
    };
    sessionStorage.setItem(HOME_CACHE_KEY, JSON.stringify(cachePayload));
  }, [images, tags, activeTag, searchQuery, searchDraft, offset, hasMore, isLoading]);

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
        <div className="px-4 py-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[#D4AF37] transition-colors" />
            <input
              type="text"
              placeholder="Search tags (e.g. snowflake)"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applySearch();
                }
              }}
              className="w-full bg-[#1a1a1a] border-none rounded-full py-2.5 pl-12 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all shadow-lg"
            />
            {searchDraft && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="px-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-2">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setActiveTag(tag);
                  setSearchDraft('');
                  setSearchQuery('');
                  if (location.search) {
                    navigate('/', { replace: true });
                  }
                }}
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
                  onError={(event) => {
                    const target = event.currentTarget;
                    if (target.src !== FALLBACK_IMAGE) {
                      target.src = FALLBACK_IMAGE;
                    }
                  }}
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
    </div>
  );
}
