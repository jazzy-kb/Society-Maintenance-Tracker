import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, Clock, DollarSign, Users, AlertCircle, 
  CheckCircle2, XCircle, Trash2, Calendar, ClipboardList,
  Sparkles, ShieldCheck, AlertTriangle
} from 'lucide-react';
import api from '../../api/client';
import type { Amenity, BookingDetailed } from '../../types';
import { formatDate } from '../../utils/cn';
import toast from 'react-hot-toast';

export default function ResidentBookings() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [bookings, setBookings] = useState<BookingDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [bookingDate, setBookingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [submitting, setSubmitting] = useState(false);
  
  // Bookings overlapping on selected date for the selected amenity
  const [dayBookings, setDayBookings] = useState<BookingDetailed[]>([]);

  useEffect(() => {
    fetchAmenities();
    fetchMyBookings();
  }, []);

  useEffect(() => {
    if (selectedAmenity) {
      fetchDayBookings();
    }
  }, [selectedAmenity, bookingDate]);

  const fetchAmenities = async () => {
    try {
      const res = await api.get('/bookings/amenities');
      setAmenities(res.data);
      if (res.data.length > 0) {
        setSelectedAmenity(res.data[0]);
      }
    } catch {
      toast.error('Failed to load amenities catalog');
    }
  };

  const fetchMyBookings = async () => {
    try {
      const res = await api.get('/bookings');
      setBookings(res.data);
    } catch {
      toast.error('Failed to load your bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchDayBookings = async () => {
    if (!selectedAmenity) return;
    try {
      const res = await api.get(`/bookings?amenity_id=${selectedAmenity.id}&date=${bookingDate}`);
      setDayBookings(res.data);
    } catch (err) {
      console.error('Failed to check slot availability');
    }
  };

  // Helper: Live Cost Calculator
  const getCalculatedCost = () => {
    if (!selectedAmenity) return 0;
    try {
      const start = new Date(`${bookingDate}T${startTime}`);
      const end = new Date(`${bookingDate}T${endTime}`);
      const diffMs = end.getTime() - start.getTime();
      if (diffMs <= 0) return 0;
      const hours = diffMs / (1000 * 60 * 60);
      return Math.round(hours * selectedAmenity.hourly_fee * 100) / 100;
    } catch {
      return 0;
    }
  };

  // Helper: Duration in hours
  const getDurationHours = () => {
    const start = new Date(`${bookingDate}T${startTime}`);
    const end = new Date(`${bookingDate}T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 0;
    return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAmenity) return;

    const startDateTime = new Date(`${bookingDate}T${startTime}`);
    const endDateTime = new Date(`${bookingDate}T${endTime}`);

    if (startDateTime < new Date()) {
      toast.error('Start time cannot be in the past');
      return;
    }

    if (endDateTime <= startDateTime) {
      toast.error('End time must be after start time');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/bookings', {
        amenity_id: selectedAmenity.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString()
      });

      if (res.data.status === 'approved') {
        toast.success(`🎉 Reservation Auto-Approved for ${selectedAmenity.name}!`);
      } else if (res.data.status === 'flagged_conflict' || res.data.is_flagged) {
        toast.error(`⚠️ Slot Clash Detected: Request flagged for admin review.`);
      } else {
        toast.success(`Booking created for ${selectedAmenity.name}`);
      }

      fetchMyBookings();
      fetchDayBookings();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to book slot. Check daily limits.';
      toast.error(msg, { duration: 5000 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.put(`/bookings/${id}/cancel`);
      toast.success('Booking cancelled successfully');
      fetchMyBookings();
      if (selectedAmenity) {
        fetchDayBookings();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to cancel booking');
    }
  };

  const formatDateTime = (dtStr: string) => {
    const d = new Date(dtStr);
    return d.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
          <CalendarDays className="h-7 w-7 text-primary-600" />
          Facility & Amenity Reservations
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Instant autonomous slot allotment, live vacancy validation, and booking manager for society facilities
        </p>
      </div>

      {/* Select Amenity Catalog */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {amenities.map((amenity) => {
          const isSelected = selectedAmenity?.id === amenity.id;
          return (
            <button
              key={amenity.id}
              onClick={() => setSelectedAmenity(amenity)}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden shadow-card group ${
                isSelected
                  ? 'border-primary-500 bg-primary-50/40 ring-2 ring-primary-500/20'
                  : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-card-hover'
              }`}
            >
              <div className="flex items-start justify-between">
                <h3 className={`font-black text-base transition-colors ${isSelected ? 'text-primary-900' : 'text-gray-900 group-hover:text-primary-600'}`}>
                  {amenity.name}
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {amenity.hourly_fee > 0 ? `$${amenity.hourly_fee}/hr` : 'Free'}
                </span>
              </div>
              
              <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[32px]">
                {amenity.description || 'Society common amenity'}
              </p>
              
              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-primary-700 bg-primary-50/70 px-2 py-1 rounded-lg font-semibold">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-primary-600" />
                  {amenity.open_time || '06:00'} - {amenity.close_time || '22:00'}
                </span>
                <span className="text-[10px] text-gray-500 font-medium">Daily</span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                <span className="flex items-center gap-1 font-semibold">
                  <Users className="h-3.5 w-3.5 text-primary-500" />
                  Cap: {amenity.capacity} {amenity.capacity === 1 ? 'slot' : 'slots'}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400 justify-end">
                  <Clock className="h-3 w-3 text-gray-400" />
                  Max {amenity.max_daily_hours_per_flat}h/flat
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Booking Form + Availability Timeline */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-2">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary-600" />
                  Schedule Reservation for {selectedAmenity?.name || 'Facility'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Operating Hours: <strong className="text-primary-700 font-bold">{selectedAmenity?.open_time || '06:00'} to {selectedAmenity?.close_time || '22:00'}</strong> · Instant auto-approval for open slots
                </p>
              </div>
              <span className="text-xs font-bold bg-primary-50 text-primary-700 px-3 py-1 rounded-full self-start sm:self-auto">
                {selectedAmenity?.capacity === 1 ? 'Exclusive Facility' : `${selectedAmenity?.capacity} Concurrent Slots`}
              </span>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Reservation Date
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    step="1800"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    step="1800"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {/* Slot Availability Visualizer */}
              <div className="bg-gray-50/80 rounded-2xl p-4.5 border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Existing Reservations on {bookingDate}
                  </span>
                  <span className="text-xs text-gray-400">
                    {dayBookings.filter(b => b.status === 'approved').length} slot(s) booked
                  </span>
                </div>
                
                {dayBookings.filter(b => b.status === 'approved').length === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    All spots available. No conflicting reservations booked on this date.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {dayBookings.filter(b => b.status === 'approved').map((b) => {
                      const sTime = new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const eTime = new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={b.id} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
                          <span className="text-gray-800 font-semibold">
                            Reserved: {sTime} - {eTime}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[10px] uppercase border border-amber-200">
                            {selectedAmenity?.capacity === 1 ? 'Booked exclusive' : `Occupied (${selectedAmenity?.capacity} max)`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cost & Cap Summary */}
              {selectedAmenity && (
                <div className="bg-primary-50/50 border border-primary-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-primary-700 uppercase block">Estimated Reservation</span>
                    <p className="text-sm text-gray-700 mt-1">
                      Duration: <strong className="text-gray-900 font-bold">{getDurationHours()} hrs</strong> · 
                      Rate: <strong className="text-gray-900 font-bold">${selectedAmenity.hourly_fee}/hr</strong>
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <span className="text-xs font-bold text-primary-700 uppercase block">Total Fee</span>
                    <p className="text-3xl font-black text-gray-900">
                      ${getCalculatedCost()}
                    </p>
                  </div>
                </div>
              )}

              {/* Warnings and Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                <div className="flex items-start gap-2 max-w-md text-xs text-gray-500 leading-relaxed">
                  <AlertCircle className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
                  <span>
                    Enforces max {selectedAmenity?.max_daily_hours_per_flat} hours reservation per flat daily. Immediate auto-approval for available slots.
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-glow active:scale-95 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {submitting ? 'Confirming...' : 'Request Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* My Booking History */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 flex flex-col h-full">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary-600" />
              My Bookings
            </h3>

            {loading ? (
              <div className="text-gray-400 text-sm py-12 text-center">Loading reservations...</div>
            ) : bookings.length === 0 ? (
              <div className="text-gray-400 text-sm py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                <CalendarDays className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p>No bookings placed yet.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
                {bookings.map((booking) => {
                  const isApproved = booking.status === 'approved';
                  const isFlagged = booking.status === 'flagged_conflict' || booking.is_flagged;
                  return (
                    <div 
                      key={booking.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isApproved
                          ? 'bg-white border-gray-200 shadow-sm'
                          : isFlagged
                          ? 'bg-amber-50/60 border-amber-200 shadow-sm'
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">
                            {booking.amenity?.name || 'Facility'}
                          </h4>
                          <span className="text-xs text-gray-500 block mt-0.5">
                            {formatDateTime(booking.start_time)} - {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Confirmed
                          </span>
                        )}
                        {isFlagged && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full uppercase">
                            <AlertTriangle className="h-3 w-3 text-amber-600" /> Slot Clash
                          </span>
                        )}
                        {booking.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full uppercase">
                            <XCircle className="h-3 w-3" /> Cancelled
                          </span>
                        )}
                      </div>

                      {booking.conflict_note && isFlagged && (
                        <p className="text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded-lg mt-2 font-medium">
                          {booking.conflict_note}
                        </p>
                      )}

                      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-900">
                          Fee: ${booking.total_fee}
                        </span>
                        
                        {(isApproved || isFlagged) && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="text-gray-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                            title="Cancel Booking"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
