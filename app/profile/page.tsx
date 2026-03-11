'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, ArrowLeft } from 'lucide-react';
import { getCurrentUser, getToken, setCurrentUser } from '@/app/lib/auth';

type KycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

type KycEntry = {
  id: string;
  status: KycStatus;
  documentType: string;
  documentNumber: string;
  submittedAt: string;
  rejectionReason?: string;
};

type OrderSummary = {
  total: number;
  totalSpent: number;
  pending: number;
};

const KYC_STATUS_BADGE: Record<KycStatus, { label: string; className: string }> = {
  not_submitted: { label: '⬜ Not Verified', className: 'bg-gray-100 text-gray-600' },
  pending: { label: '⏳ Under Review', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '✅ Verified', className: 'bg-green-100 text-green-700' },
  rejected: { label: '❌ Rejected', className: 'bg-red-100 text-red-700' },
};

export default function ProfilePage() {
  const router = useRouter();
  const user = getCurrentUser();
  const token = getToken();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [kyc, setKyc] = useState<KycEntry | null>(null);
  const [kycLoading, setKycLoading] = useState(true);

  // KYC form
  const [docType, setDocType] = useState('Ghana Card');
  const [docNumber, setDocNumber] = useState('');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycMsg, setKycMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [kycFileError, setKycFileError] = useState<string | null>(null);

  // Transaction summary
  const [summary, setSummary] = useState<OrderSummary | null>(null);

  // Referral
  type ReferralStats = {
    referralCode: string | null;
    referralPoints: number;
    stats: { totalSignups: number; totalApproved: number; totalSent: number };
    rewards: Array<{ id: string; rewardNetwork: string; status: string; createdAt: string; referredUser: { name: string; email: string } | null }>;
  };
  const [referral, setReferral] = useState<ReferralStats | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  function copyReferralCode() {
    if (referral?.referralCode) {
      navigator.clipboard.writeText(referral.referralCode).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      });
    }
  }

  useEffect(() => {
    if (!user || !token) {
      router.push('/login');
      return;
    }
    // Fetch KYC status
    fetch('/api/kyc', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setKyc(d.kyc); setKycLoading(false); })
      .catch(() => setKycLoading(false));

    // Fetch orders for summary
    fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const orders = d.orders || [];
        setSummary({
          total: orders.length,
          totalSpent: orders.filter((o: { status: string }) => o.status === 'successful').reduce((s: number, o: { amountGhs: number }) => s + (o.amountGhs ?? 0), 0),
          pending: orders.filter((o: { status: string }) => o.status === 'pending').length,
        });
      })
      .catch(() => {});

    // Fetch referral info (generate code if not exists)
    fetch('/api/referral/generate-code', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .catch(() => null);

    fetch('/api/referral/rewards', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setReferral(d))
      .catch(() => {});
  }, [user, token, router]);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMsg({ type: 'error', text: data.error || 'Failed to save' });
      } else {
        setCurrentUser(data.user, data.token);
        setSaveMsg({ type: 'success', text: 'Profile updated successfully!' });
        setEditing(false);
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setBase64: (v: string | null) => void,
    setPreview: (v: string | null) => void,
  ) {
    const file = e.target.files?.[0];
    setKycFileError(null);
    if (!file) { setBase64(null); setPreview(null); return; }
    if (file.size > 2 * 1024 * 1024) {
      setKycFileError(`File "${file.name}" exceeds the 2MB limit.`);
      e.target.value = '';
      setBase64(null);
      setPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setBase64(result);
      setPreview(result);
    };
    reader.readAsDataURL(file);
  }

  async function handleKycSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !frontImage || !selfieImage) return;
    setKycSubmitting(true);
    setKycMsg(null);
    try {
      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ documentType: docType, documentNumber: docNumber, frontImage, backImage: backImage || undefined, selfieImage }),
      });
      const data = await res.json();
      if (!res.ok) {
        setKycMsg({ type: 'error', text: data.error || 'Submission failed' });
      } else {
        setKyc(data.kyc);
        setKycMsg({ type: 'success', text: 'Documents submitted! We will review within 1–2 business days.' });
      }
    } catch {
      setKycMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setKycSubmitting(false);
    }
  }

  if (!user) return null;

  const kycStatus: KycStatus = kyc?.status ?? 'not_submitted';
  const showKycForm = kycStatus === 'not_submitted' || kycStatus === 'rejected';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex flex-col items-center px-4 py-10">
      {/* Back link */}
      <div className="w-full max-w-2xl mb-4">
        <Link href="/spend" className="flex items-center gap-1 text-lime-300 hover:text-white text-sm font-medium transition-colors">
          <ArrowLeft size={16} />
          Back to Spend
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-green-900 px-6 py-5 flex items-center gap-3">
          <User size={28} className="text-lime-400" />
          <h1 className="text-white text-2xl font-bold">My Profile</h1>
        </div>

        <div className="p-6 flex flex-col gap-8">

          {/* Section 1: Account Info */}
          <section>
            <h2 className="text-green-900 font-bold text-lg mb-4">Account Info</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={!editing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  disabled={!editing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                <p className="text-sm text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {saveMsg && (
              <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${saveMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {saveMsg.text}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {!editing ? (
                <button
                  onClick={() => { setEditing(true); setSaveMsg(null); }}
                  className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setName(user.name); setPhone(user.phone); setSaveMsg(null); }}
                    className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Section 2: KYC Verification */}
          <section>
            <h2 className="text-green-900 font-bold text-lg mb-4">KYC Verification</h2>
            {kycLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${KYC_STATUS_BADGE[kycStatus].className}`}>
                    {KYC_STATUS_BADGE[kycStatus].label}
                  </span>
                </div>

                {kycStatus === 'pending' && (
                  <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                    Your documents are being reviewed (1–2 business days).
                  </p>
                )}
                {kycStatus === 'approved' && (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    Your identity is verified. ✅
                  </p>
                )}
                {kycStatus === 'rejected' && kyc?.rejectionReason && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                    Rejection reason: {kyc.rejectionReason}
                  </p>
                )}

                {showKycForm && (
                  <form onSubmit={handleKycSubmit} className="flex flex-col gap-4 mt-4">
                    <p className="text-xs text-gray-400">Max file size: 2MB per image</p>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                      <select
                        value={docType}
                        onChange={e => setDocType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option>Ghana Card</option>
                        <option>Passport</option>
                        <option>Driver&apos;s License</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Document Number</label>
                      <input
                        type="text"
                        value={docNumber}
                        onChange={e => setDocNumber(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Front of Document</label>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={e => handleFileChange(e, setFrontImage, setFrontPreview)}
                        className="w-full text-sm text-gray-600"
                      />
                      {frontPreview && <img src={frontPreview} alt="Front preview" className="mt-2 h-24 rounded border object-cover" />}
                    </div>

                    {docType !== 'Passport' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Back of Document <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleFileChange(e, setBackImage, setBackPreview)}
                          className="w-full text-sm text-gray-600"
                        />
                        {backPreview && <img src={backPreview} alt="Back preview" className="mt-2 h-24 rounded border object-cover" />}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Selfie with Document</label>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={e => handleFileChange(e, setSelfieImage, setSelfiePreview)}
                        className="w-full text-sm text-gray-600"
                      />
                      {selfiePreview && <img src={selfiePreview} alt="Selfie preview" className="mt-2 h-24 rounded border object-cover" />}
                    </div>

                    {kycFileError && (
                      <p className="text-sm text-red-600">{kycFileError}</p>
                    )}

                    {kycMsg && (
                      <div className={`text-sm px-3 py-2 rounded-lg ${kycMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {kycMsg.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={kycSubmitting || !frontImage || !selfieImage || !docNumber}
                      className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-60 self-start"
                    >
                      {kycSubmitting ? 'Submitting…' : 'Submit for Verification →'}
                    </button>
                  </form>
                )}
              </>
            )}
          </section>

          {/* Section 3: Referral Program */}
          <section>
            <h2 className="text-green-900 font-bold text-lg mb-4">Referral Program</h2>
            <div className="bg-gradient-to-r from-green-50 to-lime-50 border border-green-200 rounded-xl p-5">
              <p className="text-sm text-green-800 mb-4">
                🎁 Invite friends to Exspend! When your referral signs up and gets KYC verified, you earn <strong>200 MB data</strong> on your choice of network.
              </p>

              {referral === null ? (
                <p className="text-sm text-gray-400">Loading referral info…</p>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Your Referral Code</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-white border border-green-300 rounded-lg px-4 py-2 text-green-900 font-bold text-base tracking-wider flex-1">
                        {referral.referralCode ?? 'Generating…'}
                      </code>
                      <button
                        onClick={copyReferralCode}
                        disabled={!referral.referralCode}
                        className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 whitespace-nowrap"
                      >
                        {copySuccess ? '✓ Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Share this code with friends when they sign up.</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white rounded-lg p-3 text-center border border-green-100">
                      <p className="text-xl font-bold text-green-800">{referral.stats?.totalSignups ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Friends Signed Up</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border border-green-100">
                      <p className="text-xl font-bold text-green-800">{referral.stats?.totalApproved ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Approved</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border border-green-100">
                      <p className="text-xl font-bold text-green-800">{referral.stats?.totalSent ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Bonuses Sent</p>
                    </div>
                  </div>

                  {referral.rewards && referral.rewards.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Recent Referrals</p>
                      <div className="flex flex-col gap-2">
                        {referral.rewards.slice(0, 5).map(r => (
                          <div key={r.id} className="bg-white rounded-lg px-3 py-2 flex items-center justify-between border border-gray-100 text-sm">
                            <div>
                              <span className="font-medium text-gray-800">{r.referredUser?.name ?? 'Friend'}</span>
                              <span className="ml-2 text-xs text-gray-400">{r.rewardNetwork.toUpperCase()}</span>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              r.status === 'sent' ? 'bg-green-100 text-green-700' :
                              r.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {r.status === 'sent' ? '✅ Sent' : r.status === 'approved' ? '✓ Approved' : '⏳ Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-3">
                    <Link
                      href="/profile/referrals"
                      className="inline-flex items-center gap-1 text-sm text-green-700 font-medium hover:text-green-900 hover:underline"
                    >
                      View All Invited People →
                    </Link>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Section 4: Transaction Summary */}
          <section>
            <h2 className="text-green-900 font-bold text-lg mb-4">Transaction Summary</h2>
            {summary === null ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                  <p className="text-2xl font-bold text-green-800">{summary.total}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Orders</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                  <p className="text-2xl font-bold text-green-800">GHS {summary.totalSpent.toFixed(0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Spent</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-100">
                  <p className="text-2xl font-bold text-yellow-700">{summary.pending}</p>
                  <p className="text-xs text-gray-500 mt-1">Pending</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
