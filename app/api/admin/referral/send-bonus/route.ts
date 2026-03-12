import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAdmin(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  return user?.isAdmin ? user : null;
}

// POST /api/admin/referral/send-bonus — admin marks reward as sent (200 MB sent to user)
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
    if (reward.status === 'sent') {
      return NextResponse.json({ error: 'Reward has already been marked as sent' }, { status: 400 });
    }

    const updated = await prisma.referralReward.update({
      where: { id: rewardId },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });

    // Notify the referrer
    await prisma.notification.create({
      data: {
        userId: reward.referrerId,
        recipientType: 'user',
        title: '🎁 Referral Bonus Sent!',
        message: `Your 200 MB bonus has been sent to ${reward.rewardPhone ?? 'your number'} on ${reward.rewardNetwork.toUpperCase()}!`,
      },
    });

    return NextResponse.json({ reward: updated });
  } catch (err) {
    console.error('REFERRAL SEND BONUS ERROR:', err);
    return NextResponse.json({ error: 'Failed to mark reward as sent' }, { status: 500 });
  }
}
