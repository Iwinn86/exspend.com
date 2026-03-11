'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/app/lib/auth';

type QuotaData = {
  totalSpent: number;
  dailyLimit: number;
  remaining: number;
};

export default function DailyQuotaDisplay({ currentAmount }: { currentAmount?: number }) {
  const [quota, setQuota] = useState<QuotaData | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch('/api/user/daily-quota', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setQuota(d))
      .catch(() => {});
  }, []);

  if (!quota) return null;

  const afterThis = currentAmount && currentAmount > 0
    ? Math.max(0, quota.remaining - currentAmount)
    : null;

  const usedPercent = Math.min(100, (quota.totalSpent / quota.dailyLimit) * 100);
  const wouldExceed = currentAmount && currentAmount > quota.remaining;

  return (
    <div className={`rounded-xl px-4 py-3 text-sm flex flex-col gap-1 ${wouldExceed ? 'bg-red-50 border border-red-200 text-red-900' : 'bg-blue-50 border border-blue-100 text-blue-900'}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="font-medium text-xs uppercase tracking-wide">Daily Spending Quota</span>
        <span className="text-xs text-gray-500">{quota.dailyLimit.toLocaleString()} GHS limit</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
        <div
          className={`h-1.5 rounded-full transition-all ${usedPercent > 80 ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${usedPercent}%` }}
        />
      </div>
      <p>Today&apos;s spending: <strong>GHS {quota.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
      <p>Quota remaining: <strong className={quota.remaining < 5000 ? 'text-red-700' : 'text-green-700'}>GHS {quota.remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
      {afterThis !== null && currentAmount && currentAmount > 0 && (
        <p className="text-xs">After this order: <strong>GHS {afterThis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining</strong></p>
      )}
      {wouldExceed && (
        <p className="text-red-700 font-semibold text-xs mt-1">⚠️ This amount exceeds your daily quota. Please reduce the amount.</p>
      )}
    </div>
  );
}
