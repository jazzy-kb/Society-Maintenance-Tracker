import React, { useState, useEffect } from 'react';
import {
  User, Building2, Phone, Mail, ShieldAlert, CheckCircle2,
  Clock, XCircle, AlertTriangle, ArrowRight, Save, History, RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';
import type { ProfileUpdateRequest } from '../../types';
import toast from 'react-hot-toast';

export default function ResidentProfile() {
  const { user, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [flatNumber, setFlatNumber] = useState(user?.flat_number || '');
  const [tower, setTower] = useState(user?.tower || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [requests, setRequests] = useState<ProfileUpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setFlatNumber(user.flat_number || '');
      setTower(user.tower || '');
      setPhone(user.phone || '');
    }
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/profile-requests/my');
      setRequests(res.data);
    } catch {
      toast.error('Failed to load profile requests');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = (
    name !== (user?.name || '') ||
    flatNumber !== (user?.flat_number || '') ||
    tower !== (user?.tower || '') ||
    phone !== (user?.phone || '')
  );

  const hasCriticalChanges = (
    flatNumber !== (user?.flat_number || '') ||
    tower !== (user?.tower || '') ||
    phone !== (user?.phone || '')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        flat_number: flatNumber || undefined,
        tower: tower || undefined,
        phone: phone || undefined,
      };

      const res = await api.post('/auth/profile-request', payload);
      
      if (res.data.requires_admin_review) {
        toast.success('Critical update submitted for Admin Verification!');
      } else {
        toast.success('Profile name updated successfully!');
        if (res.data.user) {
          updateUser(res.data.user);
        }
      }
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit profile changes');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPrompt = async (requestId: number) => {
    setActionLoading(requestId);
    try {
      const res = await api.post(`/auth/profile-requests/${requestId}/confirm`);
      toast.success('Changes confirmed! Your profile details are officially updated.');
      if (res.data.user) {
        updateUser(res.data.user);
        setFlatNumber(res.data.user.flat_number || '');
        setTower(res.data.user.tower || '');
        setPhone(res.data.user.phone || '');
        setName(res.data.user.name || '');
      }
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to confirm changes');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    if (!confirm('Are you sure you want to cancel this pending change request?')) return;
    setActionLoading(requestId);
    try {
      await api.post(`/auth/profile-requests/${requestId}/cancel`);
      toast.success('Profile change request cancelled');
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to cancel request');
    } finally {
      setActionLoading(null);
    }
  };

  // Find active prompt awaiting resident confirmation
  const activeConfirmationPrompt = requests.find(r => r.status === 'awaiting_resident_confirmation');
  const pendingAdminRequest = requests.find(r => r.status === 'pending_admin');

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
            <User className="h-7 w-7 text-primary-600" />
            Resident Profile & Flat Settings
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage your personal profile, registered flat number, tower, and mobile contact details
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-all shadow-sm self-start sm:self-auto"
          title="Refresh Status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-600' : ''}`} />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* HIGHLIGHT: INTERACTIVE CONFIRMATION CARD DISPATCHED BY ADMIN */}
      {/* ========================================================================= */}
      {activeConfirmationPrompt && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 rounded-3xl p-6 shadow-xl space-y-4 animate-bounce-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <ShieldAlert className="w-7 h-7 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                Admin Verification Completed · Action Required
              </span>
              <h3 className="text-lg font-black text-gray-900 mt-1.5">
                Are you sure you want to update your registered society details?
              </h3>
              <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                The Society Administrator has reviewed and verified your request. Please review the new details below and confirm to apply them to your resident account.
              </p>

              {/* Comparison Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 bg-white/90 backdrop-blur rounded-2xl p-4 border border-amber-200 shadow-sm text-xs">
                {activeConfirmationPrompt.new_flat_number && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Flat & Tower</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-500 line-through">
                        {activeConfirmationPrompt.old_flat_number || 'None'} ({activeConfirmationPrompt.old_tower || 'None'})
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                      <strong className="text-gray-900 font-bold text-sm bg-amber-100 px-2 py-0.5 rounded">
                        Flat {activeConfirmationPrompt.new_flat_number} · Tower {activeConfirmationPrompt.new_tower}
                      </strong>
                    </div>
                  </div>
                )}

                {activeConfirmationPrompt.new_phone && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Mobile Phone</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-500 line-through">
                        {activeConfirmationPrompt.old_phone || 'None'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                      <strong className="text-gray-900 font-bold text-sm bg-amber-100 px-2 py-0.5 rounded">
                        {activeConfirmationPrompt.new_phone}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-2">
            <button
              onClick={() => handleCancelRequest(activeConfirmationPrompt.id)}
              disabled={actionLoading === activeConfirmationPrompt.id}
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl font-bold text-xs transition-colors"
            >
              Cancel & Discard
            </button>
            <button
              onClick={() => handleConfirmPrompt(activeConfirmationPrompt.id)}
              disabled={actionLoading === activeConfirmationPrompt.id}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs shadow-glow transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {actionLoading === activeConfirmationPrompt.id ? 'Applying Updates...' : 'Yes, Confirm & Apply Changes'}
            </button>
          </div>
        </div>
      )}

      {/* PENDING ADMIN REVIEW NOTICE */}
      {pendingAdminRequest && !activeConfirmationPrompt && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4.5 flex items-start justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-900 text-sm">
                Critical Details Update Under Admin Verification
              </h4>
              <p className="text-xs text-blue-700 mt-0.5">
                You requested changes to Flat ({pendingAdminRequest.new_flat_number}) / Tower ({pendingAdminRequest.new_tower}) / Phone ({pendingAdminRequest.new_phone}). Awaiting Admin verification prompt.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleCancelRequest(pendingAdminRequest.id)}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors shrink-0"
          >
            Cancel Request
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Edit Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-black text-gray-900">Personal & Residence Details</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Keep your resident registry information up to date
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Registered Email Address (Read-Only)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 outline-none cursor-not-allowed font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black uppercase text-gray-700 tracking-wider">
                    Critical Society Records
                  </span>
                  <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                    Admin Verification Required
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                      Flat / Unit Number
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. 402"
                        value={flatNumber}
                        onChange={(e) => setFlatNumber(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                      Tower / Block
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. Tower B"
                        value={tower}
                        onChange={(e) => setTower(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                    Mobile Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Warning note for critical fields */}
              {hasCriticalChanges && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Security Notice:</strong> Changing flat number, tower, or phone number requires Admin verification. A verification prompt will be sent to confirm your identity before updating.
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!hasChanges || submitting}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-glow transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? 'Submitting...' : hasCriticalChanges ? 'Submit for Admin Verification' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Verification History & Society Registry Status */}
        <div className="lg:col-span-5 space-y-6">
          {/* Society Registry Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 space-y-4">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Current Society Records
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-500 font-medium">Resident Name:</span>
                <strong className="text-gray-900 font-bold text-sm">{user?.name}</strong>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-500 font-medium">Flat & Tower:</span>
                <strong className="text-gray-900 font-bold text-sm">Flat {user?.flat_number || '—'}, {user?.tower || '—'}</strong>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-500 font-medium">Mobile Phone:</span>
                <strong className="text-gray-900 font-bold text-sm">{user?.phone || '—'}</strong>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-gray-500 font-medium">Account Role:</span>
                <span className="text-primary-700 bg-primary-50 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Request Audit History */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 space-y-4">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-primary-600" />
              Profile Verification History
            </h3>

            {requests.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                No past profile change requests found.
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {requests.map((r) => {
                  const isApplied = r.status === 'applied';
                  const isPendingAdmin = r.status === 'pending_admin';
                  const isPrompt = r.status === 'awaiting_resident_confirmation';
                  const isRejected = r.status === 'rejected';

                  return (
                    <div key={r.id} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">
                          {new Date(r.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {isApplied && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Applied
                          </span>
                        )}
                        {isPendingAdmin && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            Pending Admin
                          </span>
                        )}
                        {isPrompt && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            Awaiting Your Confirmation
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            Declined
                          </span>
                        )}
                      </div>

                      <div className="text-gray-600">
                        {r.new_flat_number && (
                          <div>Flat: {r.old_flat_number || '—'} ➔ <strong>{r.new_flat_number}</strong></div>
                        )}
                        {r.new_tower && (
                          <div>Tower: {r.old_tower || '—'} ➔ <strong>{r.new_tower}</strong></div>
                        )}
                        {r.new_phone && (
                          <div>Phone: {r.old_phone || '—'} ➔ <strong>{r.new_phone}</strong></div>
                        )}
                      </div>

                      {r.admin_note && (
                        <p className="text-[11px] text-gray-500 italic bg-white p-2 rounded-lg border border-gray-100">
                          Note: {r.admin_note}
                        </p>
                      )}
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
