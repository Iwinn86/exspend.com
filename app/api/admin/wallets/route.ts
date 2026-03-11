// GET /api/admin/wallets — return current wallet settings (admin only)
// PATCH /api/admin/wallets — update wallet settings (admin only)
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAdmin(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  if (!user || !user.isAdmin) {
    return null;
  }
  return user;
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const settings = await prisma.walletSettings.findUnique({ where: { id: 'singleton' } });
    return NextResponse.json({
      wallets: settings ?? {
        USDT_TRC20: '',
        USDT_BEP20: '',
        USDT_POLYGON: '',
        USDC_BEP20: '',
        USDC_POLYGON: '',
        BTC: '',
        BNB: '',
        ETH: '',
        BINANCE_PAY: '',
        BYBIT_PAY: '',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch wallet settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const fields = [
      'USDT_TRC20', 'USDT_BEP20', 'USDT_POLYGON',
      'USDC_BEP20', 'USDC_POLYGON',
      'BTC', 'BNB', 'ETH',
      'BINANCE_PAY', 'BYBIT_PAY',
    ] as const;

    const data: Record<string, string> = {};
    for (const field of fields) {
      if (typeof body[field] === 'string') {
        data[field] = body[field];
      }
    }

    const settings = await prisma.walletSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...data },
      update: data,
    });

    return NextResponse.json({ wallets: settings });
  } catch {
    return NextResponse.json({ error: 'Failed to update wallet settings' }, { status: 500 });
  }
}
