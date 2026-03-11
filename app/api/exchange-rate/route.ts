import { NextResponse } from 'next/server';

// Hardcoded for now — will be configurable via admin panel later
const EXCHANGE_RATES = {
  GHS_PER_USD: 15.5,
  BTC_USD_RATE: 98000,
  BNB_USD_RATE: 600,
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  return NextResponse.json({ rates: EXCHANGE_RATES });
}
