// POST /api/help/tickets/[ticketId]/reopen — user reopens a resolved ticket
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
    const ticket = await prisma.helpTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    if (ticket.userId !== user.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      return NextResponse.json({ error: 'Ticket is not resolved/closed' }, { status: 400 });
    }

    const updated = await prisma.helpTicket.update({
      where: { id: ticketId },
      data: { status: 'open' },
    });

    return NextResponse.json({ ticket: updated });
  } catch (err) {
    console.error('HELP REOPEN ERROR:', err);
    return NextResponse.json({ error: 'Failed to reopen ticket' }, { status: 500 });
  }
}
