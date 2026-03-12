import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAuth(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/help/tickets — get user's own tickets
export async function GET(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const tickets = await prisma.helpTicket.findMany({
      where: { userId: user.userId },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ tickets });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

// POST /api/help/tickets — create new ticket
export async function POST(request: NextRequest) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { subject, message, attachmentUrl, orderId } = await request.json();

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    if (!orderId) {
      return NextResponse.json({ error: 'A valid Order ID is required to open a ticket' }, { status: 400 });
    }

    // Validate that the order belongs to the user
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.userId },
      select: { id: true, status: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found or does not belong to you' }, { status: 400 });
    }

    if (!['successful', 'failed', 'cancelled'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Tickets can only be opened for completed orders (successful, failed, or cancelled). Use the chat during active orders.' },
        { status: 400 }
      );
    }

    const ticket = await prisma.helpTicket.create({
      data: {
        userId: user.userId,
        orderId,
        subject,
        message,
        ...(attachmentUrl ? { attachmentUrl } : {}),
      },
      include: { replies: true },
    });

    // Notify admin about the new ticket
    try {
      const adminUser = await prisma.user.findFirst({ where: { isAdmin: true } });
      if (adminUser) {
        await prisma.notification.create({
          data: {
            userId: adminUser.id,
            recipientType: 'admin',
            title: '🎫 New Support Ticket',
            message: `New ticket from user: "${subject}"`,
            link: '/admin/help',
          },
        });
      }
    } catch {
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
