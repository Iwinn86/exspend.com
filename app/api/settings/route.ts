import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';
import { DEFAULT_WALLET_ADDRESSES } from '@/app/lib/crypto';

export async function GET() {
  try {
    const [settings, latestRate] = await Promise.all([
      prisma.walletSettings.findUnique({ where: { id: 'singleton' } }),
      prisma.exchangeRate.findFirst({ orderBy: { createdAt: 'desc' } }),
    ]);

    const walletAddresses = settings
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

    return NextResponse.json({
      settings: {
        walletAddresses,
        ghsPerUsd: latestRate?.ghsPerUsd ?? 15.5,
        updatedAt: settings?.updatedAt ?? new Date(),
      },
    });
  } catch {
    return NextResponse.json({
      settings: {
        walletAddresses: DEFAULT_WALLET_ADDRESSES,
        ghsPerUsd: 15.5,
        updatedAt: new Date(),
      },
    });
  }
}

export async function POST(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { walletAddresses } = body;

    if (!walletAddresses || typeof walletAddresses !== 'object') {
      return NextResponse.json({ error: 'walletAddresses object is required' }, { status: 400 });
    }

    const settings = await prisma.walletSettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        USDT_TRC20: walletAddresses.USDT_TRC20 ?? '',
        USDT_BEP20: walletAddresses.USDT_BEP20 ?? '',
        USDT_POLYGON: walletAddresses.USDT_POLYGON ?? '',
        USDC_BEP20: walletAddresses.USDC_BEP20 ?? '',
        USDC_POLYGON: walletAddresses.USDC_POLYGON ?? '',
        BTC: walletAddresses.BTC ?? '',
        BNB: walletAddresses.BNB ?? '',
        ETH: walletAddresses.ETH ?? '',
        BINANCE_PAY: walletAddresses.BINANCE_PAY ?? '',
        BYBIT_PAY: walletAddresses.BYBIT_PAY ?? '',
      },
      update: {
        ...(walletAddresses.USDT_TRC20 !== undefined && { USDT_TRC20: walletAddresses.USDT_TRC20 }),
        ...(walletAddresses.USDT_BEP20 !== undefined && { USDT_BEP20: walletAddresses.USDT_BEP20 }),
        ...(walletAddresses.USDT_POLYGON !== undefined && { USDT_POLYGON: walletAddresses.USDT_POLYGON }),
        ...(walletAddresses.USDC_BEP20 !== undefined && { USDC_BEP20: walletAddresses.USDC_BEP20 }),
        ...(walletAddresses.USDC_POLYGON !== undefined && { USDC_POLYGON: walletAddresses.USDC_POLYGON }),
        ...(walletAddresses.BTC !== undefined && { BTC: walletAddresses.BTC }),
        ...(walletAddresses.BNB !== undefined && { BNB: walletAddresses.BNB }),
        ...(walletAddresses.ETH !== undefined && { ETH: walletAddresses.ETH }),
        ...(walletAddresses.BINANCE_PAY !== undefined && { BINANCE_PAY: walletAddresses.BINANCE_PAY }),
        ...(walletAddresses.BYBIT_PAY !== undefined && { BYBIT_PAY: walletAddresses.BYBIT_PAY }),
      },
    });

    const latestRate = await prisma.exchangeRate.findFirst({ orderBy: { createdAt: 'desc' } });

    return NextResponse.json({
      settings: {
        walletAddresses: {
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
        },
        ghsPerUsd: latestRate?.ghsPerUsd ?? 15.5,
        updatedAt: settings.updatedAt,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
