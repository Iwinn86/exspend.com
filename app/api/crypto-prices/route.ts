import { NextResponse } from 'next/server';

export const revalidate = 300; // Cache for 5 minutes

export async function GET() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,binancecoin,ethereum&vs_currencies=usd',
      { next: { revalidate: 300 } }
    );

    if (!res.ok) {
      throw new Error('CoinGecko API error');
    }

    const data = await res.json();

    return NextResponse.json({
      btcUsd: data.bitcoin?.usd ?? 98000,
      bnbUsd: data.binancecoin?.usd ?? 600,
      ethUsd: data.ethereum?.usd ?? 3500,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Fallback to hardcoded values if API is unavailable
    return NextResponse.json({
      btcUsd: 98000,
      bnbUsd: 600,
      ethUsd: 3500,
      updatedAt: new Date().toISOString(),
    });
  }
}
