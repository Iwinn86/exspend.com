import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAdmin(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  return user?.isAdmin ? user : null;
}

// PATCH /api/admin/bundles/[id] — update bundle
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const bundle = await prisma.dataBundle.update({
      where: { id },
      data: {
        ...(body.label !== undefined && { label: body.label }),
        ...(body.priceGhs !== undefined && { priceGhs: Number(body.priceGhs) }),
        ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
        ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) }),
      },
    });
    return NextResponse.json({ bundle });
  } catch {
    return NextResponse.json({ error: 'Failed to update bundle' }, { status: 500 });
  }
}

// DELETE /api/admin/bundles/[id] — deactivate bundle
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const bundle = await prisma.dataBundle.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ bundle });
  } catch {
    return NextResponse.json({ error: 'Failed to deactivate bundle' }, { status: 500 });
  }
}
