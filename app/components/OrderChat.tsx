'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getToken } from '@/app/lib/auth';

type Message = {
  id: string;
  message: string;
  fromAdmin: boolean;
  createdAt: string;
  user: { name: string; isAdmin: boolean };
};

type OrderStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled';

const FINAL_STATUSES: OrderStatus[] = ['successful', 'failed', 'cancelled'];
const POLL_INTERVAL_MS = 3000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function OrderChat({
  orderId,
  orderStatus,
  isAdmin = false,
}: {
  orderId: string;
  orderStatus: OrderStatus;
  isAdmin?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(orderStatus);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const token = getToken();

  const isClosed = FINAL_STATUSES.includes(currentStatus);

  const fetchMessages = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
      if (data.orderStatus) setCurrentStatus(data.orderStatus as OrderStatus);
    } catch {
      // silently fail on poll
    }
  }, [orderId, token]);

  useEffect(() => {
    fetchMessages().finally(() => setLoadingInitial(false));
    // Stop polling when chat is closed (order in final status)
    if (isClosed) return;
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchMessages, isClosed]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || !token || isClosed) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to send message');
        return;
      }
      setInput('');
      await fetchMessages();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-3 bg-green-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span className="text-sm font-semibold text-white">Order Chat</span>
        </div>
        {isClosed ? (
          <span className="text-xs bg-gray-600 text-white px-2 py-0.5 rounded-full">Closed</span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-lime-400">
            <span className="w-2 h-2 bg-lime-400 rounded-full animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
        {loadingInitial ? (
          <p className="text-center text-gray-400 text-sm py-8">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">
            {isClosed
              ? 'This chat is closed.'
              : 'No messages yet. Start the conversation!'}
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = isAdmin ? msg.fromAdmin : !msg.fromAdmin;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    isMine
                      ? 'bg-green-700 text-white rounded-br-sm'
                      : msg.fromAdmin
                      ? 'bg-blue-100 text-blue-900 rounded-bl-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {!isMine && (
                    <p className="text-xs font-semibold mb-0.5 opacity-70">
                      {msg.fromAdmin ? '🛡 Admin' : msg.user.name}
                    </p>
                  )}
                  <p className="break-words">{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-green-200' : 'text-gray-400'} text-right`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isClosed ? (
        <div className="px-4 py-3 bg-gray-100 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Chat closed — order is {currentStatus}.{' '}
            <a href="/help" className="text-green-700 font-medium hover:underline">
              Open a support ticket
            </a>
          </p>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-gray-200 bg-white">
          {error && (
            <p className="text-xs text-red-600 mb-2">{error}</p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              disabled={sending}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="bg-green-700 hover:bg-green-600 disabled:bg-green-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
