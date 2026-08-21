import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Clock, ShieldCheck, Star } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import api from '../../api/client';
import { capitalize } from '../../utils/cn';

const COLORS = ['#3b5ef4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function DeepAnalytics() {
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/analytics?days=${days}`).then(res => setData(res.data)).finally(() => setLoading(false));
  }, [days]);

  if (loading || !data) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Deep Maintenance Analytics</h2>
          <p className="text-gray-500 text-sm mt-1">SLA metrics, volume breakdown, and trend analysis</p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="px-4 py-2 border rounded-xl text-sm font-semibold bg-white shadow-card outline-none">
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg"><Clock /></div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase">Avg Resolution Time</p>
            <p className="text-2xl font-black text-gray-900">{data.avg_resolution_hours} <span className="text-sm font-normal text-gray-500">hours</span></p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg"><ShieldCheck /></div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase">SLA Adherence</p>
            <p className="text-2xl font-black text-gray-900">{data.sla_compliance_pct}%</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center font-bold text-lg"><Star /></div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase">Resident Satisfaction</p>
            <p className="text-2xl font-black text-gray-900">{data.satisfaction_avg} <span className="text-sm font-normal text-gray-500">/ 5 ★</span></p>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h3 className="font-bold text-gray-900 mb-4">Volume Trend over Time</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b5ef4" fill="#3b5ef4" fillOpacity={0.2} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h3 className="font-bold text-gray-900 mb-4">Priority Breakup</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.priority_distribution} dataKey="count" nameKey="priority" cx="50%" cy="50%" outerRadius={90} label={({ priority, count }) => `${capitalize(priority)}: ${count}`}>
                  {data.priority_distribution.map((_: any, idx: number) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
