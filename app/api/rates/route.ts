import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

// POST /api/rates — admin only, create new ExchangeRate record
export async function POST(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { ghsPerUsd, note } = await request.json();

    if (!ghsPerUsd || typeof ghsPerUsd !== 'number' || ghsPerUsd <= 0) {
      return NextResponse.json({ error: 'Valid ghsPerUsd is required' }, { status: 400 });
    }

    const rate = await prisma.exchangeRate.create({
      data: {
        ghsPerUsd,
        setByAdmin: user.email,
        note: note || null,
      },
    });

    return NextResponse.json({ rate }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save rate' }, { status: 500 });
  }
}

// GET /api/rates — get rate history (last 10)
export async function GET() {
  try {
    const rates = await prisma.exchangeRate.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return NextResponse.json({ rates });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 });
  }
}
