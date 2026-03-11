// PATCH /api/admin/orders/[id] — admin only: update order status and optionally add admin note
// GET /api/admin/orders/[id] — admin only: get single order details
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';
import { sendEmail } from '@/app/api/lib/email';
import { orderStatusUpdateEmail } from '@/app/api/lib/email-templates';
import { OrderStatus } from '@prisma/client';

function requireAdmin(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  return user?.isAdmin ? user : null;
}

const VALID_STATUSES: OrderStatus[] = ['waiting', 'pending', 'processing', 'successful', 'failed', 'cancelled'];
const EMAIL_STATUSES: OrderStatus[] = ['processing', 'successful', 'failed'];

// GET /api/admin/orders/[id] — get single order with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        receipt: true,
      },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ order });
  } catch (err) {
    console.error('ADMIN ORDER GET ERROR:', err);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}



// PATCH /api/admin/orders/[id] — update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const { status, adminNote } = body as { status?: OrderStatus; adminNote?: string };

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Only allow note-only updates when no status is provided
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (adminNote !== undefined) updateData.adminNote = adminNote;
    if (status === 'successful') updateData.completedAt = new Date();

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.order.update>[0]['data'],
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    // Fire-and-forget email for processing/successful/failed
    if (status && EMAIL_STATUSES.includes(status)) {
      Promise.resolve().then(async () => {
        const sent = await sendEmail({
          to: updated.user.email,
          subject: `Order ${status.charAt(0).toUpperCase() + status.slice(1)} — #${updated.id.slice(0, 8).toUpperCase()}`,
          html: orderStatusUpdateEmail({
            userName: updated.user.name,
            orderId: updated.id,
            service: updated.service,
            amount: updated.amountGhs,
            status: status as 'processing' | 'successful' | 'failed',
          }),
        });
        if (!sent) {
          console.error(`[Email] Failed to send status update email for order ${updated.id} to ${updated.user.email}`);
        }
      }).catch((err) => console.error(`[Email] Unexpected error sending status update for order ${updated.id}:`, err));
    }

    // Create in-app notification for the customer
    const notifConfig: Record<string, { title: string; message: string }> = {
      processing: {
        title: '⏳ Order Processing',
        message: `Your order #${updated.id.slice(0, 8).toUpperCase()} (${updated.service}) is being processed.`,
      },
      successful: {
        title: '✅ Order Successful',
        message: `Your order #${updated.id.slice(0, 8).toUpperCase()} (${updated.service}) was completed successfully!`,
      },
      failed: {
        title: '❌ Order Failed',
        message: `Your order #${updated.id.slice(0, 8).toUpperCase()} (${updated.service}) could not be processed. Please contact support.`,
      },
      cancelled: {
        title: '🚫 Order Cancelled',
        message: `Your order #${updated.id.slice(0, 8).toUpperCase()} (${updated.service}) has been cancelled.`,
      },
    };

    const cfg = status ? notifConfig[status] : undefined;
    if (cfg) {
      Promise.resolve().then(async () => {
        await prisma.notification.create({
          data: {
            userId: updated.userId,
            recipientType: 'user',
            title: cfg.title,
            message: cfg.message,
            link: `/orders/${updated.id}`,
            relatedOrderId: updated.id,
          },
        });
      }).catch(console.error);
    }

    return NextResponse.json({ order: updated });
  } catch (err) {
    console.error('ADMIN ORDER UPDATE ERROR:', err);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

