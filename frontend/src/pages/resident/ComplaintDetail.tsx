import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Star, AlertTriangle, User, MessageSquare } from 'lucide-react';
import api from '../../api/client';
import type { ComplaintDetail } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { formatDateTime, capitalize, timeAgo } from '../../utils/cn';
import toast from 'react-hot-toast';

const TIMELINE_ICONS: Record<string, string> = {
  status: '📋',
  assigned_staff_id: '👷',
  default: '📝',
};

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    api.get(`/complaints/${id}`).then(res => {
      setComplaint(res.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      await api.post(`/complaints/${id}/feedback`, feedback);
      toast.success('Thank you for your feedback!');
      const res = await api.get(`/complaints/${id}`);
      setComplaint(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) return <div className="flex justify-center pt-20"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!complaint) return <div className="text-center pt-20 text-gray-400">Complaint not found</div>;

  const canLeaveFeedback = ['resolved', 'closed'].includes(complaint.status) && !complaint.feedback;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-black text-gray-900">{complaint.title}</h2>
            {complaint.is_overdue && (
              <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                <AlertTriangle className="w-3 h-3" />OVERDUE
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm font-mono">{complaint.complaint_id}</p>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <Badge variant="status" value={complaint.status} />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Priority</p>
          <Badge variant="priority" value={complaint.priority} />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Category</p>
          <p className="text-sm font-medium capitalize">{complaint.category}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Raised</p>
          <p className="text-sm font-medium">{timeAgo(complaint.created_at)}</p>
        </div>
        {complaint.tower && <div>
          <p className="text-xs text-gray-400 mb-1">Tower</p>
          <p className="text-sm font-medium">{complaint.tower}</p>
        </div>}
        {complaint.flat_number && <div>
          <p className="text-xs text-gray-400 mb-1">Flat</p>
          <p className="text-sm font-medium">{complaint.flat_number}</p>
        </div>}
        <div>
          <p className="text-xs text-gray-400 mb-1">Residents Affected</p>
          <p className="text-sm font-medium">{complaint.residents_affected}</p>
        </div>
        {complaint.due_date && (
          <div>
            <p className="text-xs text-gray-400 mb-1">SLA Due</p>
            <p className={`text-sm font-medium ${complaint.is_overdue ? 'text-red-600' : 'text-gray-700'}`}>
              {formatDateTime(complaint.due_date)}
            </p>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <h3 className="font-bold text-gray-900 mb-3">Description</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{complaint.description}</p>
        {complaint.photo_url && (
          <div className="mt-4">
            <img
              src={complaint.photo_url.startsWith('http') ? complaint.photo_url : `http://localhost:8000${complaint.photo_url.startsWith('/') ? '' : '/'}${complaint.photo_url}`}
              alt="Complaint photo"
              className="w-full max-h-64 object-cover rounded-xl"
            />
          </div>
        )}
      </div>

      {/* Admin notes */}
      {complaint.admin_notes && (
        <div className="bg-primary-50 rounded-2xl border border-primary-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-primary-600" />
            <h3 className="font-bold text-primary-900 text-sm">Admin Notes</h3>
          </div>
          <p className="text-sm text-primary-800">{complaint.admin_notes}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
        <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary-500" />Timeline
        </h3>
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100" />
          <div className="space-y-4">
            {complaint.history.map((h, i) => (
              <div key={h.id} className="flex gap-4 relative">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-sm shrink-0 z-10">
                  {TIMELINE_ICONS[h.field_changed] || TIMELINE_ICONS.default}
                </div>
                <div className="flex-1 min-w-0 pt-1.5">
                  <p className="text-sm font-medium text-gray-900">
                    {h.field_changed === 'status'
                      ? `Status changed: ${capitalize(h.old_value || 'new')} → ${capitalize(h.new_value || '')}`
                      : h.field_changed === 'assigned_staff_id'
                        ? 'Staff assigned'
                        : capitalize(h.field_changed)}
                  </p>
                  {h.note && <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(h.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback */}
      {canLeaveFeedback && (
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-card p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />Rate the Resolution
          </h3>
          <form onSubmit={handleFeedback} className="space-y-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setFeedback({ ...feedback, rating: n })}
                  className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${feedback.rating >= n ? 'bg-amber-400 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-amber-100'}`}>
                  {n}★
                </button>
              ))}
            </div>
            <textarea value={feedback.comment} onChange={e => setFeedback({ ...feedback, comment: e.target.value })}
              placeholder="Optional comment..." rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
            <button type="submit" disabled={submittingFeedback}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-60 flex items-center gap-2">
              {submittingFeedback ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Rating'}
            </button>
          </form>
        </div>
      )}

      {/* Existing feedback */}
      {complaint.feedback && (
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
          <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 text-amber-500" />Your Rating
          </h3>
          <div className="flex items-center gap-2 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`text-lg ${i < complaint.feedback!.rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
            ))}
            <span className="text-sm font-bold text-amber-700">{complaint.feedback.rating}/5</span>
          </div>
          {complaint.feedback.comment && <p className="text-sm text-amber-800">{complaint.feedback.comment}</p>}
        </div>
      )}
    </div>
  );
}
