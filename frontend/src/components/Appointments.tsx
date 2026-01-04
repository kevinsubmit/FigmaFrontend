import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, User, DollarSign, ChevronRight, X, AlertCircle, Star } from 'lucide-react';
import { toast } from 'react-toastify';
import { getMyAppointments, cancelAppointment, Appointment } from '../api/appointments';
import { getStoreById, Store } from '../api/stores';
import { getServiceById, Service } from '../api/services';
import { getTechnicianById, Technician } from '../api/technicians';
import ReviewForm from './ReviewForm';
import { AppointmentDetailsDialog } from './AppointmentDetailsDialog';

interface AppointmentWithDetails extends Appointment {
  store?: Store;
  service?: Service;
  technician?: Technician | null;
}

export function Appointments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewingAppointment, setReviewingAppointment] = useState<AppointmentWithDetails | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await getMyAppointments();
      
      // Load details for each appointment
      const appointmentsWithDetails = await Promise.all(
        data.map(async (apt) => {
          try {
            const [store, service, technician] = await Promise.all([
              getStoreById(apt.store_id),
              getServiceById(apt.service_id),
              apt.technician_id ? getTechnicianById(apt.technician_id).catch(() => null) : Promise.resolve(null)
            ]);
            
            return {
              ...apt,
              store,
              service,
              technician
            };
          } catch (error) {
            console.error('Failed to load appointment details:', error);
            return apt;
          }
        })
      );
      
      setAppointments(appointmentsWithDetails);
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
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

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
    // timeString is in HH:MM:SS or HH:MM format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isUpcoming = (apt: Appointment) => {
    const aptDate = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
    const now = new Date();
    return aptDate >= now && apt.status !== 'cancelled' && apt.status !== 'completed';
  };

  const upcomingAppointments = appointments.filter(isUpcoming);
  const pastAppointments = appointments.filter(apt => !isUpcoming(apt));

  const displayedAppointments = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

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
                onClick={() => navigate('/booking')}
                className="px-6 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold hover:bg-[#b08d2d] transition-colors"
              >
                Book Now
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedAppointments.map((apt) => (
              <div
                key={apt.id}
                onClick={() => {
                  setSelectedAppointment(apt);
                  setShowDetailsDialog(true);
                }}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                    {getStatusText(apt.status)}
                  </span>
                  <div className="flex gap-2">
                    {apt.status === 'completed' && (
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
                    )}
                    {apt.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setShowCancelDialog(true);
                        }}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Store Info */}
                {apt.store && (
                  <div className="mb-3">
                    <h3 className="font-semibold text-lg text-white mb-1">{apt.store.name}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {apt.store.address}
                    </p>
                  </div>
                )}

                {/* Service Info */}
                {apt.service && (
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <span className="text-white">💅 {apt.service.name}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-[#D4AF37] flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {apt.service.price.toFixed(2)}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-400">{apt.service.duration_minutes} min</span>
                  </div>
                )}

                {/* Technician Info */}
                {apt.technician && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
                    <User className="w-4 h-4" />
                    <span>with {apt.technician.name}</span>
                  </div>
                )}

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
            ))}
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
          onClick={() => navigate('/booking')}
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
