import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAuth(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/notifications — get all notifications for authenticated user
export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.userId,
        recipientType: user.isAdmin ? 'admin' : 'user',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ notifications });
  } catch (err) {
    console.error('GET /api/notifications ERROR:', err);
    return NextResponse.json({ notifications: [] });
  }
}
