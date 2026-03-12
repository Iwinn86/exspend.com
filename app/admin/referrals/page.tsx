'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/app/lib/auth';

type ReferralReward = {
  id: string;
  referrerId: string;
  referredUserId: string;
  rewardType: string;
  rewardNetwork: string;
  rewardPhone: string | null;
  status: 'pending' | 'approved' | 'sent';
  approvedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  referrer: { name: string; email: string; kycVerified: boolean; isVerified: boolean };
  referredUser: { name: string; email: string; kycVerified: boolean; isVerified: boolean };
};

const STATUS_BADGE: Record<ReferralReward['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
};

export default function AdminReferralsPage() {
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'sent'>('all');
  const [ineligibleOpen, setIneligibleOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  function loadRewards() {
    const token = getToken();
    if (!token) return;
    fetch('/api/admin/referral/list', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setRewards(d.rewards || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(loadRewards, []);

  async function handleApprove(rewardId: string) {
    const token = getToken();
    if (!token) return;
    setActionMsg(null);
    const res = await fetch('/api/admin/referral/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rewardId }),
    });
    if (res.ok) {
      setActionMsg('Reward approved successfully!');
      loadRewards();
    } else {
      const d = await res.json();
      setActionMsg(d.error || 'Failed to approve');
    }
  }

  async function handleSendBonus(rewardId: string) {
    const token = getToken();
    if (!token) return;
    setActionMsg(null);
    const res = await fetch('/api/admin/referral/send-bonus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rewardId }),
    });
    if (res.ok) {
      setActionMsg('Bonus marked as sent!');
      loadRewards();
    } else {
      const d = await res.json();
      setActionMsg(d.error || 'Failed to mark as sent');
    }
  }

  const filtered = filter === 'all' ? rewards : rewards.filter(r => r.status === filter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Section counts from full filtered list (for accurate headers)
  const totalEligible = filtered.filter(r => r.referrer.kycVerified && r.referredUser.kycVerified && r.status !== 'sent').length;
  const totalSent = filtered.filter(r => r.status === 'sent').length;
  const totalIneligible = filtered.filter(r => !r.referrer.kycVerified || !r.referredUser.kycVerified).length;

  // Section items from current page only
  const eligible = paged.filter(r =>
    r.referrer.kycVerified && r.referredUser.kycVerified && r.status !== 'sent'
  );
  const sent = paged.filter(r => r.status === 'sent');
  const ineligible = paged.filter(r =>
    !r.referrer.kycVerified || !r.referredUser.kycVerified
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-green-900 text-2xl font-bold">Referral Rewards</h1>
        <select
          value={filter}
          onChange={e => { setFilter(e.target.value as typeof filter); setCurrentPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="sent">Sent</option>
        </select>
      </div>

      {actionMsg && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">No referral rewards found.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Eligible section */}
          {totalEligible > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-3">✅ Eligible for Bonus ({totalEligible})</h2>
              <div className="flex flex-col gap-4">
                {eligible.map(reward => (
                  <div key={reward.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[reward.status]}`}>
                            {reward.status.charAt(0).toUpperCase() + reward.status.slice(1)}
                          </span>
                          <span className="text-xs text-gray-400">{new Date(reward.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-2">
                          🎁 200 MB on <strong>{reward.rewardNetwork.toUpperCase()}</strong>
                          {reward.rewardPhone && <span className="text-gray-500"> → {reward.rewardPhone}</span>}
                        </p>
                        <div className="text-xs text-gray-600 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span>Referrer: <strong>{reward.referrer.name}</strong> ({reward.referrer.email})</span>
                            <span className="text-green-600 font-semibold">✅ KYC Verified</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Referred: <strong>{reward.referredUser.name}</strong> ({reward.referredUser.email})</span>
                            <span className="text-green-600 font-semibold">✅ KYC Verified</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSendBonus(reward.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Send Bonus ✅
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sent section */}
          {totalSent > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-3">📤 Sent ({totalSent})</h2>
              <div className="flex flex-col gap-4">
                {sent.map(reward => (
                  <div key={reward.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm opacity-75">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          🎁 200 MB on <strong>{reward.rewardNetwork.toUpperCase()}</strong>
                          {reward.rewardPhone && <span className="text-gray-500"> → {reward.rewardPhone}</span>}
                        </p>
                        <div className="text-xs text-gray-600">
                          <span>Referrer: <strong>{reward.referrer.name}</strong></span>
                          {' · '}
                          <span>Referred: <strong>{reward.referredUser.name}</strong></span>
                        </div>
                      </div>
                      <span className="text-green-700 text-sm font-semibold bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                        ✅ Bonus Sent {reward.sentAt ? new Date(reward.sentAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ineligible section */}
          {totalIneligible > 0 && (
            <div>
              <button
                onClick={() => setIneligibleOpen(o => !o)}
                className="flex items-center gap-2 text-base font-semibold text-gray-500 mb-3 hover:text-gray-700 transition-colors"
              >
                <span>{ineligibleOpen ? '▾' : '▸'}</span>
                <span>⚠️ Not Eligible ({totalIneligible})</span>
              </button>
              {ineligibleOpen && (
                <div className="flex flex-col gap-4">
                  {ineligible.map(reward => (
                    <div key={reward.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm opacity-60">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-2">
                            🎁 200 MB on <strong>{reward.rewardNetwork.toUpperCase()}</strong>
                            {reward.rewardPhone && <span className="text-gray-500"> → {reward.rewardPhone}</span>}
                          </p>
                          <div className="text-xs text-gray-600 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span>Referrer: <strong>{reward.referrer.name}</strong> ({reward.referrer.email})</span>
                              {reward.referrer.kycVerified
                                ? <span className="text-green-600 font-semibold">✅ KYC Verified</span>
                                : <span className="text-orange-600 font-semibold">⚠️ Not KYC Verified</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span>Referred: <strong>{reward.referredUser.name}</strong> ({reward.referredUser.email})</span>
                              {reward.referredUser.kycVerified
                                ? <span className="text-green-600 font-semibold">✅ KYC Verified</span>
                                : <span className="text-orange-600 font-semibold">⚠️ Not KYC Verified</span>}
                            </div>
                          </div>
                        </div>
                        <span className="text-orange-700 text-sm font-semibold bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
                          ⚠️ Not Eligible
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {eligible.length === 0 && sent.length === 0 && ineligible.length === 0 && (
            <p className="text-gray-400 text-sm">No referral rewards found.</p>
          )}

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
        </div>
      )}
    </div>
  );
}

