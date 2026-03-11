'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CRYPTO_OPTIONS, getCryptoLabel, DEFAULT_LIVE_RATES, LiveRates } from '@/app/lib/crypto';
import { createOrder } from '@/app/lib/orders-api';
import { getToken } from '@/app/lib/auth';

const TELECEL_PREFIXES = ['020', '050'];

type Bundle = { id: string; label: string; priceGhs: number };

const TELECEL_BUNDLES: Bundle[] = [
  { id: '1', label: '1GB - 1 Day', priceGhs: 7 },
  { id: '2', label: '2GB - 2 Days', priceGhs: 12 },
  { id: '3', label: '3GB - 7 Days', priceGhs: 17 },
  { id: '4', label: '5GB - 7 Days', priceGhs: 23 },
  { id: '5', label: '10GB - 30 Days', priceGhs: 42 },
  { id: '6', label: '20GB - 30 Days', priceGhs: 75 },
  { id: '7', label: '50GB - 30 Days', priceGhs: 170 },
  { id: '8', label: '100GB - 30 Days', priceGhs: 300 },
];

function calcBundleCrypto(ghsAmount: number, cryptoValue: string, rates: LiveRates): string {
  if (!ghsAmount) return '—';
  const usd = ghsAmount / rates.ghsPerUsd;
  if (cryptoValue === 'BTC') return (usd / rates.btcUsd).toFixed(6);
  if (cryptoValue === 'BNB') return (usd / rates.bnbUsd).toFixed(4);
  if (cryptoValue === 'ETH') return (usd / rates.ethUsd).toFixed(6);
  return usd.toFixed(2);
}

