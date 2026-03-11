# ⚡ Exspend

Exspend is a Ghana-based crypto-to-GHS payment gateway. Users (mostly foreigners visiting Ghana) pay with crypto and the platform operator sends GHS to their specified bank, MoMo, airtime, or data recipient.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Email**: Resend
- **Styling**: Tailwind CSS v4
- **Crypto Prices**: CoinGecko free API (no key required)
- **Deployment**: Vercel + Neon (PostgreSQL)

---

## Features

- 💳 **Spend** — Bank transfer, Mobile Money (MTN/Telecel/AirtelTigo), Airtime top-up, Data bundles
- 📈 **Buy Crypto** — Purchase BTC/BNB/ETH/USDT/USDC with GHS
- 📉 **Sell Crypto** — Sell any crypto for GHS via MoMo or bank transfer
- 🔐 **KYC** — Document verification for higher transaction limits
- ⚙️ **Admin Panel** — Orders management, wallet settings, exchange rates, data bundles manager, help tickets
- 📧 **Email Notifications** — Order confirmation, status updates, password reset
- 🎫 **Help Tickets** — In-app support ticket system

---

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/your-org/exspend.git
cd exspend
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL` — Your PostgreSQL connection string
- `JWT_SECRET` — A long random string (e.g. `openssl rand -hex 32`)
- `RESEND_API_KEY` — Get from [resend.com](https://resend.com) (optional for dev)
- `NEXT_PUBLIC_APP_URL` — Your domain (e.g. `https://exspend.com`)

### 3. Set Up Database

```bash
# Run migrations
npx prisma migrate dev --name init

# Seed initial data (wallet settings, exchange rate, data bundles)
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Admin Access

Create an account with email `admin@exspend.com` — it will automatically get admin privileges.

Admin panel: `/admin`

---

## How to Add New Data Bundles

**Via Admin Panel:**
1. Log in as admin → `/admin/rates`
2. Scroll to "Data Bundles Manager"
3. Select the network tab (MTN / Telecel / AirtelTigo)
4. Click "Add Bundle" and fill in the label and price

**Via Database seed:**
Edit `prisma/seed.ts` and add bundles to the appropriate network array, then run `npm run db:seed`.

---

## Deployment (Vercel + Neon)

### 1. Create Neon Database
- Go to [neon.tech](https://neon.tech)
- Create a new project
- Copy the connection string

### 2. Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### 3. Set Environment Variables in Vercel
In the Vercel dashboard → Settings → Environment Variables, add:
- `DATABASE_URL` (from Neon)
- `JWT_SECRET`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL`

### 4. Run Migrations on Production
```bash
DATABASE_URL="<your-neon-url>" npx prisma migrate deploy
DATABASE_URL="<your-neon-url>" npm run db:seed
```

---

## Project Structure

```
app/
├── api/              # API routes
│   ├── auth/         # Login, register, forgot/reset password
│   ├── orders/       # Order CRUD
│   ├── settings/     # Wallet settings + exchange rates
│   ├── rates/        # Exchange rate history
│   ├── bundles/      # Data bundles (public)
│   ├── crypto-prices/# Live prices from CoinGecko
│   ├── kyc/          # KYC submissions
│   ├── help/         # Support tickets
│   ├── admin/        # Admin-only endpoints
│   └── lib/          # Shared utilities (prisma, jwt, email)
├── admin/            # Admin dashboard pages
├── spend/            # Spend service pages
├── buy/              # Buy crypto page
├── sell/             # Sell crypto page
├── orders/           # Order list + detail pages
├── help/             # Help & support page
├── policies/         # Terms, Privacy, Disclaimer
├── forgot-password/  # Password reset request
├── reset-password/   # Password reset form
└── lib/              # Client-side utilities
prisma/
├── schema.prisma     # Database schema
└── seed.ts           # Initial data seed
```

---

## License

Private — All rights reserved.
