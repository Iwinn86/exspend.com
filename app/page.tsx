import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-800 via-green-700 to-lime-500 text-white px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <span className="text-5xl font-extrabold">
              ⚡ <span className="text-lime-400">Ex</span><span className="text-white">spend</span>
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Pay in Ghana Cedis with Crypto
          </h1>
          <p className="text-lg md:text-xl text-green-100 mb-8">
            Ghana&apos;s fastest way to convert crypto to GHS — airtime, data, MoMo and bank transfers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-lime-400 hover:bg-lime-300 text-green-900 font-bold px-8 py-4 rounded-2xl text-lg transition-colors shadow-lg"
            >
              Get Started →
            </Link>
            <Link
              href="/login"
              className="bg-white/20 hover:bg-white/30 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-colors border border-white/40"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-green-50">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-3xl font-bold text-green-900 mb-2">What You Can Do</h2>
          <p className="text-gray-500">Fast, secure, and reliable crypto-to-GHS services</p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center border border-green-100">
            <div className="text-4xl mb-3">💳</div>
            <h3 className="text-xl font-bold text-green-900 mb-2">Spend Crypto</h3>
            <p className="text-gray-500 text-sm">
              Pay for airtime, data bundles, mobile money transfers and bank transfers using your crypto.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center border border-green-100">
            <div className="text-4xl mb-3">📈</div>
            <h3 className="text-xl font-bold text-green-900 mb-2">Buy Crypto</h3>
            <p className="text-gray-500 text-sm">
              Buy BTC, ETH, BNB, USDT and USDC with Ghana Cedis via MoMo or bank transfer.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center border border-green-100">
            <div className="text-4xl mb-3">📉</div>
            <h3 className="text-xl font-bold text-green-900 mb-2">Sell Crypto</h3>
            <p className="text-gray-500 text-sm">
              Sell your crypto and receive Ghana Cedis directly to your MoMo or bank account.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-3xl font-bold text-green-900 mb-2">How It Works</h2>
          <p className="text-gray-500">Simple 3-step process</p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '1', icon: '👤', title: 'Create Account', desc: 'Sign up for free in less than 2 minutes. No complicated forms.' },
            { step: '2', icon: '📋', title: 'Place Order', desc: 'Select your service, enter the amount, and confirm your order.' },
            { step: '3', icon: '✅', title: 'Get Paid', desc: 'Receive your crypto or GHS within minutes — fast and reliable.' },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-14 h-14 bg-green-700 text-white rounded-full text-2xl font-bold flex items-center justify-center mx-auto mb-3">
                {icon}
              </div>
              <div className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Step {step}</div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-6 bg-green-50">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-3xl font-bold text-green-900 mb-2">What Our Customers Say</h2>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Kofi Mensah', text: 'Exspend made it so easy to convert my USDT to airtime. The process was smooth and fast!', stars: 5 },
            { name: 'Ama Owusu', text: 'I love how quickly I receive my MoMo payment when I sell crypto. Best platform in Ghana!', stars: 5 },
            { name: 'Kwame Asante', text: 'Been using Exspend for 6 months. Reliable, fast and the customer support is excellent.', stars: 5 },
          ].map(({ name, text, stars }) => (
            <div key={name} className="bg-white rounded-2xl shadow-sm p-6 border border-green-100">
              <div className="text-yellow-400 text-lg mb-2">{'⭐'.repeat(stars)}</div>
              <p className="text-gray-600 text-sm mb-4 italic">&ldquo;{text}&rdquo;</p>
              <p className="text-green-900 font-bold text-sm">— {name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="py-16 px-6 bg-green-800 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ghana&apos;s #1 Crypto-to-GHS Gateway</h2>
          <p className="text-green-100 mb-6">
            Exspend is trusted by thousands of Ghanaians to convert crypto to local payments instantly.
            Safe, transparent, and always available.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-lime-400 hover:bg-lime-300 text-green-900 font-bold px-8 py-4 rounded-2xl text-lg transition-colors"
          >
            Create Free Account →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-green-900 text-green-200 text-sm py-8 px-6 text-center">
        <p className="mb-2">© 2025 Exspend. Ghana&apos;s Crypto-to-GHS Gateway.</p>
        <p>
          Questions?{' '}
          <a
            href="https://wa.me/233571827900"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lime-400 hover:text-lime-300 font-semibold"
          >
            WhatsApp us: +233 57 182 7900
          </a>
        </p>
      </footer>
    </main>
  );
}
