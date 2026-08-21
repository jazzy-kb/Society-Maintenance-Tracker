import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, AlertTriangle } from 'lucide-react';
import api from '../../api/client';
import type { Complaint } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { CATEGORIES, timeAgo, capitalize } from '../../utils/cn';

export default function ComplaintList() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const fetchComplaints = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;
      const res = await api.get('/complaints/', { params });
      setComplaints(res.data);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchComplaints, 300);
    return () => clearTimeout(t);
  }, [fetchComplaints]);

  const statuses = ['open', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened'];
  const priorities = ['low', 'normal', 'urgent', 'emergency'];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">My Complaints</h2>
          <p className="text-gray-500 text-sm">{complaints.length} total</p>
        </div>
        <Link
          to="/resident/raise-complaint"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-medium text-sm hover:shadow-card-hover transition-all"
        >
          <Plus className="w-4 h-4" />
          New Complaint
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search complaints..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none">
            <option value="">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none">
            <option value="">All Priority</option>
            {priorities.map(p => <option key={p} value={p}>{capitalize(p)}</option>)}
          </select>
          {(statusFilter || priorityFilter || search) && (
            <button onClick={() => { setStatusFilter(''); setPriorityFilter(''); setSearch(''); }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">No complaints found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="divide-y divide-gray-50">
            {complaints.map(c => (
              <Link key={c.id} to={`/resident/complaints/${c.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-gray-400 shrink-0">{c.complaint_id}</span>
                    <Badge variant="priority" value={c.priority} />
                    {c.is_overdue && (
                      <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                        <AlertTriangle className="w-3 h-3" />OVERDUE
                      </span>
                    )}
                    {c.is_recurring && (
                      <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">RECURRING</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">{c.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{c.category} · {c.tower ? `Tower ${c.tower}` : ''} · {timeAgo(c.created_at)}</p>
                </div>
                <Badge variant="status" value={c.status} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
