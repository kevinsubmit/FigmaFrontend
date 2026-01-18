import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, MapPin, DollarSign, Check, Search, SlidersHorizontal, Heart } from 'lucide-react';
import { toast } from 'react-toastify';
import { getStores, Store } from '../api/stores';
import { getServicesByStore, Service } from '../api/services';
import { getTechniciansByStore, Technician, getAvailableSlots, AvailableSlot } from '../api/technicians';
import { createAppointment } from '../api/appointments';

interface BookingFlowProps {
  onBack: () => void;
  onComplete: () => void;
}

type Step = 'store' | 'service' | 'technician' | 'datetime' | 'confirm';

export function BookingFlow({ onBack, onComplete }: BookingFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('store');
  const [loading, setLoading] = useState(false);
  
  // Selection state
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Data state
  const [stores, setStores] = useState<Store[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('rating_desc');
  const [favoriteStores, setFavoriteStores] = useState<Set<number>>(new Set());

  // Load stores on mount
  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      const data = await getStores({
        search: searchQuery || undefined,
        min_rating: minRating,
        sort_by: sortBy
      });
      setStores(data);
    } catch (error) {
      console.error('Failed to load stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };
  
  // Reload stores when search/filter changes
  useEffect(() => {
    if (currentStep === 'store') {
      loadStores();
    }
  }, [searchQuery, minRating, sortBy]);

  const loadServices = async (storeId: number) => {
    try {
      setLoading(true);
      const data = await getServicesByStore(storeId);
      setServices(data);
    } catch (error) {
      console.error('Failed to load services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const loadTechnicians = async (storeId: number) => {
    try {
      setLoading(true);
      const data = await getTechniciansByStore(storeId);
      setTechnicians(data);
    } catch (error) {
      console.error('Failed to load technicians:', error);
      toast.error('Failed to load technicians');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async (technicianId: number, date: string, serviceId: number) => {
    try {
      setLoading(true);
      const data = await getAvailableSlots(technicianId, date, serviceId);
      setAvailableSlots(data);
    } catch (error) {
      console.error('Failed to load available slots:', error);
      toast.error('Failed to load available time slots');
    } finally {
      setLoading(false);
    }
  };

  const handleStoreSelect = (store: Store) => {
    setSelectedStore(store);
    loadServices(store.id);
    loadTechnicians(store.id);
    setCurrentStep('service');
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setCurrentStep('technician');
  };

  const handleTechnicianSelect = (technician: Technician | null) => {
    setSelectedTechnician(technician);
    setCurrentStep('datetime');
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    // If no technician selected, use first available technician for slot checking
    if (selectedService) {
      const techId = selectedTechnician?.id || technicians[0]?.id;
      if (techId) {
        loadAvailableSlots(techId, date, selectedService.id);
      }
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setCurrentStep('confirm');
  };

  const handleConfirm = async () => {
    if (!selectedStore || !selectedService || !selectedDate || !selectedTime) {
      toast.error('Please complete all selections');
      return;
    }

    try {
      setLoading(true);
      await createAppointment({
        store_id: selectedStore.id,
        service_id: selectedService.id,
        technician_id: selectedTechnician?.id,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
      });
      toast.success('Appointment created successfully!');
      onComplete();
    } catch (error: any) {
      console.error('Failed to create appointment:', error);
      toast.error(error?.message || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['store', 'service', 'technician', 'datetime', 'confirm'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    } else {
      onBack();
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'store': return 'Select Store';
      case 'service': return 'Select Service';
      case 'technician': return 'Select Technician';
      case 'datetime': return 'Select Date & Time';
      case 'confirm': return 'Confirm Booking';
      default: return '';
    }
  };

  const getStepNumber = () => {
    const steps: Step[] = ['store', 'service', 'technician', 'datetime', 'confirm'];
    return steps.indexOf(currentStep) + 1;
  };

  // Generate next 30 days for date selection
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold">{getStepTitle()}</h1>
            <p className="text-sm text-gray-400">Step {getStepNumber()} of 5</p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-white/10">
          <div 
            className="h-full bg-[#D4AF37] transition-all duration-300"
            style={{ width: `${(getStepNumber() / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
          </div>
        ) : (
          <>
            {/* Store Selection */}
            {currentStep === 'store' && (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search stores..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
                
                {/* Filter Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#D4AF37]/50 transition-colors"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-sm">Filters</span>
                  </button>
                  
                  {(minRating || sortBy !== 'rating_desc') && (
                    <button
                      onClick={() => {
                        setMinRating(undefined);
                        setSortBy('rating_desc');
                      }}
                      className="text-sm text-[#D4AF37] hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                
                {/* Filter Panel */}
                {showFilters && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    {/* Minimum Rating */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Minimum Rating</label>
                      <select
                        value={minRating || ''}
                        onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50"
                      >
                        <option value="">All Ratings</option>
                        <option value="4.5">4.5+ Stars</option>
                        <option value="4.0">4.0+ Stars</option>
                        <option value="3.5">3.5+ Stars</option>
                        <option value="3.0">3.0+ Stars</option>
                      </select>
                    </div>
                    
                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50"
                      >
                        <option value="rating_desc">Highest Rated</option>
                        <option value="rating_asc">Lowest Rated</option>
                        <option value="review_count_desc">Most Reviews</option>
                        <option value="name_asc">Name (A-Z)</option>
                        <option value="name_desc">Name (Z-A)</option>
                      </select>
                    </div>
                  </div>
                )}
                
                {/* Store List */}
                <div className="space-y-3">
                  {stores.map((store) => (
                    <button
                      key={store.id}
                      onClick={() => handleStoreSelect(store)}
                      className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#D4AF37]/50 transition-all text-left"
                    >
                      <div className="flex items-start gap-4">
                        {store.image_url && (
                          <img
                            src={store.image_url}
                            alt={store.name}
                            className="w-20 h-20 rounded-xl object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">{store.name}</h3>
                          <p className="text-sm text-gray-400 flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {store.address}
                          </p>
                          {store.rating && (
                            <p className="text-sm text-[#D4AF37] mt-1">★ {store.rating.toFixed(1)}</p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Service Selection */}
            {currentStep === 'service' && (
              <div className="space-y-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#D4AF37]/50 transition-all text-left"
                  >
                    <div className="flex items-start gap-4">
                      {service.image_url && (
                        <img
                          src={service.image_url}
                          alt={service.name}
                          className="w-20 h-20 rounded-xl object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-gray-400 mb-2">{service.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-[#D4AF37] flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {service.price.toFixed(2)}
                          </span>
                          <span className="text-gray-400 flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {service.duration_minutes} min
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Technician Selection */}
            {currentStep === 'technician' && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-gray-400 text-sm mb-3">Choose a specific technician or skip to let the store assign one</p>
                  <button
                    onClick={() => handleTechnicianSelect(null)}
                    className="px-6 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold hover:bg-[#b08d2d] transition-colors"
                  >
                    Skip - No Preference
                  </button>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <p className="text-sm text-gray-400 mb-3">Or select a specific technician:</p>
                </div>
                {technicians.map((technician) => (
                  <button
                    key={technician.id}
                    onClick={() => handleTechnicianSelect(technician)}
                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#D4AF37]/50 transition-all text-left"
                  >
                    <div className="flex items-start gap-4">
                      {technician.avatar_url ? (
                        <img
                          src={technician.avatar_url}
                          alt={technician.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                          <User className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{technician.name}</h3>
                        {technician.bio && (
                          <p className="text-sm text-gray-400 mb-1">{technician.bio}</p>
                        )}
                        {technician.specialties && (
                          <p className="text-xs text-[#D4AF37]">{technician.specialties}</p>
                        )}
                        {technician.rating && (
                          <p className="text-sm text-[#D4AF37] mt-1">★ {technician.rating.toFixed(1)}</p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Date & Time Selection */}
            {currentStep === 'datetime' && (
              <div className="space-y-6">
                {/* Date Selection */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Select Date</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {getAvailableDates().map((date) => (
                      <button
                        key={date}
                        onClick={() => handleDateSelect(date)}
                        className={`p-3 rounded-xl border transition-all ${
                          selectedDate === date
                            ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
                            : 'bg-white/5 border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="text-xs">{formatDate(date)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDate && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Select Time</h3>
                    {availableSlots.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">
                        No available time slots for this date
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.start_time}
                            onClick={() => handleTimeSelect(slot.start_time)}
                            className={`p-3 rounded-xl border transition-all ${
                              selectedTime === slot.start_time
                                ? 'bg-[#D4AF37] border-[#D4AF37] text-black'
                                : 'bg-white/5 border-white/10 hover:border-white/30'
                            }`}
                          >
                            {slot.start_time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Confirmation */}
            {currentStep === 'confirm' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Booking Summary</h3>
                  
                  {selectedStore && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-400">Store</p>
                        <p className="font-medium">{selectedStore.name}</p>
                      </div>
                    </div>
                  )}

                  {selectedService && (
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 text-[#D4AF37] mt-0.5">💅</div>
                      <div>
                        <p className="text-sm text-gray-400">Service</p>
                        <p className="font-medium">{selectedService.name}</p>
                        <p className="text-sm text-[#D4AF37]">${selectedService.price.toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  {selectedTechnician && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-400">Technician</p>
                        <p className="font-medium">{selectedTechnician.name}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-400">Date & Time</p>
                      <p className="font-medium">{formatDate(selectedDate)} at {selectedTime}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-semibold hover:bg-[#b08d2d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirm Booking
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
