import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAuth(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/referral/rewards — get referral stats and rewards for authenticated user
export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        referralCode: true,
        referralPoints: true,
        referrals: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            kycVerified: true,
          },
        },
        referralRewards: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rewardType: true,
            rewardNetwork: true,
            rewardPhone: true,
            status: true,
            approvedAt: true,
            sentAt: true,
            createdAt: true,
            referredUser: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      referralCode: userData.referralCode,
      referralPoints: userData.referralPoints,
      referrals: userData.referrals,
      rewards: userData.referralRewards,
      stats: {
        totalSignups: userData.referrals.length,
        totalApproved: userData.referralRewards.filter(r => r.status === 'approved' || r.status === 'sent').length,
        totalSent: userData.referralRewards.filter(r => r.status === 'sent').length,
      },
    });
  } catch (err) {
    console.error('REFERRAL REWARDS ERROR:', err);
    return NextResponse.json({ error: 'Failed to fetch referral rewards' }, { status: 500 });
  }
}
