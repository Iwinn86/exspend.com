'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '@/app/lib/auth';

type ReferredUser = {
  id: string;
  name: string;
  createdAt: string;
  kycVerified: boolean;
};

type ReferralReward = {
  id: string;
  rewardNetwork: string;
  status: string;
  createdAt: string;
  referredUser: { name: string; email: string } | null;
};

type ReferralData = {
  referralCode: string | null;
  referrals: ReferredUser[];
  rewards: ReferralReward[];
  stats: { totalSignups: number; totalApproved: number; totalSent: number };
};

export default function ProfileReferralsPage() {
  const router = useRouter();
  const token = getToken();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    fetch('/api/referral/rewards', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, router]);

  const verified = data?.referrals.filter(r => r.kycVerified) ?? [];
  const unverified = data?.referrals.filter(r => !r.kycVerified) ?? [];

  function getRewardStatus(referredName: string) {
    const reward = data?.rewards.find(r => r.referredUser?.name === referredName);
    return reward?.status ?? null;
  }

  const REWARD_BADGE: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    sent: 'bg-green-100 text-green-700',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-green-700 hover:underline text-sm">← Profile</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-800">My Referrals</h1>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading…</div>
      ) : !data ? (
        <div className="text-gray-400 text-sm py-8 text-center">Failed to load referrals</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{data.stats.totalSignups}</p>
              <p className="text-xs text-gray-500 mt-1">Total Invited</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{verified.length}</p>
              <p className="text-xs text-gray-500 mt-1">KYC Verified</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">{unverified.length}</p>
              <p className="text-xs text-gray-500 mt-1">Not Yet Verified</p>
            </div>
          </div>

          {/* Verified & Rewarded */}
          {verified.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-green-800 mb-3">✅ Verified & Rewarded</h2>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Joined</th>
                      <th className="px-4 py-3 text-left">KYC</th>
                      <th className="px-4 py-3 text-left">Reward</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {verified.map(ref => {
                      const rewardStatus = getRewardStatus(ref.name);
                      return (
                        <tr key={ref.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{ref.name}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(ref.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className="text-green-600 text-xs font-semibold">✅ Verified</span>
                          </td>
                          <td className="px-4 py-3">
                            {rewardStatus ? (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${REWARD_BADGE[rewardStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                                {rewardStatus.charAt(0).toUpperCase() + rewardStatus.slice(1)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Not Yet Verified */}
          {unverified.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-yellow-800 mb-3">⏳ Not Yet Verified</h2>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Joined</th>
                      <th className="px-4 py-3 text-left">KYC Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {unverified.map(ref => (
                      <tr key={ref.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{ref.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(ref.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className="text-yellow-600 text-xs font-semibold">⏳ Pending Verification</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {data.referrals.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">👥</p>
              <p>You haven&apos;t invited anyone yet.</p>
              <p className="text-sm mt-1">Share your referral code to get started!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
