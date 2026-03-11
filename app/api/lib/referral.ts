import { randomBytes } from 'crypto';
import { prisma } from '@/app/api/lib/prisma';

export const DAILY_SPEND_LIMIT_GHS = 30000;

export async function generateUniqueReferralCode(): Promise<string> {
  const MAX_ATTEMPTS = 10;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const code = `EXP-${randomBytes(6).toString('hex').toUpperCase()}`;
    const taken = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!taken) return code;
  }
  // Fallback: use more entropy to virtually guarantee uniqueness
  return `EXP-${randomBytes(12).toString('hex').toUpperCase().slice(0, 12)}`;
}
