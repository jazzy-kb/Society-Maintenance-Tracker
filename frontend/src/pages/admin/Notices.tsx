import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, Pin, Calendar } from 'lucide-react';
import api from '../../api/client';
import type { Notice } from '../../types';
import { formatDate } from '../../utils/cn';
import toast from 'react-hot-toast';

export default function AdminNotices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', is_pinned: false });
  const [submitting, setSubmitting] = useState(false);

  const fetchNotices = async () => {
    try {
      const res = await api.get('/notices/');
      setNotices(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/notices/', form);
      toast.success('Notice published & broadcasted to residents! 📢');
      setIsModalOpen(false);
      setForm({ title: '', content: '', category: 'general', is_pinned: false });
      fetchNotices();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to publish notice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this notice?')) return;
    try {
      await api.delete(`/notices/${id}`);
      toast.success('Notice deleted');
      fetchNotices();
    } catch {
      toast.error('Failed to delete notice');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Notice Board Management</h2>
          <p className="text-gray-500 text-sm mt-1">Post announcements and send in-app broadcasts to residents</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium text-sm transition-all shadow-glow"
        >
          <Plus className="w-4 h-4" /> Post New Notice
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {notices.map(notice => (
            <div key={notice.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-card flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  {notice.is_pinned && <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">📌 Pinned</span>}
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium capitalize">{notice.category}</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(notice.created_at)}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{notice.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{notice.content}</p>
              </div>
              <button onClick={() => handleDelete(notice.id)} className="text-gray-400 hover:text-red-600 p-2"><Trash2 className="w-5 h-5" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-bounce-in">
            <h3 className="font-black text-lg text-gray-900">Publish Society Notice</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Title *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="E.g. Water Supply Interruption" className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 capitalize">
                  {['general', 'maintenance', 'emergency', 'event'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Content *</label>
                <textarea required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                  rows={4} placeholder="Notice details..." className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="pinned" checked={form.is_pinned} onChange={e => setForm({ ...form, is_pinned: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500" />
                <label htmlFor="pinned" className="text-sm font-medium text-gray-700">Pin notice to top of resident feed</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold shadow-glow">
                  {submitting ? 'Publishing...' : 'Publish & Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
