'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('exspend_token');
}

function getIsAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('exspend_token');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.isAdmin === true;
  } catch { return false; }
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` };
}

interface HelpReply {
  id: string;
  message: string;
  fromAdmin: boolean;
  createdAt: string;
}

interface HelpTicket {
  id: string;
  subject: string;
  message: string;
  orderId?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
  replies: HelpReply[];
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

function TicketRow({
  ticket,
  ticketNumber,
  expanded,
  onToggle,
  onRefresh,
}: {
  ticket: HelpTicket;
  ticketNumber: number;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');

  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/help/${ticket.id}/reply`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: replyMessage }),
      });
      const data = await res.json();
      if (res.ok) {
        setReplyMessage('');
        onRefresh();
      } else {
        setError(data.error ?? 'Failed to send reply.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function handleResolve() {
    if (!confirm('Mark this ticket as resolved? This will close the chat.')) return;
    setResolving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/help/${ticket.id}/reply`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ resolve: true }),
      });
      const data = await res.json();
      if (res.ok) {
        onRefresh();
      } else {
        setError(data.error ?? 'Failed to resolve ticket.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setResolving(false);
    }
  }

  const statusLabel = ticket.status.replace('_', ' ');

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-start justify-between gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono text-gray-400 flex-shrink-0">#{ticketNumber}</span>
            <span className="font-semibold text-gray-800 truncate">{ticket.subject}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {statusLabel}
            </span>
            {ticket.orderId && (
              <span className="text-xs text-gray-400 font-mono">Order: {ticket.orderId.slice(0, 8).toUpperCase()}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {ticket.user.name} &lt;{ticket.user.email}&gt; ·{' '}
            {new Date(ticket.createdAt).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{ticket.message}</p>
        </div>
        <span className="text-gray-400 text-lg flex-shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
          {isResolved && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
              <p className="text-green-800 font-semibold text-sm">🔒 Ticket Resolved — Chat Closed</p>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-400 mb-1">
              {ticket.user.name} · {new Date(ticket.createdAt).toLocaleString()}
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
          </div>

          {ticket.replies.map(reply => (
            <div
              key={reply.id}
              className={`rounded-lg border p-4 ${
                reply.fromAdmin
                  ? 'bg-green-50 border-green-200 ml-6'
                  : 'bg-white border-gray-200 mr-6'
              }`}
            >
              <p className="text-xs text-gray-400 mb-1">
                {reply.fromAdmin ? '🛡️ Admin' : ticket.user.name} ·{' '}
                {new Date(reply.createdAt).toLocaleString()}
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.message}</p>
            </div>
          ))}

          {!isResolved && (
            <div className="space-y-3 pt-2">
              <form onSubmit={handleReply} className="space-y-3">
                <textarea
                  required
                  rows={3}
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  placeholder="Type your reply…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {sending ? 'Sending…' : 'Send Reply'}
                </button>
              </form>
              <div className="border-t border-gray-200 pt-3">
                <button
                  onClick={handleResolve}
                  disabled={resolving}
                  className="px-5 py-2 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {resolving ? 'Resolving…' : '✅ Mark as Resolved'}
                </button>
                <p className="text-xs text-gray-400 mt-1">Resolving will close the chat permanently.</p>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>
      )}
    </div>
  );
}

const TICKETS_PER_PAGE = 10;

export default function AdminHelpPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const loadTickets = useCallback(async () => {
    const res = await fetch('/api/admin/help', { headers: authHeaders() }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setTickets(data.tickets ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!getIsAdmin()) {
      router.replace('/');
      return;
    }
    loadTickets();
  }, [router, loadTickets]);

  const filtered = filterStatus === 'all'
    ? tickets
    : tickets.filter(t => t.status === filterStatus);

  const totalPages = Math.max(1, Math.ceil(filtered.length / TICKETS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * TICKETS_PER_PAGE;
  const paginated = filtered.slice(pageStart, pageStart + TICKETS_PER_PAGE);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🎧 Help Tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tickets.length} total ticket{tickets.length !== 1 ? 's' : ''}</p>
        </div>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading tickets…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400">No tickets found.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map((ticket, idx) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                ticketNumber={pageStart + idx + 1}
                expanded={expandedId === ticket.id}
                onToggle={() => setExpandedId(prev => prev === ticket.id ? null : ticket.id)}
                onRefresh={loadTickets}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
