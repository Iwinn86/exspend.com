'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DEFAULT_LIVE_RATES, LiveRates } from '@/app/lib/crypto';
import { createOrder } from '@/app/lib/orders-api';
import { getToken } from '@/app/lib/auth';

const AIRTIME_CRYPTO_OPTIONS = [
  { label: 'Binance Pay', value: 'BINANCE_PAY' },
  { label: 'Bybit Pay', value: 'BYBIT_PAY' },
];

const MTN_PREFIXES = ['024', '054', '055', '059'];
const MIN_AMOUNT = 5;

export default function MtnAirtimePage() {
  const router = useRouter();

  const [rates, setRates] = useState<LiveRates>(DEFAULT_LIVE_RATES);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()).catch(() => null),
      fetch('/api/crypto-prices').then(r => r.json()).catch(() => null),
    ]).then(([settingsData, pricesData]) => {
      setRates({
        ghsPerUsd: settingsData?.settings?.ghsPerUsd ?? DEFAULT_LIVE_RATES.ghsPerUsd,
        btcUsd: pricesData?.btcUsd ?? DEFAULT_LIVE_RATES.btcUsd,
        bnbUsd: pricesData?.bnbUsd ?? DEFAULT_LIVE_RATES.bnbUsd,
        ethUsd: pricesData?.ethUsd ?? DEFAULT_LIVE_RATES.ethUsd,
      });
    });
  }, []);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [crypto, setCrypto] = useState('');

  const [phoneError, setPhoneError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [formError, setFormError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');

  const amountNum = parseFloat(amount);
  const cryptoAmount =
    crypto && amount && !isNaN(amountNum) && amountNum >= MIN_AMOUNT
      ? (amountNum / rates.ghsPerUsd).toFixed(2)
      : '—';
  const cryptoLabel =
    AIRTIME_CRYPTO_OPTIONS.find((c) => c.value === crypto)?.label ?? '';

  function handlePhoneChange(val: string) {
    setPhone(val);
    if (val.length >= 3) {
      const prefix = val.slice(0, 3);
      if (!MTN_PREFIXES.includes(prefix)) {
        setPhoneError('Please enter a valid MTN number (024, 054, 055, 059)');
      } else {
        setPhoneError('');
      }
    } else {
      setPhoneError('');
    }
  }

  function handleAmountChange(val: string) {
    setAmount(val);
    const n = parseFloat(val);
    if (val && (isNaN(n) || n < MIN_AMOUNT)) {
      setAmountError('Minimum top-up amount is 5 GHS');
    } else {
      setAmountError('');
    }
  }

  function handleProceed() {
    if (!phone || !name || !amount || !crypto) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (phoneError) {
      setFormError('Please fix the errors above.');
      return;
    }
    if (amountNum < MIN_AMOUNT) {
      setAmountError('Minimum top-up amount is 5 GHS');
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
      serviceType: 'airtime',
      service: 'MTN Airtime Top-Up',
      recipient: phone,
      recipientName: name,
      amountGhs: amountNum,
      cryptoAsset: crypto,
      cryptoAmount: cryptoAmount ?? '—',
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
    <div className="bg-yellow-50 rounded-2xl p-6 md:p-10 shadow-sm max-w-2xl mx-auto">
      <Link
        href="/spend"
        className="inline-flex items-center gap-1 text-yellow-800 hover:text-yellow-900 mb-6 text-sm font-medium"
      >
        ← Back to Spend
      </Link>

      <h1 className="text-yellow-800 text-2xl md:text-3xl font-bold mb-1">MTN Airtime Top-Up</h1>
      <p className="text-gray-500 mb-2 text-sm">Top up any MTN number with crypto</p>
      <p className="text-xs text-gray-400 mb-6">
        Rate: 1 USD = {rates.ghsPerUsd} GHS (admin rate)
      </p>

      {/* Warning box */}
      <div className="bg-yellow-50 border border-yellow-400 text-yellow-800 rounded-xl px-4 py-3 text-sm mb-6">
        ⚠️ Minimum top-up is 5 GHS. Supported payment: Binance Pay &amp; Bybit Pay only.
      </div>

      <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-5">
        {/* MTN Number */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">MTN Number *</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            maxLength={10}
            placeholder="024XXXXXXX or 054XXXXXXX"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
            placeholder="Full name on MTN account"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <p className="text-gray-400 text-xs">💡 Please verify the name matches the account</p>
        </div>

        {/* Amount GHS */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Amount (GHS) *</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            min={MIN_AMOUNT}
            placeholder="Minimum 5 GHS"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          {amountError && <p className="text-red-500 text-xs">{amountError}</p>}
        </div>

        {/* Select Payment Method */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Select Payment Method *</label>
          <select
            value={crypto}
            onChange={(e) => setCrypto(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="">— Choose payment method —</option>
            {AIRTIME_CRYPTO_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Live Calculation */}
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-sm flex flex-col gap-1 text-green-900">
          <p>
            You will pay: <strong>{cryptoAmount} {cryptoLabel}</strong>
          </p>
          <p>
            Amount: <strong className="text-green-700">{amountNum > 0 ? `GHS ${amountNum.toLocaleString()}` : '—'}</strong>
          </p>
          <p className="text-xs text-gray-500">Rate: 1 USD = {rates.ghsPerUsd} GHS (admin rate) — locked at confirmation</p>
          <p>Network fee: Zero ✅</p>
          <p>Note: Binance Pay &amp; Bybit Pay have no network fees</p>
        </div>

        {/* Proceed Button */}
        {formError && (
          <p className="text-red-500 text-xs -mt-2">{formError}</p>
        )}
        <button
          onClick={handleProceed}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          Proceed to Payment →
        </button>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-yellow-800 text-lg font-bold mb-4">Confirm Order</h2>
            <div className="flex flex-col gap-2 text-sm text-gray-700 mb-6">
              <div className="flex justify-between">
                <span className="font-medium">Service:</span>
                <span>MTN Airtime Top-Up</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">MTN Number:</span>
                <span>{phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Name:</span>
                <span>{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Amount:</span>
                <span className="font-bold text-green-700">{amountNum.toLocaleString()} GHS</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">You will pay:</span>
                <span>{cryptoAmount} {cryptoLabel}</span>
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
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
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
