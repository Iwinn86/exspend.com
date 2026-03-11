'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/app/lib/auth';

type KycEntry = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  documentType: string;
  documentNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
};

const STATUS_BADGE: Record<KycEntry['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function AdminKycPage() {
  const [entries, setEntries] = useState<KycEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  function loadKyc() {
    const token = getToken();
    if (!token) return;
    fetch('/api/admin/kyc', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setEntries(d.kyc || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(loadKyc, []);

  async function handleAction(id: string, action: 'approve' | 'reject', rejectionReason?: string) {
    const token = getToken();
    if (!token) return;
    setActionMsg(null);
    const res = await fetch(`/api/admin/kyc/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, rejectionReason }),
    });
    if (res.ok) {
      setActionMsg(`KYC ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setRejectId(null);
      setRejectReason('');
      loadKyc();
    } else {
      const d = await res.json();
      setActionMsg(d.error || 'Action failed');
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">KYC Submissions</h1>
      <p className="text-sm text-gray-500 mb-6">
        {entries.length} submission{entries.length !== 1 ? 's' : ''}
      </p>

      {actionMsg && (
        <div className="mb-4 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-400 text-sm">No KYC submissions yet.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Document</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Submitted</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{entry.userName}</p>
                      <p className="text-gray-400 text-xs">{entry.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{entry.documentType}</p>
                      <p className="text-gray-400 text-xs">{entry.documentNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[entry.status]}`}>
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </span>
                      {entry.rejectionReason && (
                        <p className="text-xs text-red-500 mt-1">{entry.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(entry.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {entry.status === 'pending' && (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleAction(entry.id, 'approve')}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-500 transition-colors"
                          >
                            Approve
                          </button>
                          {rejectId === entry.id ? (
                            <div className="flex flex-col gap-1 mt-1">
                              <input
                                type="text"
                                placeholder="Rejection reason"
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleAction(entry.id, 'reject', rejectReason)}
                                  disabled={!rejectReason.trim()}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-500 disabled:opacity-50"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => { setRejectId(null); setRejectReason(''); }}
                                  className="px-2 py-1 border border-gray-300 text-gray-500 rounded text-xs hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRejectId(entry.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-500 transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      )}
                      {entry.status !== 'pending' && (
                        <span className="text-xs text-gray-400">
                          {entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleDateString() : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
