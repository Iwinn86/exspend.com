'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Missing or invalid reset token. Please request a new reset link.');
    }
  }, [token]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => router.push('/login'), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error ?? 'Failed to reset password. The link may have expired.');
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

        <h1 className="text-green-900 font-bold text-2xl mb-1 text-center">Reset your password</h1>
        <p className="text-green-700 text-sm text-center mb-6">Enter your new password below.</p>

        {success ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-green-800 text-sm">
              ✅ Password reset successfully! Redirecting to login…
            </div>
            <Link
              href="/login"
              className="block text-sm text-green-700 font-semibold underline hover:text-green-900 transition-colors"
            >
              Go to Login →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-green-900 text-sm font-medium mb-1">New Password</label>
              <input
                type="password"
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div>
              <label className="block text-green-900 text-sm font-medium mb-1">Confirm Password</label>
              <input
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? 'Resetting…' : 'Reset Password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="bg-gradient-to-b from-green-400 to-white min-h-screen flex items-center justify-center">
        <p className="text-green-900 font-semibold">Loading…</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
