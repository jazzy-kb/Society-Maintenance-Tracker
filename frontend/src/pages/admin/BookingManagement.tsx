import React, { useState, useEffect } from 'react';
import {
  CalendarDays, Settings, Users, Plus, Pencil, Trash2,
  Search, Clock, DollarSign, XCircle, CheckCircle2,
  Calendar, Building2, AlertTriangle, ShieldCheck,
  TrendingUp, BarChart3, Activity, Check, X, ShieldAlert,
  ArrowUpRight, Sparkles, RefreshCw
} from 'lucide-react';
import api from '../../api/client';
import type { Amenity, BookingDetailed, AmenityAnalytics30d, AmenityLog } from '../../types';
import { formatDateTime, formatDate } from '../../utils/cn';
import toast from 'react-hot-toast';

export default function BookingManagement() {
  const [activeTab, setActiveTab] = useState<'allotment' | 'performance' | 'logs' | 'facilities'>('allotment');
  
  // Data States
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [bookings, setBookings] = useState<BookingDetailed[]>([]);
  const [analytics, setAnalytics] = useState<AmenityAnalytics30d[]>([]);
  const [logs, setLogs] = useState<AmenityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterAmenity, setFilterAmenity] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');

  // Editor Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formHourlyFee, setFormHourlyFee] = useState('0');
  const [formMaxHours, setFormMaxHours] = useState('2');
  const [formCapacity, setFormCapacity] = useState('1');
  const [formOpenTime, setFormOpenTime] = useState('06:00');
  const [formCloseTime, setFormCloseTime] = useState('22:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [filterDate, filterAmenity]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      let url = '/bookings?';
      if (filterDate) url += `date=${filterDate}&`;
      if (filterAmenity) url += `amenity_id=${filterAmenity}&`;

      const [amenitiesRes, bookingsRes, analyticsRes, logsRes] = await Promise.all([
        api.get('/bookings/amenities'),
        api.get(url),
        api.get('/bookings/analytics-30d'),
        api.get('/bookings/logs?limit=100'),
      ]);

      setAmenities(amenitiesRes.data);
      setBookings(bookingsRes.data);
      setAnalytics(analyticsRes.data);
      setLogs(logsRes.data);
    } catch {
      toast.error('Failed to load amenity management data');
    } finally {
      setLoading(false);
    }
  };

  // Allotment Actions
  const handleApproveBooking = async (id: number) => {
    try {
      await api.put(`/bookings/${id}/approve`);
      toast.success('Reservation approved & slot confirmed!');
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to approve booking');
    }
  };

  const handleRejectBooking = async (id: number) => {
    const reason = prompt('Enter rejection reason (optional):', 'Slot clash with earlier booking');
    if (reason === null) return;
    try {
      await api.put(`/bookings/${id}/reject?reason=${encodeURIComponent(reason || 'Slot unavailable')}`);
      toast.success('Reservation rejected & notification dispatched');
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to reject booking');
    }
  };

  const handleCancelBooking = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this resident booking reservation?')) return;
    try {
      await api.put(`/bookings/${id}/cancel`);
      toast.success('Reservation cancelled & slot released');
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to cancel booking');
    }
  };

  // Facility Edit / Create Helpers
  const openCreateModal = () => {
    setEditingAmenity(null);
    setFormName('');
    setFormDescription('');
    setFormHourlyFee('0');
    setFormMaxHours('2');
    setFormCapacity('1');
    setFormOpenTime('06:00');
    setFormCloseTime('22:00');
    setShowModal(true);
  };

  const openEditModal = (amenity: Amenity) => {
    setEditingAmenity(amenity);
    setFormName(amenity.name);
    setFormDescription(amenity.description || '');
    setFormHourlyFee(amenity.hourly_fee.toString());
    setFormMaxHours(amenity.max_daily_hours_per_flat.toString());
    setFormCapacity(amenity.capacity.toString());
    setFormOpenTime(amenity.open_time || '06:00');
    setFormCloseTime(amenity.close_time || '22:00');
    setShowModal(true);
  };

  const handleSaveAmenity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Facility name is required');
      return;
    }

    const payload = {
      name: formName,
      description: formDescription,
      hourly_fee: parseFloat(formHourlyFee) || 0,
      max_daily_hours_per_flat: parseInt(formMaxHours) || 2,
      capacity: parseInt(formCapacity) || 1,
      open_time: formOpenTime || '06:00',
      close_time: formCloseTime || '22:00',
    };

    setSaving(true);
    try {
      if (editingAmenity) {
        await api.put(`/bookings/amenities/${editingAmenity.id}`, payload);
        toast.success(`Updated facility '${formName}'`);
      } else {
        await api.post('/bookings/amenities', payload);
        toast.success(`Created facility '${formName}'`);
      }
      setShowModal(false);
      fetchAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error saving facility config');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAmenity = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete '${name}'? Future reservations remain logged but active slots are hidden.`)) return;
    try {
      await api.delete(`/bookings/amenities/${id}`);
      toast.success(`Facility '${name}' deactivated successfully`);
      fetchAllData();
    } catch {
      toast.error('Failed to delete amenity');
    }
  };

  // Filter Bookings matching search query & status
  const filteredBookings = bookings.filter(b => {
    if (filterStatus && b.status !== filterStatus) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const residentName = b.resident?.name?.toLowerCase() || '';
    const flatNo = b.resident?.flat_number?.toLowerCase() || '';
    const tower = b.resident?.tower?.toLowerCase() || '';
    const amenityName = b.amenity?.name?.toLowerCase() || '';
    return residentName.includes(q) || flatNo.includes(q) || tower.includes(q) || amenityName.includes(q);
  });

  // Filter Data Logs
  const filteredLogs = logs.filter(l => {
    if (!logSearchQuery) return true;
    const q = logSearchQuery.toLowerCase();
    const rName = l.resident_name?.toLowerCase() || '';
    const act = l.action?.toLowerCase() || '';
    const det = l.details?.toLowerCase() || '';
    const flat = l.flat_number?.toLowerCase() || '';
    return rName.includes(q) || act.includes(q) || det.includes(q) || flat.includes(q);
  });

  // Calculate Aggregates for 30d performance
  const totalBookings30d = analytics.reduce((acc, a) => acc + a.total_bookings_30d, 0);
  const totalHours30d = analytics.reduce((acc, a) => acc + a.total_hours_30d, 0);
  const totalRevenue30d = analytics.reduce((acc, a) => acc + a.total_revenue_30d, 0);
  const avgUtilizationRate = analytics.length > 0
    ? Math.round(analytics.reduce((acc, a) => acc + a.utilization_rate_pct, 0) / analytics.length)
    : 0;

  const flaggedClashesCount = bookings.filter(b => b.status === 'flagged_conflict' || b.is_flagged).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
            <CalendarDays className="h-7 w-7 text-primary-600" />
            Facility & Amenity Control Hub
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Autonomous allotment engine, real-time vacancy monitor, 30-day analytics & facility parameters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllData}
            className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-all shadow-sm"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-600' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium text-sm transition-all shadow-glow"
          >
            <Plus className="h-4 w-4" />
            Add Facility
          </button>
        </div>
      </div>

      {/* Flagged Clash Notice Banner (if any) */}
      {flaggedClashesCount > 0 && activeTab === 'allotment' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4.5 shadow-sm flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-amber-900 text-sm">
              {flaggedClashesCount} Slot Clash Conflict{flaggedClashesCount > 1 ? 's' : ''} Detected
            </h4>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              The autonomous allocation engine auto-allotted the slot to earlier applicants and flagged conflicting attempts for your review.
            </p>
          </div>
          <button
            onClick={() => setFilterStatus('flagged_conflict')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors shrink-0"
          >
            View Clashes
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-3 rounded-2xl border shadow-card gap-1">
        <button
          onClick={() => { setActiveTab('allotment'); setFilterStatus(''); }}
          className={`px-5 py-3.5 text-sm font-bold transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'allotment'
              ? 'text-primary-600 border-primary-600 bg-primary-50/50'
              : 'text-gray-500 border-transparent hover:text-gray-900'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Allotments & Approvals
          {flaggedClashesCount > 0 && (
            <span className="ml-1 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
              {flaggedClashesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`px-5 py-3.5 text-sm font-bold transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'performance'
              ? 'text-primary-600 border-primary-600 bg-primary-50/50'
              : 'text-gray-500 border-transparent hover:text-gray-900'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          30-Day Facility Performance
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-5 py-3.5 text-sm font-bold transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'logs'
              ? 'text-primary-600 border-primary-600 bg-primary-50/50'
              : 'text-gray-500 border-transparent hover:text-gray-900'
          }`}
        >
          <Activity className="h-4 w-4" />
          Amenity Data Logs
        </button>

        <button
          onClick={() => setActiveTab('facilities')}
          className={`px-5 py-3.5 text-sm font-bold transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'facilities'
              ? 'text-primary-600 border-primary-600 bg-primary-50/50'
              : 'text-gray-500 border-transparent hover:text-gray-900'
          }`}
        >
          <Settings className="h-4 w-4" />
          Facility Parameters ({amenities.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALLOTMENTS & APPROVALS MONITOR */}
      {/* ========================================================================= */}
      {activeTab === 'allotment' && (
        <div className="space-y-6">
          {/* Quick Stat Highlights */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Total Bookings</span>
              <p className="text-2xl font-black text-gray-900 mt-1">{bookings.length}</p>
              <p className="text-xs text-primary-600 mt-0.5 font-medium">All reservations logged</p>
            </div>
            <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-card">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Auto-Approved Slots</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {bookings.filter(b => b.status === 'approved').length}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5 font-medium">Capacity verified & confirmed</p>
            </div>
            <div className="bg-white border border-amber-100 rounded-2xl p-5 shadow-card">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">Flagged Slot Clashes</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{flaggedClashesCount}</p>
              <p className="text-xs text-amber-600 mt-0.5 font-medium">Conflicts requiring review</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Active Facilities</span>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {amenities.filter(a => a.is_active).length}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Bookable common areas</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search resident, flat, tower..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <select
                value={filterAmenity}
                onChange={(e) => setFilterAmenity(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              >
                <option value="">All Facilities</option>
                {amenities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              >
                <option value="">All Allotment Statuses</option>
                <option value="approved">Auto-Approved / Confirmed</option>
                <option value="flagged_conflict">Flagged Conflict (Clashes)</option>
                <option value="cancelled">Cancelled / Revoked</option>
              </select>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-card overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="font-semibold text-gray-600">No allotment records found matching criteria.</p>
                <p className="text-xs text-gray-400 mt-1">Try clearing filters or changing dates.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                      <th className="p-4 pl-6">Facility</th>
                      <th className="p-4">Resident & Flat</th>
                      <th className="p-4">Reserved Time Window</th>
                      <th className="p-4">Fee</th>
                      <th className="p-4">Allocation Status</th>
                      <th className="p-4 pr-6 text-right">Admin Allotment Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {filteredBookings.map((b) => {
                      const isApproved = b.status === 'approved';
                      const isFlagged = b.status === 'flagged_conflict' || b.is_flagged;
                      const isCancelled = b.status === 'cancelled';

                      return (
                        <tr key={b.id} className={`hover:bg-gray-50/80 transition-colors ${isFlagged ? 'bg-amber-50/40' : ''}`}>
                          <td className="p-4 pl-6">
                            <span className="font-bold text-gray-900 block">{b.amenity?.name || 'Facility'}</span>
                            <span className="text-xs text-gray-400">${b.amenity?.hourly_fee || 0}/hr · Cap: {b.amenity?.capacity || 1}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-gray-900 block">{b.resident?.name || 'Resident'}</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-gray-400" />
                              Flat {b.resident?.flat_number || '—'} · Tower {b.resident?.tower || '—'}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-medium text-gray-600">
                            <div>{formatDate(b.start_time)}</div>
                            <div className="text-gray-400 font-mono mt-0.5">
                              {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="p-4 font-bold text-gray-900">
                            {b.total_fee > 0 ? `$${b.total_fee}` : <span className="text-emerald-600 font-bold text-xs">FREE</span>}
                          </td>
                          <td className="p-4 text-xs">
                            {isApproved && (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Auto-Approved
                                </span>
                                {b.conflict_note && (
                                  <span className="block text-[10px] text-gray-400 mt-1 italic line-clamp-1">{b.conflict_note}</span>
                                )}
                              </div>
                            )}
                            {isFlagged && (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px] bg-amber-100 text-amber-800 border border-amber-300">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  Slot Clash Flagged
                                </span>
                                {b.conflict_note && (
                                  <span className="block text-[10px] text-amber-800 mt-1 font-medium line-clamp-2">{b.conflict_note}</span>
                                )}
                              </div>
                            )}
                            {isCancelled && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] bg-gray-100 text-gray-600">
                                <XCircle className="w-3.5 h-3.5 text-gray-400" />
                                Cancelled
                              </span>
                            )}
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isFlagged && (
                                <>
                                  <button
                                    onClick={() => handleApproveBooking(b.id)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                    title="Manually override clash and approve"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectBooking(b.id)}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                    title="Decline conflicting booking"
                                  >
                                    <X className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </>
                              )}
                              {isApproved && (
                                <button
                                  onClick={() => handleCancelBooking(b.id)}
                                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                                >
                                  Revoke Slot
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 1-MONTH (30-DAY) FACILITY PERFORMANCE DASHBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Monthly KPI Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">30-Day Bookings</span>
              <p className="text-3xl font-black text-gray-900 mt-1">{totalBookings30d}</p>
              <p className="text-xs text-primary-600 mt-1 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Total activity logged
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Hours Utilized</span>
              <p className="text-3xl font-black text-indigo-600 mt-1">{totalHours30d.toFixed(1)} hrs</p>
              <p className="text-xs text-gray-500 mt-1">Confirmed booking duration</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Revenue Collected</span>
              <p className="text-3xl font-black text-emerald-600 mt-1">${totalRevenue30d.toFixed(2)}</p>
              <p className="text-xs text-emerald-600 mt-1 font-semibold">Facility usage fees</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Avg Utilization Rate</span>
              <p className="text-3xl font-black text-purple-600 mt-1">{avgUtilizationRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Across 16 daily operating hrs</p>
            </div>
          </div>

          {/* Individual Amenity 30-Day Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {analytics.map((item) => (
              <div key={item.amenity_id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-card space-y-4 hover:shadow-card-hover transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary-50 text-primary-700">
                      Cap: {item.capacity} {item.capacity === 1 ? 'Slot' : 'Slots'}
                    </span>
                    <h3 className="font-black text-lg text-gray-900 mt-1.5">{item.name}</h3>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">
                    {item.hourly_fee > 0 ? `$${item.hourly_fee}/hr` : 'Free'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100 text-center">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Bookings</span>
                    <p className="text-base font-black text-gray-900 mt-0.5">{item.total_bookings_30d}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Hours</span>
                    <p className="text-base font-black text-indigo-600 mt-0.5">{item.total_hours_30d}h</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Revenue</span>
                    <p className="text-base font-black text-emerald-600 mt-0.5">${item.total_revenue_30d}</p>
                  </div>
                </div>

                {/* Utilization Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-500">30-Day Utilization</span>
                    <span className="text-primary-600 font-bold">{item.utilization_rate_pct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, item.utilization_rate_pct))}%` }}
                    />
                  </div>
                </div>

                {/* Breakdown Badges */}
                <div className="flex items-center justify-between text-[11px] pt-1 text-gray-500">
                  <span className="text-emerald-700 font-semibold">{item.approved_count} Confirmed</span>
                  {item.flagged_conflict_count > 0 && (
                    <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">
                      {item.flagged_conflict_count} Clashes
                    </span>
                  )}
                  <span className="text-gray-400">{item.cancelled_count} Cancelled</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AMENITY DATA LOGS & AUDIT TRAIL */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-card flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search amenity data logs by resident, action, details..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
              />
            </div>
            <span className="text-xs font-semibold text-gray-500">
              Showing {filteredLogs.length} activity records
            </span>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-card overflow-hidden">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                No activity logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-bold border-b border-gray-100">
                    <tr>
                      <th className="p-4 pl-6">Timestamp</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Resident & Location</th>
                      <th className="p-4 pr-6">Transaction Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 pl-6 text-xs text-gray-500 font-medium whitespace-nowrap">
                          {log.timestamp ? formatDateTime(log.timestamp) : '—'}
                        </td>
                        <td className="p-4">
                          <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                            log.action.includes('auto') || log.action.includes('approve')
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.action.includes('conflict') || log.action.includes('clash')
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : log.action.includes('cancel') || log.action.includes('delete')
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-primary-50 text-primary-700'
                          }`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-gray-900 block text-xs">{log.resident_name}</span>
                          <span className="text-[11px] text-gray-400">Flat {log.flat_number} · Tower {log.tower}</span>
                        </td>
                        <td className="p-4 pr-6 text-xs text-gray-600">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FACILITY PARAMETERS CONFIGURATOR */}
      {/* ========================================================================= */}
      {activeTab === 'facilities' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {amenities.map((amenity) => (
            <div
              key={amenity.id}
              className="bg-white border border-gray-100 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-4">
                  <h3 className="font-black text-xl text-gray-900">{amenity.name}</h3>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    amenity.is_active ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-gray-500 bg-gray-100'
                  }`}>
                    {amenity.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2 min-h-[40px]">
                  {amenity.description || 'No description provided.'}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-700">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Hourly Fee</span>
                    <p className="text-base font-black text-gray-900 mt-0.5">${amenity.hourly_fee}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Capacity</span>
                    <p className="text-base font-black text-primary-600 mt-0.5">{amenity.capacity} slots</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Max Daily Usage</span>
                    <p className="text-sm font-semibold text-gray-800">{amenity.max_daily_hours_per_flat} Hours/Flat</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Operating Hours</span>
                    <p className="text-sm font-semibold text-primary-700">{amenity.open_time || '06:00'} - {amenity.close_time || '22:00'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={() => openEditModal(amenity)}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-primary-600 bg-gray-50 hover:bg-primary-50 px-3 py-1.5 rounded-xl border border-gray-200 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                {amenity.is_active && (
                  <button
                    onClick={() => handleDeleteAmenity(amenity.id, amenity.name)}
                    className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Facility Edit / Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 border border-gray-100 animate-bounce-in space-y-4">
            <h3 className="text-lg font-black text-gray-900">
              {editingAmenity ? `Edit ${editingAmenity.name}` : 'Add New Amenity Facility'}
            </h3>

            <form onSubmit={handleSaveAmenity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Badminton Court"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Location, details, gear requirements..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Hourly Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formHourlyFee}
                    onChange={(e) => setFormHourlyFee(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Max Daily Hrs / Flat</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    required
                    value={formMaxHours}
                    onChange={(e) => setFormMaxHours(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Open Time</label>
                  <input
                    type="time"
                    required
                    value={formOpenTime}
                    onChange={(e) => setFormOpenTime(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Close Time</label>
                  <input
                    type="time"
                    required
                    value={formCloseTime}
                    onChange={(e) => setFormCloseTime(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Concurrent Capacity (Slots)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  placeholder="1 for exclusive court, 5 for shared gym"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm rounded-xl shadow-glow disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Parameters'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
