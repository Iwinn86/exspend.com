// GET /api/admin/users — admin only, returns all users + their KYC status
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
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        kyc: { orderBy: { submittedAt: 'desc' }, take: 1 },
      },
    });

    const result = users.map((u: typeof users[number]) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      isAdmin: u.isAdmin,
      isVerified: u.isVerified,
      createdAt: u.createdAt,
      kycStatus: u.kyc[0]?.status ?? 'not_submitted',
    }));

    return NextResponse.json({ users: result });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
