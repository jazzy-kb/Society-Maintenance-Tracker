import React, { useState, useEffect } from 'react';
import {
  UserCheck, Plus, Copy, Share2, Check, XCircle, Clock,
  Car, Package, ShieldCheck, Phone, CheckCircle2, User, Wrench, Sparkles,
  Trash2, AlertCircle, AlertTriangle
} from 'lucide-react';
import api from '../../api/client';
import type { VisitorPass, PassQuotaStatus } from '../../types';
import toast from 'react-hot-toast';

export default function ResidentVisitorPasses() {
  const [passes, setPasses] = useState<VisitorPass[]>([]);
  const [quotaStatus, setQuotaStatus] = useState<PassQuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // Modal form state
  const [showModal, setShowModal] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorType, setVisitorType] = useState<VisitorPass['visitor_type']>('guest');
  const [purpose, setPurpose] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [validHours, setValidHours] = useState('24');
  const [submitting, setSubmitting] = useState(false);

  // Copy state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  // Update default validity when changing visitor type
  useEffect(() => {
    if (visitorType === 'daily_help') {
      setValidHours('720'); // 1 Month default for Daily Help
    } else if (validHours === '720' || validHours === '1440' || validHours === '4320') {
      setValidHours('24');
    }
  }, [visitorType]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [passesRes, quotaRes] = await Promise.all([
        api.get('/visitors/my-passes'),
        api.get('/visitors/quota-status')
      ]);
      setPasses(passesRes.data);
      setQuotaStatus(quotaRes.data);
    } catch {
      toast.error('Failed to load visitor passes and quota status');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !visitorPhone.trim()) {
      toast.error('Visitor name and phone number are required');
      return;
    }

    if (quotaStatus && quotaStatus[visitorType]?.is_exhausted) {
      toast.error(`Cannot create pass: Maximum quota of ${quotaStatus[visitorType].limit} passes reached for ${quotaStatus[visitorType].label}.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        visitor_name: visitorName,
        visitor_phone: visitorPhone,
        visitor_type: visitorType,
        purpose: purpose || undefined,
        vehicle_number: vehicleNumber || undefined,
        valid_hours: parseInt(validHours) || (visitorType === 'daily_help' ? 720 : 24),
      };

      const res = await api.post('/visitors/passes', payload);
      toast.success(`Digital Pass Generated! Code: ${res.data.pass_code}`);
      setShowModal(false);
      // Reset form
      setVisitorName('');
      setVisitorPhone('');
      setPurpose('');
      setVehicleNumber('');
      setValidHours('24');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create pass');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPass = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this visitor pass?')) return;
    try {
      await api.put(`/visitors/passes/${id}/cancel`);
      toast.success('Visitor pass cancelled');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to cancel pass');
    }
  };

  const handleDeletePass = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this pass record from history?')) return;
    try {
      await api.delete(`/visitors/passes/${id}`);
      toast.success('Pass history record deleted');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete pass record');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Pass code ${code} copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSharePass = (pass: VisitorPass) => {
    const text = `🚪 Society Entry Pass\nVisitor: ${pass.visitor_name}\nPass Code: ${pass.pass_code}\nFlat: ${pass.flat_number || ''} (Tower ${pass.tower || ''})\nPlease show this code to Security Gate.`;
    if (navigator.share) {
      navigator.share({ title: 'Visitor Digital Pass', text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Pass details copied for WhatsApp/SMS share!');
    }
  };

  const getVisitorIcon = (type: VisitorPass['visitor_type']) => {
    switch (type) {
      case 'delivery': return <Package className="w-5 h-5 text-amber-600" />;
      case 'cab': return <Car className="w-5 h-5 text-emerald-600" />;
      case 'daily_help': return <Sparkles className="w-5 h-5 text-purple-600" />;
      case 'service': return <Wrench className="w-5 h-5 text-blue-600" />;
      default: return <User className="w-5 h-5 text-primary-600" />;
    }
  };

  const formatDateTime = (dtStr?: string) => {
    if (!dtStr) return '—';
    const d = new Date(dtStr);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const activePasses = passes.filter(p => ['approved', 'checked_in'].includes(p.status));
  const pastPasses = passes.filter(p => ['checked_out', 'expired', 'cancelled'].includes(p.status));
  const displayedPasses = activeTab === 'active' ? activePasses : pastPasses;

  // Selected type quota check
  const selectedQuota = quotaStatus ? quotaStatus[visitorType] : null;
  const isSelectedExhausted = selectedQuota?.is_exhausted || false;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-primary-600" />
            Visitor & Gate Passes
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Pre-approve guests, delivery agents, cabs, daily help, and service technicians with 6-digit gate access codes
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium text-sm transition-all shadow-glow self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Create Visitor Pass
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PASS QUOTAS & ALLOCATION TRACKER (ALL 5 CATEGORIES) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Guests */}
        <div className={`bg-white border rounded-2xl p-4 shadow-card flex flex-col justify-between transition-all ${
          quotaStatus?.guest.is_exhausted ? 'border-rose-200 bg-rose-50/20' : 'border-gray-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Guest Quota</span>
            <User className="w-4 h-4 text-primary-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-gray-900">
              {quotaStatus?.guest.used ?? 0} <span className="text-xs text-gray-400 font-semibold">/ {quotaStatus?.guest.limit ?? 3}</span>
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              quotaStatus?.guest.is_exhausted ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {quotaStatus?.guest.is_exhausted ? 'Exhausted' : `${quotaStatus?.guest.remaining ?? 3} Left Today`}
            </span>
          </div>
        </div>

        {/* 2. Service Tech */}
        <div className={`bg-white border rounded-2xl p-4 shadow-card flex flex-col justify-between transition-all ${
          quotaStatus?.service.is_exhausted ? 'border-rose-200 bg-rose-50/20' : 'border-gray-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tech / Service</span>
            <Wrench className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-gray-900">
              {quotaStatus?.service.used ?? 0} <span className="text-xs text-gray-400 font-semibold">/ {quotaStatus?.service.limit ?? 2}</span>
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              quotaStatus?.service.is_exhausted ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {quotaStatus?.service.is_exhausted ? 'Exhausted' : `${quotaStatus?.service.remaining ?? 2} Left Today`}
            </span>
          </div>
        </div>

        {/* 3. Daily Help */}
        <div className={`bg-white border rounded-2xl p-4 shadow-card flex flex-col justify-between transition-all ${
          quotaStatus?.daily_help.is_exhausted ? 'border-rose-200 bg-rose-50/20' : 'border-purple-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Daily Help (Maid)</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-purple-900">
              {quotaStatus?.daily_help.used ?? 0} <span className="text-xs text-gray-400 font-semibold">/ {quotaStatus?.daily_help.limit ?? 2}</span>
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              quotaStatus?.daily_help.is_exhausted ? 'bg-rose-100 text-rose-800' : 'bg-purple-100 text-purple-800'
            }`}>
              {quotaStatus?.daily_help.is_exhausted ? 'Limit Reached' : `${quotaStatus?.daily_help.remaining ?? 2} Active Slots`}
            </span>
          </div>
        </div>

        {/* 4. Delivery */}
        <div className={`bg-white border rounded-2xl p-4 shadow-card flex flex-col justify-between transition-all ${
          quotaStatus?.delivery.is_exhausted ? 'border-rose-200 bg-rose-50/20' : 'border-gray-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Delivery Agent</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-gray-900">
              {quotaStatus?.delivery.used ?? 0} <span className="text-xs text-gray-400 font-semibold">/ {quotaStatus?.delivery.limit ?? 5}</span>
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              quotaStatus?.delivery.is_exhausted ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {quotaStatus?.delivery.is_exhausted ? 'Exhausted' : `${quotaStatus?.delivery.remaining ?? 5} Left Today`}
            </span>
          </div>
        </div>

        {/* 5. Cab / Taxi */}
        <div className={`bg-white border rounded-2xl p-4 shadow-card flex flex-col justify-between transition-all ${
          quotaStatus?.cab.is_exhausted ? 'border-rose-200 bg-rose-50/20' : 'border-gray-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Cab / Taxi</span>
            <Car className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-gray-900">
              {quotaStatus?.cab.used ?? 0} <span className="text-xs text-gray-400 font-semibold">/ {quotaStatus?.cab.limit ?? 5}</span>
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              quotaStatus?.cab.is_exhausted ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {quotaStatus?.cab.is_exhausted ? 'Exhausted' : `${quotaStatus?.cab.remaining ?? 5} Left Today`}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-3 rounded-2xl border shadow-card gap-1">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-5 py-3.5 text-sm font-bold transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'active'
              ? 'text-primary-600 border-primary-600 bg-primary-50/50'
              : 'text-gray-500 border-transparent hover:text-gray-900'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Active Passes ({activePasses.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3.5 text-sm font-bold transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'history'
              ? 'text-primary-600 border-primary-600 bg-primary-50/50'
              : 'text-gray-500 border-transparent hover:text-gray-900'
          }`}
        >
          <Clock className="h-4 w-4" />
          Pass History ({pastPasses.length})
        </button>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayedPasses.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white border border-gray-100 rounded-3xl shadow-card">
          <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-700">No {activeTab} visitor passes found.</p>
          {activeTab === 'active' && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-4 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Generate Your First Pass
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedPasses.map((pass) => {
            const isCheckedIn = pass.status === 'checked_in';
            const isApproved = pass.status === 'approved';
            const isHistory = activeTab === 'history';

            return (
              <div
                key={pass.id}
                className={`bg-white border rounded-3xl p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between ${
                  isCheckedIn
                    ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                    : isApproved
                    ? 'border-gray-200'
                    : 'border-gray-100 opacity-70'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                        {getVisitorIcon(pass.visitor_type)}
                      </div>
                      <div>
                        <h3 className="font-black text-base text-gray-900 capitalize">
                          {pass.visitor_name}
                        </h3>
                        <span className="text-xs text-gray-500 capitalize font-medium">
                          {pass.visitor_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Status badge */}
                    {pass.status === 'approved' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-primary-700 bg-primary-50 border border-primary-200">
                        Pre-Approved
                      </span>
                    )}
                    {pass.status === 'checked_in' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Inside
                      </span>
                    )}
                    {pass.status === 'checked_out' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100">
                        Checked Out
                      </span>
                    )}
                    {pass.status === 'cancelled' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200">
                        Cancelled
                      </span>
                    )}
                  </div>

                  {/* Pass Access Code Box */}
                  <div className="mt-4 p-4 rounded-2xl bg-primary-50/50 border border-primary-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                        Gate Access Code
                      </span>
                      <span className="text-xl font-black tracking-widest font-mono text-primary-700">
                        {pass.pass_code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyCode(pass.pass_code)}
                        className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm transition-colors"
                        title="Copy Code"
                      >
                        {copiedCode === pass.pass_code ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleSharePass(pass)}
                        className="p-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white shadow-sm transition-colors"
                        title="Share Pass Details"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Visitor Details */}
                  <div className="mt-4 space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{pass.visitor_phone}</span>
                    </div>
                    {pass.vehicle_number && (
                      <div className="flex items-center gap-2">
                        <Car className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>Vehicle: <strong className="text-gray-900 font-mono">{pass.vehicle_number}</strong></span>
                      </div>
                    )}
                    {pass.purpose && (
                      <div className="text-gray-500 line-clamp-1 italic mt-1">
                        "{pass.purpose}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Timestamps & Actions */}
                <div className="mt-5 pt-3.5 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
                  <div className="flex justify-between items-center">
                    <span>Valid Until:</span>
                    <strong className="text-gray-800">{formatDateTime(pass.valid_until)}</strong>
                  </div>
                  {pass.entry_time && (
                    <div className="flex justify-between items-center">
                      <span>Entered Gate:</span>
                      <strong className="text-emerald-600">{formatDateTime(pass.entry_time)}</strong>
                    </div>
                  )}
                  {pass.exit_time && (
                    <div className="flex justify-between items-center">
                      <span>Exited Gate:</span>
                      <strong className="text-gray-700">{formatDateTime(pass.exit_time)}</strong>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-2">
                    {isApproved && (
                      <button
                        onClick={() => handleCancelPass(pass.id)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel Pass
                      </button>
                    )}
                    {isHistory && (
                      <button
                        onClick={() => handleDeletePass(pass.id)}
                        className="text-xs font-semibold text-gray-400 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                        title="Delete record from history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Record
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Pass Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 border border-gray-100 animate-bounce-in space-y-4">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary-600" />
              Generate Visitor Digital Pass
            </h3>

            <form onSubmit={handleCreatePass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Visitor Category & Quota
                </label>
                <select
                  value={visitorType}
                  onChange={(e) => setVisitorType(e.target.value as VisitorPass['visitor_type'])}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                >
                  <option value="guest">
                    Guest / Relative — ({quotaStatus ? `${quotaStatus.guest.used}/${quotaStatus.guest.limit} used` : 'Max 3/day'})
                  </option>
                  <option value="service">
                    Service Technician (Plumber/AC) — ({quotaStatus ? `${quotaStatus.service.used}/${quotaStatus.service.limit} used` : 'Max 2/day'})
                  </option>
                  <option value="daily_help">
                    Daily Help (Maid/Cook) — ({quotaStatus ? `${quotaStatus.daily_help.used}/${quotaStatus.daily_help.limit} active` : 'Max 2 active'})
                  </option>
                  <option value="delivery">
                    Delivery Agent — ({quotaStatus ? `${quotaStatus.delivery.used}/${quotaStatus.delivery.limit} used` : 'Max 5/day'})
                  </option>
                  <option value="cab">
                    Cab / Taxi Driver — ({quotaStatus ? `${quotaStatus.cab.used}/${quotaStatus.cab.limit} used` : 'Max 5/day'})
                  </option>
                </select>
              </div>

              {/* Exceeded Quota Alert Banner */}
              {isSelectedExhausted && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-rose-800 animate-shake">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">Fixed Pass Limit Reached!</strong>
                    You have reached the maximum allowed limit of {selectedQuota?.limit} {selectedQuota?.period === 'daily' ? 'passes for today' : 'concurrent active passes'} for {selectedQuota?.label}.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Visitor Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Visitor Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={visitorPhone}
                  onChange={(e) => setVisitorPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Vehicle No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MH-02-AB-1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Pass Validity Duration
                  </label>
                  {visitorType === 'daily_help' ? (
                    <select
                      value={validHours}
                      onChange={(e) => setValidHours(e.target.value)}
                      className="w-full px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl text-sm font-semibold text-purple-900 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                    >
                      <option value="720">1 Month (30 Days)</option>
                      <option value="1440">2 Months (60 Days)</option>
                      <option value="4320">6 Months (180 Days)</option>
                    </select>
                  ) : (
                    <select
                      value={validHours}
                      onChange={(e) => setValidHours(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
                    >
                      <option value="4">4 Hours (Quick Visit)</option>
                      <option value="12">12 Hours (Half Day)</option>
                      <option value="24">24 Hours (Full Day)</option>
                      <option value="48">48 Hours (Weekend)</option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Purpose / Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dinner gathering, plumbing repair, daily cooking..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white"
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
                  disabled={submitting || isSelectedExhausted}
                  className={`px-5 py-2 font-semibold text-white text-sm rounded-xl shadow-glow transition-all ${
                    isSelectedExhausted
                      ? 'bg-gray-400 cursor-not-allowed opacity-60'
                      : 'bg-primary-600 hover:bg-primary-500'
                  }`}
                >
                  {submitting
                    ? 'Generating...'
                    : isSelectedExhausted
                    ? 'Quota Limit Exceeded'
                    : 'Generate 6-Digit Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
