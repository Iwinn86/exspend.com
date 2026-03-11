import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAdmin(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  return user?.isAdmin ? user : null;
}

// GET /api/admin/referral/list — admin: list all referral rewards
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rewards = await prisma.referralReward.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        referrer: { select: { name: true, email: true, kycVerified: true, isVerified: true } },
        referredUser: { select: { name: true, email: true, kycVerified: true, isVerified: true } },
      },
    });

    return NextResponse.json({ rewards });
  } catch (err) {
    console.error('ADMIN REFERRAL LIST ERROR:', err);
    return NextResponse.json({ error: 'Failed to fetch referral rewards' }, { status: 500 });
  }
}
