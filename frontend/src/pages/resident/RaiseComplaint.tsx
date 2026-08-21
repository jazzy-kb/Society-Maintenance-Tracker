import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Lightbulb, MapPin, Users, AlertTriangle } from 'lucide-react';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { CATEGORIES, TOWERS, capitalize } from '../../utils/cn';
import toast from 'react-hot-toast';

export default function RaiseComplaint() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    title: '', description: '', category: '', priority: 'normal',
    tower: user?.tower || '', flat_number: user?.flat_number || '',
    residents_affected: 1,
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recPriority, setRecPriority] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Real-time priority recommendation
  const calcRecPriority = (cat: string, pri: string, affected: number) => {
    const catWeights: Record<string, number> = {
      electrical: 3, lift: 3, water: 3, gas: 3, structural: 2, plumbing: 2, security: 2,
      cleaning: 1, parking: 1, garbage: 1, internet: 1, general: 1,
    };
    const priWeights: Record<string, number> = { low: 1, normal: 2, urgent: 3, emergency: 4 };
    let score = (priWeights[pri] || 2) + (catWeights[cat] || 1);
    if (affected >= 20) score += 2;
    else if (affected >= 6) score += 1;
    if (score >= 8) return 'emergency';
    if (score >= 6) return 'urgent';
    if (score >= 3) return 'normal';
    return 'low';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const next = { ...form, [e.target.name]: e.target.name === 'residents_affected' ? Number(e.target.value) : e.target.value };
    setForm(next);
    if (next.category && next.priority) {
      setRecPriority(calcRecPriority(next.category, next.priority, next.residents_affected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) { toast.error('Please select a category'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (photo) fd.append('photo', photo);
      const res = await api.post('/complaints/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Complaint ${res.data.complaint_id} raised successfully!`);
      navigate(`/resident/complaints/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to raise complaint');
    } finally {
      setLoading(false);
    }
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600', normal: 'bg-blue-100 text-blue-700',
    urgent: 'bg-orange-100 text-orange-700', emergency: 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900">Raise a Complaint</h2>
        <p className="text-gray-500 text-sm mt-1">Describe your issue clearly for faster resolution</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide text-gray-500">Issue Details</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input name="title" required value={form.title} onChange={handleChange}
              placeholder="E.g. Lift not working in Tower B"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
              <select name="category" required value={form.category} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none capitalize">
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{capitalize(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>

          {/* Priority recommendation */}
          {recPriority && recPriority !== form.priority && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-amber-700">
                Based on category & impact, we recommend:{' '}
                <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${priorityColors[recPriority]}`}>
                  {capitalize(recPriority)}
                </span>
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
            <textarea name="description" required value={form.description} onChange={handleChange}
              rows={4} placeholder="Describe the issue in detail. Include when it started, frequency, and any relevant context..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
          </div>
        </div>

        {/* Location & Impact */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wide text-gray-500 flex items-center gap-2">
            <MapPin className="w-4 h-4" />Location & Impact
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tower</label>
              <select name="tower" value={form.tower} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="">Select tower</option>
                {TOWERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Flat Number</label>
              <input name="flat_number" value={form.flat_number} onChange={handleChange}
                placeholder="B-204"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
              <Users className="w-4 h-4" />Residents Affected
            </label>
            <input name="residents_affected" type="number" min={1} max={500} value={form.residents_affected} onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
        </div>

        {/* Photo upload */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          <h3 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4" />Photo Evidence (optional)
          </h3>
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
              <button type="button" onClick={() => { setPhoto(null); setPreview(null); }}
                className="absolute top-2 right-2 w-7 h-7 bg-gray-900/70 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all">
              <Upload className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Click to upload photo</p>
              <p className="text-xs text-gray-300 mt-1">PNG, JPG up to 5MB</p>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </label>
          )}
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-glow">
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Complaint'}
        </button>
      </form>
    </div>
  );
}
