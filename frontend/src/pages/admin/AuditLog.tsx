import React, { useEffect, useState } from 'react';
import { ClipboardList, Shield, User } from 'lucide-react';
import api from '../../api/client';
import type { AuditLog } from '../../types';
import { formatDateTime } from '../../utils/cn';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/audit-logs').then(res => setLogs(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-black text-gray-900">System Audit Trail</h2>
        <p className="text-gray-500 text-sm mt-1">Immutable log of administrative actions and status changes</p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400">
          No audit entries logged yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b">
              <tr>
                <th className="p-4">Action</th>
                <th className="p-4">Resource</th>
                <th className="p-4">Details</th>
                <th className="p-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="p-4 font-semibold text-gray-900">{log.action}</td>
                  <td className="p-4 text-gray-600 capitalize">{log.resource_type || 'System'} #{log.resource_id || ''}</td>
                  <td className="p-4 text-gray-500 text-xs">{log.details || '—'}</td>
                  <td className="p-4 text-xs text-gray-400">{formatDateTime(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
