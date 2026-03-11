'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CRYPTO_OPTIONS, calcCrypto, getCryptoLabel, DEFAULT_LIVE_RATES, LiveRates } from '@/app/lib/crypto';
import { createOrder } from '@/app/lib/orders-api';
import { getToken } from '@/app/lib/auth';
import DailyQuotaDisplay from '@/app/components/DailyQuotaDisplay';

const MAX_ACCOUNT_NUMBER_LENGTH = 16;

const GHANA_BANKS = [
  'Ghana Commercial Bank (GCB)',
  'Ecobank Ghana',
  'Absa Bank Ghana',
  'Standard Chartered Ghana',
  'Fidelity Bank Ghana',
  'Cal Bank',
  'Zenith Bank Ghana',
  'Access Bank Ghana',
  'Agricultural Development Bank (ADB)',
  'National Investment Bank (NIB)',
  'Prudential Bank',
  'Universal Merchant Bank (UMB)',
  'First Atlantic Bank',
  'GT Bank Ghana',
  'Societe Generale Ghana',
  'Republic Bank Ghana',
  'Consolidated Bank Ghana (CBG)',
  'OmniBank Ghana',
];

export default function BankPage() {
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

  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [crypto, setCrypto] = useState('');

  const [amountError, setAmountError] = useState('');
  const [formError, setFormError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');

  const amountNum = parseFloat(amount);
  const cryptoAmount = crypto && amount ? calcCrypto(amountNum, crypto, rates) : '—';

  function handleAmountChange(val: string) {
    setAmount(val);
    const n = parseFloat(val);
    if (val && (isNaN(n) || n < 150)) {
      setAmountError('Amount must be at least 150 GHS.');
    } else {
      setAmountError('');
    }
  }

  function handleProceed() {
    if (!bank || !accountNumber || !accountName || !amount || !crypto) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (amountNum < 150) {
      setAmountError('Amount must be at least 150 GHS.');
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
      serviceType: 'bank',
      service: 'Bank Transfer',
      recipient: accountNumber,
      recipientName: accountName,
      amountGhs: amountNum,
      cryptoAsset: crypto,
      cryptoAmount,
      reference: reference || undefined,
      bankName: bank || undefined,
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
    <div className="bg-green-50 rounded-2xl p-6 md:p-10 shadow-sm max-w-2xl mx-auto">
      <Link
        href="/spend"
        className="inline-flex items-center gap-1 text-green-700 hover:text-green-900 mb-6 text-sm font-medium"
      >
        ← Back to Spend
      </Link>

      <h1 className="text-green-900 text-2xl md:text-3xl font-bold mb-1">Bank Transfer</h1>
      <p className="text-gray-500 mb-2 text-sm">Send crypto, receive GHS in any bank account</p>
      <p className="text-xs text-gray-400 mb-6">
        Rate: 1 USD = {rates.ghsPerUsd} GHS (admin rate) | 1 BTC = ${rates.btcUsd.toLocaleString()} (live)
      </p>

      {/* Warning box */}
      <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-xl px-4 py-3 text-sm mb-6">
        ⚠️ Minimum transfer amount is 150 GHS. Maximum daily limit is 30,000 GHS.
      </div>

      <div className="bg-white rounded-2xl shadow p-6 flex flex-col gap-5">
        {/* Select Bank */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Select Bank *</label>
          <select
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">— Choose a bank —</option>
            {GHANA_BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Account Number */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Account Number *</label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            maxLength={MAX_ACCOUNT_NUMBER_LENGTH}
            placeholder="Enter account number"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Account Name */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Account Name *</label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Account holder's full name"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Amount GHS */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Amount (GHS) *</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            min={150}
            placeholder="Minimum 150 GHS"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {amountError && <p className="text-red-500 text-xs">{amountError}</p>}
        </div>

        {/* Reference */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Reference (optional)</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. Payment for goods"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
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
          <p>
            Amount: <strong className="text-green-700 text-base">{amountNum > 0 ? `GHS ${amountNum.toLocaleString()}` : '—'}</strong>
          </p>
          <p>
            You will send:{' '}
            <strong>
              {cryptoAmount} {crypto ? getCryptoLabel(crypto) : ''}
            </strong>
          </p>
          <p className="text-xs text-gray-500">Rate: 1 USD = {rates.ghsPerUsd} GHS (admin rate) — locked at confirmation</p>
          <p>Network fee: included</p>
          <p>Daily limit: 30,000 GHS per account</p>

          {/* Daily Quota */}
          <DailyQuotaDisplay currentAmount={amountNum} />
        </div>

        {/* Proceed Button */}
        {formError && (
          <p className="text-red-500 text-xs -mt-2">{formError}</p>
        )}
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
            <h2 className="text-green-900 text-lg font-bold mb-4">Confirm Transfer</h2>
            <div className="flex flex-col gap-2 text-sm text-gray-700 mb-6">
              <div className="flex justify-between">
                <span className="font-medium">Bank:</span>
                <span>{bank}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Account Number:</span>
                <span>{accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Account Name:</span>
                <span>{accountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Amount:</span>
                <span className="font-bold text-green-700">{amountNum.toLocaleString()} GHS</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">You will send:</span>
                <span>
                  {cryptoAmount} {getCryptoLabel(crypto)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Reference:</span>
                <span>{reference || 'None'}</span>
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
