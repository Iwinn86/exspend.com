'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ASSETS = ['BTC', 'BNB', 'ETH', 'USDT (TRC-20)', 'USDT (BEP-20)', 'USDC (BEP-20)'];

function assetToSettingsKey(asset: string): string {
  const map: Record<string, string> = {
    BTC: 'BTC',
    BNB: 'BNB',
    ETH: 'ETH',
    'USDT (TRC-20)': 'USDT_TRC20',
    'USDT (BEP-20)': 'USDT_BEP20',
    'USDC (BEP-20)': 'USDC_BEP20',
  };
  return map[asset] ?? asset;
}

function isEVMAsset(asset: string) {
  return ['BNB', 'ETH', 'USDT (TRC-20)', 'USDT (BEP-20)', 'USDC (BEP-20)'].includes(asset);
}

function validateWallet(address: string, asset: string): boolean {
  if (asset === 'BTC') return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

function ghsToCrypto(ghs: number, asset: string, btcUsd: number, bnbUsd: number, ethUsd: number, ghsPerUsd: number): string {
  if (!ghsPerUsd || ghsPerUsd === 0) return '0';
  const usd = ghs / ghsPerUsd;
  if (asset === 'BTC') return btcUsd ? (usd / btcUsd).toFixed(6) : '0';
  if (asset === 'BNB') return bnbUsd ? (usd / bnbUsd).toFixed(4) : '0';
  if (asset === 'ETH') return ethUsd ? (usd / ethUsd).toFixed(6) : '0';
  return usd.toFixed(2);
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 inline mr-2" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

type PaymentMethod = 'bank' | 'momo';
type MomoProvider = 'MTN' | 'Telecel' | 'AirtelTigo';

type AdminPaymentSetting = {
  settingType: string;
  bankName?: string | null;
  bankAccount?: string | null;
  bankAcctName?: string | null;
  momoProvider?: string | null;
  momoNumber?: string | null;
  momoAcctName?: string | null;
};

const MOMO_PROVIDERS: { key: string; label: MomoProvider; color: string; emoji: string; imgSrc: string }[] = [
  { key: 'mtn_details', label: 'MTN', color: 'border-yellow-400 bg-yellow-50', emoji: '📡', imgSrc: '/mtn.png' },
  { key: 'telecel_details', label: 'Telecel', color: 'border-red-400 bg-red-50', emoji: '📶', imgSrc: '/telecel.png' },
  { key: 'airteltigo_details', label: 'AirtelTigo', color: 'border-orange-400 bg-orange-50', emoji: '📲', imgSrc: '/airteltigo.png' },
];

const PENDING_BUY_ORDER_KEY = 'exspend_pending_buy_order';
const ORDER_TIMEOUT_SECONDS = 30 * 60;

export default function BuyPage() {
  const router = useRouter();

  // steps: 0=payment method, 1=asset+amount, 2=wallet, 3=confirm, 4=success
  const [step, setStep] = useState(0);
  const [loadingRates, setLoadingRates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rates
  const [ghsPerUsd, setGhsPerUsd] = useState(0);
  const [btcUsd, setBtcUsd] = useState(0);
  const [bnbUsd, setBnbUsd] = useState(0);
  const [ethUsd, setEthUsd] = useState(0);

  // Payment method (Step 0)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedMomoProvider, setSelectedMomoProvider] = useState<MomoProvider | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<Record<string, AdminPaymentSetting>>({});
  const [loadingPaymentSettings, setLoadingPaymentSettings] = useState(true);

  // Step 1
  const [asset, setAsset] = useState('BTC');
  const [amountGhs, setAmountGhs] = useState('');

  // Step 2
  const [walletAddress, setWalletAddress] = useState('');
  const [walletError, setWalletError] = useState<string | null>(null);

  // Step 4 – payment instructions
  const [orderId, setOrderId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(ORDER_TIMEOUT_SECONDS);
  const [confirmingPaid, setConfirmingPaid] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Restore pending order from localStorage on mount
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(PENDING_BUY_ORDER_KEY) : null;
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.orderId) return;

      const timeLeftCalc = ORDER_TIMEOUT_SECONDS - Math.floor((Date.now() - new Date(parsed.orderCreatedAt).getTime()) / 1000);
      if (timeLeftCalc <= 0) {
        localStorage.removeItem(PENDING_BUY_ORDER_KEY);
        return;
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('exspend_token') : null;
      if (!token) return;

      fetch(`/api/orders/${parsed.orderId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          const order = data.order ?? data;
          if (['successful', 'failed', 'cancelled'].includes(order.status)) {
            localStorage.removeItem(PENDING_BUY_ORDER_KEY);
            router.push(`/orders/${parsed.orderId}`);
            return;
          }
          setOrderId(parsed.orderId);
          setStep(parsed.step ?? 4);
          setSelectedPaymentMethod(parsed.selectedPaymentMethod ?? null);
          setSelectedMomoProvider(parsed.selectedMomoProvider ?? null);
          setAsset(parsed.asset ?? 'BTC');
          setAmountGhs(parsed.amountGhs ?? '');
          setWalletAddress(parsed.walletAddress ?? '');
          setTimeLeft(Math.max(0, timeLeftCalc));
        })
        .catch(() => {});
    } catch {
      localStorage.removeItem(PENDING_BUY_ORDER_KEY);
    }
  // Run once on mount to restore any pending buy order from localStorage
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoadingRates(true);
      setLoadingPaymentSettings(true);
      try {
        const [pricesRes, settingsRes, paymentRes] = await Promise.all([
          fetch('/api/crypto-prices'),
          fetch('/api/settings'),
          fetch('/api/settings/payment-methods'),
        ]);
        const pricesData = await pricesRes.json();
        const settingsData = await settingsRes.json();
        const paymentData = await paymentRes.json();
        setBtcUsd(pricesData.btcUsd ?? 0);
        setBnbUsd(pricesData.bnbUsd ?? 0);
        setEthUsd(pricesData.ethUsd ?? 0);
        setGhsPerUsd(settingsData.settings?.buyRateGhsPerUsd ?? settingsData.settings?.ghsPerUsd ?? 0);
        setPaymentSettings(paymentData.paymentMethods ?? {});
      } catch {
        setError('Failed to load rates. Please refresh.');
      } finally {
        setLoadingRates(false);
        setLoadingPaymentSettings(false);
      }
    }
    loadData();
  }, []);

  const ghsNum = parseFloat(amountGhs) || 0;
  const cryptoAmount = ghsToCrypto(ghsNum, asset, btcUsd, bnbUsd, ethUsd, ghsPerUsd);
  const cryptoRateGhs = ghsPerUsd;
  const cryptoRateUsd = asset === 'BTC' ? btcUsd : asset === 'BNB' ? bnbUsd : asset === 'ETH' ? ethUsd : 1;

  const bankSetting = paymentSettings['bank_details'] as AdminPaymentSetting | undefined;

  // Get the selected MoMo provider's setting
  const momoProviderKey = selectedMomoProvider
    ? `${selectedMomoProvider.toLowerCase()}_details`
    : null;
  const momoSetting = momoProviderKey
    ? (paymentSettings[momoProviderKey] as AdminPaymentSetting | undefined)
    : undefined;

  function handleStep0Continue() {
    if (!selectedPaymentMethod) { setError('Please select a payment method'); return; }
    if (selectedPaymentMethod === 'momo' && !selectedMomoProvider) { setError('Please select a mobile money provider'); return; }
    setError(null);
    setStep(1);
  }

  function handleStep1Continue() {
    if (ghsNum < 150) { setError('Minimum amount is GHS 150'); return; }
    setError(null);
    setStep(2);
  }

  function handleStep2Continue() {
    if (!walletAddress.trim()) { setWalletError('Wallet address is required'); return; }
    if (!validateWallet(walletAddress.trim(), asset)) {
      setWalletError(
        asset === 'BTC'
          ? 'Invalid BTC address. Must start with bc1, 1, or 3.'
          : 'Invalid EVM address. Must start with 0x followed by 40 hex characters.'
      );
      return;
    }
    setWalletError(null);
    setStep(3);
  }

  async function handleConfirmOrder() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('exspend_token') : null;
    if (!token) { router.push('/login'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderType: 'buy',
          serviceType: 'buy_crypto',
          service: `Buy ${asset}`,
          cryptoAsset: assetToSettingsKey(asset),
          cryptoAmount,
          amountGhs: ghsNum,
          cryptoRateGhs,
          cryptoRateUsd,
          userWalletAddress: walletAddress.trim(),
          paymentMethod: selectedPaymentMethod,
          ...(selectedPaymentMethod === 'bank' && bankSetting
            ? {
                paymentBankName: bankSetting.bankName,
                paymentBankAcct: bankSetting.bankAccount,
                paymentAcctName: bankSetting.bankAcctName,
              }
            : {}),
          ...(selectedPaymentMethod === 'momo' && momoSetting
            ? {
                paymentMomoProvider: selectedMomoProvider,
                paymentMomoNumber: momoSetting.momoNumber,
                paymentAcctName: momoSetting.momoAcctName,
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create order'); return; }
      const newOrderId = data.order.id;
      setOrderId(newOrderId);
      setStep(4);
      // Persist order to localStorage for page refresh recovery
      if (typeof window !== 'undefined') {
        localStorage.setItem(PENDING_BUY_ORDER_KEY, JSON.stringify({
          orderId: newOrderId,
          step: 4,
          selectedPaymentMethod,
          selectedMomoProvider,
          asset,
          amountGhs,
          walletAddress: walletAddress.trim(),
          orderCreatedAt: new Date().toISOString(),
        }));
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    if (typeof window !== 'undefined') localStorage.removeItem(PENDING_BUY_ORDER_KEY);
    setStep(0);
    setSelectedPaymentMethod(null);
    setSelectedMomoProvider(null);
    setAsset('BTC');
    setAmountGhs('');
    setWalletAddress('');
    setWalletError(null);
    setOrderId(null);
    setTimeLeft(ORDER_TIMEOUT_SECONDS);
    setPaymentError(null);
    setError(null);
  }

  useEffect(() => {
    if (!orderId || step !== 4) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [orderId, step]);

  async function handleConfirmPaid() {
    if (!orderId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('exspend_token') : null;
    if (!token) { router.push('/login'); return; }
    setConfirmingPaid(true);
    setPaymentError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm-sent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setPaymentError(data.error || 'Failed to confirm payment'); return; }
      if (typeof window !== 'undefined') localStorage.removeItem(PENDING_BUY_ORDER_KEY);
      router.push(`/orders/${orderId}`);
    } catch {
      setPaymentError('Network error. Please try again.');
    } finally {
      setConfirmingPaid(false);
    }
  }

  async function handleCancelOrder() {
    if (!orderId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('exspend_token') : null;
    if (!token) { router.push('/login'); return; }
    setCancellingOrder(true);
    setPaymentError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); setPaymentError(d.error || 'Failed to cancel order'); return; }
      if (typeof window !== 'undefined') localStorage.removeItem(PENDING_BUY_ORDER_KEY);
      router.push('/orders');
    } catch {
      setPaymentError('Network error. Please try again.');
    } finally {
      setCancellingOrder(false);
    }
  }

  const rateInfo = loadingRates
    ? 'Loading rates\u2026'
    : `Rate: 1 USD = ${ghsPerUsd} GHS (admin rate) | 1 BTC = $${btcUsd.toLocaleString()} (live)`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Step indicator for steps 1-3 */}
        {step > 0 && step < 4 && (
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
                  {s < step ? '\u2713' : s}
                </div>
                {s < 3 && <div className={`w-10 h-0.5 ${s < step ? 'bg-lime-400' : 'bg-green-600'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* STEP 0 – Payment Method Selection */}
        {step === 0 && (
          <div className="bg-green-50 rounded-2xl p-6 md:p-8 shadow-lg">
            <p className="text-4xl mb-3 text-center">💳</p>
            <h1 className="text-green-900 font-bold text-2xl mb-1 text-center">Buy Crypto with GHS</h1>
            <p className="text-green-700 text-sm text-center mb-6">
              Choose how you want to pay for your crypto
            </p>

            {error && <p className="bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm mb-4">{error}</p>}

            {loadingPaymentSettings ? (
              <p className="text-green-600 text-sm text-center py-4"><Spinner />Loading payment options\u2026</p>
            ) : (
              <div className="space-y-3 mb-6">
                {/* Bank Transfer Option */}
                <button
                  onClick={() => setSelectedPaymentMethod('bank')}
                  className={`w-full border-2 rounded-xl p-4 text-left transition-all ${
                    selectedPaymentMethod === 'bank'
                      ? 'border-green-600 bg-green-100'
                      : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🏦</span>
                    <div className="flex-1">
                      <p className="font-semibold text-green-900">Bank Transfer</p>
                      {bankSetting ? (
                        <div className="mt-1 space-y-0.5">
                          {bankSetting.bankName && (
                            <p className="text-xs text-green-700">Bank: <span className="font-medium">{bankSetting.bankName}</span></p>
                          )}
                          {bankSetting.bankAccount && (
                            <p className="text-xs text-green-700">Account No: <span className="font-medium font-mono">{bankSetting.bankAccount}</span></p>
                          )}
                          {bankSetting.bankAcctName && (
                            <p className="text-xs text-green-700">Name: <span className="font-medium">{bankSetting.bankAcctName}</span></p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1">Transfer to our bank account</p>
                      )}
                    </div>
                    {selectedPaymentMethod === 'bank' && (
                      <span className="text-green-600 font-bold text-lg">\u2713</span>
                    )}
                  </div>
                </button>

                {/* Mobile Money Option */}
                <div>
                  <button
                    onClick={() => setSelectedPaymentMethod('momo')}
                    className={`w-full border-2 rounded-xl p-4 text-left transition-all ${
                      selectedPaymentMethod === 'momo'
                        ? 'border-green-600 bg-green-100'
                        : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📱</span>
                      <div className="flex-1">
                        <p className="font-semibold text-green-900">Mobile Money</p>
                        <p className="text-xs text-gray-500 mt-1">MTN, Telecel, or AirtelTigo</p>
                      </div>
                      {selectedPaymentMethod === 'momo' && (
                        <span className="text-green-600 font-bold text-lg">✓</span>
                      )}
                    </div>
                  </button>

                  {/* MoMo Provider Selection */}
                  {selectedPaymentMethod === 'momo' && (
                    <div className="mt-3 space-y-2 pl-2">
                      <p className="text-sm font-medium text-green-900 mb-2">Select your provider:</p>
                      {MOMO_PROVIDERS.map(provider => {
                        const providerSetting = paymentSettings[provider.key] as AdminPaymentSetting | undefined;
                        const isSelected = selectedMomoProvider === provider.label;
                        return (
                          <button
                            key={provider.key}
                            onClick={() => setSelectedMomoProvider(provider.label)}
                            className={`w-full border-2 rounded-xl p-3 text-left transition-all ${
                              isSelected
                                ? `${provider.color} border-opacity-100`
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={provider.imgSrc}
                                alt={provider.label}
                                className="h-8 w-8 object-contain"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                                  if (sibling) sibling.style.display = 'inline';
                                }}
                              />
                              <span className="text-xl hidden">{provider.emoji}</span>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm">{provider.label}</p>
                                {isSelected && providerSetting && (
                                  <div className="mt-1 space-y-0.5">
                                    {providerSetting.momoNumber && (
                                      <p className="text-xs text-gray-600">Number: <span className="font-mono font-medium">{providerSetting.momoNumber}</span></p>
                                    )}
                                    {providerSetting.momoAcctName && (
                                      <p className="text-xs text-gray-600">Name: <span className="font-medium">{providerSetting.momoAcctName}</span></p>
                                    )}
                                  </div>
                                )}
                              </div>
                              {isSelected && <span className="text-green-600 font-bold text-lg">✓</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleStep0Continue}
              disabled={loadingPaymentSettings || !selectedPaymentMethod}
              className="w-full bg-green-700 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="bg-green-50 rounded-2xl p-6 md:p-8 shadow-lg">
            <p className="text-4xl mb-3 text-center">📈</p>
            <h1 className="text-green-900 font-bold text-2xl mb-1 text-center">Buy Crypto with GHS</h1>
            <p className="text-green-700 text-sm text-center mb-2">{rateInfo}</p>
            <div className="flex justify-center mb-4">
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                selectedPaymentMethod === 'bank'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {selectedPaymentMethod === 'bank' ? '🏦 Bank Transfer' : '📱 Mobile Money'}
                <button onClick={() => setStep(0)} className="ml-2 underline text-current opacity-70 hover:opacity-100">change</button>
              </span>
            </div>

            {error && <p className="bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm mb-4">{error}</p>}

            <label className="block text-green-900 font-semibold mb-1 text-sm">Select Crypto</label>
            <select
              value={asset}
              onChange={(e) => { setAsset(e.target.value); setAmountGhs(''); }}
              className="w-full border border-green-300 rounded-lg px-3 py-2 text-green-900 bg-white mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={loadingRates}
            >
              {ASSETS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>

            <label className="block text-green-900 font-semibold mb-1 text-sm">Amount in GHS</label>
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-semibold">GHS</span>
              <input
                type="number"
                min="150"
                step="1"
                value={amountGhs}
                onChange={(e) => setAmountGhs(e.target.value)}
                placeholder="e.g. 500"
                className="w-full border border-green-300 rounded-lg pl-14 pr-4 py-2 text-green-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loadingRates}
              />
            </div>
            <p className="text-green-600 text-xs mb-1">Minimum: GHS 150</p>

            {ghsNum >= 150 && !loadingRates && (
              <div className="bg-green-100 rounded-lg px-4 py-3 my-3 text-sm text-green-800">
                You will receive approximately{' '}
                <span className="font-bold">{cryptoAmount} {asset}</span>
              </div>
            )}

            <p className="text-green-600 text-xs mb-5 italic">Rate is locked at time of order confirmation.</p>

            <button
              onClick={handleStep1Continue}
              disabled={loadingRates || !amountGhs}
              className="w-full bg-green-700 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loadingRates ? <><Spinner />Loading rates\u2026</> : 'Continue'}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="bg-green-50 rounded-2xl p-6 md:p-8 shadow-lg">
            <h1 className="text-green-900 font-bold text-2xl mb-1">Wallet Address</h1>
            <p className="text-green-600 text-sm mb-5">Enter your {asset} wallet address to receive crypto</p>

            {walletError && <p className="bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm mb-4">{walletError}</p>}

            <label className="block text-green-900 font-semibold mb-1 text-sm">Your {asset} Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => { setWalletAddress(e.target.value); setWalletError(null); }}
              placeholder={
                asset === 'BTC'
                  ? 'bc1q\u2026 or 1\u2026 or 3\u2026'
                  : isEVMAsset(asset) ? '0x\u2026' : ''
              }
              className="w-full border border-green-300 rounded-lg px-3 py-2 text-green-900 bg-white font-mono text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800 mb-3 space-y-1">
              <p>⚠️ <strong>Binance Pay and Bybit Pay not supported</strong> for Buy orders — use on-chain addresses only.</p>
              <p>⚠️ Make sure the address is correct. We cannot recover funds sent to wrong addresses.</p>
            </div>

            <div className="flex gap-3">
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
            <h1 className="text-green-900 font-bold text-2xl mb-1">Confirm &amp; Pay</h1>
            <p className="text-green-600 text-sm mb-5">Review your order details</p>

            {error && <p className="bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm mb-4">{error}</p>}

            <div className="bg-white border border-green-200 rounded-xl p-4 mb-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Asset</span>
                <span className="font-semibold text-green-900">{asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">You receive</span>
                <span className="font-bold text-green-900">{cryptoAmount} {asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">You pay</span>
                <span className="font-bold text-green-900">GHS {ghsNum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-green-700">Wallet address</span>
                <span className="font-mono text-xs text-green-900 max-w-[55%] text-right break-all">{walletAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Rate used</span>
                <span className="text-green-900">1 USD = {ghsPerUsd} GHS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Payment via</span>
                <span className="font-semibold text-green-900">
                  {selectedPaymentMethod === 'bank' ? '🏦 Bank Transfer' : '📱 Mobile Money'}
                </span>
              </div>
            </div>

            {/* Payment instructions */}
            {selectedPaymentMethod === 'bank' && bankSetting ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 mb-5">
                <p className="font-semibold mb-2">🏦 Bank Transfer Details</p>
                {bankSetting.bankName && <p>Bank: <strong>{bankSetting.bankName}</strong></p>}
                {bankSetting.bankAccount && <p>Account No: <strong className="font-mono">{bankSetting.bankAccount}</strong></p>}
                {bankSetting.bankAcctName && <p>Account Name: <strong>{bankSetting.bankAcctName}</strong></p>}
                <p className="mt-2 text-blue-700">Transfer exactly <strong>GHS {ghsNum.toFixed(2)}</strong> to complete this order.</p>
              </div>
            ) : selectedPaymentMethod === 'momo' && momoSetting ? (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800 mb-5">
                <p className="font-semibold mb-2">📱 Mobile Money Details</p>
                {momoSetting.momoProvider && <p>Provider: <strong>{momoSetting.momoProvider}</strong></p>}
                {momoSetting.momoNumber && <p>Number: <strong className="font-mono">{momoSetting.momoNumber}</strong></p>}
                {momoSetting.momoAcctName && <p>Account Name: <strong>{momoSetting.momoAcctName}</strong></p>}
                <p className="mt-2 text-orange-700">Send exactly <strong>GHS {ghsNum.toFixed(2)}</strong> to complete this order.</p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 mb-5">
                <p className="font-semibold mb-1">💳 How to pay</p>
                <p>Come to our office or do a {selectedPaymentMethod === 'bank' ? 'bank transfer' : 'mobile money transfer'} of <strong>GHS {ghsNum.toFixed(2)}</strong> to complete this order. Once confirmed, your crypto will be sent within 30 minutes.</p>
              </div>
            )}

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
                {submitting ? <><Spinner />Submitting\u2026</> : 'Confirm Order'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 – PAYMENT INSTRUCTIONS */}
        {step === 4 && orderId && (
          <div className="bg-green-50 rounded-2xl p-6 md:p-8 shadow-lg">
            <p className="text-4xl mb-3 text-center">💳</p>
            <h1 className="text-green-900 font-bold text-2xl mb-1 text-center">Payment Instructions</h1>
            <p className="text-green-700 text-sm text-center mb-1">
              Order <span className="font-mono font-bold">#{orderId.slice(0, 8).toUpperCase()}</span>
            </p>
            <p className="text-green-600 text-sm text-center mb-5">
              You will receive <strong>{cryptoAmount} {asset}</strong> once your payment is verified.
            </p>

            {paymentError && <p className="bg-red-100 text-red-700 rounded-lg px-4 py-2 text-sm mb-4">{paymentError}</p>}

            {/* Payment destination */}
            {selectedPaymentMethod === 'bank' && bankSetting ? (
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-4 text-sm text-yellow-900 mb-4">
                <p className="font-semibold mb-2">🏦 Bank Transfer Details</p>
                {bankSetting.bankName && <p>Bank: <strong>{bankSetting.bankName}</strong></p>}
                {bankSetting.bankAccount && <p>Account No: <strong className="font-mono">{bankSetting.bankAccount}</strong></p>}
                {bankSetting.bankAcctName && <p>Account Name: <strong>{bankSetting.bankAcctName}</strong></p>}
                <p className="mt-2">Amount: <strong className="text-lg">GHS {ghsNum.toFixed(2)}</strong></p>
                <p className="text-xs mt-1 text-yellow-700">Reference: <span className="font-mono">{orderId.slice(0, 8).toUpperCase()}</span></p>
              </div>
            ) : selectedPaymentMethod === 'momo' && momoSetting ? (
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-4 text-sm text-yellow-900 mb-4">
                <p className="font-semibold mb-2">📱 Mobile Money Details</p>
                {(momoSetting.momoProvider || selectedMomoProvider) && <p>Provider: <strong>{momoSetting.momoProvider ?? selectedMomoProvider}</strong></p>}
                {momoSetting.momoNumber && <p>Number: <strong className="font-mono">{momoSetting.momoNumber}</strong></p>}
                {momoSetting.momoAcctName && <p>Account Name: <strong>{momoSetting.momoAcctName}</strong></p>}
                <p className="mt-2">Amount: <strong className="text-lg">GHS {ghsNum.toFixed(2)}</strong></p>
                <p className="text-xs mt-1 text-yellow-700">Reference: <span className="font-mono">{orderId.slice(0, 8).toUpperCase()}</span></p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-4 text-sm text-yellow-900 mb-4">
                <p className="font-semibold mb-1">💳 Payment Required</p>
                <p>Pay <strong>GHS {ghsNum.toFixed(2)}</strong> via {selectedPaymentMethod === 'bank' ? 'bank transfer' : 'mobile money'} to complete your order.</p>
                <p className="text-xs mt-1 text-yellow-700">Reference: <span className="font-mono">{orderId.slice(0, 8).toUpperCase()}</span></p>
              </div>
            )}

            {/* Countdown timer */}
            <div className={`rounded-xl px-4 py-3 text-center mb-5 ${timeLeft > 0 ? (timeLeft <= 300 ? 'bg-red-50 border border-red-200' : 'bg-green-100 border border-green-200') : 'bg-gray-100 border border-gray-200'}`}>
              {timeLeft > 0 ? (
                <>
                  <p className={`text-xs font-medium mb-1 ${timeLeft <= 300 ? 'text-red-600' : 'text-green-700'}`}>⏱ Time remaining to confirm payment</p>
                  <p className={`text-2xl font-bold font-mono ${timeLeft <= 300 ? 'text-red-600' : 'text-green-800'}`}>
                    {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-600">⏰ Time&apos;s up — your order will be cancelled automatically.</p>
                  <p className="text-xs text-gray-500 mt-1">If you&apos;ve already paid, please contact support with your order ID.</p>
                  <button onClick={handleReset} className="mt-2 text-sm text-green-700 underline">Start a new order</button>
                </>
              )}
            </div>

            {timeLeft > 0 && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirmPaid}
                  disabled={confirmingPaid || cancellingOrder}
                  className="w-full bg-green-700 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {confirmingPaid ? <><Spinner />Confirming…</> : '✅ I Have Paid →'}
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={confirmingPaid || cancellingOrder}
                  className="w-full border border-red-300 text-red-600 hover:bg-red-50 font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  {cancellingOrder ? <><Spinner />Cancelling…</> : '✕ Cancel Order'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
