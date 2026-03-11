// GET /api/kyc — get current user's KYC status
// POST /api/kyc — submit KYC documents
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const entry = await prisma.kycEntry.findFirst({
      where: { userId: user.userId },
      orderBy: { submittedAt: 'desc' },
    });
    return NextResponse.json({ kyc: entry });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch KYC' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { documentType, documentNumber, frontImage, backImage, selfieImage } = await request.json();

    if (!documentType || !documentNumber || !frontImage || !selfieImage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const entry = await prisma.kycEntry.create({
      data: {
        userId: user.userId,
        documentType,
        documentNumber,
        frontImage,
        backImage: backImage || null,
        selfieImage,
      },
    });

    return NextResponse.json({ kyc: entry }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to submit KYC' }, { status: 500 });
  }
}
