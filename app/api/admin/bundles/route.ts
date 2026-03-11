import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAdmin(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  return user?.isAdmin ? user : null;
}

// GET /api/admin/bundles — get all bundles
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const bundles = await prisma.dataBundle.findMany({ orderBy: [{ network: 'asc' }, { sortOrder: 'asc' }] });
    return NextResponse.json({ bundles });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch bundles' }, { status: 500 });
  }
}

// POST /api/admin/bundles — create new bundle
export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { network, label, priceGhs, sortOrder } = await request.json();

    if (!network || !label || !priceGhs) {
      return NextResponse.json({ error: 'network, label, and priceGhs are required' }, { status: 400 });
    }

    const bundle = await prisma.dataBundle.create({
      data: {
        network,
        label,
        priceGhs: Number(priceGhs),
        sortOrder: Number(sortOrder) || 0,
      },
    });

    return NextResponse.json({ bundle }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create bundle' }, { status: 500 });
  }
}
