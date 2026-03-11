import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/api/lib/prisma';
import { signToken } from '@/app/api/lib/jwt';
import { generateUniqueReferralCode } from '@/app/api/lib/referral';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password, referralCode } = await request.json();

    if (!name || !email || !phone || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // Validate referral code if provided
    let referrerId: string | null = null;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.trim().toUpperCase() },
        select: { id: true, email: true },
      });
      if (!referrer) {
        return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
      }
      if (referrer.email === email) {
        return NextResponse.json({ error: 'You cannot use your own referral code' }, { status: 400 });
      }
      referrerId = referrer.id;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Generate a unique referral code for the new user
    const newUserReferralCode = await generateUniqueReferralCode();

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        isAdmin: email === 'admin@exspend.com',
        referralCode: newUserReferralCode,
        referredBy: referrerId,
      },
    });

    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      isAdmin: newUser.isAdmin,
    });

    return NextResponse.json({
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, phone: newUser.phone, isAdmin: newUser.isAdmin, createdAt: newUser.createdAt },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
