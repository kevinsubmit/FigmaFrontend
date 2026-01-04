import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, User, DollarSign, MessageSquare, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Appointment } from '../api/appointments';
import { Store } from '../api/stores';
import { Service } from '../api/services';
import { Technician } from '../api/technicians';
import { cancelAppointment, rescheduleAppointment, updateAppointmentNotes } from '../api/appointments';

interface AppointmentWithDetails extends Appointment {
  store?: Store;
  service?: Service;
  technician?: Technician | null;
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

  const canCancel = appointment.status === 'pending' || appointment.status === 'confirmed';
  const canReschedule = appointment.status === 'pending' || appointment.status === 'confirmed';
  const canEditNotes = appointment.status !== 'cancelled' && appointment.status !== 'completed';

  const handleCancel = async () => {
    try {
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
      setProcessing(true);
      await rescheduleAppointment(appointment.id, newDate, newTime);
      toast.success('Appointment rescheduled successfully');
      setShowRescheduleDialog(false);
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Failed to reschedule appointment:', error);
      toast.error(error?.message || 'Failed to reschedule appointment');
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Appointment Details</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(appointment.status)}`}>
                {appointment.status}
              </span>
            </div>

            {/* Store */}
            {appointment.store && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">{appointment.store.name}</div>
                  <div className="text-sm text-gray-600">{appointment.store.address}</div>
                </div>
              </div>
            )}

            {/* Service */}
            {appointment.service && (
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">{appointment.service.name}</div>
                  <div className="text-sm text-gray-600">
                    ${appointment.service.price} • {appointment.service.duration_minutes} mins
                  </div>
                </div>
              </div>
            )}

            {/* Date & Time */}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div className="font-medium text-gray-900">
                {new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div className="font-medium text-gray-900">
                {appointment.appointment_time.substring(0, 5)}
              </div>
            </div>

            {/* Technician */}
            {appointment.technician && (
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div className="font-medium text-gray-900">{appointment.technician.name}</div>
              </div>
            )}

            {/* Notes */}
            {appointment.notes && (
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-600">Notes</div>
                  <div className="text-gray-900">{appointment.notes}</div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 p-6 space-y-3">
            {canEditNotes && (
              <button
                onClick={() => setShowNotesDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-medium transition-colors"
              >
                <Edit className="w-5 h-5" />
                Edit Notes
              </button>
            )}

            {canReschedule && (
              <button
                onClick={() => setShowRescheduleDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
              >
                <Calendar className="w-5 h-5" />
                Reschedule
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => setShowCancelDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Cancel Appointment
              </button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reschedule Appointment</h3>
            
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Date
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Time
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRescheduleDialog(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {processing ? 'Rescheduling...' : 'Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Dialog */}
      {showNotesDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Notes</h3>
            
            <div className="mb-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Add any special requests or notes..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowNotesDialog(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateNotes}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {processing ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
