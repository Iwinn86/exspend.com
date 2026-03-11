import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAdmin(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  return user?.isAdmin ? user : null;
}

// POST /api/admin/referral/approve — admin approves a referral reward
export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { rewardId } = await request.json();

    if (!rewardId) {
      return NextResponse.json({ error: 'rewardId is required' }, { status: 400 });
    }

    const reward = await prisma.referralReward.findUnique({ where: { id: rewardId } });
    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }
    if (reward.status !== 'pending') {
      return NextResponse.json({ error: 'Reward is not in pending state' }, { status: 400 });
    }

    const updated = await prisma.referralReward.update({
      where: { id: rewardId },
      data: {
        status: 'approved',
        approvedBy: admin.userId,
        approvedAt: new Date(),
      },
    });

    // Update referrer's points
    await prisma.user.update({
      where: { id: reward.referrerId },
      data: { referralPoints: { increment: 1 } },
    });

    return NextResponse.json({ reward: updated });
  } catch (err) {
    console.error('REFERRAL APPROVE ERROR:', err);
    return NextResponse.json({ error: 'Failed to approve reward' }, { status: 500 });
  }
}
