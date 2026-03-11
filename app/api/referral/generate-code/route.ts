import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';
import { generateUniqueReferralCode } from '@/app/api/lib/referral';

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
    const code = await generateUniqueReferralCode();

    const updated = await prisma.user.update({
      where: { id: user.userId },
      data: { referralCode: code },
      select: { referralCode: true },
    });

    return NextResponse.json({ referralCode: updated.referralCode });
  } catch (err) {
    console.error('REFERRAL GENERATE ERROR:', err);
    return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 });
  }
}
