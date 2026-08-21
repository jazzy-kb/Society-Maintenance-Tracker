import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, CheckCircle2, Clock, AlertTriangle, Plus,
  Bell, Megaphone, ArrowRight, TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';
import type { Complaint, Notice, Notification } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { timeAgo, formatDate } from '../../utils/cn';

interface Stats {
  total: number;
  open: number;
  resolved: number;
  overdue: number;
}

export default function ResidentDashboard() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [c, n, notifs] = await Promise.all([
          api.get('/complaints/'),
          api.get('/notices/'),
          api.get('/notifications/?limit=5'),
        ]);
        setComplaints(c.data);
        setNotices(n.data.slice(0, 3));
        setNotifications(notifs.data);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const stats: Stats = {
    total: complaints.length,
    open: complaints.filter(c => ['open', 'assigned', 'in_progress', 'reopened'].includes(c.status)).length,
    resolved: complaints.filter(c => ['resolved', 'closed'].includes(c.status)).length,
    overdue: complaints.filter(c => c.is_overdue).length,
  };

  const statCards = [
    { label: 'Total Complaints', value: stats.total, icon: FileText, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
    { label: 'Active', value: stats.open, icon: Clock, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'bg-red-50 text-red-600', border: 'border-red-100' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Hello, {user?.name?.split(' ')[0]} 👋</h2>
          <p className="text-gray-500 text-sm mt-1">Flat {user?.flat_number || '—'} · Tower {user?.tower || '—'}</p>
        </div>
        <Link
          to="/resident/raise-complaint"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-medium text-sm hover:from-primary-500 hover:to-accent-500 transition-all shadow-card hover:shadow-card-hover"
        >
          <Plus className="w-4 h-4" />
          Raise Complaint
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className={`bg-white rounded-2xl border ${border} p-5 shadow-card`}>
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-gray-500 text-sm mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent complaints */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              <h3 className="font-bold text-gray-900">Recent Complaints</h3>
            </div>
            <Link to="/resident/complaints" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {complaints.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No complaints yet</p>
              <Link to="/resident/raise-complaint" className="text-primary-600 text-sm mt-2 inline-block">Raise your first complaint →</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {complaints.slice(0, 5).map(complaint => (
                <Link
                  key={complaint.id}
                  to={`/resident/complaints/${complaint.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-400">{complaint.complaint_id}</span>
                      {complaint.is_overdue && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">OVERDUE</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{complaint.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(complaint.created_at)}</p>
                  </div>
                  <Badge variant="status" value={complaint.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Notices */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-gray-900 text-sm">Latest Notices</h3>
              </div>
              <Link to="/resident/notices" className="text-xs text-primary-600 hover:text-primary-700">See all</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {notices.map(notice => (
                <div key={notice.id} className="px-5 py-3">
                  <div className="flex items-start gap-2">
                    {notice.is_pinned && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded mt-0.5 font-medium shrink-0">📌</span>}
                    <div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{notice.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(notice.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {notices.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No notices</p>}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary-500" />
                <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
              </div>
              <Link to="/resident/notifications" className="text-xs text-primary-600">See all</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {notifications.map(n => (
                <div key={n.id} className={`px-5 py-3 ${!n.is_read ? 'bg-primary-50/50' : ''}`}>
                  <p className="text-xs font-medium text-gray-900 line-clamp-1">{n.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
              ))}
              {notifications.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No notifications</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
