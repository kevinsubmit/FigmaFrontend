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
  Calendar as CalendarIcon, 
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
  Navigation,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
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
import { Calendar } from "./ui/calendar";  // Calendar component
import { getServicesByStoreId, Service as APIService } from '../services/services.service';
import { Store as APIStore } from '../services/stores.service';
import { createAppointment, getMyAppointments } from '../services/appointments.service';
import { getStorePortfolio, PortfolioItem } from '../services/store-portfolio.service';
import StoreReviews from './StoreReviews';
import { Pin } from '../api/pins';
import { getStoreRating, StoreRating } from '../api/reviews';
import { getAvailableSlots, getTechniciansByStore, Technician } from '../api/technicians';
import {
  addStoreToFavorites,
  checkIfStoreFavorited,
  getStoreHours,
  getStoreImages,
  removeStoreFromFavorites,
  StoreHours,
  StoreImage,
} from '../api/stores';

const formatLocalDateYYYYMMDD = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Use the Store type from stores.service
type Store = APIStore;

// Use the Service type from services.service, but adapt it for UI
interface Service {
  id: number;
  name: string;
  price: number;
  duration: string;
  description?: string;
  category?: string;
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

// MOCK_SERVICES removed - now fetched from API

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

const PORTFOLIO_PAGE_SIZE = 20;

const TABS = ['Services', 'Reviews', 'Portfolio', 'Details'];

interface StoreDetailsProps {
  store: Store;
  onBack: () => void;
  onBookingComplete?: (booking: any) => void;
  referencePin?: Pin;
  showDistance?: boolean;
}

export function StoreDetails({ store, onBack, onBookingComplete, referencePin, showDistance = false }: StoreDetailsProps) {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Technician | null>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'reviews' | 'portfolio' | 'details'>('services');
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  
  // Services State
  const [services, setServices] = useState<Service[]>([]);
  const [isServicesLoading, setIsServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  
  // Booking State
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  
  // Modals/Drawers State
  const [isMapDrawerOpen, setIsMapDrawerOpen] = useState(false);
  const [isCallDrawerOpen, setIsCallDrawerOpen] = useState(false);
  const [isBookingDrawerOpen, setIsBookingDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooked, setIsBooked] = useState(false);

  // Portfolio State
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(false);
  const [hasMorePortfolio, setHasMorePortfolio] = useState(true);
  const [portfolioSkip, setPortfolioSkip] = useState(0);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  // Reviews State
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);
  const [storeRating, setStoreRating] = useState<StoreRating | null>(null);

  // Details State
  const [showFullHours, setShowFullHours] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsHint, setSlotsHint] = useState<string>('Times are based on store hours and staff availability.');
  const [storeHours, setStoreHours] = useState<StoreHours[]>([]);
  const [isStoreHoursLoading, setIsStoreHoursLoading] = useState(false);
  const [isStoreFavorited, setIsStoreFavorited] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [storefrontImages, setStorefrontImages] = useState<StoreImage[]>(store.images || []);

  // Shared Observer Target
  const observerTarget = useRef(null);

  const resolveStoreImageUrl = (url?: string | null): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Combine cover image and thumbnails for the gallery (match Services cards)
  const getPrimaryImage = (): string => {
    if (storefrontImages && storefrontImages.length > 0) {
      const primaryImage = storefrontImages.find((img) => img.is_primary === 1);
      const raw = primaryImage?.image_url || storefrontImages[0].image_url;
      return resolveStoreImageUrl(raw);
    }
    return 'https://images.unsplash.com/photo-1619607146034-5a05296c8f9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
  };

  const fallbackThumbnails = [
    'https://images.unsplash.com/photo-1673985402265-46c4d2e53982?w=400&q=80',
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80',
    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&q=80',
    'https://images.unsplash.com/photo-1519017713917-9807534d0b0b?w=400&q=80',
  ];

  const getThumbnailImages = (): string[] => {
    if (storefrontImages && storefrontImages.length > 1) {
      return storefrontImages
        .filter((img) => img.is_primary !== 1)
        .sort((a, b) => a.display_order - b.display_order)
        .slice(0, 4)
        .map((img) => resolveStoreImageUrl(img.image_url));
    }
    return fallbackThumbnails;
  };

