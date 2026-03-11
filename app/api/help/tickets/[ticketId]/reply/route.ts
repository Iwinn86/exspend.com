// POST /api/help/tickets/[ticketId]/reply — user replies to their own ticket
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAuth(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const user = requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ticketId } = await params;

  try {
    const { message, imageUrl } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const ticket = await prisma.helpTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    if (ticket.userId !== user.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      return NextResponse.json({ error: 'Ticket is closed. Please reopen to reply.' }, { status: 400 });
    }

    const reply = await prisma.helpReply.create({
      data: {
        ticketId,
        message: message.trim(),
        fromAdmin: false,
        ...(imageUrl ? { imageUrl } : {}),
      },
    });

    return NextResponse.json({ reply }, { status: 201 });
  } catch (err) {
    console.error('HELP REPLY ERROR:', err);
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
  }
}
