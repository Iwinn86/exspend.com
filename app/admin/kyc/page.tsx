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
  frontImage: string;
  backImage?: string;
  selfieImage: string;
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
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

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

  function toggleDocs(id: string) {
    setExpandedDocs(prev => ({ ...prev, [id]: !prev[id] }));
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
        <div className="flex flex-col gap-4">
          {(() => {
            const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
            const paged = entries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
            return (
              <>
                {paged.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                  <tbody>
                    <tr className="hover:bg-gray-50">
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
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => toggleDocs(entry.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors mb-1"
                          >
                            {expandedDocs[entry.id] ? 'Hide Docs' : '🖼 View Documents'}
                          </button>
                          {entry.status === 'pending' && (
                            <>
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
                            </>
                          )}
                          {entry.status !== 'pending' && (
                            <span className="text-xs text-gray-400">
                              {entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleDateString() : '—'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {expandedDocs[entry.id] && (
                <div className="px-4 py-4 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Uploaded Documents</p>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Front ID</p>
                      <a href={entry.frontImage} target="_blank" rel="noopener noreferrer">
                        <img src={entry.frontImage} alt="Front ID" className="w-full max-w-xs rounded border hover:opacity-90 transition-opacity" />
                      </a>
                    </div>
                    {entry.backImage && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Back ID</p>
                        <a href={entry.backImage} target="_blank" rel="noopener noreferrer">
                          <img src={entry.backImage} alt="Back ID" className="w-full max-w-xs rounded border hover:opacity-90 transition-opacity" />
                        </a>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Selfie</p>
                      <a href={entry.selfieImage} target="_blank" rel="noopener noreferrer">
                        <img src={entry.selfieImage} alt="Selfie" className="w-full max-w-xs rounded border hover:opacity-90 transition-opacity" />
                        </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    >
                      ← Prev
                    </button>
                    <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

