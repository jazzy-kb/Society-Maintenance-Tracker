import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Search, LogIn, LogOut,
  Car, ShieldAlert, Sparkles, User, Package, Wrench,
  CheckCircle2, Clock, Phone, Building2
} from 'lucide-react';
import api from '../../api/client';
import type { VisitorPass } from '../../types';
import toast from 'react-hot-toast';

export default function VisitorLogs() {
  const [logs, setLogs] = useState<VisitorPass[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Gate Verifier state
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedPass, setVerifiedPass] = useState<VisitorPass | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [filterStatus, filterType]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let url = '/visitors/logs?';
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterType) url += `visitor_type=${filterType}&`;

      const res = await api.get(url);
      setLogs(res.data);
    } catch {
      toast.error('Failed to load visitor entry logs');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;

    setVerifying(true);
    try {
      const res = await api.post('/visitors/verify', { pass_code: verifyCode });
      setVerifiedPass(res.data);
      toast.success(`Pass Verified! Visitor: ${res.data.visitor_name} (${res.data.status})`);
    } catch (err: any) {
      setVerifiedPass(null);
      toast.error(err.response?.data?.detail || 'Invalid or expired pass code');
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckIn = async (passId: number) => {
    try {
      const res = await api.post(`/visitors/check-in/${passId}`);
      toast.success(`Visitor ${res.data.visitor_name} Checked IN! Host resident notified.`);
      setVerifiedPass(res.data);
      fetchLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to process check-in');
    }
  };

  const handleCheckOut = async (passId: number) => {
    try {
      const res = await api.post(`/visitors/check-out/${passId}`);
      toast.success(`Visitor ${res.data.visitor_name} Checked OUT!`);
      setVerifiedPass(res.data);
      fetchLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to process check-out');
    }
  };

  const formatDateTime = (dtStr?: string) => {
    if (!dtStr) return '—';
    const d = new Date(dtStr);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getVisitorIcon = (type: VisitorPass['visitor_type']) => {
    switch (type) {
      case 'delivery': return <Package className="w-4 h-4 text-amber-600" />;
      case 'cab': return <Car className="w-4 h-4 text-emerald-600" />;
      case 'daily_help': return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'service': return <Wrench className="w-4 h-4 text-blue-600" />;
      default: return <User className="w-4 h-4 text-primary-600" />;
    }
  };

  // Live Gate Stats
  const currentlyInside = logs.filter(l => l.status === 'checked_in').length;
  const preApproved = logs.filter(l => l.status === 'approved').length;
  const checkedOutCount = logs.filter(l => l.status === 'checked_out').length;

  // Filter matching search query
  const filteredLogs = logs.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const vName = l.visitor_name?.toLowerCase() || '';
    const pCode = l.pass_code?.toLowerCase() || '';
    const flatNo = l.flat_number?.toLowerCase() || '';
    const tower = l.tower?.toLowerCase() || '';
    const rName = l.resident_name?.toLowerCase() || '';
    return vName.includes(q) || pCode.includes(q) || flatNo.includes(q) || tower.includes(q) || rName.includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
          <ShieldCheck className="h-7 w-7 text-primary-600" />
          Gate Security & Visitor Control Center
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Real-time security gate verification, 6-digit access code validation, entry/exit logs, and visitor management
        </p>
      </div>

      {/* Quick Gatekeeper Access Code Verification Box */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-card space-y-4">
        <div>
          <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary-600" />
            Security Gate Verifier
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Enter the 6-digit pass code (e.g. <span className="font-mono font-bold text-primary-600">VP-849201</span> or <span className="font-mono font-bold text-primary-600">849201</span>) presented by visitor at the gate.
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Enter Pass Code (e.g. VP-849201)"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={verifying}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm rounded-xl shadow-glow active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            {verifying ? 'Verifying...' : 'Verify Pass'}
          </button>
        </form>

        {/* Verified Pass Result Popup Card */}
        {verifiedPass && (
          <div className="p-5 rounded-2xl bg-primary-50/60 border border-primary-200 animate-bounce-in flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="text-lg font-black text-gray-900">{verifiedPass.visitor_name}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-primary-700 bg-primary-100">
                  {verifiedPass.visitor_type}
                </span>
                <span className="text-xs font-mono font-bold text-gray-700 bg-white border px-2 py-0.5 rounded-lg shadow-sm">
                  {verifiedPass.pass_code}
                </span>
              </div>

              <p className="text-xs text-gray-700">
                Destination: <strong className="text-gray-900 font-bold">Flat {verifiedPass.flat_number} · Tower {verifiedPass.tower}</strong> 
                {verifiedPass.resident_name && <span className="text-gray-600 font-medium"> (Host: {verifiedPass.resident_name})</span>}
              </p>
              <p className="text-xs text-gray-500">
                Phone: {verifiedPass.visitor_phone} | Vehicle: {verifiedPass.vehicle_number || 'N/A'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {verifiedPass.status === 'approved' && (
                <button
                  onClick={() => handleCheckIn(verifiedPass.id)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  ALLOW ENTRY (Check In)
                </button>
              )}
              {verifiedPass.status === 'checked_in' && (
                <button
                  onClick={() => handleCheckOut(verifiedPass.id)}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  MARK EXIT (Check Out)
                </button>
              )}
              {verifiedPass.status === 'checked_out' && (
                <span className="text-xs font-bold text-gray-500 bg-white border px-3 py-1.5 rounded-xl shadow-sm">
                  Already Checked Out
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live Gate Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Currently Inside</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-3xl font-black text-emerald-600 mt-1">{currentlyInside}</p>
          <p className="text-xs text-emerald-600 mt-0.5 font-medium">Active visitors inside society</p>
        </div>

        <div className="bg-white border border-primary-100 rounded-2xl p-5 shadow-card">
          <span className="text-xs font-bold text-primary-700 uppercase tracking-wider block">Pre-Approved Expected</span>
          <p className="text-3xl font-black text-primary-600 mt-1">{preApproved}</p>
          <p className="text-xs text-primary-600 mt-0.5 font-medium">Valid pass codes ready</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Checked Out</span>
          <p className="text-3xl font-black text-gray-900 mt-1">{checkedOutCount}</p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Visitors who exited</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Total Logged Entries</span>
          <p className="text-3xl font-black text-gray-900 mt-1">{logs.length}</p>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">All recorded passes</p>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search visitor, code, flat, tower..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
          />
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
          >
            <option value="">All Statuses</option>
            <option value="approved">Approved (Expected)</option>
            <option value="checked_in">Checked In (Inside)</option>
            <option value="checked_out">Checked Out</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
          >
            <option value="">All Categories</option>
            <option value="guest">Guest</option>
            <option value="delivery">Delivery</option>
            <option value="cab">Cab</option>
            <option value="daily_help">Daily Help</option>
            <option value="service">Service</option>
          </select>
        </div>

        <div className="flex items-center justify-end">
          {(searchQuery || filterStatus || filterType) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('');
                setFilterType('');
              }}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Visitor Entry Logs Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShieldAlert className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">No visitor logs match your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                  <th className="p-4 pl-6">Visitor</th>
                  <th className="p-4">Pass Code</th>
                  <th className="p-4">Destination Flat</th>
                  <th className="p-4">Entry / Exit Times</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {filteredLogs.map((log) => {
                  const isCheckedIn = log.status === 'checked_in';
                  const isApproved = log.status === 'approved';
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                            {getVisitorIcon(log.visitor_type)}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block">{log.visitor_name}</span>
                            <span className="text-xs text-gray-500 capitalize">{log.visitor_type.replace('_', ' ')} · {log.visitor_phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-primary-600 font-bold text-xs">
                        <span className="bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                          {log.pass_code}
                        </span>
                      </td>
                      <td className="p-4 text-xs">
                        <span className="font-bold text-gray-900 block">Flat {log.flat_number || '—'} · Tower {log.tower || '—'}</span>
                        {log.resident_name && <span className="text-gray-500 font-medium">Host: {log.resident_name}</span>}
                      </td>
                      <td className="p-4 text-xs space-y-0.5">
                        <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                          <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                          <span>In: {formatDateTime(log.entry_time)}</span>
                        </div>
                        {log.exit_time && (
                          <div className="flex items-center gap-1.5 text-gray-400">
                            <LogOut className="w-3.5 h-3.5 text-gray-400" />
                            <span>Out: {formatDateTime(log.exit_time)}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-xs">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-primary-700 bg-primary-50 border border-primary-200">
                            Approved
                          </span>
                        )}
                        {isCheckedIn && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Inside Society
                          </span>
                        )}
                        {log.status === 'checked_out' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100">
                            Checked Out
                          </span>
                        )}
                        {log.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {isApproved && (
                          <button
                            onClick={() => handleCheckIn(log.id)}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-1.5 rounded-xl active:scale-95 transition-all shadow-sm"
                          >
                            Check In
                          </button>
                        )}
                        {isCheckedIn && (
                          <button
                            onClick={() => handleCheckOut(log.id)}
                            className="text-xs font-bold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3.5 py-1.5 rounded-xl active:scale-95 transition-all shadow-sm"
                          >
                            Check Out
                          </button>
                        )}
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
  );
}
