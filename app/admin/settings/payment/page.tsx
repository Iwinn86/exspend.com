'use client';

import { useCallback, useEffect, useState } from 'react';

type SettingType = 'bank_details' | 'mtn_details' | 'telecel_details' | 'airteltigo_details';

type PaymentSetting = {
  id?: string;
  settingType: SettingType;
  bankName?: string;
  bankAccount?: string;
  bankAcctName?: string;
  momoProvider?: string;
  momoNumber?: string;
  momoAcctName?: string;
  isActive?: boolean;
};

const SETTING_CONFIGS: { type: SettingType; label: string; icon: string; isMomo: boolean }[] = [
  { type: 'bank_details', label: 'Bank Transfer', icon: '🏦', isMomo: false },
  { type: 'mtn_details', label: 'MTN Mobile Money', icon: '🟡', isMomo: true },
  { type: 'telecel_details', label: 'Telecel Mobile Money', icon: '🔵', isMomo: true },
  { type: 'airteltigo_details', label: 'AirtelTigo Mobile Money', icon: '⚪', isMomo: true },
];

const EMPTY_SETTING = (type: SettingType): PaymentSetting => ({
  settingType: type,
  bankName: '',
  bankAccount: '',
  bankAcctName: '',
  momoProvider: '',
  momoNumber: '',
  momoAcctName: '',
  isActive: true,
});

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('exspend_token');
}

function authHeaders() {
  const token = getToken();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export default function AdminPaymentSettingsPage() {
  const [settings, setSettings] = useState<Record<SettingType, PaymentSetting>>(
    {} as Record<SettingType, PaymentSetting>
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<SettingType | null>(null);
  const [success, setSuccess] = useState<SettingType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payment-settings', { headers: authHeaders() });
      const data = await res.json();
      const map: Record<string, PaymentSetting> = {};
      for (const s of data.settings ?? []) {
        map[s.settingType] = s;
      }
      setSettings(map as Record<SettingType, PaymentSetting>);
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  function getCurrentSetting(type: SettingType): PaymentSetting {
    return settings[type] ?? EMPTY_SETTING(type);
  }

  function updateField(type: SettingType, field: keyof PaymentSetting, value: string | boolean) {
    setSettings((prev) => ({
      ...prev,
      [type]: { ...getCurrentSetting(type), [field]: value },
    }));
  }

  async function handleSave(type: SettingType) {
    setSaving(type);
    setError(null);
    setSuccess(null);
    try {
      const s = getCurrentSetting(type);
      const res = await fetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(s),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return; }
      setSuccess(type);
      setTimeout(() => setSuccess(null), 3000);
      await loadSettings();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Method Settings</h1>
      <p className="text-gray-500 text-sm mb-6">
        Configure the payment details shown to users when they select a payment method on the Buy page.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-6">
          {SETTING_CONFIGS.map(({ type, label, icon, isMomo }) => {
            const s = getCurrentSetting(type);
            const isSaving = saving === type;
            const isSuccess = success === type;

            return (
              <div key={type} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1">
                    <h2 className="font-semibold text-gray-800">{label}</h2>
                    <p className="text-xs text-gray-400">{type}</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-gray-600">Active</span>
                    <input
                      type="checkbox"
                      checked={s.isActive ?? true}
                      onChange={(e) => updateField(type, 'isActive', e.target.checked)}
                      className="w-4 h-4 accent-green-600"
                    />
                  </label>
                </div>

                {!isMomo ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={s.bankName ?? ''}
                        onChange={(e) => updateField(type, 'bankName', e.target.value)}
                        placeholder="e.g. GCB Bank"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={s.bankAccount ?? ''}
                        onChange={(e) => updateField(type, 'bankAccount', e.target.value)}
                        placeholder="e.g. 1234567890"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        value={s.bankAcctName ?? ''}
                        onChange={(e) => updateField(type, 'bankAcctName', e.target.value)}
                        placeholder="e.g. Exspend Technologies Ltd"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                      <input
                        type="text"
                        value={s.momoProvider ?? ''}
                        onChange={(e) => updateField(type, 'momoProvider', e.target.value)}
                        placeholder="e.g. MTN"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                      <input
                        type="text"
                        value={s.momoNumber ?? ''}
                        onChange={(e) => updateField(type, 'momoNumber', e.target.value)}
                        placeholder="e.g. 0241234567"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                      <input
                        type="text"
                        value={s.momoAcctName ?? ''}
                        onChange={(e) => updateField(type, 'momoAcctName', e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => handleSave(type)}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                  {isSuccess && (
                    <span className="text-sm text-green-600 font-medium">✅ Saved successfully!</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
