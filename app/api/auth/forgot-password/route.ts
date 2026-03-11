import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/app/api/lib/prisma';
import { sendEmail } from '@/app/api/lib/email';
import { passwordResetEmail } from '@/app/api/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Delete any existing unused tokens for this user
      await prisma.passwordReset.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordReset.create({
        data: { userId: user.id, token, expiresAt },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://exspend.com';
      const resetLink = `${appUrl}/reset-password?token=${token}`;

      await sendEmail({
        to: user.email,
        subject: 'Reset your Exspend password',
        html: passwordResetEmail({ userName: user.name, resetLink }),
      });
    }

    return NextResponse.json({ message: "If an account with that email exists, we've sent a reset link." });
  } catch {
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
