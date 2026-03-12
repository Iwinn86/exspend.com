'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '@/app/lib/auth';

const ASSETS = ['BTC', 'BNB', 'ETH', 'USDT (TRC-20)', 'USDT (BEP-20)', 'USDC (BEP-20)', 'Binance Pay', 'Bybit Pay'];

function assetToSettingsKey(asset: string): string {
  const map: Record<string, string> = {
    BTC: 'BTC',
    BNB: 'BNB',
    ETH: 'ETH',
    'USDT (TRC-20)': 'USDT_TRC20',
    'USDT (BEP-20)': 'USDT_BEP20',
    'USDC (BEP-20)': 'USDC_BEP20',
    'Binance Pay': 'BINANCE_PAY',
    'Bybit Pay': 'BYBIT_PAY',
  };
  return map[asset] ?? asset;
}

function ghsToCrypto(ghs: number, asset: string, btcUsd: number, bnbUsd: number, ethUsd: number, ghsPerUsd: number): string {
  if (!ghsPerUsd || ghsPerUsd === 0) return '0';
  const usd = ghs / ghsPerUsd;
  if (asset === 'BTC') return btcUsd ? (usd / btcUsd).toFixed(6) : '0';
  if (asset === 'BNB') return bnbUsd ? (usd / bnbUsd).toFixed(4) : '0';
  if (asset === 'ETH') return ethUsd ? (usd / ethUsd).toFixed(6) : '0';
  return usd.toFixed(2);
}

