// GET /api/admin/kyc — list all KYC submissions (admin only)
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const kyc = await prisma.kycEntry.findMany({
      orderBy: { submittedAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const enriched = kyc.map((entry: typeof kyc[number]) => ({
      ...entry,
      userName: entry.user.name,
      userEmail: entry.user.email,
    }));

    return NextResponse.json({ kyc: enriched });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch KYC submissions' }, { status: 500 });
  }
}