  const getAllImages = (): string[] => {
    const primary = getPrimaryImage();
    const thumbnails = getThumbnailImages();
    return Array.from(new Set([primary, ...thumbnails]));
  };

  useEffect(() => {
    setStorefrontImages(store.images || []);
  }, [store.id, store.images]);

  useEffect(() => {
    getStoreImages(store.id)
      .then((rows) => {
        if (rows.length > 0) {
          setStorefrontImages(rows);
        }
      })
      .catch((error) => {
        console.error('Failed to load store images:', error);
      });
  }, [store.id]);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      setIsStoreFavorited(false);
      return;
    }
    checkIfStoreFavorited(store.id, token)
      .then((result) => setIsStoreFavorited(result.is_favorited))
      .catch((error) => {
        console.error('Failed to check store favorite:', error);
        setIsStoreFavorited(false);
      });
  }, [store.id]);

  const handleToggleFavorite = async () => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
      toast.error('Please sign in to save favorites', { duration: 1200 });
      return;
    }
    try {
      setIsFavoriteLoading(true);
      if (isStoreFavorited) {
        await removeStoreFromFavorites(store.id, token);
        setIsStoreFavorited(false);
        toast.success('Removed from favorites', { duration: 1200 });
      } else {
        await addStoreToFavorites(store.id, token);
        setIsStoreFavorited(true);
        toast.success('Added to favorites', { duration: 1200 });
      }
    } catch (error) {
      console.error('Failed to toggle store favorite:', error);
      toast.error('Failed to update favorites', { duration: 1200 });
    } finally {
      setIsFavoriteLoading(false);
    }
  };
  
  const galleryImages = getAllImages();

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

  // Load services from API
  useEffect(() => {
    const loadServices = async () => {
      try {
        setIsServicesLoading(true);
        const apiServices = await getServicesByStoreId(store.id);
        // Convert API services to UI format
        const uiServices: Service[] = apiServices.map(s => ({
          id: s.id,
          name: s.name,
          price: s.price,
          duration: `${s.duration_minutes}m`,
          description: s.description || undefined,
          category: s.category || undefined
        }));
        setServices(uiServices);
        setServicesError(null);
      } catch (err) {
        console.error('Failed to load services:', err);
        setServicesError('Failed to load services');
      } finally {
        setIsServicesLoading(false);
      }
    };

    loadServices();
  }, [store.id]);

  useEffect(() => {
    if (!store?.id) return;
    getStoreRating(store.id)
      .then(setStoreRating)
      .catch((error) => {
        console.error('Failed to load store rating:', error);
        setStoreRating(null);
      });
  }, [store?.id]);

  // Initial Data Load on Tab Change
  useEffect(() => {
    if (activeTab === 'portfolio') {
      setPortfolioItems([]);
      setPortfolioSkip(0);
      setHasMorePortfolio(true);
      setPortfolioError(null);
      loadPortfolioPage(0, true);
    } else if (activeTab === 'reviews' && reviewsList.length === 0) {
      loadMoreReviews();
    }
  }, [activeTab, store.id]);

  // Infinite Scroll Observer (Shared Logic)
  useEffect(() => {
    const isReviews = activeTab === 'reviews';
    
    // Only run for reviews infinite scroll
    if (!isReviews) return;

    const isLoading = isReviewsLoading;
    const hasMore = hasMoreReviews;
    const loadFunction = loadMoreReviews;

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
  }, [activeTab, hasMoreReviews, isReviewsLoading]);

  const loadPortfolioPage = async (skip: number, replace: boolean = false) => {
    if (isPortfolioLoading) return;
    setIsPortfolioLoading(true);

    try {
      const items = await getStorePortfolio(store.id, skip, PORTFOLIO_PAGE_SIZE);
      setPortfolioError(null);
      if (replace) {
        setPortfolioItems(items);
      } else {
        setPortfolioItems(prev => [...prev, ...items]);
      }
      setPortfolioSkip(skip + items.length);
      setHasMorePortfolio(items.length === PORTFOLIO_PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      setPortfolioError('Unable to load portfolio images.');
      setHasMorePortfolio(false);
    } finally {
      setIsPortfolioLoading(false);
    }
  };

  const loadMorePortfolio = async () => {
    await loadPortfolioPage(portfolioSkip);
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
    if (!store.phone) {
      return;
    }
    window.location.href = `tel:${store.phone}`;
    setIsCallDrawerOpen(false);
  };

  const formatTime = (timeString?: string | null) => {
    if (!timeString) return 'Closed';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    if (Number.isNaN(hour)) return timeString;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const parseOpeningHoursFallback = useCallback((): StoreHours[] => {
    if (!store.opening_hours) return [];

    const normalized: StoreHours[] = [];
    const dayKeyToIndex: Record<string, number> = {
      mon: 0,
      tue: 1,
      wed: 2,
      thu: 3,
      fri: 4,
      sat: 5,
      sun: 6,
    };

    try {
      const parsed = JSON.parse(store.opening_hours);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.entries(parsed as Record<string, string>).forEach(([key, value]) => {
          const dayIndex = dayKeyToIndex[key.toLowerCase()];
          if (dayIndex === undefined) return;

          if (!value || value.toLowerCase() === 'closed') {
            normalized.push({
              id: -1000 - dayIndex,
              store_id: store.id,
              day_of_week: dayIndex,
              open_time: '00:00',
              close_time: '00:00',
              is_closed: true,
            });
            return;
          }

          const [openRaw, closeRaw] = value.split('-');
          if (!openRaw || !closeRaw) return;
          normalized.push({
            id: -1000 - dayIndex,
            store_id: store.id,
            day_of_week: dayIndex,
            open_time: openRaw.trim(),
            close_time: closeRaw.trim(),
            is_closed: false,
          });
        });
        return normalized.sort((a, b) => a.day_of_week - b.day_of_week);
      }
    } catch {
      // fallback to legacy text format below
    }

    const legacy = store.opening_hours.match(/^(.+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!legacy) return [];
    const daysPart = legacy[1].trim();
    const openTime = legacy[2];
    const closeTime = legacy[3];
    const dayTokenToIndex: Record<string, number> = {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6,
    };

    daysPart
      .split(',')
      .map((token) => token.trim())
      .forEach((token) => {
        const dayIndex = dayTokenToIndex[token];
        if (dayIndex === undefined) return;
        normalized.push({
          id: -2000 - dayIndex,
          store_id: store.id,
          day_of_week: dayIndex,
          open_time: openTime,
          close_time: closeTime,
          is_closed: false,
        });
      });
    return normalized.sort((a, b) => a.day_of_week - b.day_of_week);
  }, [store.id, store.opening_hours]);

  const effectiveStoreHours = useMemo(() => {
    if (storeHours.length > 0) return storeHours;
    return parseOpeningHoursFallback();
  }, [storeHours, parseOpeningHoursFallback]);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayIndex = (new Date().getDay() + 6) % 7;
  const todayHours = effectiveStoreHours.find((hour) => hour.day_of_week === todayIndex);

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

  const mapQuery = useMemo(() => {
    const parts = [store.name, store.address, store.city, store.state].filter(Boolean);
    return parts.join(' ').trim();
  }, [store.address, store.city, store.name, store.state]);

  const distanceInfo = useMemo(() => {
    if (store.distance === undefined || store.distance === null) {
      return null;
    }
    const miles = Number(store.distance);
    if (Number.isNaN(miles)) {
      return null;
    }
    const roundedMiles = Math.round(miles * 10) / 10;
    const driveMinutes = Math.max(1, Math.round(roundedMiles * 3));
    return { miles: roundedMiles, driveMinutes };
  }, [store.distance]);

  const openMaps = () => {
    if (!mapQuery) return;
    setIsMapDrawerOpen(true);
  };

  const notesPreview = useMemo(() => {
    const parts: string[] = [];
    if (selectedServices.length > 1) {
      parts.push(`Multiple services: ${selectedServices.map(s => s.name).join(', ')}`);
    }
    if (referencePin) {
      parts.push(`Reference look: ${referencePin.title} (Pin #${referencePin.id})`);
    }
    return parts.join(' | ');
  }, [selectedServices, referencePin]);

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime) return;
    
    try {
      setIsBooking(true);
      setBookingError(null);
      
      // Parse time string (e.g., "9:00 AM") to hours and minutes
      const [timeStr, period] = selectedTime.split(' ');
      const [hours, minutes] = timeStr.split(':').map(Number);
      let appointmentHours = hours;
      if (period === 'PM' && hours !== 12) {
        appointmentHours += 12;
      } else if (period === 'AM' && hours === 12) {
        appointmentHours = 0;
      }
      
      // Format date as YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const appointmentDate = `${year}-${month}-${day}`;
      
      // Format time as HH:MM:SS
      const appointmentTime = `${String(appointmentHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

      const selectedDateTime = new Date(selectedDate);
      selectedDateTime.setHours(appointmentHours, minutes, 0, 0);
      const now = new Date();
      if (selectedDateTime <= now) {
        setBookingError('Past time cannot be booked. Please choose a future time.');
        setIsBooking(false);
        return;
      }
      
      // Get first service ID (for now, we only support single service booking)
      const serviceId = selectedServices[0]?.id;
      if (!serviceId) {
        throw new Error('No service selected');
      }

      const existingAppointments = await getMyAppointments();
      const selectedDurationMinutes = parseDurationMinutes(selectedServices[0]?.duration || '');
      const selectedStartMinutes = parseTimeToMinutes(appointmentTime);
      const selectedEndMinutes = selectedStartMinutes + selectedDurationMinutes;

      const conflict = existingAppointments.find((apt) => {
        if (apt.status !== 'pending' && apt.status !== 'confirmed') return false;
        if (apt.appointment_date !== appointmentDate) return false;
        if (!apt.service_duration) return false;

        const existingStart = parseTimeToMinutes(apt.appointment_time);
        const existingEnd = existingStart + apt.service_duration;
        return selectedStartMinutes < existingEnd && selectedEndMinutes > existingStart;
      });

      if (conflict) {
        const existingStart = parseTimeToMinutes(conflict.appointment_time);
        const existingEnd = existingStart + (conflict.service_duration || 0);
        const suggestedHour = String(Math.floor(existingEnd / 60)).padStart(2, '0');
        const suggestedMinute = String(existingEnd % 60).padStart(2, '0');
        setBookingError(
          `You already have an appointment from ${conflict.appointment_time.slice(0, 5)} to ${suggestedHour}:${suggestedMinute}. Please choose a time after ${suggestedHour}:${suggestedMinute}.`
        );
        setIsBooking(false);
        return;
      }
      
      const notesParts: string[] = [];
      if (selectedServices.length > 1) {
        notesParts.push(`Multiple services: ${selectedServices.map(s => s.name).join(', ')}`);
      }
      if (referencePin) {
        notesParts.push(`Reference look: ${referencePin.title} (Pin #${referencePin.id})`);
      }

      const notes = notesParts.length > 0 ? notesParts.join(' | ') : undefined;

      // Call backend API
      const appointment = await createAppointment({
        store_id: store.id,
        service_id: serviceId,
        technician_id: selectedStaff?.id,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        notes
      });
      
      // Show success state
      setIsBooked(true);
      
      // Prepare booking data for callback
      const { totalPrice, durationStr } = calculateTotals();
      const bookingData = {
        id: appointment.id.toString(),
        services: selectedServices,
        totalPrice,
        totalDuration: durationStr,
        staff: selectedStaff || { name: 'Any Professional' },
        store: store,
        date: selectedDate,
        time: selectedTime,
        appointment: appointment
      };
      
      setTimeout(() => {
        setIsBooked(false);
        setIsBookingDrawerOpen(false);
        onBookingComplete?.(bookingData);
        // Reset selections
        setSelectedServices([]);
        setSelectedTime(null);
        setSelectedDate(new Date());
      }, 2500);
      
    } catch (err: any) {
      console.error('Booking failed:', err);
      setBookingError(err.response?.data?.detail || err.message || 'Failed to create appointment');
      setIsBooked(false);
    } finally {
      setIsBooking(false);
    }
  };

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const minSelectableDate = today;

  const selectedServiceId = selectedServices[0]?.id;
  const selectedServiceDuration = selectedServices[0]?.duration || '';
  const formattedSelectedDate = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : null;
  const selectedDateKey = formattedSelectedDate;

  const parseDurationMinutes = (duration: string) => {
    const minutes = parseInt(duration.replace('m', ''), 10);
    return Number.isNaN(minutes) ? 30 : minutes;
  };

  const parseTimeToMinutes = (time: string) => {
    const [hoursStr, minutesStr] = time.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    return hours * 60 + minutes;
  };

  const getStoreHoursForDate = (dateKey: string) => {
    const selectedDay = new Date(dateKey).getDay();
    const dayOfWeek = selectedDay === 0 ? 6 : selectedDay - 1;
    return effectiveStoreHours.find((hour) => hour.day_of_week === dayOfWeek) || null;
  };

  const buildSlotsFromStoreHours = (dateKey: string, durationMinutes: number) => {
    const hoursForDay = getStoreHoursForDate(dateKey);
    if (!hoursForDay || hoursForDay.is_closed) {
      return [];
    }

    const [openHour, openMinute] = hoursForDay.open_time.split(':').map(Number);
    const [closeHour, closeMinute] = hoursForDay.close_time.split(':').map(Number);
    const slotInterval = 30;

    const startTime = new Date(dateKey);
    startTime.setHours(openHour, openMinute, 0, 0);

    const endTime = new Date(dateKey);
    endTime.setHours(closeHour, closeMinute, 0, 0);

    const durationMs = durationMinutes * 60 * 1000;
    const slots: string[] = [];
    const cursor = new Date(startTime);

    while (cursor.getTime() + durationMs <= endTime.getTime()) {
      const hours = String(cursor.getHours()).padStart(2, '0');
      const minutes = String(cursor.getMinutes()).padStart(2, '0');
      slots.push(`${hours}:${minutes}`);
      cursor.setMinutes(cursor.getMinutes() + slotInterval);
    }

    return slots;
  };

  useEffect(() => {
    const cacheKey = `storeTechnicians:${store.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setTechnicians(parsed);
        }
      } catch (error) {
        console.error('Failed to parse cached technicians:', error);
      }
    }

    getTechniciansByStore(store.id)
      .then((data) => {
        setTechnicians(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      })
      .catch((error) => {
        console.error('Failed to load technicians:', error);
        if (!cached) {
          setTechnicians([]);
        }
      });
  }, [store.id]);

  useEffect(() => {
    setIsStoreHoursLoading(true);
    getStoreHours(store.id)
      .then(setStoreHours)
      .catch((error) => {
        console.error('Failed to load store hours:', error);
        setStoreHours([]);
      })
      .finally(() => setIsStoreHoursLoading(false));
  }, [store.id]);

  useEffect(() => {
    const loadAvailableSlots = async () => {
      if (!formattedSelectedDate || !selectedServiceId) {
        setAvailableSlots([]);
        return;
      }

      if (!isStoreHoursLoading) {
        const hoursForDay = getStoreHoursForDate(formattedSelectedDate);

        if (!hoursForDay) {
          setAvailableSlots([]);
          setSlotsError('Store hours are not configured for this date.');
          return;
        }

        if (hoursForDay.is_closed) {
          setAvailableSlots([]);
          setSlotsError('Store is closed on this date.');
          return;
        }
      }

      setIsSlotsLoading(true);
      setSlotsError(null);

      try {
        const durationMinutes = parseDurationMinutes(selectedServiceDuration);
        const technicianList = selectedStaff
          ? [selectedStaff]
          : technicians;

        if (technicianList.length === 0) {
          const storeSlots = buildSlotsFromStoreHours(formattedSelectedDate, durationMinutes);
          setAvailableSlots(storeSlots);
          setSlotsHint('Times are based on store hours. Staff selection is optional.');
          return;
        }

        const slotResults = await Promise.all(
          technicianList.map((tech) =>
            getAvailableSlots(tech.id, formattedSelectedDate, selectedServiceId).catch(() => [])
          )
        );

        const combinedSlots = new Set<string>();
        slotResults.flat().forEach((slot) => {
          combinedSlots.add(slot.start_time);
        });

        const sortedSlots = Array.from(combinedSlots).sort();

        if (formattedSelectedDate === formatLocalDateYYYYMMDD(new Date())) {
          const now = new Date();
          const minTime = new Date(now.getTime() + 30 * 60 * 1000);
          const filtered = sortedSlots.filter((time) => {
            const [hours, minutes] = time.split(':').map(Number);
            const slotTime = new Date(selectedDate!);
            slotTime.setHours(hours, minutes, 0, 0);
            return slotTime >= minTime;
          });
          setAvailableSlots(filtered);
        } else {
          setAvailableSlots(sortedSlots);
        }
        setSlotsHint('Times are based on store hours and staff availability.');
      } catch (error) {
        console.error('Failed to load available slots:', error);
        setAvailableSlots([]);
        setSlotsError('Unable to load available times. Please try again.');
      } finally {
        setIsSlotsLoading(false);
      }
    };

    loadAvailableSlots();
  }, [formattedSelectedDate, selectedServiceId, selectedStaff, technicians, selectedDate, effectiveStoreHours, isStoreHoursLoading, selectedServiceDuration]);

  useEffect(() => {
    if (selectedTime && !availableSlots.includes(selectedTime)) {
      setSelectedTime(null);
    }
  }, [selectedTime, availableSlots]);

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

        <button
          onClick={handleToggleFavorite}
          disabled={isFavoriteLoading}
          className={`absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
            isStoreFavorited
              ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
              : 'bg-black/60 border-white/20 text-white hover:border-[#D4AF37]'
          } ${isFavoriteLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <Heart className={`w-5 h-5 ${isStoreFavorited ? 'fill-black' : 'fill-transparent'}`} />
        </button>

        <div className="absolute bottom-4 right-4 flex gap-1.5 z-10">
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
          <span className="text-white font-bold">
            {((storeRating?.average_rating ?? store.rating) ?? null)?.toFixed(1) || 'N/A'}
          </span>
          <span className="text-[#D4AF37] text-sm">
            ({((storeRating?.total_reviews ?? store.review_count) ?? 0)} reviews)
          </span>
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
            {isServicesLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
              </div>
            ) : servicesError ? (
              <div className="text-center py-12 text-red-500">
                {servicesError}
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No services available
              </div>
            ) : (
              services.map((service) => {
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
            })
            )}
          </div>
        )}

        {/* REVIEWS TAB */}
        {activeTab === 'reviews' && (
          <div className="animate-in fade-in duration-300">
            <StoreReviews storeId={store.id} />
          </div>
        )}
        
        {/* PORTFOLIO TAB */}
        {activeTab === 'portfolio' && (
            <div className="animate-in fade-in duration-300 -mx-2">
                 {portfolioError ? (
                    <div className="text-center py-12 text-gray-500">
                        {portfolioError}
                    </div>
                 ) : portfolioItems.length > 0 ? (
                    <Masonry columnsCount={2} gutter="8px">
                        {portfolioItems.map((item, index) => (
                            <div key={item.id} className="relative group cursor-pointer overflow-hidden rounded-xl bg-gray-900 border border-[#333]">
                                <img 
                                    src={item.image_url.startsWith('http') ? item.image_url : `${apiBaseUrl}${item.image_url}`} 
                                    alt={item.title || `Portfolio ${index + 1}`} 
                                    className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
                                />
                                {item.title && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                                    <p className="text-white text-sm font-medium">{item.title}</p>
                                  </div>
                                )}
                            </div>
                        ))}
                    </Masonry>
                 ) : (
                    <div className="text-center py-12 text-gray-500">
                        No portfolio images yet
                    </div>
                 )}

                 <div className="py-8 flex flex-col items-center gap-3">
                    {isPortfolioLoading && portfolioItems.length > 0 && (
                        <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-widest">
                             <Loader2 className="w-4 h-4 animate-spin" />
                             Loading
                        </div>
                    )}
                    {!isPortfolioLoading && hasMorePortfolio && portfolioItems.length > 0 && (
                        <button
                          onClick={loadMorePortfolio}
                          className="rounded-full border border-[#D4AF37] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
                        >
                          Load more
                        </button>
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </div>
                    
                    {/* Floating Info Card */}
                    <div className="absolute bottom-4 left-4 right-4 bg-[#101010]/95 backdrop-blur-md border border-[#333] p-4 rounded-2xl shadow-2xl flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full border border-[#333] overflow-hidden flex-shrink-0 bg-black">
                                  <img src={getPrimaryImage()} className="w-full h-full object-cover" alt="Store Logo" />
                             </div>
                             <div className="flex-1 min-w-0">
                                 <h3 className="font-bold text-white text-sm truncate">{store.name}</h3>
                                 <p className="text-xs text-gray-300 truncate">{store.address}</p>
                             </div>
                          </div>
                          <button 
                              onClick={() => setIsMapDrawerOpen(true)}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#D4AF37] text-black font-semibold py-2 text-sm hover:bg-[#b5952f] transition-all"
                          >
                              <Navigation className="w-4 h-4 rotate-45" />
                              Open in Maps
                          </button>
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
                                <span className="text-white font-bold text-sm">
                                    {todayHours
                                      ? (todayHours.is_closed
                                        ? 'Closed'
                                        : `${formatTime(todayHours.open_time)} - ${formatTime(todayHours.close_time)}`)
                                      : 'Hours not set'}
                                </span>
                            </div>
                            <button 
                                onClick={() => setShowFullHours(!showFullHours)}
                                disabled={effectiveStoreHours.length === 0}
                                className="flex items-center gap-1 text-[#D4AF37] text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
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
                                            {effectiveStoreHours.length === 0 ? (
                                                <div className="flex justify-between text-gray-500">
                                                    <span>Hours not set</span>
                                                    <span>-</span>
                                                </div>
                                            ) : (
                                              dayNames.map((day, index) => {
                                                const hours = effectiveStoreHours.find((hour) => hour.day_of_week === index);
                                                if (!hours) {
                                                  return (
                                                    <div key={day} className="flex justify-between text-gray-500">
                                                      <span>{day}</span>
                                                      <span>Closed</span>
                                                    </div>
                                                  );
                                                }
                                                if (hours.is_closed || !hours.open_time || !hours.close_time) {
                                                  return (
                                                    <div key={day} className="flex justify-between text-red-400">
                                                      <span>{day}</span>
                                                      <span>Closed</span>
                                                    </div>
                                                  );
                                                }
                                                return (
                                                  <div key={day} className="flex justify-between">
                                                    <span className="text-gray-400">{day}</span>
                                                    <span className="text-gray-300">
                                                      {formatTime(hours.open_time)} - {formatTime(hours.close_time)}
                                                    </span>
                                                  </div>
                                                );
                                              })
                                            )}
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
                                <span className="text-white font-medium text-lg tracking-wide">
                                  {store.phone || 'No phone listed'}
                                </span>
                            </div>
                            <button 
                                onClick={() => setIsCallDrawerOpen(true)}
                                disabled={!store.phone}
                                className="px-5 py-2 border border-[#333] text-white font-medium rounded-lg text-sm hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white disabled:hover:border-[#333]"
                            >
                                Call
                            </button>
                        </div>

                        {store.email && (
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                  <MessageSquare className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                                  <span className="text-white font-medium text-sm tracking-wide break-all">{store.email}</span>
                              </div>
                              <a
                                href={`mailto:${store.email}`}
                                className="px-5 py-2 border border-[#333] text-white font-medium rounded-lg text-sm hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] transition-all"
                              >
                                Email
                              </a>
                          </div>
                        )}
                    </div>
                </div>

                {!store.email && (
                  <div>
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Contact</h3>
                      <p className="text-sm text-gray-500">No additional contact details provided.</p>
                  </div>
                )}

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
          className="fixed bottom-0 left-0 right-0 bg-black border-t border-[#333] px-6 py-5 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
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
                <div className="text-2xl font-bold text-white tracking-wider mb-2">
                  {store.phone || 'No phone listed'}
                </div>
            </div>
            <div className="px-6 flex flex-col gap-3">
                <button 
                    onClick={handleCall}
                    disabled={!store.phone}
                    className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-[#b5952f] transition-all disabled:opacity-40 disabled:hover:bg-[#D4AF37]"
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
                                        disabled={{ before: minSelectableDate }}
                                        className="text-white"
                                        classNames={{
                                            day_selected: "bg-[#D4AF37] text-black hover:bg-[#D4AF37] hover:text-black focus:bg-[#D4AF37] focus:text-black",
                                            day_today: "text-[#D4AF37] font-bold border border-[#D4AF37]/30",
                                            nav_button: "text-gray-200 border border-white/10 hover:text-white hover:bg-white/10",
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Step 2: Select Time */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Select Time</h3>
                                {isSlotsLoading ? (
                                  <p className="text-xs text-gray-500">Loading available times...</p>
                                ) : (
                                  <>
                                    <div className="grid grid-cols-4 gap-2">
                                      {availableSlots.map((time) => (
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
                                    {slotsError && (
                                      <p className="mt-3 text-xs text-red-400">{slotsError}</p>
                                    )}
                                    {!slotsError && availableSlots.length === 0 && (
                                      <p className="mt-3 text-xs text-gray-500">
                                        No available times for this date.
                                      </p>
                                    )}
                                  </>
                                )}
                                <p className="mt-3 text-[10px] text-gray-600 uppercase tracking-widest">
                                  {slotsHint}
                                </p>
                            </div>

                            {/* Step 3: Select Professional */}
                            {technicians.length > 0 && (
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
                                  {technicians.map((staff) => (
                                    <button 
                                      key={staff.id}
                                      onClick={() => setSelectedStaff(staff)}
                                      className="flex-shrink-0 flex flex-col items-center gap-2"
                                    >
                                      <div className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${selectedStaff?.id === staff.id ? 'border-[#D4AF37] scale-105' : 'border-transparent'}`}>
                                        <img src={staff.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100'} alt={staff.name} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="text-center">
                                        <span className={`text-[10px] font-bold block ${selectedStaff?.id === staff.id ? 'text-[#D4AF37]' : 'text-gray-300'}`}>{staff.name}</span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

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

                        <div className="flex flex-col gap-3">
                            {bookingError && (
                              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm">
                                <p>{bookingError}</p>
                                <button
                                  type="button"
                                  onClick={handleConfirmBooking}
                                  className="mt-3 inline-flex items-center justify-center rounded-lg border border-red-500/60 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/10 transition-colors"
                                >
                                  Retry booking
                                </button>
                              </div>
                            )}
                            <div className="rounded-2xl border border-[#333] bg-[#111] p-4">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs uppercase tracking-widest text-gray-400">Appointment Summary</p>
                                <span className="text-[#D4AF37] text-xs font-semibold">${calculateTotals().totalPrice.toFixed(2)}</span>
                              </div>
                              <div className="space-y-2 text-sm text-gray-300">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-500">Service</span>
                                  <span className="text-white font-medium">
                                    {selectedServices.length > 1
                                      ? `${selectedServices[0]?.name} +${selectedServices.length - 1}`
                                      : selectedServices[0]?.name || 'Select service'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-500">Duration</span>
                                  <span className="text-white font-medium">{calculateTotals().durationStr}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-500">Time</span>
                                  <span className="text-white font-medium">
                                    {selectedDate && selectedTime
                                      ? `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${selectedTime}`
                                      : 'Select date & time'}
                                  </span>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-gray-500">Location</span>
                                  <button
                                    type="button"
                                    onClick={openMaps}
                                    className="flex items-center gap-2 text-right text-white hover:text-[#D4AF37] transition-colors"
                                  >
                                    <MapPin className="w-4 h-4" />
                                    <span className="underline decoration-white/30 underline-offset-4">
                                      {store.address}
                                    </span>
                                  </button>
                                </div>
                                {showDistance && distanceInfo && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Distance</span>
                                    <span className="text-white font-medium">
                                      {distanceInfo.miles} mi · ~{distanceInfo.driveMinutes} min drive
                                    </span>
                                  </div>
                                )}
                                {notesPreview && (
                                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Notes</p>
                                    <p className="text-xs text-gray-300">{notesPreview}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button 
                                onClick={handleConfirmBooking}
                                disabled={!selectedTime || !selectedDate || isBooking}
                                className="w-full py-4 bg-gradient-to-r from-[#D4AF37] to-[#b5952f] text-black font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale shadow-[0_10px_30px_rgba(212,175,55,0.2)] flex items-center justify-center gap-2"
                            >
                                {isBooking ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating Appointment...
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-4 h-4 fill-black" />
                                    Confirm Appointment
                                  </>
                                )}
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
