export const CRYPTO_OPTIONS = [
  { label: 'USDT (TRC-20)', value: 'USDT_TRC20' },
  { label: 'USDT (BEP-20)', value: 'USDT_BEP20' },
  { label: 'USDT (Polygon)', value: 'USDT_POLYGON' },
  { label: 'USDC (BEP-20)', value: 'USDC_BEP20' },
  { label: 'USDC (Polygon)', value: 'USDC_POLYGON' },
  { label: 'BTC (Bitcoin)', value: 'BTC' },
  { label: 'BNB (BEP-20)', value: 'BNB' },
  { label: 'ETH (ERC-20)', value: 'ETH' },
  { label: 'Binance Pay', value: 'BINANCE_PAY' },
  { label: 'Bybit Pay', value: 'BYBIT_PAY' },
];

// Buy crypto options — no Binance Pay / Bybit Pay (on-chain addresses only)
export const BUY_CRYPTO_OPTIONS = [
  { label: 'BTC (Bitcoin)', value: 'BTC' },
  { label: 'BNB (BEP-20)', value: 'BNB' },
  { label: 'ETH (ERC-20)', value: 'ETH' },
  { label: 'USDT (TRC-20)', value: 'USDT_TRC20' },
  { label: 'USDT (BEP-20)', value: 'USDT_BEP20' },
  { label: 'USDC (BEP-20)', value: 'USDC_BEP20' },
];

// Sell crypto options — all supported assets including Binance Pay / Bybit Pay
export const SELL_CRYPTO_OPTIONS = [
  { label: 'BTC (Bitcoin)', value: 'BTC' },
  { label: 'BNB (BEP-20)', value: 'BNB' },
  { label: 'ETH (ERC-20)', value: 'ETH' },
  { label: 'USDT (TRC-20)', value: 'USDT_TRC20' },
  { label: 'USDT (BEP-20)', value: 'USDT_BEP20' },
  { label: 'USDC (BEP-20)', value: 'USDC_BEP20' },
  { label: 'Binance Pay', value: 'BINANCE_PAY' },
  { label: 'Bybit Pay', value: 'BYBIT_PAY' },
];

export const DEFAULT_WALLET_ADDRESSES: Record<string, string> = {
  USDT_TRC20: 'TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  USDT_BEP20: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  USDT_POLYGON: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  USDC_BEP20: '0xcccccccccccccccccccccccccccccccccccccccc',
  USDC_POLYGON: '0xdddddddddddddddddddddddddddddddddddddddd',
  BTC: 'bc1qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  BNB: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  ETH: '0xffffffffffffffffffffffffffffffffffffffff',
  BINANCE_PAY: 'binancepay@exspend.com',
  BYBIT_PAY: 'bybitpay@exspend.com',
};

// Legacy constants kept for backward compatibility; use live rates when available
export const GHS_PER_USD = 15.5;
export const BTC_USD_RATE = 98000;
export const BNB_USD_RATE = 600;
export const ETH_USD_RATE = 3500;

export type LiveRates = {
  ghsPerUsd: number;
  btcUsd: number;
  bnbUsd: number;
  ethUsd: number;
};

export const DEFAULT_LIVE_RATES: LiveRates = {
  ghsPerUsd: GHS_PER_USD,
  btcUsd: BTC_USD_RATE,
  bnbUsd: BNB_USD_RATE,
  ethUsd: ETH_USD_RATE,
};

/**
 * Calculate crypto amount from GHS with live rates.
 * Falls back to hardcoded constants if rates not provided.
 */
export function calcCrypto(
  ghsAmount: number,
  cryptoValue: string,
  rates?: Partial<LiveRates>,
  minGhs = 150,
): string {
  if (!ghsAmount || ghsAmount < minGhs) return '—';
  const r = { ...DEFAULT_LIVE_RATES, ...rates };
  const usd = ghsAmount / r.ghsPerUsd;
  if (cryptoValue === 'BTC') return (usd / r.btcUsd).toFixed(6);
  if (cryptoValue === 'BNB') return (usd / r.bnbUsd).toFixed(4);
  if (cryptoValue === 'ETH') return (usd / r.ethUsd).toFixed(6);
  return usd.toFixed(2);
}

/**
 * Calculate GHS amount from crypto amount with live rates.
 */
export function calcGhsFromCrypto(
  cryptoAmount: number,
  cryptoValue: string,
  rates?: Partial<LiveRates>,
): number {
  const r = { ...DEFAULT_LIVE_RATES, ...rates };
  if (cryptoValue === 'BTC') return cryptoAmount * r.btcUsd * r.ghsPerUsd;
  if (cryptoValue === 'BNB') return cryptoAmount * r.bnbUsd * r.ghsPerUsd;
  if (cryptoValue === 'ETH') return cryptoAmount * r.ethUsd * r.ghsPerUsd;
  // USDT/USDC — 1:1 USD
  return cryptoAmount * r.ghsPerUsd;
}

export function getCryptoLabel(value: string): string {
  return CRYPTO_OPTIONS.find((c) => c.value === value)?.label ?? value;
}

export function isHexAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export function isBtcAddress(addr: string): boolean {
  return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(addr);
}
