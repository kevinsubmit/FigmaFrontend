import { Heart, Plus, Search, Loader2, ArrowDown } from 'lucide-react';
import Masonry from 'react-responsive-masonry';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader } from './ui/Loader';
import { motion } from 'framer-motion';

interface HomeProps {
  onNavigate: (page: 'home' | 'services' | 'appointments' | 'profile' | 'deals') => void;
  onPinClick?: (pinData: any) => void;
}

const MOCK_IMAGES_POOL = [
  {
    url: 'https://images.unsplash.com/photo-1754799670410-b282791342c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaW5rJTIwbmFpbHMlMjBtYW5pY3VyZXxlbnwxfHx8fDE3NjUxNjI2NDF8MA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Pink Manicure',
    author: 'Sarah Styles',
    likes: 124,
    tags: ['Minimalist']
  },
  {
    url: 'https://images.unsplash.com/photo-1763063556535-5f6174a5c5d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnbGl0dGVyJTIwbmFpbHMlMjBkZXNpZ258ZW58MXx8fHwxNzY1MTYyNjQxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Glitter Design',
    author: 'Glam Studio',
    likes: 89,
    tags: ['Y2K', 'Chrome']
  },
  {
    url: 'https://images.unsplash.com/photo-1762121903467-8cf5cc423ba5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVuY2glMjBtYW5pY3VyZSUyMG5haWxzfGVufDF8fHx8MTc2NTE1Njc2Nnww&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'French Manicure',
    author: 'Chic Beauty',
    likes: 245,
    tags: ['French', 'Minimalist']
  },
  {
    url: 'https://images.unsplash.com/photo-1645566370376-af89a31f3862?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhY3J5bGljJTIwbmFpbHMlMjBhcnR8ZW58MXx8fHwxNzY1MTYyNjQzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Acrylic Nails',
    author: 'Artistic Hands',
    likes: 56,
    tags: ['Chrome', 'Y2K']
  },
  {
    url: 'https://images.unsplash.com/photo-1659391542239-9648f307c0b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnZWwlMjBuYWlscyUyMHBvbGlzaHxlbnwxfHx8fDE3NjUwODg2OTZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Gel Polish',
    author: 'Polish Pro',
    likes: 178,
    tags: ['Minimalist', 'French']
  },
  {
    url: 'https://images.unsplash.com/photo-1737214475365-e4f06281dcf3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuYWlsJTIwYXJ0JTIwZGVzaWdufGVufDF8fHx8MTc2NTEwNTkxOHww&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Nail Art',
    author: 'Creative Soul',
    likes: 92,
    tags: ['Y2K', 'Chrome']
  },
  {
    url: 'https://images.unsplash.com/photo-1562940215-4314619607a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBoYWlyJTIwYmxvd291dCUyMHNhbG9ufGVufDF8fHx8MTc2NTE2MDgwOXww&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Blowout Style',
    author: 'Hair Haven',
    likes: 312,
    tags: ['Minimalist']
  },
  {
    url: 'https://images.unsplash.com/photo-1698181842119-a5283dea1440?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWtldXAlMjBhcnRpc3QlMjBiZWF1dHl8ZW58MXx8fHwxNzY1MDgwNjQwfDA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Makeup Art',
    author: 'Face Forward',
    likes: 156,
    tags: ['Minimalist']
  },
  {
    url: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800&auto=format&fit=crop&q=60',
    title: 'Summer Vibes',
    author: 'Beach Beauty',
    likes: 201,
    tags: ['French', 'Y2K']
  },
  {
    url: 'https://images.unsplash.com/photo-1519017713917-9807534d0b0b?w=800&auto=format&fit=crop&q=60',
    title: 'Classy Red',
    author: 'Red Rose',
    likes: 334,
    tags: ['Minimalist']
  },
  {
    url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&auto=format&fit=crop&q=60',
    title: 'Abstract Art',
    author: 'Modernist',
    likes: 112,
    tags: ['Minimalist', 'Chrome']
  },
  {
    url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&auto=format&fit=crop&q=60',
    title: 'Pastel Dream',
    author: 'Soft Touch',
    likes: 145,
    tags: ['French', 'Minimalist']
  }
];

export function Home({ onNavigate, onPinClick }: HomeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTag, setActiveTag] = useState('All');
  const [images, setImages] = useState<any[]>([]);
  
  // Infinite Scroll State
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);

  // Pull to Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStart = useRef(0);
  const isPulling = useRef(false);

  const tags = ['All', 'French', 'Chrome', 'Y2K', 'Minimalist'];

  // Helper to get random images
  const getRandomImages = (count: number, tag: string = 'All') => {
    let pool = [...MOCK_IMAGES_POOL];
    if (tag !== 'All') {
      pool = pool.filter(img => img.tags.includes(tag));
    }
    
    // If pool is empty or too small, just use what we have or shuffle again
    const shuffled = pool.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map((img, index) => ({
      ...img,
      id: Date.now() + index + Math.random(), // Ensure unique IDs
      likes: Math.floor(Math.random() * 300) + 50
    }));
  };

  // Initial Load
  useEffect(() => {
    const timer = setTimeout(() => {
      setImages(getRandomImages(8, activeTag));
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Update images when tag changes
  useEffect(() => {
    if (!isLoading) {
      setIsLoadingMore(true);
      // Simulate switching category
      setTimeout(() => {
        setImages(getRandomImages(8, activeTag));
        setIsLoadingMore(false);
      }, 300);
    }
  }, [activeTag]);

  // Infinite Scroll Logic
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || isLoading) return;
    
    setIsLoadingMore(true);
    // Simulate network request
    setTimeout(() => {
      setImages(prev => [...prev, ...getRandomImages(6, activeTag)]);
      setIsLoadingMore(false);
    }, 800);
  }, [isLoadingMore, isLoading, activeTag]);

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
    
    // Simulate refresh
    setTimeout(() => {
      setImages(getRandomImages(6));
      setIsRefreshing(false);
    }, 800);
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
                  src={image.url}
                  alt={image.title}
                  className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                    idx % 3 === 0 ? 'aspect-[4/5]' : idx % 2 === 0 ? 'aspect-[2/3]' : 'aspect-[3/4]'
                  }`}
                  loading="lazy"
                />
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