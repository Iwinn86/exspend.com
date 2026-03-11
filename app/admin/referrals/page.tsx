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
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'sent'>('pending');

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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-green-900 text-2xl font-bold">Referral Rewards</h1>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as typeof filter)}
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
        <div className="flex flex-col gap-4">
          {filtered.map(reward => {
            const bothVerified = reward.referrer.kycVerified && reward.referredUser.kycVerified;
            return (
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
                    {!bothVerified && reward.status === 'pending' && (
                      <div className="mt-2 flex flex-col gap-0.5">
                        {!reward.referrer.kycVerified && (
                          <p className="text-xs text-orange-600">⚠️ Referrer not KYC verified</p>
                        )}
                        {!reward.referredUser.kycVerified && (
                          <p className="text-xs text-orange-600">⚠️ Referred user not KYC verified</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {reward.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(reward.id)}
                        disabled={!bothVerified}
                        title={!bothVerified ? 'Both users must be KYC verified to approve' : ''}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          bothVerified
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Approve
                      </button>
                    )}
                    {reward.status === 'approved' && (
                      <button
                        onClick={() => handleSendBonus(reward.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Mark as Sent ✅
                      </button>
                    )}
                    {reward.status === 'sent' && (
                      <span className="text-green-700 text-sm font-semibold">
                        ✅ Bonus Sent {reward.sentAt ? new Date(reward.sentAt).toLocaleDateString() : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

