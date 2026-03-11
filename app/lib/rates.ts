// app/lib/rates.ts

export type Rates = {
  ghsPerUsd: number;
  btcPriceUsd: number;
  bnbPriceUsd: number;
};

const RATES_KEY = 'exspend_rates';

const DEFAULT_RATES: Rates = {
  ghsPerUsd: 15.5,
  btcPriceUsd: 98000,
  bnbPriceUsd: 600,
};

export function getRates(): Rates {
  if (typeof window === 'undefined') return { ...DEFAULT_RATES };
  try {
    const raw = localStorage.getItem(RATES_KEY);
    return raw ? { ...DEFAULT_RATES, ...JSON.parse(raw) } : { ...DEFAULT_RATES };
  } catch {
    return { ...DEFAULT_RATES };
  }
}

export function saveRates(rates: Rates): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RATES_KEY, JSON.stringify(rates));
}
