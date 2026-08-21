import React, { useEffect, useState } from 'react';
import { Megaphone, Pin, Calendar, Tag } from 'lucide-react';
import api from '../../api/client';
import type { Notice } from '../../types';
import { formatDate } from '../../utils/cn';

export default function ResidentNotices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notices/').then(res => setNotices(res.data)).finally(() => setLoading(false));
  }, []);

  const categoryColors: Record<string, string> = {
    emergency: 'bg-red-100 text-red-700 border-red-200',
    maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
    event: 'bg-purple-100 text-purple-700 border-purple-200',
    general: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Notice Board</h2>
          <p className="text-gray-500 text-sm mt-1">Official announcements and society updates</p>
        </div>
      </div>

      {notices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Megaphone className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">No notices posted yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map(notice => (
            <div
              key={notice.id}
              className={`bg-white rounded-2xl border p-6 shadow-card transition-all ${
                notice.is_pinned ? 'border-amber-200 ring-1 ring-amber-100 bg-amber-50/20' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {notice.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-semibold">
                      <Pin className="w-3 h-3 fill-amber-800" /> Pinned
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border capitalize ${categoryColors[notice.category] || categoryColors.general}`}>
                    {notice.category}
                  </span>
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(notice.created_at)}
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">{notice.title}</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{notice.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
