// PATCH /api/admin/kyc/[id] — approve or reject a KYC submission (admin only)
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { action, rejectionReason } = await request.json();

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { id } = await params;

    const updated = await prisma.kycEntry.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedAt: new Date(),
        ...(action === 'reject' && rejectionReason ? { rejectionReason } : {}),
      },
    });

    return NextResponse.json({ kyc: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update KYC' }, { status: 500 });
  }
}
