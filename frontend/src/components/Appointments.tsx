import { useState, useEffect } from 'react';
import { Loader } from './ui/Loader';
import { Calendar, Clock, MapPin, ChevronRight, CheckCircle2, Navigation2, XCircle, AlertTriangle } from 'lucide-react';
import { getMyAppointments, cancelAppointment as cancelAppointmentAPI, AppointmentWithDetails } from '../services/appointments.service';
import { getStoreById } from '../services/stores.service';
import { getServiceById } from '../services/services.service';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "./ui/drawer";
import { toast } from "sonner@2.0.3";

interface AppointmentDisplay {
  id: number;
  service: {
    name: string;
    price: number;
    duration: number;
  };
  store: {
    name: string;
    address: string;
  };
  date: Date;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface AppointmentsProps {
  newBooking?: any;
  onClearNewBooking?: () => void;
  onNavigate?: (page: any) => void;
}

export function Appointments({ newBooking, onClearNewBooking, onNavigate }: AppointmentsProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [appointments, setAppointments] = useState<AppointmentDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManageDrawerOpen, setIsManageDrawerOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDisplay | null>(null);
  const [isRescheduleDrawerOpen, setIsRescheduleDrawerOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string>('');

  // 加载预约列表
  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      const data = await getMyAppointments();
      
      // 转换数据格式
      const displayAppointments: AppointmentDisplay[] = await Promise.all(
        data.map(async (apt) => {
          try {
            const store = await getStoreById(apt.store_id);
            const service = await getServiceById(apt.service_id);
            
            return {
              id: apt.id,
              service: {
                name: service.name,
                price: service.price,
                duration: service.duration_minutes
              },
              store: {
                name: store.name,
                address: store.address
              },
              date: new Date(apt.appointment_date + 'T' + apt.appointment_time),
              time: apt.appointment_time.substring(0, 5), // HH:MM
              status: apt.status
            };
          } catch (error) {
            console.error('Error loading appointment details:', error);
            return null;
          }
        })
      );
      
      setAppointments(displayAppointments.filter(apt => apt !== null) as AppointmentDisplay[]);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirections = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    // Universal link for Google Maps, works on iOS/Android
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    // Apple Maps specific link (will fallback to Google Maps or web if not on iOS)
    const appleMapsUrl = `maps://maps.apple.com/?q=${encodedAddress}`;
    
    // Check if user is on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      window.open(appleMapsUrl, '_blank');
    } else {
      window.open(googleMapsUrl, '_blank');
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    
    try {
      await cancelAppointmentAPI(selectedAppointment.id);
      
      // 如果取消的是newBooking，清除它
      if (newBooking && selectedAppointment.id === newBooking.id) {
        onClearNewBooking?.();
      }
      
      // 重新加载预约列表
      await loadAppointments();
      
      setIsCancelConfirmOpen(false);
      setIsManageDrawerOpen(false);
      toast.success("Appointment cancelled successfully", {
        description: "You can book again anytime.",
        style: {
          background: '#1a1a1a',
          border: '1px solid #D4AF3733',
          color: '#fff'
        }
      });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const handleReschedule = async () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) {
      toast.error('Please select both date and time');
      return;
    }
    
    try {
      const { updateAppointment } = await import('../services/appointments.service');
      
      await updateAppointment(selectedAppointment.id, {
        appointment_date: rescheduleDate.toISOString().split('T')[0],
        appointment_time: rescheduleTime
      });
      
      // 重新加载预约列表
      await loadAppointments();
      
      setIsRescheduleDrawerOpen(false);
      setIsManageDrawerOpen(false);
      setRescheduleDate(null);
      setRescheduleTime('');
      
      toast.success("Appointment rescheduled successfully", {
        description: `New time: ${rescheduleDate.toLocaleDateString()} at ${rescheduleTime}`,
        style: {
          background: '#1a1a1a',
          border: '1px solid #D4AF3733',
          color: '#fff'
        }
      });
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Failed to reschedule appointment');
    }
  };

  // 生成可用时间段（9:00 - 18:00，每30分钟一个时间段）
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break; // 最后一个时间段是18:00
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  return (
    <div className="min-h-screen bg-black animate-in fade-in duration-500 pb-24">
      {/* Header */}
      <div className="bg-black text-white px-6 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-[#D4AF37]/20 sticky top-0 z-10">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Appointments</h1>
        </div>
        {/* Tabs */}
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-6 py-2 rounded-full transition-colors text-sm font-bold ${
              activeTab === 'upcoming'
                ? 'bg-[#D4AF37] text-black'
                : 'bg-transparent text-gray-400 border border-[#333]'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-full transition-colors text-sm font-bold ${
              activeTab === 'history'
                ? 'bg-[#D4AF37] text-black'
                : 'bg-transparent text-gray-400 border border-[#333]'
            }`}
          >
            History
          </button>
        </div>
      </div>

      <div className="px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader />
          </div>
        ) : activeTab === 'upcoming' ? (
          <div className="space-y-4">
            {newBooking ? (
              <div className="bg-[#1a1a1a] border border-[#D4AF37]/30 rounded-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
                <div className="bg-[#D4AF37]/10 px-4 py-2 border-b border-[#D4AF37]/20 flex items-center justify-between">
                  <span className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest">Just Booked</span>
                  <CheckCircle2 className="w-3 h-3 text-[#D4AF37]" />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 pr-4">
                      {newBooking.services ? (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {newBooking.services.map((s: any) => (
                            <span key={s.id} className="px-2 py-0.5 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded text-[10px] font-bold uppercase tracking-wider">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="px-2 py-0.5 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded text-[10px] font-bold uppercase tracking-wider inline-block mb-2">
                          {newBooking.service?.name}
                        </div>
                      )}
                      <h3 className="text-white font-bold text-xl leading-tight mb-1">{newBooking.store?.name}</h3>
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                        <MapPin className="w-3 h-3" />
                        <span>{newBooking.store?.address}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="bg-[#D4AF37] text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                        Pay at salon
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-black/40 rounded-xl p-3 border border-[#333]">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Date</span>
                      </div>
                      <div className="text-white text-sm font-medium">
                        {newBooking.date?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="bg-black/40 rounded-xl p-3 border border-[#333]">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Time</span>
                      </div>
                      <div className="text-white text-sm font-medium">{newBooking.time}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <button 
                      onClick={() => handleDirections(newBooking.store?.address)}
                      className="flex-1 py-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl border border-[#D4AF37]/20 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                      <Navigation2 className="w-4 h-4" />
                      Directions
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedAppointment({
                          id: newBooking.id,
                          service: newBooking.service,
                          store: newBooking.store,
                          date: newBooking.date,
                          time: newBooking.time,
                          status: 'pending'
                        });
                        setIsManageDrawerOpen(true);
                      }}
                      className="flex-1 py-3 bg-[#1a1a1a] border border-[#333] text-white text-sm font-bold rounded-xl hover:bg-[#222] transition-colors"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            
            {/* 显示从后端API获取的预约列表 */}
            {appointments
              .filter(apt => apt.status === 'pending' || apt.status === 'confirmed')
              .map((apt) => (
                <div key={apt.id} className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1 pr-4">
                        <div className="px-2 py-0.5 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded text-[10px] font-bold uppercase tracking-wider inline-block mb-2">
                          {apt.service.name}
                        </div>
                        <h3 className="text-white font-bold text-xl leading-tight mb-1">{apt.store.name}</h3>
                        <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                          <MapPin className="w-3 h-3" />
                          <span>{apt.store.address}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="bg-[#D4AF37] text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                          Pay at salon
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-black/40 rounded-xl p-3 border border-[#333]">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Date</span>
                        </div>
                        <div className="text-white text-sm font-medium">
                          {apt.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="bg-black/40 rounded-xl p-3 border border-[#333]">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Time</span>
                        </div>
                        <div className="text-white text-sm font-medium">{apt.time}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <button 
                        onClick={() => handleDirections(apt.store.address)}
                        className="flex-1 py-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl border border-[#D4AF37]/20 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                      >
                        <Navigation2 className="w-4 h-4" />
                        Directions
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setIsManageDrawerOpen(true);
                        }}
                        className="flex-1 py-3 bg-[#1a1a1a] border border-[#333] text-white text-sm font-bold rounded-xl hover:bg-[#222] transition-colors"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            
            {/* 如果没有预约，显示空状态 */}
            {!newBooking && appointments.filter(apt => apt.status === 'pending' || apt.status === 'confirmed').length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-20 h-20 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-6 border border-[#333]">
                  <Calendar className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No upcoming appointments</h3>
                <p className="text-gray-400 text-sm mb-8 max-w-[260px]">
                  Looks like you haven't booked anything yet. Ready for a fresh new look?
                </p>
                <button 
                  onClick={() => onNavigate?.('services')}
                  className="w-full max-w-[200px] py-4 bg-[#D4AF37] hover:bg-[#b5952f] text-black font-bold rounded-xl transition-all active:scale-[0.98] shadow-[0_10px_20px_rgba(212,175,55,0.2)]"
                >
                  Book Now
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {appointments
              .filter(apt => apt.status === 'completed' || apt.status === 'cancelled')
              .map((apt) => (
                <div key={apt.id} className="bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden opacity-60">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 pr-4">
                        <div className="px-2 py-0.5 bg-gray-500/10 text-gray-500 border border-gray-500/20 rounded text-[10px] font-bold uppercase tracking-wider inline-block mb-2">
                          {apt.service.name}
                        </div>
                        <h3 className="text-white font-bold text-lg leading-tight mb-1">{apt.store.name}</h3>
                        <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                          <MapPin className="w-3 h-3" />
                          <span>{apt.store.address}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                          apt.status === 'completed' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {apt.status}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-black/40 rounded-xl p-3 border border-[#333]">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Date</span>
                        </div>
                        <div className="text-white text-sm font-medium">
                          {apt.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="bg-black/40 rounded-xl p-3 border border-[#333]">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Time</span>
                        </div>
                        <div className="text-white text-sm font-medium">{apt.time}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            
            {appointments.filter(apt => apt.status === 'completed' || apt.status === 'cancelled').length === 0 && (
              <div className="py-20 text-center">
                <p className="text-gray-500 text-sm">No past appointments found.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manage Appointment Drawer */}
      <Drawer open={isManageDrawerOpen} onOpenChange={setIsManageDrawerOpen}>
        <DrawerContent className="bg-[#121212] border-t border-[#333] text-white pb-8">
          <div className="mx-auto w-12 h-1.5 bg-[#333] rounded-full mt-3 mb-6" />
          <DrawerHeader className="pb-6">
            <DrawerTitle className="text-center text-xl font-bold tracking-tight">Manage Appointment</DrawerTitle>
            <DrawerDescription className="text-center text-gray-400 mt-1">
              Update or cancel your upcoming service
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-6 space-y-3">
            <button 
              className="w-full py-4 px-6 bg-[#1a1a1a] border border-[#333] rounded-2xl flex items-center justify-between hover:bg-[#222] transition-colors group"
              onClick={() => {
                setIsRescheduleDrawerOpen(true);
                setIsManageDrawerOpen(false);
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <span className="font-bold text-lg">Reschedule</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            
            <button 
              onClick={() => setIsCancelConfirmOpen(true)}
              className="w-full py-4 px-6 bg-[#1a1a1a] border border-red-500/20 rounded-2xl flex items-center justify-between hover:bg-red-500/5 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <span className="font-bold text-lg text-red-500">Cancel Appointment</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <DrawerFooter className="pt-6">
            <DrawerClose asChild>
              <button className="w-full py-4 font-bold text-gray-400 hover:text-white transition-colors">
                Back
              </button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Cancellation Confirmation Drawer */}
      <Drawer open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <DrawerContent className="bg-[#121212] border-t border-[#333] text-white pb-8">
          <div className="mx-auto w-12 h-1.5 bg-[#333] rounded-full mt-3 mb-6" />
          <DrawerHeader className="pb-2">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <DrawerTitle className="text-center text-xl font-bold tracking-tight">Cancel Appointment?</DrawerTitle>
            <DrawerDescription className="text-center text-gray-400 mt-2 px-6">
              Are you sure you want to cancel your appointment? This action cannot be undone.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-6 flex flex-col gap-3 mt-8">
            <button 
              onClick={handleCancelAppointment}
              className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all"
            >
              Yes, Cancel Appointment
            </button>
            <button 
              onClick={() => setIsCancelConfirmOpen(false)}
              className="w-full py-4 bg-[#1a1a1a] border border-[#333] text-white font-bold rounded-2xl hover:bg-[#222] transition-colors"
            >
              No, Keep It
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Reschedule Drawer */}
      <Drawer open={isRescheduleDrawerOpen} onOpenChange={setIsRescheduleDrawerOpen}>
        <DrawerContent className="bg-black border-[#D4AF37]/20 text-white max-h-[90vh]">
          <DrawerHeader className="border-b border-[#D4AF37]/20 px-6">
            <DrawerTitle className="text-2xl font-bold">Reschedule Appointment</DrawerTitle>
            <DrawerDescription className="text-gray-400">
              Choose a new date and time for your service
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-6 py-6 space-y-6 overflow-y-auto">
            {/* Current Appointment Info */}
            {selectedAppointment && (
              <div className="p-4 bg-[#1a1a1a] border border-[#333] rounded-2xl">
                <div className="text-sm text-gray-400 mb-2">Current Appointment</div>
                <div className="font-bold text-lg text-[#D4AF37]">{selectedAppointment.service.name}</div>
                <div className="text-gray-300 mt-1">{selectedAppointment.store.name}</div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                  <span>{selectedAppointment.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span>{selectedAppointment.time}</span>
                </div>
              </div>
            )}

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-3">Select New Date</label>
              <input
                type="date"
                value={rescheduleDate ? rescheduleDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setRescheduleDate(new Date(e.target.value))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-white focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            {/* Time Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-3">Select New Time</label>
              <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                {generateTimeSlots().map((time) => (
                  <button
                    key={time}
                    onClick={() => setRescheduleTime(time)}
                    className={`py-3 px-2 rounded-xl font-medium transition-all ${
                      rescheduleTime === time
                        ? 'bg-[#D4AF37] text-black'
                        : 'bg-[#1a1a1a] border border-[#333] text-white hover:bg-[#222]'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DrawerFooter className="border-t border-[#D4AF37]/20 px-6 py-4">
            <button
              onClick={handleReschedule}
              disabled={!rescheduleDate || !rescheduleTime}
              className="w-full py-4 bg-[#D4AF37] text-black font-bold rounded-2xl hover:bg-[#C5A028] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Reschedule
            </button>
            <DrawerClose asChild>
              <button className="w-full py-4 font-bold text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}