import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, User, DollarSign, ChevronRight, X, AlertCircle, Star } from 'lucide-react';
import { toast } from 'react-toastify';
import { getMyAppointments, cancelAppointment, Appointment } from '../api/appointments';
import { Store, getStores } from '../api/stores';
import { Service } from '../api/services';
import { Technician } from '../api/technicians';
import ReviewForm from './ReviewForm';
import { AppointmentDetailsDialog } from './AppointmentDetailsDialog';

interface AppointmentWithDetails extends Appointment {
  store?: Store;
  service?: Service;
  technician?: Technician | null;
  store_name?: string | null;
  store_address?: string | null;
  service_name?: string | null;
  service_price?: number | null;
  service_duration?: number | null;
  technician_name?: string | null;
}

export function Appointments() {
  const navigate = useNavigate();
  const REVIEW_WINDOW_DAYS = 30;
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewingAppointment, setReviewingAppointment] = useState<AppointmentWithDetails | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [storeAddressById, setStoreAddressById] = useState<Record<number, string>>({});
  const [showMapOptions, setShowMapOptions] = useState(false);
  const [mapTarget, setMapTarget] = useState<{ name: string; address: string } | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await getMyAppointments();
      setAppointments(data);
      try {
        const stores = await getStores({ limit: 100 });
        const addressMap: Record<number, string> = {};
        stores.forEach((store) => {
          if (store.address) {
            addressMap[store.id] = store.address;
          }
        });
        setStoreAddressById(addressMap);
      } catch (storeError) {
        console.warn('Failed to load store addresses fallback:', storeError);
      }
    } catch (error) {
      console.error('Failed to load appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      setCancelling(true);
      await cancelAppointment(selectedAppointment.id);
      toast.success('Appointment cancelled successfully');
      setShowCancelDialog(false);
      setSelectedAppointment(null);
      await loadAppointments();
    } catch (error: any) {
      console.error('Failed to cancel appointment:', error);
      toast.error(error?.message || 'Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'confirmed':
        return 'text-green-500 bg-green-500/10';
      case 'completed':
        return 'text-blue-500 bg-blue-500/10';
      case 'cancelled':
        return 'text-red-500 bg-red-500/10';
      case 'expired':
        return 'text-gray-400 bg-white/5';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getStatusText = (status: string) => {
    if (status === 'expired') {
      return 'Expired';
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) {
      return new Date(dateString);
    }
    return new Date(year, month - 1, day);
  };

  const parseLocalDateTime = (dateString: string, timeString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const [hoursRaw, minutesRaw = '0', secondsRaw = '0'] = timeString.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    const seconds = Number(secondsRaw);
    if (!year || !month || !day || Number.isNaN(hours)) {
      return new Date(`${dateString}T${timeString}`);
    }
    return new Date(year, month - 1, day, hours, minutes, seconds);
  };

  const formatDate = (dateString: string) => {
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      weekday: 'short'
    });
  };

  const formatTime = (timeString: string) => {
    // timeString is in HH:MM:SS or HH:MM format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isUpcoming = (apt: Appointment) => {
    if (apt.status === 'cancelled' || apt.status === 'completed') {
      return false;
    }

    const appointmentDateTime = parseLocalDateTime(apt.appointment_date, apt.appointment_time);
    return appointmentDateTime >= new Date();
  };

  const getAppointmentDateTime = (apt: Appointment) =>
    parseLocalDateTime(apt.appointment_date, apt.appointment_time);

  const isReviewWindowOpen = (apt: Appointment) => {
    const appointmentDateTime = getAppointmentDateTime(apt);
    const cutoff = new Date(appointmentDateTime);
    cutoff.setDate(cutoff.getDate() + REVIEW_WINDOW_DAYS);
    return new Date() <= cutoff;
  };

  const upcomingAppointments = appointments.filter(isUpcoming);
  const pastAppointments = appointments.filter(apt => !isUpcoming(apt));

  const displayedAppointments = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  const openMapOptions = (
    event: React.MouseEvent<HTMLButtonElement>,
    storeName: string,
    storeAddress: string
  ) => {
    event.stopPropagation();
    setMapTarget({ name: storeName, address: storeAddress });
    setShowMapOptions(true);
  };

  const openMaps = (provider: 'apple' | 'google') => {
    if (!mapTarget?.address) return;
    const query = `${mapTarget.name ? `${mapTarget.name} ` : ''}${mapTarget.address}`.trim();
    const encoded = encodeURIComponent(query);
    const url =
      provider === 'apple'
        ? `http://maps.apple.com/?q=${encoded}`
        : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowMapOptions(false);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold">My Appointments</h1>
        </div>

        {/* Tabs */}
        <div className="flex px-4">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-3 text-center font-medium transition-colors relative ${
              activeTab === 'upcoming' ? 'text-[#D4AF37]' : 'text-gray-400'
            }`}
          >
            Upcoming
            {upcomingAppointments.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-[#D4AF37] text-black">
                {upcomingAppointments.length}
              </span>
            )}
            {activeTab === 'upcoming' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex-1 py-3 text-center font-medium transition-colors relative ${
              activeTab === 'past' ? 'text-[#D4AF37]' : 'text-gray-400'
            }`}
          >
            Past
            {activeTab === 'past' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
          </div>
        ) : displayedAppointments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400 mb-4">
              {activeTab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
            </p>
            {activeTab === 'upcoming' && (
              <button
                onClick={() => navigate('/services')}
                className="px-6 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold hover:bg-[#b08d2d] transition-colors"
              >
                Book Now
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedAppointments.map((apt) => {
              const isPast = !isUpcoming(apt);
              const displayStatus = isPast && (apt.status === 'pending' || apt.status === 'confirmed')
                ? 'expired'
                : apt.status;
              const displayAddress = apt.store_address || apt.store?.address || storeAddressById[apt.store_id];

              return (
              <div
                key={apt.id}
                onClick={() => {
                  if (isPast) {
                    return;
                  }
                  setSelectedAppointment(apt);
                  setShowDetailsDialog(true);
                }}
                className={`p-4 rounded-2xl bg-white/5 border border-white/10 transition-all ${
                  isPast ? 'opacity-60 cursor-default' : 'hover:border-white/20 cursor-pointer'
                }`}
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(displayStatus)}`}>
                    {getStatusText(displayStatus)}
                  </span>
                  <div className="flex gap-2">
                    {apt.status === 'completed' && (
                      isReviewWindowOpen(apt) && !apt.review_id ? (
                        <button
                          onClick={() => {
                            setReviewingAppointment(apt);
                            setShowReviewForm(true);
                          }}
                          className="text-sm text-[#D4AF37] hover:text-[#b08d2d] transition-colors flex items-center gap-1"
                        >
                          <Star className="w-4 h-4" />
                          Review
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          {apt.review_id ? 'Reviewed' : 'Review window closed'}
                        </span>
                      )
                    )}
                    {apt.status === 'pending' && !isPast && (
                      <button
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setShowCancelDialog(true);
                        }}
                        className="rounded-full border border-[#D4AF37] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#D4AF37] transition-colors hover:bg-[#D4AF37]/10"
                      >
                        Manage
                      </button>
                    )}
                  </div>
                </div>

                {/* Store Info */}
                {apt.store || apt.store_name ? (
                  <div className="mb-3">
                    <h3 className="font-semibold text-lg text-white mb-1">{apt.store?.name || apt.store_name}</h3>
                    {displayAddress && (
                      <button
                        onClick={(event) =>
                          openMapOptions(event, apt.store?.name || apt.store_name || 'Selected location', displayAddress)
                        }
                        className="text-sm text-gray-300 hover:text-white transition-colors inline-flex items-center gap-1"
                      >
                        <MapPin className="w-4 h-4 text-[#D4AF37]" />
                        <span className="underline decoration-white/30 underline-offset-4">{displayAddress}</span>
                      </button>
                    )}
                  </div>
                ) : null}

                {/* Service Info */}
                {apt.service || apt.service_name ? (
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <span className="text-white">💅 {apt.service?.name || apt.service_name}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-[#D4AF37] flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {(apt.service?.price ?? apt.service_price ?? 0).toFixed(2)}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-400">{apt.service?.duration_minutes ?? apt.service_duration ?? 0} min</span>
                  </div>
                ) : null}

                {/* Technician Info */}
                {apt.technician || apt.technician_name ? (
                  <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
                    <User className="w-4 h-4" />
                    <span>with {apt.technician?.name || apt.technician_name}</span>
                  </div>
                ) : null}

                {/* Date & Time */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-white">
                    <Calendar className="w-4 h-4" />
                    {formatDate(apt.appointment_date)}
                  </div>
                  <div className="flex items-center gap-1 text-white">
                    <Clock className="w-4 h-4" />
                    {formatTime(apt.appointment_time)}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#1a1a1a] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Cancel Appointment?</h3>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-white/5">
              <p className="text-sm text-gray-400 mb-2">You are about to cancel:</p>
              <p className="font-medium">{selectedAppointment.service?.name}</p>
              <p className="text-sm text-gray-400">
                {formatDate(selectedAppointment.appointment_date)} at {formatTime(selectedAppointment.appointment_time)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  setSelectedAppointment(null);
                }}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors font-medium disabled:opacity-50"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleCancelAppointment}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <X className="w-5 h-5" />
                    Cancel Appointment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Book Button */}
      {activeTab === 'upcoming' && (
        <button
          onClick={() => navigate('/services')}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[#D4AF37] text-black shadow-lg hover:bg-[#b08d2d] transition-all flex items-center justify-center z-10"
        >
          <span className="text-2xl">+</span>
        </button>
      )}

      {/* Appointment Details Dialog */}
      {showDetailsDialog && selectedAppointment && (
        <AppointmentDetailsDialog
          appointment={selectedAppointment}
          onClose={() => {
            setShowDetailsDialog(false);
            setSelectedAppointment(null);
          }}
          onUpdate={() => {
            loadAppointments();
          }}
        />
      )}

      {showMapOptions && mapTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-[60] p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0f0f0f] border border-white/10 shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10">
              <p className="text-sm text-gray-400 uppercase tracking-widest">Open in Maps</p>
              <p className="text-base text-white font-semibold mt-1">{mapTarget.name}</p>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => openMaps('apple')}
                className="w-full px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
              >
                Open in Apple Maps
              </button>
              <button
                onClick={() => openMaps('google')}
                className="w-full px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
              >
                Open in Google Maps
              </button>
              <button
                onClick={() => setShowMapOptions(false)}
                className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] hover:bg-[#222] text-gray-300 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Form */}
      {showReviewForm && reviewingAppointment && (
        <ReviewForm
          appointmentId={reviewingAppointment.id}
          onSuccess={() => {
            setShowReviewForm(false);
            setReviewingAppointment(null);
            loadAppointments();
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
