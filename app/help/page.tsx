'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/app/lib/auth';

const FAQS = [
  {
    q: 'How long does a transaction take?',
    a: 'Usually within 30 minutes for MoMo/Airtime/Data. Bank transfers may take up to 2 hours.',
  },
  {
    q: 'What crypto do you accept?',
    a: 'We accept USDT (TRC-20, BEP-20), USDC (BEP-20), BTC, BNB, ETH, Binance Pay, Bybit Pay.',
  },
  {
    q: 'What is the minimum amount?',
    a: 'Minimum is GHS 150 for bank/MoMo transfers, GHS 5 for airtime. Data bundles have fixed prices.',
  },
  {
    q: 'What happens if I send the wrong amount?',
    a: 'Contact support immediately via the ticket below.',
  },
  {
    q: 'Is my information safe?',
    a: 'Yes, we use industry standard encryption and never store crypto private keys.',
  },
];

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

type Reply = {
  id: string;
  message: string;
  createdAt: string;
  fromAdmin: boolean;
};

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  createdAt: string;
  replies?: Reply[];
};

const STATUS_BADGE: Record<TicketStatus, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState('');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const t = getToken();
    setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    setTicketsLoading(true);
    fetch('/api/help/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setTickets(data.tickets ?? []);
      })
      .catch(() => setTicketsError('Failed to load tickets.'))
      .finally(() => setTicketsLoading(false));
  }, [token, submitSuccess]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/help/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject, message }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? 'Submission failed.');
      } else {
        setSubmitSuccess(true);
        setSubject('');
        setMessage('');
        setTimeout(() => setSubmitSuccess(false), 5000);
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-green-900 mb-1">Help & Support</h1>
      <p className="text-gray-500 mb-8 text-sm">Find answers or contact our team</p>

      {/* FAQ Accordion */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-green-800 mb-4">Frequently Asked Questions</h2>
        <div className="flex flex-col gap-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-white rounded-xl border border-green-200 overflow-hidden shadow-sm">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-5 py-4 flex justify-between items-center text-gray-800 font-medium hover:bg-green-50 transition-colors"
              >
                <span>{faq.q}</span>
                <span className="text-green-600 text-lg ml-2">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-gray-600 text-sm border-t border-green-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* My Support Tickets */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-green-800 mb-4">My Support Tickets</h2>
        {!token ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-6 text-center text-gray-500">
            <span className="text-2xl block mb-2">🔒</span>
            Login to view your tickets
          </div>
        ) : ticketsLoading ? (
          <div className="text-center py-8 text-gray-400">Loading tickets…</div>
        ) : ticketsError ? (
          <div className="text-red-500 text-sm">{ticketsError}</div>
        ) : tickets.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-6 text-center text-gray-500">
            <span className="text-2xl block mb-2">📭</span>
            No support tickets yet
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white border border-green-200 rounded-xl shadow-sm overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)
                  }
                  className="w-full text-left px-5 py-4 flex justify-between items-start hover:bg-green-50 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{ticket.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(ticket.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${STATUS_BADGE[ticket.status]}`}
                    >
                      {STATUS_LABEL[ticket.status]}
                    </span>
                    <span className="text-green-600">{expandedTicket === ticket.id ? '−' : '+'}</span>
                  </div>
                </button>
                {expandedTicket === ticket.id && (
                  <div className="px-5 pb-4 border-t border-green-100 pt-3">
                    <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{ticket.message}</p>
                    {ticket.replies && ticket.replies.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Replies</p>
                        {ticket.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className={`rounded-lg px-4 py-3 text-sm ${
                              reply.fromAdmin
                                ? 'bg-green-50 border border-green-200 text-green-900'
                                : 'bg-gray-50 border border-gray-200 text-gray-700'
                            }`}
                          >
                            <p className="text-xs text-gray-400 mb-1">
                              {reply.fromAdmin ? '🟢 Support' : '👤 You'} · {formatDate(reply.createdAt)}
                            </p>
                            <p className="whitespace-pre-wrap">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Submit New Ticket */}
      <section>
        <h2 className="text-xl font-semibold text-green-800 mb-4">Submit a New Ticket</h2>
        {!token ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-6 text-center text-gray-500">
            <span className="text-2xl block mb-2">🔒</span>
            Please login to submit a ticket
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-green-200 rounded-xl shadow-sm p-5 flex flex-col gap-4">
            {submitSuccess && (
              <div className="bg-green-50 border border-green-300 text-green-800 rounded-lg px-4 py-3 text-sm">
                ✅ Your ticket has been submitted. Our team will respond shortly.
              </div>
            )}
            {submitError && (
              <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 text-sm">
                {submitError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder="Brief description of your issue"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                placeholder="Describe your issue in detail…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
