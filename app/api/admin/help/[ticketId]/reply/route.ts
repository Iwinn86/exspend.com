// POST /api/admin/help/[ticketId]/reply — admin replies to a help ticket
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAdmin(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  return user?.isAdmin ? user : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ticketId } = await params;

  try {
    const body = await request.json();
    const { message, resolve, imageUrl } = body as { message?: string; resolve?: boolean; imageUrl?: string };

    const ticket = await prisma.helpTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      return NextResponse.json({ error: 'Ticket is already resolved — chat is closed' }, { status: 400 });
    }

    // Handle resolve-only action
    if (resolve) {
      await prisma.helpTicket.update({
        where: { id: ticketId },
        data: { status: 'resolved' },
      });
      // Notify user
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          recipientType: 'user',
          title: '✅ Ticket Resolved',
          message: `Your support ticket "${ticket.subject}" has been resolved.`,
          link: '/help',
        },
      });
      return NextResponse.json({ success: true, status: 'resolved' });
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const reply = await prisma.helpReply.create({
      data: {
        ticketId,
        message: message.trim(),
        fromAdmin: true,
        ...(imageUrl ? { imageUrl } : {}),
      },
    });

    // Mark in_progress when admin replies
    await prisma.helpTicket.update({
      where: { id: ticketId },
      data: { status: 'in_progress' },
    });

    return NextResponse.json({ reply }, { status: 201 });
  } catch (err) {
    console.error('ADMIN HELP REPLY ERROR:', err);
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
  }
}
