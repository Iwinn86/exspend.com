'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok || res.status === 404) {
        // Always show generic success to avoid user enumeration
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-b from-green-400 to-white min-h-screen flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <span className="text-3xl font-bold">
            ⚡ <span className="text-lime-400">Ex</span>
            <span className="text-green-900">spend</span>
          </span>
        </div>

        <h1 className="text-green-900 font-bold text-2xl mb-1 text-center">Forgot your password?</h1>
        <p className="text-green-700 text-sm text-center mb-6">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-green-800 text-sm">
              ✅ If an account with that email exists, we&apos;ve sent a reset link. Please check your inbox.
            </div>
            <Link
              href="/login"
              className="block text-sm text-green-700 font-semibold underline hover:text-green-900 transition-colors"
            >
              ← Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-green-900 text-sm font-medium mb-1">Email address</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <p className="text-center text-sm text-green-800">
              <Link href="/login" className="font-semibold underline hover:text-green-900 transition-colors">
                ← Back to Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
