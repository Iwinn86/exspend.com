import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';

// POST /api/referral/validate-code — validate a referral code (public, used at signup)
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Code is required' }, { status: 400 });
    }

    const referrer = await prisma.user.findUnique({
      where: { referralCode: code.trim().toUpperCase() },
      select: { id: true, name: true, referralCode: true },
    });

    if (!referrer) {
      return NextResponse.json({ valid: false, error: 'Invalid referral code' });
    }

    return NextResponse.json({ valid: true, referrerId: referrer.id, referrerName: referrer.name });
  } catch (err) {
    console.error('REFERRAL VALIDATE ERROR:', err);
    return NextResponse.json({ valid: false, error: 'Failed to validate code' }, { status: 500 });
  }
}
