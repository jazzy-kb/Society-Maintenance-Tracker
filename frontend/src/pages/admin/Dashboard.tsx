import React, { useEffect, useState } from 'react';
import {
  FileText, CheckCircle2, Clock, AlertTriangle, Star, ShieldCheck,
  TrendingUp, Activity, BarChart2, UserCheck, ArrowRight, Check, X, ShieldAlert
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';
import api from '../../api/client';
import type { AdminDashboard, ProfileUpdateRequest } from '../../types';
import { capitalize } from '../../utils/cn';
import toast from 'react-hot-toast';

const COLORS = ['#3b5ef4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [profileRequests, setProfileRequests] = useState<ProfileUpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashRes, reqsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/profile-requests?status=pending_admin'),
      ]);
      setData(dashRes.data);
      setProfileRequests(reqsRes.data);
    } catch {
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const handlePromptResident = async (reqId: number) => {
    setActionId(reqId);
    try {
      await api.post(`/admin/profile-requests/${reqId}/prompt`);
      toast.success('Confirmation prompt successfully sent to resident!');
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to dispatch verification prompt');
    } finally {
      setActionId(null);
    }
  };

  const handleRejectRequest = async (reqId: number) => {
    const reason = prompt('Enter rejection reason (optional):', 'Invalid flat details provided');
    if (reason === null) return;
    setActionId(reqId);
    try {
      await api.post(`/admin/profile-requests/${reqId}/reject?reason=${encodeURIComponent(reason || 'Declined')}`);
      toast.success('Profile change request declined');
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to reject request');
    } finally {
      setActionId(null);
    }
  };

  if (loading || !data) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const { stats, health_score, avg_resolution_hours, sla_compliance_pct, satisfaction_avg } = data;

  const kpis = [
    { label: 'Total Complaints', value: stats.total, icon: FileText, color: 'text-blue-600 bg-blue-50', border: 'border-blue-100' },
    { label: 'Active Complaints', value: stats.open + stats.assigned + stats.in_progress, icon: Clock, color: 'text-amber-600 bg-amber-50', border: 'border-amber-100' },
    { label: 'Resolved / Closed', value: stats.resolved + stats.closed, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-red-600 bg-red-50', border: 'border-red-100' },
    { label: 'Avg Resolution Time', value: `${avg_resolution_hours} hrs`, icon: Activity, color: 'text-indigo-600 bg-indigo-50', border: 'border-indigo-100' },
    { label: 'SLA Compliance', value: `${sla_compliance_pct}%`, icon: ShieldCheck, color: 'text-purple-600 bg-purple-50', border: 'border-purple-100' },
    { label: 'Avg Satisfaction', value: `${satisfaction_avg} / 5 ★`, icon: Star, color: 'text-yellow-600 bg-yellow-50', border: 'border-yellow-100' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Admin Control Center</h2>
          <p className="text-gray-500 text-sm mt-1">Real-time society maintenance insights & metrics</p>
        </div>
      </div>

      {/* Health Score & Top Banner */}
      <div className="bg-gradient-to-r from-surface-900 via-primary-950 to-surface-900 text-white rounded-3xl p-6 shadow-xl border border-surface-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-primary-500/20 text-primary-300 border border-primary-500/30 rounded-full px-3 py-1 text-xs font-semibold">
            <TrendingUp className="w-3.5 h-3.5" /> Intelligent Society Health Rating
          </div>
          <h3 className="text-2xl font-black">Overall Health Grade: <span className="text-primary-400">{health_score.grade}</span></h3>
          <p className="text-gray-400 text-sm max-w-xl">
            Calculated from SLA adherence ({health_score.breakdown.sla_compliance}%), resolution rate ({health_score.breakdown.resolution_rate}%), overdue rate ({health_score.breakdown.overdue_rate}%), and resident feedback.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/10 min-w-40">
          <p className="text-5xl font-black text-primary-300">{health_score.score}</p>
          <p className="text-xs uppercase tracking-wider text-gray-300 font-bold mt-1">Out of 100</p>
        </div>
      </div>

      {/* Pending Critical Profile Change Verification Requests */}
      {profileRequests.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 shadow-md space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">
                  {profileRequests.length} Pending Critical Profile Verification Request{profileRequests.length > 1 ? 's' : ''}
                </h3>
                <p className="text-xs text-amber-900 mt-0.5">
                  Residents requested critical flat number or mobile changes. Verify details and dispatch confirmation prompt.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold bg-amber-200 text-amber-900 px-3 py-1 rounded-full">
              Requires Admin Action
            </span>
          </div>

          <div className="space-y-3">
            {profileRequests.map((req) => (
              <div key={req.id} className="bg-white border border-amber-200 rounded-2xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm">{req.user_name}</span>
                    <span className="text-xs text-gray-400">({req.user_email})</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs">
                    {req.new_flat_number && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">Flat:</span>
                        <span className="text-gray-500 line-through">{req.old_flat_number || '—'}</span>
                        <ArrowRight className="w-3 h-3 text-amber-600" />
                        <strong className="text-gray-900 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          {req.new_flat_number} {req.new_tower ? `(${req.new_tower})` : ''}
                        </strong>
                      </div>
                    )}
                    {req.new_phone && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">Phone:</span>
                        <span className="text-gray-500 line-through">{req.old_phone || '—'}</span>
                        <ArrowRight className="w-3 h-3 text-amber-600" />
                        <strong className="text-gray-900 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          {req.new_phone}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => handleRejectRequest(req.id)}
                    disabled={actionId === req.id}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handlePromptResident(req.id)}
                    disabled={actionId === req.id}
                    className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {actionId === req.id ? 'Sending...' : 'Send Confirmation Prompt to Resident'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className={`bg-white rounded-2xl border ${border} p-4 shadow-card hover:shadow-card-hover transition-all`}>
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-2`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-black text-gray-900 leading-tight">{value}</p>
            <p className="text-gray-400 text-xs mt-1 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h3 className="font-bold text-gray-900 text-base mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary-500" /> 30-Day Complaint Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend_30d}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b5ef4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b5ef4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="count" stroke="#3b5ef4" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Complaints by Category */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h3 className="font-bold text-gray-900 text-base mb-4">Complaints by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.by_category}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={capitalize} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Complaints by Status (Pie) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h3 className="font-bold text-gray-900 text-base mb-4">Distribution by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${capitalize(status)}: ${count}`}>
                  {data.by_status.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Complaints by Tower */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h3 className="font-bold text-gray-900 text-base mb-4">Complaints by Tower</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.by_tower}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="tower" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(t) => `Tower ${t}`} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
