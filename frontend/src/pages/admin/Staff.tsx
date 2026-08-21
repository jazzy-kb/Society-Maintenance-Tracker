import React, { useEffect, useState } from 'react';
import { Users, Plus, Phone, Mail, CheckCircle, XCircle, Trash2, Edit2 } from 'lucide-react';
import api from '../../api/client';
import type { Staff } from '../../types';
import { capitalize } from '../../utils/cn';
import toast from 'react-hot-toast';

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState({ name: '', department: 'electrical', phone: '', email: '', is_available: true });
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/staff/');
      setStaffList(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setForm({ name: '', department: 'electrical', phone: '', email: '', is_available: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Staff) => {
    setEditingStaff(s);
    setForm({ name: s.name, department: s.department, phone: s.phone || '', email: s.email || '', is_available: s.is_available });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingStaff) {
        await api.put(`/staff/${editingStaff.id}`, form);
        toast.success('Staff member updated');
      } else {
        await api.post('/staff/', form);
        toast.success('Staff member added');
      }
      setIsModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await api.delete(`/staff/${id}`);
      toast.success('Staff member deleted');
      fetchStaff();
    } catch {
      toast.error('Failed to delete staff member');
    }
  };

  const departments = ['electrical', 'plumbing', 'civil', 'cleaning', 'lift', 'general'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Maintenance Staff</h2>
          <p className="text-gray-500 text-sm mt-1">Manage technician assignments and workload</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium text-sm transition-all shadow-glow"
        >
          <Plus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {staffList.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 space-y-4 relative group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-full">
                    {capitalize(s.department)}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mt-2">{s.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleOpenEdit(s)} className="p-1 text-gray-400 hover:text-primary-600"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-gray-500">
                {s.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" />{s.phone}</div>}
                {s.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" />{s.email}</div>}
              </div>

              <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  {s.is_available ? (
                    <span className="flex items-center gap-1 text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Available</span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500"><XCircle className="w-3.5 h-3.5" /> Unavailable</span>
                  )}
                </div>
                <span className="bg-gray-100 px-2.5 py-1 rounded-lg text-gray-700">
                  Active Workload: <strong className="text-primary-600">{s.current_workload}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-bounce-in">
            <h3 className="font-black text-lg text-gray-900">{editingStaff ? 'Edit Staff Member' : 'Add New Staff'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Name *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Technician Name" className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Department *</label>
                <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 capitalize">
                  {departments.map(d => <option key={d} value={d}>{capitalize(d)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="9800000000" className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="staff@society.com" className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="avail" checked={form.is_available} onChange={e => setForm({ ...form, is_available: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500" />
                <label htmlFor="avail" className="text-sm font-medium text-gray-700">Currently Available for Duty</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold shadow-glow">
                  {submitting ? 'Saving...' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
