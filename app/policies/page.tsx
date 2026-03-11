import React from 'react';

const sections = [
  {
    title: 'Terms of Service',
    icon: '📜',
    content: [
      {
        heading: 'Service Description',
        body: 'Exspend facilitates the conversion of cryptocurrency to Ghanaian Cedis (GHS) for payment of bank transfers, MoMo, airtime, and data bundles. We act as a payment intermediary and do not hold funds beyond the processing period.',
      },
      {
        heading: 'User Responsibilities',
        body: 'You must provide correct recipient details before submitting an order. You are responsible for sending the exact crypto amount specified at order creation. Exspend bears no liability for failed or misdirected payments caused by incorrect information provided by the user.',
      },
      {
        heading: 'Minimum Amounts',
        body: 'The minimum transaction value is GHS 150 for bank transfers and MoMo, and GHS 5 for airtime top-ups. Data bundles are offered at fixed prices as listed.',
      },
      {
        heading: 'Daily Limit',
        body: 'Each account is subject to a daily transaction limit of GHS 30,000. Transactions exceeding this limit will be queued for the next business day or may require additional verification.',
      },
      {
        heading: 'Refund Policy',
        body: 'In the event of a failed transaction caused by Exspend, the equivalent crypto value will be refunded to your designated wallet within 24 hours. Network fees incurred during the original transaction are non-refundable.',
      },
      {
        heading: 'Limitation of Liability',
        body: 'Exspend is not liable for losses arising from incorrect recipient details entered by the user, network delays outside our control, or fluctuations in cryptocurrency market value after order confirmation.',
      },
    ],
  },
  {
    title: 'Privacy Policy',
    icon: '🔒',
    content: [
      {
        heading: 'Information We Collect',
        body: 'We collect your name, email address, phone number, and transaction data (including amounts, recipient details, and crypto assets used) to provide our services.',
      },
      {
        heading: 'How We Use Your Information',
        body: 'Your data is used to process transactions, send order receipts and status updates, and perform KYC (Know Your Customer) verification as required by applicable regulations.',
      },
      {
        heading: 'Data Sharing',
        body: 'We do not sell, rent, or trade your personal data to third parties. Data may be shared with regulated financial partners strictly to fulfil your transaction.',
      },
      {
        heading: 'Data Security',
        body: 'All data is stored securely using industry-standard encryption (AES-256 at rest, TLS 1.3 in transit). We never store cryptocurrency private keys.',
      },
    ],
  },
  {
    title: 'Crypto Disclaimer',
    icon: '₿',
    content: [
      {
        heading: 'Exchange Rate Volatility',
        body: 'Cryptocurrency exchange rates fluctuate continuously. The GHS rate displayed is locked at the time of order creation and is valid for the duration of the payment window only.',
      },
      {
        heading: 'Irreversibility of Transactions',
        body: 'Once cryptocurrency has been sent to the provided wallet address, the transaction cannot be reversed. Please verify all details carefully before sending.',
      },
      {
        heading: 'Wallet Address Accuracy',
        body: 'The user is solely responsible for copying the correct wallet address and selecting the correct network. Sending funds to a wrong address or on the wrong network will result in permanent loss.',
      },
      {
        heading: 'Network Fees',
        body: 'Blockchain network (gas) fees are paid by the sender and are non-refundable under any circumstances.',
      },
    ],
  },
];

function PolicySection({
  title,
  icon,
  content,
}: {
  title: string;
  icon: string;
  content: { heading: string; body: string }[];
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-bold text-green-800">{title}</h2>
      </div>
      <div className="bg-white border border-green-200 rounded-2xl shadow-sm overflow-hidden">
        {content.map((item, i) => (
          <div
            key={i}
            className={`px-6 py-4 ${i < content.length - 1 ? 'border-b border-green-100' : ''}`}
          >
            <p className="font-semibold text-gray-800 text-sm mb-1">{item.heading}</p>
            <p className="text-gray-600 text-sm leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function PoliciesPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-green-900 mb-1">Policies</h1>
      <p className="text-sm text-gray-400 mb-8">Effective: January 1, 2025</p>

      {sections.map((s) => (
        <PolicySection key={s.title} title={s.title} icon={s.icon} content={s.content} />
      ))}

      <p className="text-center text-xs text-gray-400 mt-4">
        By using Exspend, you agree to all policies above. For questions, visit our{' '}
        <a href="/help" className="text-green-700 underline hover:text-green-900">
          Help &amp; Support
        </a>{' '}
        page.
      </p>
    </div>
  );
}
