import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import type { Notification } from '../../types';
import { timeAgo } from '../../utils/cn';
import toast from 'react-hot-toast';

export default function ResidentNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch {}
  };

  const iconMap = {
    info: <Info className="w-5 h-5 text-blue-500" />,
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const hasUnread = notifications.some(n => !n.is_read);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Notifications</h2>
          <p className="text-gray-500 text-sm mt-1">In-app notifications and system alerts</p>
        </div>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 text-sm text-primary-600 font-medium hover:text-primary-700 bg-primary-50 px-3.5 py-2 rounded-xl transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">No notifications yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden divide-y divide-gray-50">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.is_read && handleMarkRead(n.id)}
              className={`p-5 flex items-start gap-4 transition-colors ${
                !n.is_read ? 'bg-primary-50/40 font-medium' : 'hover:bg-gray-50'
              }`}
            >
              <div className="mt-0.5 shrink-0">{iconMap[n.type] || iconMap.info}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-sm font-bold text-gray-900">{n.title}</h4>
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(n.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-2">{n.message}</p>
                {n.link && (
                  <Link
                    to={n.link.replace('/complaints/', '/resident/complaints/')}
                    className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    View details <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
              {!n.is_read && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary-600 mt-1.5 shrink-0" title="Unread" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
