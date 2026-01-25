import { ArrowLeft, ShoppingBag, MapPin, Calendar, CheckCircle2, Clock, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Loader } from './ui/Loader';
import { toast } from 'react-toastify';
import { getMyAppointments, Appointment } from '../api/appointments';
import ReviewForm from './ReviewForm';
import { Store } from '../api/stores';
import { Service } from '../api/services';
import { Technician } from '../api/technicians';

interface OrderHistoryProps {
  onBack: () => void;
}

interface AppointmentWithDetails extends Appointment {
  store?: Store;
  service?: Service;
  technician?: Technician | null;
  store_name?: string | null;
  service_name?: string | null;
  service_price?: number | null;
  service_duration?: number | null;
  technician_name?: string | null;
}

export function OrderHistory({ onBack }: OrderHistoryProps) {
  const REVIEW_WINDOW_DAYS = 30;
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewingAppointment, setReviewingAppointment] = useState<AppointmentWithDetails | null>(null);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setIsLoading(true);
        const data = await getMyAppointments();
        const completedOnly = data.filter((apt) => apt.status === 'completed');
        setAppointments([...completedOnly].sort((a, b) => {
          const aDateTime = new Date(`${a.appointment_date}T${a.appointment_time}`);
          const bDateTime = new Date(`${b.appointment_date}T${b.appointment_time}`);
          return bDateTime.getTime() - aDateTime.getTime();
        }));
      } catch (error) {
        console.error('Failed to load order history:', error);
        toast.error('Failed to load order history');
      } finally {
        setIsLoading(false);
      }
    };

    loadAppointments();
  }, []);

  const totalSpend = appointments
    .filter((apt) => apt.status === 'completed')
    .reduce((acc, curr) => acc + (curr.service_price || 0), 0);
    
  const totalVisits = appointments.filter((apt) => apt.status === 'completed').length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      weekday: 'short'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getAppointmentDateTime = (apt: Appointment) =>
    new Date(`${apt.appointment_date}T${apt.appointment_time}`);

  const isReviewWindowOpen = (apt: Appointment) => {
    const appointmentDateTime = getAppointmentDateTime(apt);
    const cutoff = new Date(appointmentDateTime);
    cutoff.setDate(cutoff.getDate() + REVIEW_WINDOW_DAYS);
    return new Date() <= cutoff;
  };

  const getStatusLabel = (apt: Appointment) => {
    if (apt.status === 'completed') return 'completed';
    if (apt.status === 'cancelled') return 'cancelled';
    return 'upcoming';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-safe animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-[#333]">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-lg font-bold">Transaction History</h1>
        <div className="w-8" /> {/* Spacer for centering */}
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#333] relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Total Spend</p>
                <p className="text-2xl font-bold text-[#D4AF37]">${totalSpend.toFixed(2)}</p>
             </div>
             <div className="absolute right-0 bottom-0 p-2 opacity-10">
                <ShoppingBag className="w-12 h-12 text-[#D4AF37]" />
             </div>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#333] relative overflow-hidden">
             <div className="relative z-10">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Total Visits</p>
                <p className="text-2xl font-bold text-white">{totalVisits}</p>
             </div>
             <div className="absolute right-0 bottom-0 p-2 opacity-10">
                <Calendar className="w-12 h-12 text-white" />
             </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider pl-1">Recent Activity</h2>
          
          {appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((apt) => {
                const statusLabel = getStatusLabel(apt);
                const canReview = apt.status === 'completed' && isReviewWindowOpen(apt) && !apt.review_id;
                return (
                <div key={apt.id} className="bg-[#1a1a1a] border border-[#333] rounded-xl p-4 flex flex-col gap-3 group hover:border-[#D4AF37]/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#252525] flex items-center justify-center border border-[#333] shrink-0">
                         <ShoppingBag className="w-5 h-5 text-gray-400 group-hover:text-[#D4AF37] transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{apt.store?.name || apt.store_name || 'Salon'}</h3>
                        {apt.order_number && (
                          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">
                            Order {apt.order_number}
                          </div>
                        )}
                        {apt.store?.address && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>{apt.store.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#D4AF37]">${(apt.service_price || 0).toFixed(2)}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        statusLabel === 'completed' ? 'bg-green-900/30 text-green-400' :
                        statusLabel === 'upcoming' ? 'bg-blue-900/30 text-blue-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-full h-px bg-[#333]" />
                  
                  <div className="flex justify-between items-center text-sm">
                    <p className="text-gray-300">{apt.service?.name || apt.service_name || 'Service'}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(apt.appointment_date)}</span>
                      <Clock className="w-3 h-3 ml-1" />
                      <span>{formatTime(apt.appointment_time)}</span>
                    </div>
                  </div>

                  {apt.status === 'completed' && (
                    <div className="flex justify-end">
                      {canReview ? (
                        <button
                          onClick={() => {
                            setReviewingAppointment(apt);
                            setShowReviewForm(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#D4AF37] transition-colors hover:bg-[#D4AF37]/10"
                        >
                          <Star className="w-4 h-4" />
                          Review
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                          {apt.review_id ? 'Reviewed' : 'Review window closed'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )})}
            </div>
          ) : (
             <div className="text-center py-10 text-gray-500">
                <p>No transactions found.</p>
             </div>
          )}
        </div>
      </div>

      {showReviewForm && reviewingAppointment && (
        <ReviewForm
          appointmentId={reviewingAppointment.id}
          onSuccess={() => {
            setShowReviewForm(false);
            setReviewingAppointment(null);
            setIsLoading(true);
            getMyAppointments()
              .then((data) => {
                const sorted = [...data].sort((a, b) => {
                  const aDateTime = new Date(`${a.appointment_date}T${a.appointment_time}`);
                  const bDateTime = new Date(`${b.appointment_date}T${b.appointment_time}`);
                  return bDateTime.getTime() - aDateTime.getTime();
                });
                setAppointments(sorted);
              })
              .catch((error) => {
                console.error('Failed to load order history:', error);
                toast.error('Failed to load order history');
              })
              .finally(() => setIsLoading(false));
          }}
          onCancel={() => {
            setShowReviewForm(false);
            setReviewingAppointment(null);
          }}
        />
      )}
    </div>
  );
}
