'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  imageUrl?: string | null;
  createdAt: string;
  fromAdmin: boolean;
};

type Ticket = {
  id: string;
  subject: string;
  message: string;
  attachmentUrl?: string | null;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  replies?: Reply[];
};

const STATUS_BADGE: Record<TicketStatus, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
};

const STATUS_EMOJI: Record<TicketStatus, string> = {
  open: '🟡',
  in_progress: '🔵',
  resolved: '🟢',
  closed: '⚫',
};

function shortTicketId(id: string) {
  return '#TKT-' + id.slice(0, 6).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function HelpPageContent() {
  const searchParams = useSearchParams();
  const prefillOrderId = searchParams.get('orderId');

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState('');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [orderId, setOrderId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Per-ticket reply state
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replyImages, setReplyImages] = useState<Record<string, string | null>>({});
  const [replyImageNames, setReplyImageNames] = useState<Record<string, string | null>>({});
  const [sendingReply, setSendingReply] = useState<Record<string, boolean>>({});
  const [replyError, setReplyError] = useState<Record<string, string>>({});

  const replyInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    const t = getToken();
    setToken(t);
  }, []);

  // Pre-fill subject and orderId if provided
  useEffect(() => {
    if (prefillOrderId) {
      setOrderId(prefillOrderId);
      const shortId = '#' + prefillOrderId.slice(0, 8).toUpperCase();
      setSubject(`Order ${shortId} - Issue`);
    }
  }, [prefillOrderId]);

  useEffect(() => {
    if (!token) return;
    setTicketsLoading(true);
    fetch('/api/help/tickets', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { setTickets(data.tickets ?? []); })
      .catch(() => setTicketsError('Failed to load tickets.'))
      .finally(() => setTicketsLoading(false));
  }, [token, submitSuccess]);

  async function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setSubmitError('Image too large. Max 5MB.'); return; }
    const b64 = await fileToBase64(file);
    setAttachmentBase64(b64);
    setAttachmentName(file.name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    if (!orderId.trim()) {
      setSubmitError('A valid Order ID is required to open a ticket.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/help/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, message, orderId: orderId.trim(), attachmentUrl: attachmentBase64 }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? 'Submission failed.');
      } else {
        setSubmitSuccess(true);
        setSubject('');
        setMessage('');
        setOrderId('');
        setAttachmentBase64(null);
        setAttachmentName(null);
        setTimeout(() => setSubmitSuccess(false), 5000);
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReplyImageChange(ticketId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setReplyError(prev => ({ ...prev, [ticketId]: 'Image too large. Max 5MB.' }));
      return;
    }
    const b64 = await fileToBase64(file);
    setReplyImages(prev => ({ ...prev, [ticketId]: b64 }));
    setReplyImageNames(prev => ({ ...prev, [ticketId]: file.name }));
  }

  async function handleSendReply(ticketId: string) {
    const msg = replyInputs[ticketId]?.trim();
    if (!msg && !replyImages[ticketId]) return;
    setSendingReply(prev => ({ ...prev, [ticketId]: true }));
    setReplyError(prev => ({ ...prev, [ticketId]: '' }));
    try {
      const res = await fetch(`/api/help/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg || '📷 Image attached', imageUrl: replyImages[ticketId] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReplyError(prev => ({ ...prev, [ticketId]: data.error ?? 'Failed to send reply.' }));
        return;
      }
      setReplyInputs(prev => ({ ...prev, [ticketId]: '' }));
      setReplyImages(prev => ({ ...prev, [ticketId]: null }));
      setReplyImageNames(prev => ({ ...prev, [ticketId]: null }));
      // Refresh tickets to show new reply
      fetch('/api/help/tickets', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setTickets(d.tickets ?? []));
    } catch {
      setReplyError(prev => ({ ...prev, [ticketId]: 'Network error.' }));
    } finally {
      setSendingReply(prev => ({ ...prev, [ticketId]: false }));
    }
  }

  async function handleReopenTicket(ticketId: string) {
    try {
      const res = await fetch(`/api/help/tickets/${ticketId}/reopen`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetch('/api/help/tickets', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => setTickets(d.tickets ?? []));
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-green-900 mb-1">Help & Support</h1>
      <p className="text-gray-500 mb-6 text-sm">Find answers or contact our team</p>

      {/* WhatsApp Quick Support */}
      <section className="mb-8">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">⚡ Quick Support</p>
          <p className="text-sm text-gray-600 mb-3">For immediate assistance, chat with us on WhatsApp</p>
          <a
            href="https://wa.me/233571827900"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#25D366' }}
          >
            <span className="text-lg">💬</span>
            Chat on WhatsApp: +233 57 182 7900
          </a>
        </div>
      </section>

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
            {tickets.map(ticket => {
              const isClosed = ticket.status === 'resolved' || ticket.status === 'closed';
              return (
                <div
                  key={ticket.id}
                  className="bg-white border border-green-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Ticket header */}
                  <button
                    onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                    className="w-full text-left px-5 py-4 flex justify-between items-start hover:bg-green-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-gray-400">{shortTicketId(ticket.id)}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[ticket.status]}`}>
                          {STATUS_EMOJI[ticket.status]} {ticket.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        {ticket.replies && ticket.replies.length > 0 && (
                          <span className="text-xs text-gray-400">{ticket.replies.length} repl{ticket.replies.length === 1 ? 'y' : 'ies'}</span>
                        )}
                      </div>
                      <p className="font-semibold text-gray-800 text-sm truncate">{ticket.subject}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(ticket.createdAt)}</p>
                    </div>
                    <span className="text-green-600 ml-2 flex-shrink-0">{expandedTicket === ticket.id ? '−' : '+'}</span>
                  </button>

                  {/* Expanded conversation */}
                  {expandedTicket === ticket.id && (
                    <div className="border-t border-green-100">
                      {/* Chat messages area */}
                      <div className="px-4 py-4 space-y-3 bg-gray-50 max-h-80 overflow-y-auto">
                        {/* Original message */}
                        <div className="flex justify-end">
                          <div className="max-w-[80%] bg-green-700 text-white rounded-2xl rounded-br-sm px-4 py-2 text-sm">
                            <p className="break-words">{ticket.message}</p>
                            {ticket.attachmentUrl && (
                              <a href={ticket.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                <img src={ticket.attachmentUrl} alt="Attachment" className="mt-2 max-w-full rounded border border-green-500" />
                              </a>
                            )}
                            <p className="text-[10px] text-green-200 text-right mt-1">{formatDate(ticket.createdAt)}</p>
                          </div>
                        </div>

                        {/* Replies */}
                        {ticket.replies?.map(reply => (
                          <div key={reply.id} className={`flex ${reply.fromAdmin ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                              reply.fromAdmin
                                ? 'bg-blue-100 text-blue-900 rounded-bl-sm'
                                : 'bg-green-700 text-white rounded-br-sm'
                            }`}>
                              {reply.fromAdmin && (
                                <p className="text-xs font-semibold mb-0.5 opacity-70">🛡 Admin Support</p>
                              )}
                              <p className="break-words">{reply.message}</p>
                              {reply.imageUrl && (
                                <a href={reply.imageUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={reply.imageUrl} alt="Image" className="mt-2 max-w-full rounded border" />
                                </a>
                              )}
                              <p className={`text-[10px] mt-1 text-right ${reply.fromAdmin ? 'text-blue-400' : 'text-green-200'}`}>
                                {formatDate(reply.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Closed ticket banner */}
                      {isClosed && (
                        <div className="px-4 py-3 bg-gray-100 border-t border-gray-200 text-center">
                          <p className="text-sm text-gray-500 mb-2">🔒 This ticket has been resolved and closed.</p>
                          <button
                            onClick={() => handleReopenTicket(ticket.id)}
                            className="text-sm text-green-700 font-medium hover:underline"
                          >
                            Reopen Ticket
                          </button>
                        </div>
                      )}

                      {/* Reply input */}
                      {!isClosed && (
                        <div className="px-4 py-3 border-t border-green-100 bg-white">
                          {replyError[ticket.id] && (
                            <p className="text-xs text-red-600 mb-2">{replyError[ticket.id]}</p>
                          )}
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <textarea
                                ref={el => { replyInputRefs.current[ticket.id] = el; }}
                                rows={2}
                                value={replyInputs[ticket.id] ?? ''}
                                onChange={e => setReplyInputs(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                                placeholder="Type a reply…"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                              />
                              {replyImageNames[ticket.id] && (
                                <p className="text-xs text-gray-400 mt-1">📎 {replyImageNames[ticket.id]}</p>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/jpg"
                                  className="hidden"
                                  onChange={e => handleReplyImageChange(ticket.id, e)}
                                />
                                <span className="flex items-center justify-center w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-500 text-sm transition-colors">
                                  📎
                                </span>
                              </label>
                              <button
                                onClick={() => handleSendReply(ticket.id)}
                                disabled={sendingReply[ticket.id] || (!replyInputs[ticket.id]?.trim() && !replyImages[ticket.id])}
                                className="flex items-center justify-center w-9 h-9 bg-green-700 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm transition-colors"
                              >
                                {sendingReply[ticket.id] ? '…' : '↑'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
              ℹ️ Tickets can only be opened for completed orders (successful, failed, or cancelled). For help during an active order, use the order chat.
            </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Order ID <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                required
                placeholder="Paste your Order ID here"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <p className="text-xs text-gray-400 mt-1">Find your Order ID in My Orders or the order detail page.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                placeholder="Brief description of your issue"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={4}
                placeholder="Describe your issue in detail…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (optional)</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleAttachmentChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              {attachmentName && (
                <p className="text-xs text-gray-400 mt-1">📎 {attachmentName}</p>
              )}
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

export default function HelpPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8 text-gray-400">Loading…</div>}>
      <HelpPageContent />
    </Suspense>
  );
}

