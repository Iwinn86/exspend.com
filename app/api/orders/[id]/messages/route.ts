import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

const MESSAGE_PREVIEW_LENGTH = 80;
const ORDER_ID_DISPLAY_LENGTH = 8;

function requireAuth(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/orders/[id]/messages — fetch chat history for an order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: orderId } = await params;

  try {
    // Verify the order belongs to this user (or user is admin)
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (!user.isAdmin && order.userId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messages = await prisma.orderMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { name: true, isAdmin: true } },
      },
    });

    return NextResponse.json({ messages, orderStatus: order.status });
  } catch (err) {
    console.error('ORDER MESSAGES GET ERROR:', err);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/orders/[id]/messages — send a message in an order chat
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: orderId } = await params;

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (!user.isAdmin && order.userId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Chat is closed once order reaches a final status
    const finalStatuses = ['successful', 'failed', 'cancelled'];
    if (finalStatuses.includes(order.status)) {
      return NextResponse.json({ error: 'Chat is closed for completed orders' }, { status: 400 });
    }

    const body = await request.json();
    const message = (body.message ?? '').trim();
    if (!message) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const newMsg = await prisma.orderMessage.create({
      data: {
        orderId,
        userId: user.userId,
        message,
        fromAdmin: user.isAdmin ?? false,
      },
      include: {
        user: { select: { name: true, isAdmin: true } },
      },
    });

    // Notify the other party
    const notifyUserId = user.isAdmin ? order.userId : null;
    if (notifyUserId) {
      await prisma.notification.create({
        data: {
          userId: notifyUserId,
          title: '💬 New message on your order',
          message: `Admin sent a message on order #${orderId.slice(0, ORDER_ID_DISPLAY_LENGTH).toUpperCase()}: "${message.slice(0, MESSAGE_PREVIEW_LENGTH)}${message.length > MESSAGE_PREVIEW_LENGTH ? '\u2026' : ''}"`,
          link: `/orders/${orderId}`,
        },
      });
    }

    return NextResponse.json({ message: newMsg }, { status: 201 });
  } catch (err) {
    console.error('ORDER MESSAGE CREATE ERROR:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
