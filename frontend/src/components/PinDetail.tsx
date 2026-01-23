import { 
  ArrowLeft, 
  Share, 
  Heart,
  ScanLine,
  X,
  Link,
  Instagram,
  Twitter,
  MessageSquare,
  MessageCircle,
  Download
} from 'lucide-react';
import Masonry from 'react-responsive-masonry';
import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader } from './ui/Loader';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from './ui/sonner';
import { toast } from 'sonner@2.0.3';
import { getPins, getPinById, Pin } from '../api/pins';

interface PinDetailProps {
  onBack: () => void;
  onBookNow: (pinId?: number) => void;
  onTagClick?: (tag: string) => void;
  onPinClick?: (pinData: Pin) => void;
  pinData?: {
    id: number;
    image_url: string;
    title: string;
    description?: string;
    tags?: string[];
    authorAvatar?: string;
  };
}

export function PinDetail({ onBack, onBookNow, onTagClick, onPinClick, pinData }: PinDetailProps) {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [relatedPins, setRelatedPins] = useState<Pin[]>([]);
  const [resolvedPin, setResolvedPin] = useState<Pin | null>(null);
  const favoritesKey = 'favorite_pins';
  const data = useMemo(() => {
    if (pinData) {
      return pinData;
    }
    if (resolvedPin) {
      return resolvedPin;
    }
    return {
      id: 1,
      image_url: 'https://images.unsplash.com/photo-1754799670410-b282791342c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaW5rJTIwbmFpbHMlMjBtYW5pY3VyZXxlbnwxfHx8fDE3NjUxNjI2NDF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      title: 'Pink Manicure with Hearts',
      description: 'Curated inspiration from our studio team.',
      tags: ['Minimalist', 'French'],
    };
  }, [pinData, resolvedPin]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(favoritesKey);
      const parsed: Array<{ id: number }> = raw ? JSON.parse(raw) : [];
      setIsFavorite(parsed.some((pin) => pin.id === data.id));
    } catch (error) {
      console.error('Failed to read favorite pins:', error);
      setIsFavorite(false);
    }
  }, [data.id]);

  const handleToggleFavorite = () => {
    try {
      const raw = localStorage.getItem(favoritesKey);
      const parsed: Array<{ id: number; title: string; image_url: string }> = raw ? JSON.parse(raw) : [];
      const exists = parsed.find((pin) => pin.id === data.id);
      let updated: typeof parsed = [];
      if (exists) {
        updated = parsed.filter((pin) => pin.id !== data.id);
        toast.success('Removed from favorites', { duration: 1200 });
        setIsFavorite(false);
      } else {
        updated = [
          {
            id: data.id,
            title: data.title,
            image_url: data.image_url,
          },
          ...parsed,
        ];
        toast.success('Added to favorites', { duration: 1200 });
        setIsFavorite(true);
      }
      localStorage.setItem(favoritesKey, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update favorite pins:', error);
      toast.error('Failed to update favorites');
    }
  };

  useEffect(() => {
    if (pinData) {
      setResolvedPin(null);
      return;
    }
    const params = new URLSearchParams(location.search);
    const pinId = params.get('id');
    if (!pinId) {
      const cached = sessionStorage.getItem('lastPin');
      if (cached) {
        try {
          setResolvedPin(JSON.parse(cached));
        } catch (error) {
          console.error('Failed to parse cached pin:', error);
        }
      }
      return;
    }
    const parsedId = Number(pinId);
    if (Number.isNaN(parsedId)) return;

    setIsLoading(true);
    getPinById(parsedId)
      .then((pin) => {
        setResolvedPin(pin);
        sessionStorage.setItem('lastPin', JSON.stringify(pin));
      })
      .catch((error) => {
        console.error('Failed to load pin detail:', error);
      })
      .finally(() => setIsLoading(false));
  }, [location.search, pinData]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(data.image_url);
      toast.success("Link copied to clipboard", { duration: 1200 });
    } catch (err) {
      // Fallback for environments where Clipboard API is blocked
      try {
        const textArea = document.createElement("textarea");
        textArea.value = data.image_url;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          toast.success("Link copied to clipboard", { duration: 1200 });
        } else {
          toast.error("Failed to copy link", { duration: 1200 });
        }
      } catch (fallbackErr) {
        toast.error("Failed to copy link", { duration: 1200 });
      }
    }
  };

  const handleDownloadImage = async () => {
    try {
      const response = await fetch(data.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.title || 'nail-inspo'}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image');
    }
  };

  const handleShareWhatsApp = () => {
    const text = `${data.title}\n${data.image_url}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareMessage = () => {
    const text = `${data.title}\n${data.image_url}`;
    const url = `sms:?&body=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    const loadRelatedPins = async () => {
      if (!data.tags || data.tags.length === 0) {
        setRelatedPins([]);
        return;
      }
      try {
        const primaryTag = data.tags[0];
        const pins = await getPins({ skip: 0, limit: 8, tag: primaryTag });
        const filtered = pins.filter((pin) => pin.id !== data.id);
        setRelatedPins(filtered.slice(0, 6));
      } catch (err) {
        console.error('Failed to load related pins:', err);
        setRelatedPins([]);
      }
    };

    loadRelatedPins();
  }, [data.id, data.tags?.join('|')]);

  useEffect(() => {
    // Simulate loading detailed data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [data.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="fixed top-0 left-0 right-0 z-50 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
           <button 
            onClick={onBack}
            className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
        </div>
        <div className="pt-20">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32 animate-in fade-in duration-500">
      <Toaster />
      {/* Sticky Top Bar for Back Button */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center pointer-events-auto hover:bg-black/70 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="flex flex-col">
        {/* Main Image Section */}
        <div className="relative w-full rounded-b-[2rem] overflow-hidden bg-gray-900">
          <img 
            src={data.image_url} 
            alt={data.title}
            className="w-full h-auto object-cover max-h-[75vh]"
          />
          
          {/* Visual Search Icon */}
          <button className="absolute bottom-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/70 transition-colors">
            <ScanLine className="w-5 h-5 text-white" />
          </button>

          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label="Add to favorites"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-white'}`} />
            </button>
            <button
              onClick={() => setIsShareOpen(true)}
              className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label="Share"
            >
              <Share className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="px-4 py-4 flex flex-col gap-6">
          <div className="flex items-center justify-end" />
          
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-gray-500">Chosen design</p>
            <h1 className="text-2xl font-bold text-white">{data.title}</h1>
          </div>

          {data.tags && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onTagClick?.(tag)}
                  className="px-3 py-1 bg-white/10 rounded-full text-xs text-gray-300 hover:text-white hover:bg-white/15 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {relatedPins.length > 0 && (
          <div className="px-4 pb-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Similar ideas</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {relatedPins.map((pin) => (
                <button
                  key={pin.id}
                  onClick={() => onPinClick?.(pin)}
                  className="group overflow-hidden rounded-2xl border border-[#222] bg-[#111] text-left"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={pin.image_url}
                      alt={pin.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Share Sheet Modal */}
        <AnimatePresence>
          {isShareOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsShareOpen(false)}
                className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm"
              />
              
              {/* Sheet */}
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-[#0f0f0f] rounded-t-3xl z-[61] overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1">
                  <div className="w-12 h-1.5 bg-gray-700 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 py-2 flex items-center justify-between relative">
                  <button 
                    onClick={() => setIsShareOpen(false)}
                    className="p-2 -ml-2 text-white hover:text-gray-300 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <h2 className="text-lg font-bold absolute left-1/2 -translate-x-1/2">Share ND link</h2>
                  <div className="w-8" /> {/* Spacer for centering */}
                </div>

                {/* Content */}
                <div className="flex flex-col items-center px-4 pb-8 pt-2">
                  {/* Image Preview */}
                  <div className="relative w-[60%] aspect-[3/4] rounded-2xl overflow-hidden mb-8 shadow-2xl border border-gray-800">
                     <img 
                      src={data.image_url} 
                      alt={data.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Share Options */}
                  <div className="flex items-center justify-start gap-4 w-full overflow-x-auto px-2 pb-2 scrollbar-hide">
                    <button 
                      className="flex flex-col items-center gap-2 group min-w-[72px]"
                      onClick={handleCopyLink}
                    >
                      <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                        <Link className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-xs text-gray-400">Copy link</span>
                    </button>
                    
                    <button
                      className="flex flex-col items-center gap-2 group min-w-[72px]"
                      onClick={handleDownloadImage}
                    >
                      <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                        <Download className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">Download image</span>
                    </button>

                    <button
                      className="flex flex-col items-center gap-2 group min-w-[72px]"
                      onClick={handleShareWhatsApp}
                    >
                      <div className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center group-hover:opacity-90 transition-opacity">
                        <MessageCircle className="w-7 h-7 text-white fill-current" />
                      </div>
                      <span className="text-xs text-gray-400">WhatsApp</span>
                    </button>

                    <button
                      className="flex flex-col items-center gap-2 group min-w-[72px]"
                      onClick={handleShareMessage}
                    >
                      <div className="w-14 h-14 rounded-full bg-[#53d769] flex items-center justify-center group-hover:opacity-90 transition-opacity">
                         <MessageSquare className="w-7 h-7 text-white fill-current" />
                      </div>
                      <span className="text-xs text-gray-400">Messages</span>
                    </button>

                    <button className="flex flex-col items-center gap-2 group min-w-[72px]">
                      <div className="w-14 h-14 rounded-full bg-black border border-gray-700 flex items-center justify-center group-hover:bg-gray-900 transition-colors">
                         <Twitter className="w-6 h-6 text-white fill-current" />
                      </div>
                      <span className="text-xs text-gray-400">X</span>
                    </button>

                    <button className="flex flex-col items-center gap-2 group min-w-[72px]">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#833AB4] flex items-center justify-center group-hover:opacity-90 transition-opacity">
                         <Instagram className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-xs text-gray-400">Instagram</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-t border-[#222] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500">Book this look</p>
            <p className="text-sm text-white">Find salons near you</p>
          </div>
          <button
            onClick={() => onBookNow(data.id)}
            className="rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-bold text-black hover:bg-[#b5952f] transition-colors"
          >
            Choose a salon
          </button>
        </div>
      </div>
    </div>
  );
}