function cryptoToGhs(amount: number, asset: string, btcUsd: number, bnbUsd: number, ethUsd: number, ghsPerUsd: number): number {
  if (asset === 'BTC') return amount * btcUsd * ghsPerUsd;
  if (asset === 'BNB') return amount * bnbUsd * ghsPerUsd;
  if (asset === 'ETH') return amount * ethUsd * ghsPerUsd;
  return amount * ghsPerUsd;
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 inline mr-2" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

type PayoutMethod = 'momo' | 'bank';
type MomoNetwork = 'MTN' | 'Telecel' | 'AirtelTigo';
type InputMode = 'ghs' | 'crypto';

export default function SellPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loadingRates, setLoadingRates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Rates & settings
  const [ghsPerUsd, setGhsPerUsd] = useState(0);
  const [btcUsd, setBtcUsd] = useState(0);
  const [bnbUsd, setBnbUsd] = useState(0);
  const [ethUsd, setEthUsd] = useState(0);
  const [walletAddresses, setWalletAddresses] = useState<Record<string, string>>({});

  // Step 1
  const [asset, setAsset] = useState('BTC');
  const [inputMode, setInputMode] = useState<InputMode>('ghs');
  const [ghsInput, setGhsInput] = useState('');
  const [cryptoInput, setCryptoInput] = useState('');

  // Step 2
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('momo');
  const [momoNetwork, setMomoNetwork] = useState<MomoNetwork>('MTN');
  const [momoPhone, setMomoPhone] = useState('');
  const [momoName, setMomoName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');

  // Step 4 – success
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function loadRates() {
      setLoadingRates(true);
      try {
        const [pricesRes, settingsRes] = await Promise.all([
          fetch('/api/crypto-prices'),
          fetch('/api/settings'),
        ]);
        const pricesData = await pricesRes.json();
        const settingsData = await settingsRes.json();
        setBtcUsd(pricesData.btcUsd ?? 0);
        setBnbUsd(pricesData.bnbUsd ?? 0);
        setEthUsd(pricesData.ethUsd ?? 0);
        setGhsPerUsd(settingsData.settings?.sellRateGhsPerUsd ?? settingsData.settings?.ghsPerUsd ?? 0);
        setWalletAddresses(settingsData.settings?.walletAddresses ?? {});
      } catch {
        setError('Failed to load rates. Please refresh.');
      } finally {
        setLoadingRates(false);
      }
    }
    loadRates();
  }, []);

  // Derived amounts
  const ghsNum = inputMode === 'ghs' ? (parseFloat(ghsInput) || 0) : 0;
  const cryptoNum = inputMode === 'crypto' ? (parseFloat(cryptoInput) || 0) : 0;

  const derivedCrypto = inputMode === 'ghs' && ghsNum > 0
    ? ghsToCrypto(ghsNum, asset, btcUsd, bnbUsd, ethUsd, ghsPerUsd)
    : '';
  const derivedGhs = inputMode === 'crypto' && cryptoNum > 0
    ? cryptoToGhs(cryptoNum, asset, btcUsd, bnbUsd, ethUsd, ghsPerUsd)
    : 0;

  const finalCryptoAmount = inputMode === 'ghs' ? derivedCrypto : cryptoInput;
  const finalGhsAmount = inputMode === 'ghs' ? ghsNum : derivedGhs;

  const cryptoRateUsd = asset === 'BTC' ? btcUsd : asset === 'BNB' ? bnbUsd : asset === 'ETH' ? ethUsd : 1;
  const settingsKey = assetToSettingsKey(asset);
  const receiveWallet = walletAddresses[settingsKey] ?? '';

  const rateInfo = loadingRates
    ? 'Loading rates…'
    : `Rate: 1 USD = ${ghsPerUsd} GHS (admin rate) | 1 BTC = $${btcUsd.toLocaleString()} (live)`;

  function handleStep1Continue() {
    const minGhs = 150;
    if (finalGhsAmount < minGhs) { setError(`Minimum equivalent is GHS ${minGhs}`); return; }
    setError(null);
    setStep(2);
  }

  function handleStep2Continue() {
    if (payoutMethod === 'momo') {
      if (!momoPhone.trim()) { setError('Phone number is required'); return; }
      if (!momoName.trim()) { setError('Account name is required'); return; }
    } else {
      if (!bankName.trim()) { setError('Bank name is required'); return; }
      if (!bankAccount.trim()) { setError('Account number is required'); return; }
      if (!bankAccountName.trim()) { setError('Account name is required'); return; }
    }
    setError(null);
    setStep(3);
  }

  async function handleConfirmOrder() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('exspend_token') : null;
    if (!token) { router.push('/login'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        orderType: 'sell',
        serviceType: 'sell_crypto',
        service: `Sell ${asset}`,
        cryptoAsset: settingsKey,
        cryptoAmount: finalCryptoAmount,
        amountGhs: finalGhsAmount,
        cryptoRateGhs: ghsPerUsd,
        cryptoRateUsd,
      };

      if (payoutMethod === 'momo') {
        body.sellPayoutPhone = `${momoNetwork}: ${momoPhone}`;
        body.recipient = momoPhone;
        body.recipientName = momoName;
      } else {
        body.sellPayoutBank = `${bankName} | ${bankAccount}`;
        body.recipient = bankAccount;
        body.recipientName = bankAccountName;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create order'); return; }
      setOrderId(data.order.id);
      setStep(4);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleReset() {
    setStep(1);
    setAsset('BTC');
    setInputMode('ghs');
    setGhsInput('');
    setCryptoInput('');
    setMomoPhone('');
    setMomoName('');
    setBankName('');
    setBankAccount('');
    setBankAccountName('');
    setOrderId(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    s < step
                      ? 'bg-lime-400 border-lime-400 text-green-900'
                      : s === step
                      ? 'bg-white border-white text-green-900'
                      : 'bg-transparent border-green-500 text-green-400'
                  }`}
                >
                  {s < step ? '✓' : s}
                </div>
                {s < 3 && <div className={`w-10 h-0.5 ${s < step ? 'bg-lime-400' : 'bg-green-600'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="bg-green-50 rounded-2xl p-6 md:p-8 shadow-lg">
            <p className="text-4xl mb-3 text-center">📉</p>
            <h1 className="text-green-900 font-bold text-2xl mb-1 text-center">Sell Crypto for GHS</h1>
            <p className="text-green-700 text-sm text-center mb-6">{rateInfo}</p>

            {error && <p className="bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm mb-4">{error}</p>}

            <label className="block text-green-900 font-semibold mb-1 text-sm">Select Crypto</label>
            <select
              value={asset}
              onChange={(e) => { setAsset(e.target.value); setGhsInput(''); setCryptoInput(''); }}
              className="w-full border border-green-300 rounded-lg px-3 py-2 text-green-900 bg-white mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={loadingRates}
            >
              {ASSETS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>

            {/* Toggle input mode */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => { setInputMode('ghs'); setCryptoInput(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  inputMode === 'ghs'
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                }`}
              >
                Enter GHS amount
              </button>
              <button
                onClick={() => { setInputMode('crypto'); setGhsInput(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  inputMode === 'crypto'
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                }`}
              >
                Enter {asset} amount
              </button>
            </div>

            {inputMode === 'ghs' ? (
              <>
                <label className="block text-green-900 font-semibold mb-1 text-sm">GHS Amount to Receive</label>
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-semibold">GHS</span>
                  <input
                    type="number"
                    min="150"
                    value={ghsInput}
                    onChange={(e) => setGhsInput(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full border border-green-300 rounded-lg pl-14 pr-4 py-2 text-green-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={loadingRates}
                  />
                </div>
                {ghsNum >= 150 && !loadingRates && derivedCrypto && (
                  <div className="bg-green-100 rounded-lg px-4 py-3 my-3 text-sm text-green-800">
                    You will send approximately{' '}
                    <span className="font-bold">{derivedCrypto} {asset}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <label className="block text-green-900 font-semibold mb-1 text-sm">{asset} Amount to Send</label>
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-semibold text-xs">{asset}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={cryptoInput}
                    onChange={(e) => setCryptoInput(e.target.value)}
                    placeholder="e.g. 0.001"
                    className="w-full border border-green-300 rounded-lg pl-20 pr-4 py-2 text-green-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={loadingRates}
                  />
                </div>
                {cryptoNum > 0 && !loadingRates && derivedGhs > 0 && (
                  <div className="bg-green-100 rounded-lg px-4 py-3 my-3 text-sm text-green-800">
                    You will receive approximately{' '}
                    <span className="font-bold">GHS {derivedGhs.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}

            <p className="text-green-600 text-xs mb-5">Minimum: equivalent of GHS 150</p>

            <button
              onClick={handleStep1Continue}
              disabled={loadingRates || (inputMode === 'ghs' ? !ghsInput : !cryptoInput)}
              className="w-full bg-green-700 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loadingRates ? <><Spinner />Loading rates…</> : 'Continue'}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="bg-green-50 rounded-2xl p-6 md:p-8 shadow-lg">
            <h1 className="text-green-900 font-bold text-2xl mb-1">How to Receive GHS</h1>
            <p className="text-green-600 text-sm mb-5">Choose your preferred payout method</p>

            {error && <p className="bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm mb-4">{error}</p>}

            {/* Payout method radio */}
            <div className="flex gap-3 mb-5">
              {(['momo', 'bank'] as PayoutMethod[]).map((method) => (
                <button
                  key={method}
                  onClick={() => { setPayoutMethod(method); setError(null); }}
                  className={`flex-1 py-3 rounded-xl font-semibold border-2 transition-colors text-sm ${
                    payoutMethod === method
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
                  }`}
                >
                  {method === 'momo' ? '📱 Mobile Money' : '🏦 Bank Transfer'}
                </button>
              ))}
            </div>

            {payoutMethod === 'momo' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-green-900 font-semibold mb-1 text-sm">MoMo Network</label>
                  <select
                    value={momoNetwork}
                    onChange={(e) => setMomoNetwork(e.target.value as MomoNetwork)}
                    className="w-full border border-green-300 rounded-lg px-3 py-2 text-green-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {(['MTN', 'Telecel', 'AirtelTigo'] as MomoNetwork[]).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-green-900 font-semibold mb-1 text-sm">Phone Number</label>
                  <input
                    type="tel"
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    placeholder="e.g. 0241234567"
                    className="w-full border border-green-300 rounded-lg px-3 py-2 text-green-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-green-900 font-semibold mb-1 text-sm">Name on Account</label>
                  <input
                    type="text"
                    value={momoName}
                    onChange={(e) => setMomoName(e.target.value)}
                    placeholder="Full name"
                    className="w-full border border-green-300 rounded-lg px-3 py-2 text-green-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                {/* TODO: Replace with Hubtel API call when ready */}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-green-900 font-semibold mb-1 text-sm">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. GCB Bank"
                    className="w-full border border-green-300 rounded-lg px-3 py-2 text-green-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-green-900 font-semibold mb-1 text-sm">Account Number</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="e.g. 1234567890"
                    className="w-full border border-green-300 rounded-lg px-3 py-2 text-green-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-green-900 font-semibold mb-1 text-sm">Account Name</label>
                  <input
                    type="text"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="Full name on bank account"
                    className="w-full border border-green-300 rounded-lg px-3 py-2 text-green-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-green-300 text-green-700 hover:bg-green-100 font-semibold py-3 rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleStep2Continue}
                className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="bg-green-50 rounded-2xl p-6 md:p-8 shadow-lg">
            <h1 className="text-green-900 font-bold text-2xl mb-1">Confirm & Send Crypto</h1>
            <p className="text-green-600 text-sm mb-5">Review your order details</p>

            {error && <p className="bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm mb-4">{error}</p>}

            <div className="bg-white border border-green-200 rounded-xl p-4 mb-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">You send</span>
                <span className="font-bold text-green-900">{finalCryptoAmount} {asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">You receive</span>
                <span className="font-bold text-green-900">GHS {finalGhsAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Rate used</span>
                <span className="text-green-900">1 USD = {ghsPerUsd} GHS</span>
              </div>
              <hr className="border-green-100" />
              <div>
                <span className="text-green-700 block mb-1">Send {asset} to</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-green-900 break-all flex-1">
                    {receiveWallet || 'Loading wallet address…'}
                  </span>
                  {receiveWallet && (
                    <button
                      onClick={() => handleCopy(receiveWallet)}
                      className="shrink-0 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-semibold px-2 py-1 rounded transition-colors"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>
              <hr className="border-green-100" />
              <div className="flex justify-between">
                <span className="text-green-700">Payment goes to</span>
                <span className="text-green-900 text-right">
                  {payoutMethod === 'momo'
                    ? `${momoNetwork} – ${momoPhone} (${momoName})`
                    : `${bankName} – ${bankAccount} (${bankAccountName})`}
                </span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800 mb-5">
              ⏱️ You have <strong>30 minutes</strong> to send the crypto after confirming this order.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={submitting}
                className="flex-1 border border-green-300 text-green-700 hover:bg-green-100 font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={submitting}
                className="flex-1 bg-green-700 hover:bg-green-600 disabled:bg-green-400 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {submitting ? <><Spinner />Submitting…</> : 'Confirm Order'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 – SUCCESS */}
        {step === 4 && orderId && (
          <div className="bg-green-50 rounded-2xl p-6 md:p-10 shadow-lg text-center">
            <p className="text-5xl mb-4">🎉</p>
            <h1 className="text-green-900 font-bold text-2xl mb-2">Order Created!</h1>
            <p className="text-green-700 mb-1">
              Your order <span className="font-mono font-bold">#{orderId.slice(0, 8).toUpperCase()}</span> has been created.
            </p>
            <p className="text-green-600 text-sm mb-5">Now send your crypto to complete the order.</p>

            <div className="bg-white border border-green-200 rounded-xl p-4 mb-5 text-left space-y-3 text-sm">
              <p className="font-semibold text-green-900">Send crypto to this address:</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-green-900 break-all flex-1">
                  {receiveWallet || '—'}
                </span>
                {receiveWallet && (
                  <button
                    onClick={() => handleCopy(receiveWallet)}
                    className="shrink-0 bg-green-100 hover:bg-green-200 text-green-800 text-xs font-semibold px-2 py-1 rounded transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-yellow-800 text-xs">
                Send exactly <strong>{finalCryptoAmount} {asset}</strong> to the wallet address above within <strong>30 minutes</strong>.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/orders/${orderId}`}
                className="bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                Track your order
              </Link>
              <button
                onClick={handleReset}
                className="border border-green-300 text-green-700 hover:bg-green-100 font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                Place another order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
