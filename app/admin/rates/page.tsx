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

// ─── Types ────────────────────────────────────────────────────────────────────

interface RateRecord {
  id: string;
  ghsPerUsd: number;
  setByAdmin: string;
  note: string | null;
  createdAt: string;
}

interface CryptoPrices {
  btcUsd: number;
  bnbUsd: number;
  ethUsd: number;
  updatedAt: string;
}

interface Bundle {
  id: string;
  network: string;
  label: string;
  priceGhs: number;
  isActive: boolean;
  sortOrder: number;
}

type Network = 'MTN' | 'Telecel' | 'AirtelTigo';
const NETWORKS: Network[] = ['MTN', 'Telecel', 'AirtelTigo'];

// ─── Section 1: GHS/USD Rate ──────────────────────────────────────────────────

function RateSection() {
  const [ghsPerUsd, setGhsPerUsd] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [history, setHistory] = useState<RateRecord[]>([]);

  const loadHistory = useCallback(async () => {
    const res = await fetch('/api/rates').catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setHistory(data.rates ?? []);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ghsPerUsd: parseFloat(ghsPerUsd), note: note || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: '✅ Rate saved successfully!' });
        setGhsPerUsd('');
        setNote('');
        loadHistory();
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed to save rate.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">💱 Set Daily GHS/USD Rate</h2>
        <p className="text-xs text-gray-500 mt-0.5">⚠️ Rate changes only affect new orders.</p>
      </div>
      <div className="p-6 grid md:grid-cols-2 gap-8">
        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GHS per USD</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={ghsPerUsd}
              onChange={e => setGhsPerUsd(e.target.value)}
              placeholder="e.g. 15.80"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Market update"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg font-medium text-sm transition-colors"
          >
            {saving ? 'Saving…' : 'Save Rate'}
          </button>
        </form>

        {/* History table */}
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Recent Rate History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Rate</th>
                  <th className="px-3 py-2 text-left">Set By</th>
                  <th className="px-3 py-2 text-left">Note</th>
                  <th className="px-3 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-400">No history yet</td>
                  </tr>
                ) : (
                  history.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-green-700">GHS {r.ghsPerUsd.toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-700 truncate max-w-[100px]">{r.setByAdmin}</td>
                      <td className="px-3 py-2 text-gray-500">{r.note ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 2: Live Crypto Prices ────────────────────────────────────────────

function CryptoPricesSection() {
  const [prices, setPrices] = useState<CryptoPrices | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crypto-prices');
      if (res.ok) setPrices(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, 60_000);
    return () => clearInterval(id);
  }, [fetchPrices]);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">📈 Live Crypto Prices</h2>
          <p className="text-xs text-gray-500 mt-0.5">Fetched live from CoinGecko · auto-refreshes every 60s</p>
        </div>
        <button
          onClick={fetchPrices}
          disabled={loading}
          className="px-4 py-1.5 text-sm bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>
      <div className="p-6">
        {prices ? (
          <div className="grid grid-cols-3 gap-4">
            {[
              { symbol: 'BTC', name: 'Bitcoin', price: prices.btcUsd },
              { symbol: 'BNB', name: 'BNB', price: prices.bnbUsd },
              { symbol: 'ETH', name: 'Ethereum', price: prices.ethUsd },
            ].map(({ symbol, name, price }) => (
              <div key={symbol} className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{name}</p>
                <p className="text-xl font-bold text-gray-800">${price.toLocaleString()}</p>
                <p className="text-xs text-lime-600 font-semibold mt-0.5">{symbol}/USD</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Loading prices…</p>
        )}
        {prices && (
          <p className="text-xs text-gray-400 mt-3">
            Last updated: {new Date(prices.updatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    </section>
  );
}

// ─── Section 3: Data Bundles Manager ──────────────────────────────────────────

function BundlesSection() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [activeTab, setActiveTab] = useState<Network>('MTN');
  const [addLabel, setAddLabel] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addSortOrder, setAddSortOrder] = useState('0');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editLabel, setEditLabel] = useState('');

  const loadBundles = useCallback(async () => {
    const res = await fetch('/api/admin/bundles', { headers: authHeaders() }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setBundles(data.bundles ?? []);
    }
  }, []);

  useEffect(() => { loadBundles(); }, [loadBundles]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    try {
      const res = await fetch('/api/admin/bundles', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          network: activeTab,
          label: addLabel,
          priceGhs: parseFloat(addPrice),
          sortOrder: parseInt(addSortOrder) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddLabel('');
        setAddPrice('');
        setAddSortOrder('0');
        loadBundles();
      } else {
        setAddError(data.error ?? 'Failed to add bundle.');
      }
    } catch {
      setAddError('Network error.');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleActive(bundle: Bundle) {
    await fetch(`/api/admin/bundles/${bundle.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ isActive: !bundle.isActive }),
    });
    loadBundles();
  }

  function startEdit(bundle: Bundle) {
    setEditingId(bundle.id);
    setEditPrice(String(bundle.priceGhs));
    setEditLabel(bundle.label);
  }

  async function saveEdit(bundle: Bundle) {
    await fetch(`/api/admin/bundles/${bundle.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ priceGhs: parseFloat(editPrice), label: editLabel }),
    });
    setEditingId(null);
    loadBundles();
  }

  const filtered = bundles.filter(b => b.network === activeTab);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">📦 Data Bundles Manager</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {NETWORKS.map(net => (
          <button
            key={net}
            onClick={() => setActiveTab(net)}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === net
                ? 'border-b-2 border-green-600 text-green-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {net}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Bundles table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Label</th>
                <th className="px-3 py-2 text-right">Price (GHS)</th>
                <th className="px-3 py-2 text-center">Active</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                    No bundles for {activeTab} yet
                  </td>
                </tr>
              ) : (
                filtered.map(bundle => (
                  <tr key={bundle.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {editingId === bundle.id ? (
                        <input
                          value={editLabel}
                          onChange={e => setEditLabel(e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      ) : (
                        <span className="text-gray-800">{bundle.label}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {editingId === bundle.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      ) : (
                        <span className="text-gray-800">GHS {bundle.priceGhs.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bundle.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {bundle.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2 flex items-center gap-2">
                      {editingId === bundle.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(bundle)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(bundle)}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(bundle)}
                            className={`px-2 py-1 text-xs rounded border transition-colors ${
                              bundle.isActive
                                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            }`}
                          >
                            {bundle.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add bundle inline form */}
        <div className="border-t border-gray-100 pt-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Bundle for {activeTab}</h3>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Label</label>
              <input
                required
                value={addLabel}
                onChange={e => setAddLabel(e.target.value)}
                placeholder="e.g. 1GB / 30 days"
                className="w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Price (GHS)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={addPrice}
                onChange={e => setAddPrice(e.target.value)}
                placeholder="e.g. 12.00"
                className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sort Order</label>
              <input
                type="number"
                min="0"
                value={addSortOrder}
                onChange={e => setAddSortOrder(e.target.value)}
                className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="px-5 py-2 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {adding ? 'Adding…' : '+ Add Bundle'}
            </button>
          </form>
          {addError && <p className="text-red-500 text-xs mt-2">{addError}</p>}
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRatesPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getIsAdmin()) router.replace('/');
  }, [router]);

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Rates & Bundles</h1>
      <RateSection />
      <CryptoPricesSection />
      <BundlesSection />
    </div>
  );
}
