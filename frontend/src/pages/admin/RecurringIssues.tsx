import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Building } from 'lucide-react';
import api from '../../api/client';
import { capitalize, formatDate } from '../../utils/cn';

export default function RecurringIssues() {
  const [recurring, setRecurring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/recurring-issues').then(res => setRecurring(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-black text-gray-900">Recurring Infrastructure Issues</h2>
        <p className="text-gray-500 text-sm mt-1">Rule-based detection (3+ complaints in same category & tower within 30 days)</p>
      </div>

      {recurring.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <RefreshCw className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
          <p className="text-gray-700 font-bold">No recurring issues detected!</p>
          <p className="text-gray-400 text-sm mt-1">Your society infrastructure is running smoothly.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {recurring.map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-amber-200 shadow-card p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                  {item.count} Complaints Reported
                </span>
                <h3 className="text-lg font-bold text-gray-900 capitalize">{item.category} Malfunction</h3>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Building className="w-4 h-4 text-gray-400" /> Tower {item.tower}
                </p>
                {item.last_reported && (
                  <p className="text-xs text-gray-400 mt-2">
                    Last incident: {formatDate(item.last_reported)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
