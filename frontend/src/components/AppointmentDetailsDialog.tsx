import React, { useEffect, useMemo, useState } from 'react';
import { X, Calendar, Clock, MapPin, User, DollarSign, MessageSquare, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Appointment, getMyAppointments } from '../api/appointments';
import { getStoreById, Store } from '../api/stores';
import { Service } from '../api/services';
import { Technician } from '../api/technicians';
import { cancelAppointment, rescheduleAppointment, updateAppointmentNotes } from '../api/appointments';

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

interface AppointmentDetailsDialogProps {
  appointment: AppointmentWithDetails;
  onClose: () => void;
  onUpdate: () => void;
}

export function AppointmentDetailsDialog({ appointment, onClose, onUpdate }: AppointmentDetailsDialogProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [newDate, setNewDate] = useState(appointment.appointment_date);
  const [newTime, setNewTime] = useState(appointment.appointment_time.substring(0, 5)); // HH:MM
  const [notes, setNotes] = useState(appointment.notes || '');
  const [processing, setProcessing] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');
  const [storeDetails, setStoreDetails] = useState<Store | null>(null);
  const [showMapOptions, setShowMapOptions] = useState(false);

  const canCancelByStatus = appointment.status === 'pending' || appointment.status === 'confirmed';
  const canRescheduleByStatus = appointment.status === 'pending' || appointment.status === 'confirmed';
  const canEditNotes = appointment.status !== 'cancelled' && appointment.status !== 'completed';
  const appointmentDateTime = useMemo(
    () => new Date(`${appointment.appointment_date}T${appointment.appointment_time}`),
    [appointment.appointment_date, appointment.appointment_time]
  );
  const cutoffDateTime = useMemo(
    () => new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000),
    [appointmentDateTime]
  );
  const isWithinCutoff = new Date() < cutoffDateTime;

  const parseTimeToMinutes = (time: string) => {
    const [hoursStr, minutesStr] = time.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    return hours * 60 + minutes;
  };

  useEffect(() => {
    setNotes(appointment.notes || '');
  }, [appointment.id, appointment.notes]);

  useEffect(() => {
    if (appointment.store?.address || storeDetails) {
      return;
    }

    getStoreById(appointment.store_id)
      .then(setStoreDetails)
      .catch((error) => {
        console.error('Failed to load store details:', error);
      });
  }, [appointment.store?.address, appointment.store_id, storeDetails]);

  const resolvedStore = appointment.store || storeDetails;
  const mapQuery = useMemo(() => {
    if (!resolvedStore?.address) return '';
    const name = resolvedStore?.name ? `${resolvedStore.name} ` : '';
    return `${name}${resolvedStore.address}`.trim();
  }, [resolvedStore?.address, resolvedStore?.name]);

  const openMaps = (provider: 'apple' | 'google') => {
    if (!mapQuery) return;
    const encoded = encodeURIComponent(mapQuery);
    const url =
      provider === 'apple'
        ? `http://maps.apple.com/?q=${encoded}`
        : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowMapOptions(false);
  };

  const handleCancel = async () => {
    try {
      if (!isWithinCutoff) {
        toast.error('Cancellation window has passed. Changes are no longer allowed.');
        return;
      }
      setProcessing(true);
      await cancelAppointment(appointment.id, cancelReason);
      toast.success('Appointment cancelled successfully');
      setShowCancelDialog(false);
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Failed to cancel appointment:', error);
      toast.error(error?.message || 'Failed to cancel appointment');
    } finally {
      setProcessing(false);
    }
  };

  const handleReschedule = async () => {
    try {
      if (!isWithinCutoff) {
        const message = 'Reschedule window has passed. Changes are no longer allowed.';
        setRescheduleError(message);
        toast.error(message);
        return;
      }
      setProcessing(true);
      setRescheduleError('');

      const existingAppointments = await getMyAppointments();
      const selectedStartMinutes = parseTimeToMinutes(newTime);
      const selectedDuration = appointment.service?.duration_minutes || appointment.service_duration || 0;
      const selectedEndMinutes = selectedStartMinutes + selectedDuration;

      const conflict = existingAppointments.find((apt) => {
        if (apt.id === appointment.id) return false;
        if (apt.status !== 'pending' && apt.status !== 'confirmed') return false;
        if (apt.appointment_date !== newDate) return false;
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
        const message = `You already have an appointment from ${conflict.appointment_time.slice(0, 5)} to ${suggestedHour}:${suggestedMinute}. Please choose a time after ${suggestedHour}:${suggestedMinute}.`;
        setRescheduleError(message);
        toast.error(message);
        setProcessing(false);
        return;
      }

      await rescheduleAppointment(appointment.id, newDate, newTime);
      toast.success('Appointment rescheduled successfully');
      setShowRescheduleDialog(false);
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Failed to reschedule appointment:', error);
      const message = error?.message || 'Failed to reschedule appointment';
      setRescheduleError(message);
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateNotes = async () => {
    try {
      setProcessing(true);
      await updateAppointmentNotes(appointment.id, notes);
      toast.success('Notes updated successfully');
      setShowNotesDialog(false);
      onUpdate();
    } catch (error: any) {
      console.error('Failed to update notes:', error);
      toast.error(error?.message || 'Failed to update notes');
    } finally {
      setProcessing(false);
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

  return (
    <>
      {/* Main Dialog */}
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0f0f0f] text-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Appointment Details</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Status */}
            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <span className="text-xs uppercase tracking-widest text-gray-400">Status</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(appointment.status)}`}>
                {appointment.status}
              </span>
            </div>

            {/* Store */}
            {appointment.store || appointment.store_name || resolvedStore?.address ? (
              <div className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <div>
                  <div className="text-sm text-gray-400 uppercase tracking-widest">Location</div>
                  <div className="font-semibold text-white">{appointment.store?.name || appointment.store_name}</div>
                  {resolvedStore?.address ? (
                    <button
                      onClick={() => setShowMapOptions(true)}
                      className="mt-1 inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-[#D4AF37]" />
                      <span className="underline decoration-white/30 underline-offset-4">
                        {resolvedStore.address}
                      </span>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Service */}
            {appointment.service || appointment.service_name ? (
              <div className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <DollarSign className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                <div>
                  <div className="text-sm text-gray-400 uppercase tracking-widest">Service</div>
                  <div className="font-semibold text-white">{appointment.service?.name || appointment.service_name}</div>
                  <div className="text-sm text-gray-400">
                    ${(appointment.service?.price ?? appointment.service_price ?? 0).toFixed(2)} • {appointment.service?.duration_minutes ?? appointment.service_duration ?? 0} mins
                  </div>
                </div>
              </div>
            ) : null}

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <Calendar className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-gray-400">Date</div>
                  <div className="font-semibold text-white">
                    {new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <Clock className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-gray-400">Time</div>
                  <div className="font-semibold text-white">
                    {appointment.appointment_time.substring(0, 5)}
                  </div>
                </div>
              </div>
            </div>

            {/* Technician */}
            {appointment.technician || appointment.technician_name ? (
              <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <User className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-gray-400">Technician</div>
                  <div className="font-semibold text-white">{appointment.technician?.name || appointment.technician_name}</div>
                </div>
              </div>
            ) : null}

            {/* Notes */}
            {notes.trim() && (
              <div className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <MessageSquare className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-widest text-gray-400">Notes</div>
                  <div className="text-sm text-white">{notes}</div>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <div className="text-xs uppercase tracking-widest text-gray-400">Cancel/Reschedule Cutoff</div>
              <div className="mt-1 text-sm text-white">2 hours before appointment</div>
              <div className="text-xs text-gray-400">
                Deadline: {cutoffDateTime.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </div>
              {!isWithinCutoff && (
                <div className="mt-1 text-xs text-red-300">Cutoff passed. Changes are disabled.</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-white/10 p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] space-y-3">
            {canEditNotes && (
              <button
                onClick={() => setShowNotesDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-medium transition-colors"
              >
                <Edit className="w-5 h-5" />
                Edit Notes
              </button>
            )}

            {(canRescheduleByStatus || canCancelByStatus) && (
              <div className="flex gap-3">
                {canRescheduleByStatus && (
                  <button
                    onClick={() => setShowRescheduleDialog(true)}
                    disabled={!isWithinCutoff}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                      isWithinCutoff
                        ? 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white'
                        : 'bg-white/5 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Calendar className="w-5 h-5" />
                    Reschedule
                  </button>
                )}

                {canCancelByStatus && (
                  <button
                    onClick={handleCancel}
                    disabled={processing || !isWithinCutoff}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                      isWithinCutoff
                        ? 'bg-[#dc2626] hover:bg-[#b91c1c] text-white'
                        : 'bg-white/5 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 className="w-5 h-5" />
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Appointment</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Let us know why you're cancelling..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleCancel}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {processing ? 'Cancelling...' : 'Cancel Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Dialog */}
      {showRescheduleDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-[60] p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0f0f0f] border border-white/10 shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10">
              <p className="text-xs uppercase tracking-widest text-gray-400">Reschedule</p>
              <h3 className="text-lg font-semibold text-white mt-1">Pick a new date & time</h3>
            </div>

            <div className="p-6 space-y-5">
              {rescheduleError && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {rescheduleError}
                </div>
              )}
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">
                  New Date
                </label>
                <div className="relative">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-white/10 text-white placeholder-gray-500 border border-white/10 focus:ring-2 focus:ring-[#D4AF37]/60 focus:border-transparent"
                  />
                  <Calendar className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">
                  New Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-white/10 text-white placeholder-gray-500 border border-white/10 focus:ring-2 focus:ring-[#D4AF37]/60 focus:border-transparent"
                  />
                  <Clock className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="px-6 pb-[calc(5rem+env(safe-area-inset-bottom))] flex gap-3">
              <button
                onClick={() => setShowRescheduleDialog(false)}
                disabled={processing}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={processing}
                className="flex-1 px-4 py-3 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium transition-colors disabled:opacity-50"
              >
                {processing ? 'Rescheduling...' : 'Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Dialog */}
      {showNotesDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-[60] p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0f0f0f] border border-white/10 shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10">
              <p className="text-xs uppercase tracking-widest text-gray-400">Notes</p>
              <h3 className="text-lg font-semibold text-white mt-1">Edit notes</h3>
            </div>

            <div className="p-6">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-500 border border-white/10 focus:ring-2 focus:ring-[#D4AF37]/60 focus:border-transparent resize-none"
                rows={4}
                placeholder="Add any special requests or notes..."
              />
              <p className="mt-2 text-xs text-gray-500">
                Keep it short and clear for the salon team.
              </p>
            </div>

            <div className="px-6 pb-[calc(5rem+env(safe-area-inset-bottom))] flex gap-3">
              <button
                onClick={() => setShowNotesDialog(false)}
                disabled={processing}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateNotes}
                disabled={processing}
                className="flex-1 px-4 py-3 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium transition-colors disabled:opacity-50"
              >
                {processing ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMapOptions && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-[60] p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0f0f0f] border border-white/10 shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10">
              <p className="text-sm text-gray-400 uppercase tracking-widest">Open in Maps</p>
              <p className="text-base text-white font-semibold mt-1">{resolvedStore?.name || 'Selected location'}</p>
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
    </>
  );
}
