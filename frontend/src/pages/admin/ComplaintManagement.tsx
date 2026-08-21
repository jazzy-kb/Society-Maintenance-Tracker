import React, { useEffect, useState, useCallback } from 'react';
import { Search, Filter, AlertTriangle, UserCheck, Edit, Eye, MessageSquare, Clock } from 'lucide-react';
import api from '../../api/client';
import type { Complaint, Staff } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { timeAgo, capitalize, formatDateTime } from '../../utils/cn';
import toast from 'react-hot-toast';

export default function ComplaintManagement() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [towerFilter, setTowerFilter] = useState('');

  // Edit Modal State
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editStaff, setEditStaff] = useState<number | ''>('');
  const [editPriority, setEditPriority] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (towerFilter) params.tower = towerFilter;
      if (search) params.search = search;

      const [cRes, sRes] = await Promise.all([
        api.get('/complaints/', { params }),
        api.get('/staff/'),
      ]);
      setComplaints(cRes.data);
      setStaffList(sRes.data);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, towerFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchAll, 300);
    return () => clearTimeout(t);
  }, [fetchAll]);

  const openEditModal = (c: Complaint) => {
    setSelectedComplaint(c);
    setEditStatus(c.status);
    setEditStaff(c.assigned_staff_id || '');
    setEditPriority(c.priority);
    setAdminNotes(c.admin_notes || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setUpdating(true);
    try {
      const payload: Record<string, any> = {};
      if (editStatus !== selectedComplaint.status) payload.status = editStatus;
      if (editStaff !== (selectedComplaint.assigned_staff_id || '')) payload.assigned_staff_id = editStaff === '' ? null : Number(editStaff);
      if (editPriority !== selectedComplaint.priority) payload.priority = editPriority;
      if (adminNotes !== (selectedComplaint.admin_notes || '')) payload.admin_notes = adminNotes;

      await api.patch(`/complaints/${selectedComplaint.id}`, payload);
      toast.success('Complaint updated successfully');
      setSelectedComplaint(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update complaint');
    } finally {
      setUpdating(false);
    }
  };

  const statusOptions = ['open', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Complaint Management</h2>
          <p className="text-gray-500 text-sm mt-1">{complaints.length} complaints listed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID, title..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none">
          <option value="">All Status</option>
          {statusOptions.map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none">
          <option value="">All Priority</option>
          {['low', 'normal', 'urgent', 'emergency'].map(p => <option key={p} value={p}>{capitalize(p)}</option>)}
        </select>
        <select value={towerFilter} onChange={e => setTowerFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none">
          <option value="">All Towers</option>
          {['A', 'B', 'C', 'D', 'E'].map(t => <option key={t} value={t}>Tower {t}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4">ID & Title</th>
                  <th className="p-4">Category / Tower</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Assigned Staff</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {complaints.map(c => {
                  const staff = staffList.find(s => s.id === c.assigned_staff_id);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs text-gray-400 font-bold">{c.complaint_id}</span>
                          {c.is_overdue && <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.2 rounded font-bold">OVERDUE</span>}
                          {c.is_recurring && <span className="bg-orange-100 text-orange-600 text-[10px] px-1.5 py-0.2 rounded font-bold">RECURRING</span>}
                        </div>
                        <p className="font-bold text-gray-900 line-clamp-1">{c.title}</p>
                      </td>
                      <td className="p-4 text-gray-600">
                        <span className="capitalize font-medium">{c.category}</span>
                        {c.tower && <span className="text-gray-400 text-xs block">Tower {c.tower} · Flat {c.flat_number}</span>}
                      </td>
                      <td className="p-4"><Badge variant="priority" value={c.priority} /></td>
                      <td className="p-4"><Badge variant="status" value={c.status} /></td>
                      <td className="p-4 text-gray-700">
                        {staff ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="font-medium">{staff.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-gray-500">
                        {c.due_date ? formatDateTime(c.due_date) : '—'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => openEditModal(c)}
                          className="px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg font-semibold text-xs inline-flex items-center gap-1 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" /> Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-bounce-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-black text-lg text-gray-900">Manage Complaint</h3>
                <p className="text-xs text-gray-400 font-mono">{selectedComplaint.complaint_id} — {selectedComplaint.title}</p>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Status Transition</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500">
                  {statusOptions.map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Assign Maintenance Staff</label>
                <select value={editStaff} onChange={e => setEditStaff(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Unassigned</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({capitalize(s.department)}) — Workload: {s.current_workload}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Priority</label>
                <select value={editPriority} onChange={e => setEditPriority(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500">
                  {['low', 'normal', 'urgent', 'emergency'].map(p => <option key={p} value={p}>{capitalize(p)}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Admin Notes / Update Reason</label>
                <textarea
                  value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                  rows={3} placeholder="Notes visible to resident..."
                  className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSelectedComplaint(null)} className="flex-1 py-2.5 border rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={updating} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-semibold shadow-glow">
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
