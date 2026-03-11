import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';

// GET /api/bundles?network=MTN — return active bundles for a network
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const network = searchParams.get('network');

  try {
    const where = network
      ? { network, isActive: true }
      : { isActive: true };

    const bundles = await prisma.dataBundle.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ bundles });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch bundles' }, { status: 500 });
  }
}
