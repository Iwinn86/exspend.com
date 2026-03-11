'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getToken } from '@/app/lib/auth';

type SpendButton = {
  emoji: string;
  label: string;
  href: string;
  disabled?: boolean;
};

type SpendCategory = {
  category: string;
  buttons: SpendButton[];
};

const spendCategories: SpendCategory[] = [
  {
    category: 'Bank / Mobile Money',
    buttons: [
      { emoji: '🏦', label: 'Bank', href: '/spend/bank' },
      { emoji: '📱', label: 'MTN MoMo', href: '/spend/mtn-momo' },
      { emoji: '📡', label: 'Telecel MoMo', href: '/spend/telecel-momo' },
      { emoji: '🔴', label: 'AirtelTigo MoMo', href: '/spend/airteltigo-momo' },
    ],
  },
  {
    category: 'Airtime Top Up',
    buttons: [
      { emoji: '🔴', label: 'AirtelTigo', href: '/spend/airteltigo-airtime' },
      { emoji: '📡', label: 'Telecel', href: '/spend/telecel-airtime' },
      { emoji: '🟡', label: 'MTN', href: '/spend/mtn-airtime' },
    ],
  },
  {
    category: 'Data Bundles',
    buttons: [
      { emoji: '🔴', label: 'AirtelTigo', href: '/spend/airteltigo-data' },
      { emoji: '📡', label: 'Telecel', href: '/spend/telecel-data' },
      { emoji: '🟡', label: 'MTN', href: '/spend/mtn-data' },
    ],
  },
  {
    category: 'Utilities',
    buttons: [
      { emoji: '📺', label: 'DStv', href: '/spend/dstv', disabled: true },
      { emoji: '📺', label: 'GOtv', href: '/spend/gotv', disabled: true },
      { emoji: '🎬', label: 'BoxOffice', href: '/spend/boxoffice', disabled: true },
      { emoji: '📡', label: 'Canal+', href: '/spend/canal', disabled: true },
      { emoji: '⚡', label: 'ECG', href: '/spend/ecg', disabled: true },
      { emoji: '💧', label: 'GWCL', href: '/spend/gwcl', disabled: true },
      { emoji: '🔌', label: 'ZL', href: '/spend/zl', disabled: true },
    ],
  },
];

export default function SpendPage() {
  const [kycVerified, setKycVerified] = useState<boolean | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('kyc_banner_dismissed') === '1';
  });

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch('/api/kyc', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setKycVerified(d.kyc?.status === 'approved'))
      .catch(() => {});
  }, []);

  function dismissBanner() {
    setBannerDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('kyc_banner_dismissed', '1');
    }
  }

  return (
    <div className="bg-green-50 rounded-2xl p-6 md:p-10 shadow-sm">
      {/* KYC banner */}
      {kycVerified === false && !bannerDismissed && (
        <div className="flex items-start justify-between gap-3 bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3 mb-6">
          <p className="text-sm text-yellow-800">
            ⚠️ Your account is not KYC verified. Transactions above GHS 500 may be limited.{' '}
            <Link href="/profile" className="font-semibold underline hover:text-yellow-900">
              Verify now →
            </Link>
          </p>
          <button onClick={dismissBanner} className="text-yellow-500 hover:text-yellow-700 shrink-0 mt-0.5">✕</button>
        </div>
      )}

      <h1 className="text-green-900 text-2xl md:text-3xl font-bold mb-8">
        Choose how you want to spend
      </h1>

      <div className="flex flex-col gap-8">
        {spendCategories.map(({ category, buttons }) => (
          <div key={category} className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="md:w-48 shrink-0">
              <span className="text-green-800 font-bold text-sm md:text-base">{category}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {buttons.map(({ emoji, label, href, disabled }) =>
                disabled ? (
                  <div
                    key={label}
                    className="bg-white rounded-xl shadow p-3 flex flex-col items-center gap-1 min-w-[80px] opacity-50 cursor-not-allowed select-none"
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs text-center text-gray-600">{label}</span>
                    <span className="text-[10px] text-gray-400 italic">Soon</span>
                  </div>
                ) : (
                  <Link
                    key={label}
                    href={href}
                    className="bg-white rounded-xl shadow p-3 flex flex-col items-center gap-1 hover:bg-green-100 cursor-pointer min-w-[80px] transition-colors"
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs text-center text-gray-700">{label}</span>
                  </Link>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pay Online Sites - Coming Soon */}
      <div className="mt-10">
        <div className="bg-green-600 text-white rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-3 cursor-not-allowed opacity-80">
          <div>
            <p className="font-bold text-lg">Pay Online Sites</p>
            <p className="text-sm text-green-100">Amazon, Zoom, Aliexpress, Temu etc</p>
          </div>
          <span className="bg-white text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}