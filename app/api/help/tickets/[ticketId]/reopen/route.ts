// POST /api/help/tickets/[ticketId]/reopen — disabled: tickets cannot be reopened by users
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Tickets cannot be reopened. Please open a new ticket.' },
    { status: 403 }
  );
}
