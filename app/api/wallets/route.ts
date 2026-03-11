// GET /api/wallets — public endpoint, returns wallet addresses for the Buy page
import { NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';
import { DEFAULT_WALLET_ADDRESSES } from '@/app/lib/crypto';

export async function GET() {
  try {
    const settings = await prisma.walletSettings.findUnique({ where: { id: 'singleton' } });

    const wallets = settings
      ? {
          USDT_TRC20: settings.USDT_TRC20,
          USDT_BEP20: settings.USDT_BEP20,
          USDT_POLYGON: settings.USDT_POLYGON,
          USDC_BEP20: settings.USDC_BEP20,
          USDC_POLYGON: settings.USDC_POLYGON,
          BTC: settings.BTC,
          BNB: settings.BNB,
          ETH: settings.ETH,
          BINANCE_PAY: settings.BINANCE_PAY,
          BYBIT_PAY: settings.BYBIT_PAY,
        }
      : DEFAULT_WALLET_ADDRESSES;

    return NextResponse.json({ wallets });
  } catch {
    return NextResponse.json({ wallets: DEFAULT_WALLET_ADDRESSES });
  }
}
