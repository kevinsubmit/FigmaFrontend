import { 
  X, 
  MapPin, 
  Star, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Heart, 
  Share2, 
  Calendar, 
  CreditCard,
  MessageSquare,
  Lock,
  MessageCircle,
  ArrowLeft,
  ExternalLink,
  Phone,
  CheckCircle2,
  User,
  Loader2,
  ChevronDown,
  Instagram,
  Navigation,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Masonry from 'react-responsive-masonry';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "./ui/carousel";
import { Progress } from "./ui/progress";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "./ui/drawer";
import { Calendar } from "./ui/calendar";

interface Store {
  id: number;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
  coverImage: string;
  thumbnails: string[];
}

interface Service {
  id: number;
  name: string;
  price: number;
  duration: string;
  description?: string;
}

interface Review {
  id: number;
  user: string;
  avatar: string;
  rating: number;
  date: string;
  title?: string;
  content: string;
  verified: boolean;
  reply?: {
    user: string;
    date: string;
    content: string;
  };
  photos?: string[];
}

const MOCK_SERVICES: Service[] = [
  { id: 1, name: "Manicure", price: 20.00, duration: "25m" },
  { id: 2, name: "Manicure and pedicure", price: 50.00, duration: "55m" },
  { id: 3, name: "Gel Remove", price: 8.00, duration: "15m" },
  { id: 4, name: "Gel Manicure", price: 30.00, duration: "40m" },
  { id: 5, name: "Acrylic Full Set", price: 45.00, duration: "60m" },
  { id: 6, name: "Dip Powder", price: 40.00, duration: "45m" },
];

// Template reviews for generating data
const REVIEW_TEMPLATES: Partial<Review>[] = [
  {
    user: "UniqueJulZ",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
    rating: 5,
    title: "Amazing",
    content: "The service was absolutely wonderful! I loved how attentive the staff was.",
    verified: true,
    reply: {
      user: "Owner",
      date: "Nov 23, 2025",
      content: "Thank you 🌸"
    }
  },
  {
    user: "Vivian",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
    rating: 5,
    content: "I've been going to her for years! She is so talented! I just send her the colors I want and she knows me so well.",
    verified: true,
    photos: ["https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=200&q=80"]
  },
  {
    user: "Sarah M.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80",
    rating: 4,
    content: "Great service but a bit pricey. The ambiance is lovely though.",
    verified: true
  },
  {
    user: "Jessica K.",
    avatar: "https://images.unsplash.com/photo-1554151228-14d9def656ec?w=100&q=80",
    rating: 5,
    content: "Absolutely obsessed with my new set! The attention to detail is unmatched.",
    verified: true
  },
  {
    user: "Emily R.",
    avatar: "https://images.unsplash.com/photo-1521119989659-a83eee488058?w=100&q=80",
    rating: 3,
    content: "It was okay, but the wait time was longer than expected even with an appointment.",
    verified: false
  }
];

const PORTFOLIO_BASE_IMAGES = [
  "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80",
  "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=600&q=80",
  "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=600&q=80",
  "https://images.unsplash.com/photo-1519017713917-9807534d0b0b?w=600&q=80",
  "https://images.unsplash.com/photo-1595854341625-f33ee1043f76?w=600&q=80",
  "https://images.unsplash.com/photo-1562940215-4314619607a2?w=600&q=80",
  "https://images.unsplash.com/photo-1698181842119-a5283dea1440?w=600&q=80",
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80",
  "https://images.unsplash.com/photo-1522337360705-2b5163795267?w=600&q=80",
  "https://images.unsplash.com/photo-1457972729786-0411a3b2b626?w=600&q=80"
];

const TABS = ['Services', 'Reviews', 'Portfolio', 'Details'];

interface StoreDetailsProps {
  store: Store;
  onBack: () => void;
  onBookingComplete?: (booking: any) => void;
}

export function StoreDetails({ store, onBack, onBookingComplete }: StoreDetailsProps) {
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'reviews' | 'portfolio' | 'details'>('services');
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  
  // Modals/Drawers State
  const [isMapDrawerOpen, setIsMapDrawerOpen] = useState(false);
  const [isCallDrawerOpen, setIsCallDrawerOpen] = useState(false);
  const [isBookingDrawerOpen, setIsBookingDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooked, setIsBooked] = useState(false);

  // Portfolio State
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(false);
  const [hasMorePortfolio, setHasMorePortfolio] = useState(true);

  // Reviews State
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);

  // Details State
  const [showFullHours, setShowFullHours] = useState(false);

  // Shared Observer Target
  const observerTarget = useRef(null);

  // Combine cover image and thumbnails for the gallery
  const galleryImages = [store.coverImage, ...(store.thumbnails || [])];

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Initial Data Load on Tab Change
  useEffect(() => {
    if (activeTab === 'portfolio' && portfolioImages.length === 0) {
      loadMoreImages();
    } else if (activeTab === 'reviews' && reviewsList.length === 0) {
      loadMoreReviews();
    }
  }, [activeTab]);

  // Infinite Scroll Observer (Shared Logic)
  useEffect(() => {
    const isPortfolio = activeTab === 'portfolio';
    const isReviews = activeTab === 'reviews';
    
    // Only run for tabs with infinite scroll
    if (!isPortfolio && !isReviews) return;

    const isLoading = isPortfolio ? isPortfolioLoading : isReviewsLoading;
    const hasMore = isPortfolio ? hasMorePortfolio : hasMoreReviews;
    const loadFunction = isPortfolio ? loadMoreImages : loadMoreReviews;

    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadFunction();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [activeTab, hasMorePortfolio, hasMoreReviews, isPortfolioLoading, isReviewsLoading]);

  // Load More Portfolio Images
  const loadMoreImages = async () => {
    if (isPortfolioLoading) return;
    setIsPortfolioLoading(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    const newImages = Array.from({ length: 10 }).map((_, i) => {
        const baseIndex = (portfolioImages.length + i) % PORTFOLIO_BASE_IMAGES.length;
        return `${PORTFOLIO_BASE_IMAGES[baseIndex]}&sig=${portfolioImages.length + i}`;
    });

    setPortfolioImages(prev => [...prev, ...newImages]);
    setIsPortfolioLoading(false);
    
    if (portfolioImages.length + newImages.length >= 50) {
        setHasMorePortfolio(false);
    }
  };

  // Load More Reviews
  const loadMoreReviews = async () => {
    if (isReviewsLoading) return;
    setIsReviewsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    const newReviews: Review[] = Array.from({ length: 10 }).map((_, i) => {
        const index = reviewsList.length + i;
        const template = REVIEW_TEMPLATES[index % REVIEW_TEMPLATES.length];
        
        return {
            id: index + 100, // Offset ID
            user: template.user || "Anonymous",
            avatar: template.avatar || "",
            rating: template.rating || 5,
            date: "Oct 21, 2025",
            title: template.title,
            content: template.content || "Great service!",
            verified: template.verified || false,
            reply: template.reply,
            photos: template.photos
        };
    });

    setReviewsList(prev => [...prev, ...newReviews]);
    setIsReviewsLoading(false);

    if (reviewsList.length + newReviews.length >= 40) {
        setHasMoreReviews(false);
    }
  };

  const handleOpenGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`;
    window.open(url, '_blank');
    setIsMapDrawerOpen(false);
  };

  const handleOpenAppleMaps = () => {
    const url = `https://maps.apple.com/?q=${encodeURIComponent(store.address)}`;
    window.open(url, '_blank');
    setIsMapDrawerOpen(false);
  };

  const handleCall = () => {
    window.location.href = "tel:(413)381-8496";
    setIsCallDrawerOpen(false);
  };

  const handleBookingClick = (service: Service) => {
    setSelectedServices(prev => {
      const isSelected = prev.find(s => s.id === service.id);
      if (isSelected) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const calculateTotals = () => {
    const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
    const totalMinutes = selectedServices.reduce((sum, s) => {
      const mins = parseInt(s.duration.replace('m', '')) || 0;
      return sum + mins;
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return { totalPrice, durationStr, totalMinutes };
  };

  const handleConfirmBooking = () => {
    // Mock booking logic
    const { totalPrice, durationStr } = calculateTotals();
    const bookingData = {
      id: Math.random().toString(36).substr(2, 9),
      services: selectedServices,
      totalPrice,
      totalDuration: durationStr,
      staff: selectedStaff || { name: 'Any Professional' },
      store: store,
      date: selectedDate,
      time: selectedTime,
    };

    setIsBooked(true);
    setTimeout(() => {
        setIsBooked(false);
        onBookingComplete?.(bookingData);
        setSelectedTime(null);
    }, 2500);
  };

  const timeSlots = ["09:00", "09:30", "10:00", "11:00", "13:30", "14:00", "15:30", "16:00"];

  const MOCK_STAFF = [
    { id: '1', name: 'Linda', role: 'Senior Artist', rating: 4.9, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100' },
    { id: '2', name: 'Sarah', role: 'Nail Technician', rating: 4.8, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100' },
    { id: '3', name: 'Jessica', role: 'Master Stylist', rating: 5.0, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100' },
    { id: '4', name: 'Amy', role: 'Artist', rating: 4.7, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=100' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black animate-in slide-in-from-right duration-500 pb-32">
      {/* Header */}
      <div className="bg-black/95 backdrop-blur-md text-white px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] sticky top-0 z-20 border-b border-[#333]">
        <div className="relative flex items-center">
          <button 
            onClick={onBack}
            className="absolute left-0 w-8 h-8 flex items-center justify-center rounded-full bg-[#1a1a1a] hover:bg-[#333] transition-colors z-30"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          
          <div className="pl-12">
            <p className="text-[#D4AF37] text-[10px] font-bold tracking-[0.2em] uppercase mb-0.5 opacity-90">Step 02</p>
            <h1 className="text-xl font-bold text-white tracking-tight">Book Services</h1>
          </div>
        </div>
      </div>

      {/* Store Hero (Carousel) */}
      <div className="relative w-full bg-gray-900 mb-6">
        <Carousel 
          setApi={setApi} 
          className="w-full" 
          opts={{ loop: true }}
        >
          <CarouselContent className="ml-0">
            {galleryImages.map((src, index) => (
              <CarouselItem key={index} className="pl-0 basis-full">
                <div className="relative w-full h-56">
                  <img 
                    src={src} 
                    alt={`${store.name} image ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute bottom-4 right-4 flex gap-1.5 z-20">
          {galleryImages.map((_, index) => (
            <div 
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === current ? 'w-4 bg-[#D4AF37]' : 'w-1.5 bg-white/50'
              }`} 
            />
          ))}
        </div>
      </div>

      {/* Store Info */}
      <div className="px-4 mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">{store.name}</h2>
        <p className="text-gray-300 text-sm mb-3">{store.address}</p>
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
          <span className="text-white font-bold">{store.rating}</span>
          <span className="text-[#D4AF37] text-sm">({store.reviewCount} reviews)</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 px-4 border-b border-[#333] overflow-x-auto hide-scrollbar mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase() as 'services' | 'reviews' | 'portfolio' | 'details')}
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors relative whitespace-nowrap ${
              activeTab === tab.toLowerCase() ? 'text-white' : 'text-gray-500'
            }`}
          >
            {tab}
            {activeTab === tab.toLowerCase() && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4 min-h-[400px]">
        
        {/* SERVICES TAB */}
        {activeTab === 'services' && (
          <div className="space-y-4 animate-in fade-in">
            {MOCK_SERVICES.map((service) => {
              const isSelected = selectedServices.some(s => s.id === service.id);
              return (
                <div 
                  key={service.id} 
                  onClick={() => handleBookingClick(service)}
                  className={`flex items-center justify-between py-5 border-b border-[#333] last:border-0 cursor-pointer group transition-all duration-300 ${isSelected ? 'bg-[#D4AF37]/5 -mx-4 px-4' : ''}`}
                >
                  <div className="flex-1 pr-4">
                    <h3 className={`font-bold text-base mb-1 transition-colors duration-300 ${isSelected ? 'text-[#D4AF37]' : 'text-white'}`}>
                      {service.name}
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="text-white font-black text-sm">${service.price.toFixed(2)}+</div>
                      <div className="w-1 h-1 rounded-full bg-gray-700" />
                      <div className="text-gray-500 text-xs font-medium tracking-wide">{service.duration}</div>
                    </div>
                    {service.description && (
                      <p className="text-gray-500 text-[11px] mt-1.5 leading-relaxed line-clamp-1">{service.description}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <button 
                      className={`h-10 px-6 rounded-lg font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                        isSelected 
                          ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                          : 'bg-transparent border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          Added
                        </>
                      ) : (
                        'Add'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* REVIEWS TAB */}
        {activeTab === 'reviews' && (
          <div className="animate-in fade-in duration-300">
            {/* Rating Summary Card */}
            <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 mb-6">
              <div className="flex gap-6">
                <div className="flex flex-col items-center justify-center border-r border-[#333] pr-6">
                    <div className="text-5xl font-bold text-white mb-2">5.0<span className="text-lg text-gray-500 font-normal">/5</span></div>
                    <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                        ))}
                    </div>
                    <div className="text-xs text-gray-400">13 reviews</div>
                </div>
                
                <div className="flex-1 flex flex-col justify-center gap-1.5">
                    {[5, 4, 3, 2, 1].map((num) => (
                        <div key={num} className="flex items-center gap-3 text-xs">
                            <span className="text-gray-400 w-2">{num}</span>
                            <Progress 
                                value={num === 5 ? 100 : 0} 
                                className="h-1.5 bg-[#333]" 
                                indicatorClassName="bg-[#D4AF37]"
                            />
                            <span className="text-gray-400 w-4 text-right">{num === 5 ? 13 : 0}</span>
                        </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-8">
                <div className="text-xs text-gray-500 leading-relaxed mb-6">
                    Verified reviews ensure that feedback is provided by actual customers who have completed a service with this provider.
                </div>

                {reviewsList.length === 0 && isReviewsLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
                    </div>
                ) : (
                    <>
                        {reviewsList.map((review) => (
                            <div key={review.id} className="border-b border-[#333] pb-8 last:border-0">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <img src={review.avatar} alt={review.user} className="w-10 h-10 rounded-full object-cover bg-gray-800" />
                                        <div>
                                            <div className="flex items-center gap-1 mb-0.5">
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <Star 
                                                        key={i} 
                                                        className={`w-3 h-3 ${i <= review.rating ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-gray-600'}`} 
                                                    />
                                                ))}
                                            </div>
                                            <div className="text-xs text-gray-500">{review.date}</div>
                                        </div>
                                    </div>
                                    
                                    {review.verified && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-medium text-[#D4AF37]">Verified User</span>
                                            <div className="w-4 h-4 rounded-full bg-[#D4AF37] flex items-center justify-center">
                                                <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {review.title && <h4 className="text-white font-bold mb-2">{review.title}</h4>}
                                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                                    {review.content}
                                </p>

                                {review.photos && review.photos.length > 0 && (
                                    <div className="flex gap-2 mb-4">
                                        {review.photos.map((photo, index) => (
                                            <img key={index} src={photo} alt="Review attachment" className="w-20 h-20 rounded-lg object-cover border border-[#333]" />
                                        ))}
                                    </div>
                                )}

                                {review.reply && (
                                    <div className="bg-[#222] rounded-lg p-4 mt-4 border border-[#333]">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-white font-bold text-sm">{review.reply.user}</span>
                                            <span className="text-xs text-gray-500">Replied: {review.reply.date}</span>
                                        </div>
                                        <p className="text-gray-400 text-xs">
                                            {review.reply.content}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                )}

                 {/* Load More Trigger & Loader */}
                 <div ref={observerTarget} className="py-8 flex justify-center">
                    {isReviewsLoading && reviewsList.length > 0 && (
                        <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-widest">
                             <Loader2 className="w-4 h-4 animate-spin" />
                             Loading Reviews
                        </div>
                    )}
                 </div>
            </div>
          </div>
        )}
        
        {/* PORTFOLIO TAB */}
        {activeTab === 'portfolio' && (
            <div className="animate-in fade-in duration-300 -mx-2">
                 {portfolioImages.length > 0 ? (
                    <Masonry columnsCount={2} gutter="8px">
                        {portfolioImages.map((src, index) => (
                            <div key={index} className="relative group cursor-pointer overflow-hidden rounded-xl bg-gray-900 border border-[#333]">
                                <img 
                                    src={src} 
                                    alt={`Portfolio ${index}`} 
                                    className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                        ))}
                    </Masonry>
                 ) : (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
                    </div>
                 )}

                 {/* Load More Trigger & Loader */}
                 <div ref={observerTarget} className="py-8 flex justify-center">
                    {isPortfolioLoading && portfolioImages.length > 0 && (
                        <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-widest">
                             <Loader2 className="w-4 h-4 animate-spin" />
                             Loading
                        </div>
                    )}
                 </div>
            </div>
        )}

        {/* DETAILS TAB */}
        {activeTab === 'details' && (
            <div className="animate-in fade-in duration-300 space-y-8 pb-10">
                {/* Map Section */}
                <div className="relative rounded-xl overflow-hidden border border-[#333] bg-[#1a1a1a]">
                    {/* Map Image */}
                    <div className="h-64 w-full relative">
                        <img 
                            src="https://images.unsplash.com/photo-1664044056437-6330bcf8e2fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwc3RyZWV0JTIwbWFwJTIwZ3JhcGhpYyUyMHRvcCUyMHZpZXd8ZW58MXx8fHwxNzY1OTM3MzkzfDA&ixlib=rb-4.1.0&q=80&w=1080" 
                            className="w-full h-full object-cover opacity-80" 
                            alt="Map View"
                        />
                        {/* Center Pin */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <MapPin className="w-10 h-10 text-black fill-[#D4AF37]" strokeWidth={1.5} />
                        </div>
                    </div>
                    
                    {/* Floating Info Card */}
                    <div className="absolute bottom-4 left-4 right-4 bg-[#1a1a1a]/95 backdrop-blur-md border border-[#333] p-3 rounded-xl shadow-2xl flex items-center gap-3">
                         <div className="w-12 h-12 rounded-full border border-[#333] overflow-hidden flex-shrink-0 bg-black">
                             <img src={store.coverImage} className="w-full h-full object-cover" alt="Store Logo" />
                         </div>
                         <div className="flex-1 min-w-0">
                             <h3 className="font-bold text-white text-sm truncate">{store.name}</h3>
                             <p className="text-xs text-gray-400 truncate">{store.address}</p>
                         </div>
                         <div className="pl-3 border-l border-[#333]">
                             <button 
                                onClick={() => setIsMapDrawerOpen(true)}
                                className="w-10 h-10 flex items-center justify-center text-[#D4AF37] hover:bg-[#333] rounded-lg transition-colors"
                             >
                                 <Navigation className="w-6 h-6 rotate-45" />
                             </button>
                         </div>
                    </div>
                </div>

                {/* Contact & Hours */}
                <div>
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Contact & Business Hours</h3>
                    
                    <div className="space-y-4">
                        {/* Hours */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-gray-300 text-sm">Today</span>
                                <span className="text-white font-bold text-sm">09:15 - 18:00</span>
                            </div>
                            <button 
                                onClick={() => setShowFullHours(!showFullHours)}
                                className="flex items-center gap-1 text-[#D4AF37] text-sm font-medium hover:opacity-80 transition-opacity"
                            >
                                Show full week
                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showFullHours ? 'rotate-180' : ''}`} />
                            </button>
                            
                            <AnimatePresence>
                                {showFullHours && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-4 space-y-2 pl-4 border-l border-[#333] text-sm">
                                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                                                <div key={day} className="flex justify-between">
                                                    <span className="text-gray-400">{day}</span>
                                                    <span className="text-gray-300">09:15 - 18:00</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between text-gray-500">
                                                <span>Saturday</span>
                                                <span>10:00 - 16:00</span>
                                            </div>
                                            <div className="flex justify-between text-red-400">
                                                <span>Sunday</span>
                                                <span>Closed</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="h-px bg-[#333] my-4" />

                        {/* Phone */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Phone className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                                <span className="text-white font-medium text-lg tracking-wide">(413) 381-8496</span>
                            </div>
                            <button 
                                onClick={() => setIsCallDrawerOpen(true)}
                                className="px-5 py-2 border border-[#333] text-white font-medium rounded-lg text-sm hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] transition-all"
                            >
                                Call
                            </button>
                        </div>
                    </div>
                </div>

                {/* Social Media */}
                <div>
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Social Media & Share</h3>
                    <div className="flex flex-col items-center justify-center gap-2">
                        <button className="w-14 h-14 rounded-full bg-[#222] border border-[#333] flex items-center justify-center text-white hover:text-[#D4AF37] hover:border-[#D4AF37] hover:scale-105 transition-all shadow-lg">
                            <Instagram className="w-7 h-7" />
                        </button>
                        <span className="text-xs text-gray-500 font-medium">Instagram</span>
                    </div>
                </div>

                {/* Report */}
                <div className="border-t border-[#333] pt-4 mt-8">
                    <button className="w-full flex items-center justify-between py-2 text-gray-400 hover:text-white transition-colors group">
                        <span className="text-base group-hover:text-red-400 transition-colors">Report</span>
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white" />
                    </button>
                </div>
            </div>
        )}

      </div>

      {/* Sticky Summary Bar */}
      {selectedServices.length > 0 && activeTab === 'services' && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-black/95 backdrop-blur-md border-t border-[#333] px-6 py-5 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1">
                {selectedServices.length} {selectedServices.length === 1 ? 'Service' : 'Services'} Selected
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-white font-bold">
                  <span className="text-xl">${calculateTotals().totalPrice.toFixed(2)}</span>
                  <span className="text-xs text-gray-500 font-normal">Est. Total</span>
                </div>
                <div className="w-px h-4 bg-[#333]" />
                <div className="flex items-center gap-1.5 text-gray-300">
                  <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span className="text-sm">{calculateTotals().durationStr}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsBookingDrawerOpen(true)}
              className="bg-[#D4AF37] text-black font-bold px-8 py-3 rounded-full hover:bg-[#b5952f] transition-all active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
            >
              Continue
            </button>
          </div>
        </motion.div>
      )}

      {/* Map Selection Drawer */}
      <Drawer open={isMapDrawerOpen} onOpenChange={setIsMapDrawerOpen}>
        <DrawerContent className="bg-[#121212] border-t border-[#333] text-white pb-8">
            <div className="mx-auto w-12 h-1.5 bg-[#333] rounded-full mt-3 mb-6" />
            <DrawerHeader className="pb-6">
                <DrawerTitle className="text-center text-xl font-bold tracking-tight">Open in Maps</DrawerTitle>
                <DrawerDescription className="sr-only">Choose your preferred map application to navigate to the salon.</DrawerDescription>
            </DrawerHeader>
            <div className="px-6 space-y-3">
                <button 
                    onClick={handleOpenGoogleMaps}
                    className="w-full py-4 px-6 bg-[#1a1a1a] border border-[#333] rounded-2xl flex items-center justify-between hover:bg-[#222] transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                            <img src="https://www.google.com/images/branding/product/ico/maps15_64dp.ico" className="w-6 h-6" alt="Google Maps" />
                        </div>
                        <span className="font-bold text-lg">Google Maps</span>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-[#D4AF37] transition-colors" />
                </button>
                
                <button 
                    onClick={handleOpenAppleMaps}
                    className="w-full py-4 px-6 bg-[#1a1a1a] border border-[#333] rounded-2xl flex items-center justify-between hover:bg-[#222] transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.24-1.99 1.1-3.15-1.04.04-2.3.69-3.05 1.56-.67.77-1.26 1.96-1.1 3.08 1.14.09 2.3-.6 3.05-1.49z"/>
                            </svg>
                        </div>
                        <span className="font-bold text-lg">Apple Maps</span>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-[#D4AF37] transition-colors" />
                </button>
            </div>
            <DrawerFooter className="pt-6">
                <DrawerClose asChild>
                    <button className="w-full py-4 font-bold text-gray-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                </DrawerClose>
            </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Call Confirmation Drawer */}
      <Drawer open={isCallDrawerOpen} onOpenChange={setIsCallDrawerOpen}>
        <DrawerContent className="bg-[#121212] border-t border-[#333] text-white pb-8">
            <div className="mx-auto w-12 h-1.5 bg-[#333] rounded-full mt-3 mb-6" />
            <DrawerHeader className="pb-2">
                <DrawerTitle className="text-center text-xl font-bold tracking-tight">Confirm Call</DrawerTitle>
                <DrawerDescription className="sr-only">Confirm if you would like to call the salon directly.</DrawerDescription>
            </DrawerHeader>
            <div className="px-6 text-center mb-8">
                <p className="text-gray-400 mb-6">Would you like to call the salon directly?</p>
                <div className="text-2xl font-bold text-white tracking-wider mb-2">(413) 381-8496</div>
            </div>
            <div className="px-6 flex flex-col gap-3">
                <button 
                    onClick={handleCall}
                    className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-[#b5952f] transition-all"
                >
                    <Phone className="w-5 h-5 fill-black" />
                    Call Now
                </button>
                <DrawerClose asChild>
                    <button className="w-full py-4 bg-[#1a1a1a] border border-[#333] text-white font-bold rounded-2xl hover:bg-[#222] transition-colors">
                        Cancel
                    </button>
                </DrawerClose>
            </div>
        </DrawerContent>
      </Drawer>

      {/* Booking Drawer */}
      <Drawer open={isBookingDrawerOpen} onOpenChange={setIsBookingDrawerOpen}>
        <DrawerContent className="bg-[#121212] border-t border-[#333] text-white max-h-[90vh]">
            <div className="mx-auto w-12 h-1.5 bg-[#333] rounded-full mt-3 mb-6" />
            <div className="overflow-y-auto px-6 pb-8">
                {isBooked ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                        <DrawerDescription className="sr-only">Your appointment has been successfully booked.</DrawerDescription>
                        <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mb-6 border border-[#D4AF37]/20">
                            <CheckCircle2 className="w-12 h-12 text-[#D4AF37]" />
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Appointment Set!</h2>
                        <p className="text-gray-400 max-w-[240px] mb-8">We've sent a confirmation to your app notifications.</p>
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-4 w-full">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-gray-500 text-sm">Services</span>
                                <div className="text-right">
                                  {selectedServices.map(s => (
                                    <div key={s.id} className="text-white font-bold text-sm">{s.name}</div>
                                  ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-500 text-sm">Total</span>
                                <span className="text-[#D4AF37] font-bold">${calculateTotals().totalPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Time</span>
                                <span className="text-white font-bold">{selectedDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {selectedTime}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <DrawerHeader className="px-0 pt-0 pb-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest">Service Selection</p>
                                        <div className="px-2 py-0.5 bg-[#D4AF37] text-black rounded text-[9px] font-black uppercase shadow-[0_0_10px_rgba(212,175,55,0.3)] animate-pulse">No Deposit Needed</div>
                                    </div>
                                    <DrawerTitle className="text-2xl font-bold">
                                      {selectedServices.length > 1 
                                        ? `${selectedServices[0].name} +${selectedServices.length - 1}` 
                                        : selectedServices[0]?.name}
                                    </DrawerTitle>
                                    <DrawerDescription className="sr-only">
                                      Confirm your appointment details for the selected services.
                                    </DrawerDescription>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {selectedServices.map(s => (
                                        <span key={s.id} className="text-[10px] bg-[#1a1a1a] text-gray-400 px-1.5 py-0.5 rounded border border-[#333]">
                                          {s.name}
                                        </span>
                                      ))}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-white">${calculateTotals().totalPrice.toFixed(2)}</div>
                                    <div className="text-xs text-gray-500">{calculateTotals().durationStr}</div>
                                </div>
                            </div>
                        </DrawerHeader>

                        <div className="space-y-8 animate-in slide-in-from-bottom duration-500 pb-12">
                            {/* Step 1: Select Date */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Select Date</h3>
                                <div className="bg-[#1a1a1a] rounded-2xl border border-[#333] p-2">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        className="text-white"
                                        classNames={{
                                            day_selected: "bg-[#D4AF37] text-black hover:bg-[#D4AF37] hover:text-black focus:bg-[#D4AF37] focus:text-black",
                                            day_today: "text-[#D4AF37] font-bold border border-[#D4AF37]/30",
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Step 2: Select Time */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Select Time</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {timeSlots.map((time) => (
                                        <button
                                            key={time}
                                            onClick={() => setSelectedTime(time)}
                                            className={`py-3 rounded-xl border font-medium text-sm transition-all ${
                                                selectedTime === time 
                                                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black' 
                                                    : 'bg-[#1a1a1a] border-[#333] text-gray-300 hover:border-[#D4AF37]/50'
                                            }`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Step 3: Select Professional */}
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Select Professional</h3>
                                <span className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded">Optional</span>
                              </div>
                              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
                                <button 
                                  onClick={() => setSelectedStaff(null)}
                                  className={`flex-shrink-0 flex flex-col items-center gap-2 group`}
                                >
                                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all ${!selectedStaff ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#333] bg-[#1a1a1a]'}`}>
                                    <User className={`w-8 h-8 ${!selectedStaff ? 'text-[#D4AF37]' : 'text-gray-500'}`} />
                                  </div>
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${!selectedStaff ? 'text-[#D4AF37]' : 'text-gray-500'}`}>Any</span>
                                </button>
                                {MOCK_STAFF.map((staff) => (
                                  <button 
                                    key={staff.id}
                                    onClick={() => setSelectedStaff(staff)}
                                    className="flex-shrink-0 flex flex-col items-center gap-2"
                                  >
                                    <div className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${selectedStaff?.id === staff.id ? 'border-[#D4AF37] scale-105' : 'border-transparent'}`}>
                                      <img src={staff.avatar} alt={staff.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="text-center">
                                      <span className={`text-[10px] font-bold block ${selectedStaff?.id === staff.id ? 'text-[#D4AF37]' : 'text-gray-300'}`}>{staff.name}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Staff Info Row (Integrated Summary) */}
                            <div className="flex items-center justify-between py-3 border-b border-[#D4AF37]/10">
                                <span className="text-gray-400 text-xs">Professional</span>
                                <div className="flex items-center gap-2">
                                    {selectedStaff ? (
                                        <>
                                            <span className="text-white text-sm font-medium">{selectedStaff.name}</span>
                                            <img src={selectedStaff.avatar} alt="" className="w-5 h-5 rounded-full object-cover border border-[#D4AF37]/30" />
                                        </>
                                    ) : (
                                        <span className="text-white text-sm font-medium">Any Professional</span>
                                    )}
                                </div>
                            </div>

                            {/* Payment Info Card (Optimization) */}
                            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#252525] border border-[#D4AF37]/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 blur-2xl rounded-full -mr-8 -mt-8 group-hover:bg-[#D4AF37]/10 transition-colors" />
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0 border border-[#D4AF37]/20">
                                        <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                                            Pay at Salon
                                            <span className="text-[10px] text-[#D4AF37] font-normal px-1.5 py-0.5 border border-[#D4AF37]/30 rounded">Safe & Secure</span>
                                        </h4>
                                        <p className="text-gray-400 text-xs leading-relaxed">
                                            Your appointment is secured instantly. No prepayment or deposit is required today. Just show up and pay after your service.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-3 pt-4 border-t border-[#333]">
                                    <div className="flex -space-x-2">
                                        <div className="w-6 h-6 rounded-full border border-black bg-gray-800 flex items-center justify-center"><CreditCard className="w-3 h-3 text-gray-400" /></div>
                                        <div className="w-6 h-6 rounded-full border border-black bg-gray-800 flex items-center justify-center text-[10px] font-bold text-white">C</div>
                                        <div className="w-6 h-6 rounded-full border border-black bg-gray-800 flex items-center justify-center text-[10px] font-bold text-white">A</div>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-medium italic">Accepted: Credit Card, Apple Pay, Cash</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 flex flex-col gap-3">
                            <button 
                                onClick={handleConfirmBooking}
                                disabled={!selectedTime || !selectedDate}
                                className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#b5952f] text-black font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale shadow-[0_10px_30px_rgba(212,175,55,0.2)] flex items-center justify-center gap-2"
                            >
                                <Zap className="w-4 h-4 fill-black" />
                                Confirm Appointment
                            </button>
                            <DrawerClose asChild>
                                <button className="w-full py-4 text-gray-400 font-bold hover:text-white transition-colors">
                                    Change Service
                                </button>
                            </DrawerClose>
                        </div>
                    </>
                )}
            </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}