export default function TelecelDataPage() {
  const router = useRouter();

  const [rates, setRates] = useState<LiveRates>(DEFAULT_LIVE_RATES);
  const [bundles, setBundles] = useState<Bundle[]>(TELECEL_BUNDLES);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()).catch(() => null),
      fetch('/api/crypto-prices').then(r => r.json()).catch(() => null),
      fetch('/api/bundles?network=Telecel').then(r => r.json()).catch(() => null),
    ]).then(([settingsData, pricesData, bundlesData]) => {
      setRates({
        ghsPerUsd: settingsData?.settings?.ghsPerUsd ?? DEFAULT_LIVE_RATES.ghsPerUsd,
        btcUsd: pricesData?.btcUsd ?? DEFAULT_LIVE_RATES.btcUsd,
        bnbUsd: pricesData?.bnbUsd ?? DEFAULT_LIVE_RATES.bnbUsd,
        ethUsd: pricesData?.ethUsd ?? DEFAULT_LIVE_RATES.ethUsd,
      });
      if (bundlesData?.bundles?.length > 0) setBundles(bundlesData.bundles);
    });
  }, []);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [selectedBundleIndex, setSelectedBundleIndex] = useState<number | null>(null);
  const [crypto, setCrypto] = useState('');

  const [phoneError, setPhoneError] = useState('');
  const [formError, setFormError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');

  const selectedBundle = selectedBundleIndex !== null ? bundles[selectedBundleIndex] : null;
  const cryptoAmount = crypto && selectedBundle ? calcBundleCrypto(selectedBundle.priceGhs, crypto, rates) : '—';

  function handlePhoneChange(val: string) {
    setPhone(val);
    if (val.length >= 3) {
      const prefix = val.slice(0, 3);
      if (!TELECEL_PREFIXES.includes(prefix)) {
        setPhoneError('Please enter a valid Telecel number (020, 050)');
      } else {
        setPhoneError('');
      }
    } else {
      setPhoneError('');
    }
  }

  function handleProceed() {
    if (!phone || !name || selectedBundleIndex === null || !crypto) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (phoneError) {
      setFormError('Please fix the errors above.');
      return;
    }
    setFormError('');
    setShowModal(true);
  }

  async function handleConfirm() {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    setSubmitting(true);
    const order = await createOrder({
      serviceType: 'data',
      service: 'Telecel Data Bundle',
      recipient: phone,
      recipientName: name,
      amountGhs: selectedBundle?.priceGhs ?? 0,
      cryptoAsset: crypto,
      cryptoAmount,
      bundleLabel: selectedBundle?.label,
      cryptoRateGhs: rates.ghsPerUsd,
    });
    setSubmitting(false);
    if (order) {
      setOrderId(order.id);
    } else {
      setFormError('Failed to create order. Please try again.');
      setShowModal(false);
    }
  }

  if (orderId) {
    return (
      <div className="bg-green-50 rounded-2xl p-10 text-center">
        <p className="text-4xl mb-4">✅</p>
        <h1 className="text-green-900 font-bold text-2xl mb-2">Order Submitted!</h1>
        <p className="text-green-700 mb-4">Your order has been received.</p>
        <Link href={`/orders/${orderId}`} className="inline-block bg-green-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800">
          Track Your Order →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-red-50 rounded-2xl p-6 md:p-10 shadow-sm max-w-2xl mx-auto">
      <Link
        href="/spend"
        className="inline-flex items-center gap-1 text-red-800 hover:text-red-900 mb-6 text-sm font-medium"
      >
        ← Back to Spend
      </Link>

      <h1 className="text-red-800 text-2xl md:text-3xl font-bold mb-1">Telecel Data Bundles</h1>
      <p className="text-gray-500 mb-2 text-sm">Buy data bundles for any Telecel number with crypto</p>
      <p className="text-xs text-gray-400 mb-6">
        Rate: 1 USD = {rates.ghsPerUsd} GHS (admin rate) | 1 BTC = ${rates.btcUsd.toLocaleString()} (live)
      </p>

      <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-5">
        {/* Telecel Number */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Telecel Number *</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            maxLength={10}
            placeholder="020XXXXXXX or 050XXXXXXX"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {phoneError && <p className="text-red-500 text-xs">{phoneError}</p>}
        </div>

        {/* Name on Number */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Name on Number *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name on Telecel account"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <p className="text-gray-400 text-xs">💡 Please verify the name matches the account</p>
        </div>

        {/* Select Bundle */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Select Bundle *</label>
          <select
            value={selectedBundleIndex ?? ''}
            onChange={(e) =>
              setSelectedBundleIndex(e.target.value === '' ? null : parseInt(e.target.value))
            }
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">— Choose a bundle —</option>
            {bundles.map((b, i) => (
              <option key={b.id} value={i}>
                {b.label} — GHS {b.priceGhs.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {/* Select Crypto */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Select Crypto *</label>
          <select
            value={crypto}
            onChange={(e) => setCrypto(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">— Choose crypto —</option>
            {CRYPTO_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Live Calculation */}
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-sm flex flex-col gap-1 text-green-900">
          {selectedBundle ? (
            <>
              <p>
                Bundle: <strong>{selectedBundle.label}</strong>
              </p>
              <p>
                Price: <strong className="text-green-700 text-base">GHS {selectedBundle.priceGhs.toFixed(2)}</strong>
              </p>
              <p>
                You will send:{' '}
                <strong>
                  {cryptoAmount} {crypto ? getCryptoLabel(crypto) : ''}
                </strong>
              </p>
              <p className="text-xs text-gray-500">Rate: 1 USD = {rates.ghsPerUsd} GHS (admin rate) — locked at confirmation</p>
            </>
          ) : (
            <p>— Select a bundle to see the price —</p>
          )}
        </div>

        {/* Proceed Button */}
        {formError && <p className="text-red-500 text-xs -mt-2">{formError}</p>}
        <button
          onClick={handleProceed}
          className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          Proceed to Payment →
        </button>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-red-800 text-lg font-bold mb-4">Confirm Order</h2>
            <div className="flex flex-col gap-2 text-sm text-gray-700 mb-6">
              <div className="flex justify-between">
                <span className="font-medium">Service:</span>
                <span>Telecel Data Bundle</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Telecel Number:</span>
                <span>{phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Name:</span>
                <span>{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Bundle:</span>
                <span>{selectedBundle?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Price:</span>
                <span className="font-bold text-green-700">{selectedBundle?.priceGhs.toFixed(2)} GHS</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">You will send:</span>
                <span>
                  {cryptoAmount} {getCryptoLabel(crypto)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-4">Rate is locked at time of confirmation.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
