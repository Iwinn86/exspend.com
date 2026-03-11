import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAuth(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

// POST /api/referral/generate-code — generate a unique referral code for the authenticated user
export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const existing = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { referralCode: true },
    });

    if (existing?.referralCode) {
      return NextResponse.json({ referralCode: existing.referralCode });
    }

    // Generate unique code
    let code: string;
    let attempts = 0;
    do {
      code = `EXP-${randomBytes(6).toString('hex').toUpperCase()}`;
      const taken = await prisma.user.findUnique({ where: { referralCode: code } });
      if (!taken) break;
      attempts++;
    } while (attempts < 10);

    const updated = await prisma.user.update({
      where: { id: user.userId },
      data: { referralCode: code! },
      select: { referralCode: true },
    });

    return NextResponse.json({ referralCode: updated.referralCode });
  } catch (err) {
    console.error('REFERRAL GENERATE ERROR:', err);
    return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 });
  }
}
