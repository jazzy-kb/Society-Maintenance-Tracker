import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Clock, Save } from 'lucide-react';
import api from '../../api/client';
import type { SLASetting } from '../../types';
import { capitalize } from '../../utils/cn';
import toast from 'react-hot-toast';

export default function SLASettingsPage() {
  const [settings, setSettings] = useState<SLASetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchSLA = async () => {
    try {
      const res = await api.get('/settings/sla');
      setSettings(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSLA();
  }, []);

  const handleUpdate = async (priority: string, hours: number) => {
    setSaving(priority);
    try {
      await api.put(`/settings/sla/${priority}`, { resolution_hours: hours, warning_threshold_pct: 80 });
      toast.success(`SLA for ${capitalize(priority)} updated to ${hours} hours`);
      fetchSLA();
    } catch {
      toast.error('Failed to update SLA');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-black text-gray-900">SLA Configurator</h2>
        <p className="text-gray-500 text-sm mt-1">Configure target resolution hours for each complaint priority tier</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 divide-y divide-gray-100">
        {settings.map(s => (
          <div key={s.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900 capitalize text-base">{s.priority} Priority</h3>
              <p className="text-xs text-gray-400">Target resolution window for {s.priority} complaints</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={500}
                value={s.resolution_hours}
                onChange={e => {
                  const val = Number(e.target.value);
                  setSettings(prev => prev.map(item => item.id === s.id ? { ...item, resolution_hours: val } : item));
                }}
                className="w-24 px-3 py-2 border rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 text-center"
              />
              <span className="text-xs text-gray-500 font-medium">hours</span>
              <button
                onClick={() => handleUpdate(s.priority, s.resolution_hours)}
                disabled={saving === s.priority}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-glow transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving === s.priority ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
