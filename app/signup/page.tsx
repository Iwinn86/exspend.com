'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '@/app/lib/auth';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function checkReferralCode(code: string) {
    if (!code.trim()) {
      setReferralValid(null);
      return;
    }
    setReferralChecking(true);
    try {
      const res = await fetch('/api/referral/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      setReferralValid(data.valid === true);
    } catch {
      setReferralValid(null);
    } finally {
      setReferralChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    // If referral code entered but not yet validated, validate it now
    if (referralCode.trim() && referralValid === null) {
      await checkReferralCode(referralCode);
      // Re-check after validation completes
      setLoading(false);
      setError('Please wait for referral code validation to complete, then try again.');
      return;
    }
    if (referralCode.trim() && referralValid === false) {
      setLoading(false);
      setError('Invalid referral code. Please remove it or enter a valid code.');
      return;
    }

    const result = await registerUser(name, email, phone, password, referralCode.trim() || undefined);
    setLoading(false);

    if (result.success) {
      router.push('/spend');
    } else {
      setError(result.error ?? 'Registration failed.');
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

        <h1 className="text-green-900 font-bold text-2xl mb-1 text-center">Create your account</h1>
        <p className="text-green-700 text-sm text-center mb-6">Join Exspend — pay local with crypto</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-green-900 text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-green-900 text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-green-900 text-sm font-medium mb-1">Phone Number</label>
            <input
              type="text"
              placeholder="e.g. 0241234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={10}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-green-900 text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-green-900 text-sm font-medium mb-1">Confirm Password</label>
            <input
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-green-900 text-sm font-medium mb-1">
              Referral Code <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. EXP-ABC123DEF456"
                value={referralCode}
                onChange={(e) => {
                  setReferralCode(e.target.value);
                  setReferralValid(null);
                }}
                onBlur={() => checkReferralCode(referralCode)}
                className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${
                  referralValid === true ? 'border-green-400' : referralValid === false ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {referralChecking && (
                <span className="absolute right-3 top-3 text-xs text-gray-400">Checking…</span>
              )}
              {referralValid === true && !referralChecking && (
                <span className="absolute right-3 top-3 text-xs text-green-600 font-medium">✓ Valid</span>
              )}
              {referralValid === false && !referralChecking && (
                <span className="absolute right-3 top-3 text-xs text-red-600 font-medium">✗ Invalid</span>
              )}
            </div>
            {referralValid === true && (
              <p className="text-xs text-green-600 mt-1">Referral code applied! Your friend will earn 200 MB when you get verified.</p>
            )}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>
        </form>

        <p className="text-center text-sm text-green-800 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

