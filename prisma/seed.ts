import { PrismaClient } from '@prisma/client';
import { DEFAULT_WALLET_ADDRESSES } from '@/app/lib/crypto';

const prisma = new PrismaClient();

const MTN_BUNDLES = [
  { label: '1GB - 1 Day', priceGhs: 7, sortOrder: 1 },
  { label: '2GB - 2 Days', priceGhs: 12, sortOrder: 2 },
  { label: '3GB - 7 Days', priceGhs: 18, sortOrder: 3 },
  { label: '5GB - 7 Days', priceGhs: 25, sortOrder: 4 },
  { label: '10GB - 30 Days', priceGhs: 45, sortOrder: 5 },
  { label: '20GB - 30 Days', priceGhs: 80, sortOrder: 6 },
  { label: '50GB - 30 Days', priceGhs: 180, sortOrder: 7 },
  { label: '100GB - 30 Days', priceGhs: 320, sortOrder: 8 },
];

const TELECEL_BUNDLES = [
  { label: '1GB - 1 Day', priceGhs: 7, sortOrder: 1 },
  { label: '2GB - 2 Days', priceGhs: 12, sortOrder: 2 },
  { label: '3GB - 7 Days', priceGhs: 17, sortOrder: 3 },
  { label: '5GB - 7 Days', priceGhs: 23, sortOrder: 4 },
  { label: '10GB - 30 Days', priceGhs: 42, sortOrder: 5 },
  { label: '20GB - 30 Days', priceGhs: 75, sortOrder: 6 },
  { label: '50GB - 30 Days', priceGhs: 170, sortOrder: 7 },
  { label: '100GB - 30 Days', priceGhs: 300, sortOrder: 8 },
];

const AIRTELTIGO_BUNDLES = [
  { label: '1GB - 1 Day', priceGhs: 6, sortOrder: 1 },
  { label: '2GB - 2 Days', priceGhs: 11, sortOrder: 2 },
  { label: '3GB - 7 Days', priceGhs: 16, sortOrder: 3 },
  { label: '5GB - 7 Days', priceGhs: 22, sortOrder: 4 },
  { label: '10GB - 30 Days', priceGhs: 40, sortOrder: 5 },
  { label: '20GB - 30 Days', priceGhs: 72, sortOrder: 6 },
  { label: '50GB - 30 Days', priceGhs: 160, sortOrder: 7 },
  { label: '100GB - 30 Days', priceGhs: 290, sortOrder: 8 },
];

async function main() {
  console.log('Seeding database...');

  // Seed wallet settings singleton
  await prisma.walletSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      USDT_TRC20: DEFAULT_WALLET_ADDRESSES.USDT_TRC20,
      USDT_BEP20: DEFAULT_WALLET_ADDRESSES.USDT_BEP20,
      USDT_POLYGON: DEFAULT_WALLET_ADDRESSES.USDT_POLYGON,
      USDC_BEP20: DEFAULT_WALLET_ADDRESSES.USDC_BEP20,
      USDC_POLYGON: DEFAULT_WALLET_ADDRESSES.USDC_POLYGON,
      BTC: DEFAULT_WALLET_ADDRESSES.BTC,
      BNB: DEFAULT_WALLET_ADDRESSES.BNB,
      ETH: DEFAULT_WALLET_ADDRESSES.ETH,
      BINANCE_PAY: DEFAULT_WALLET_ADDRESSES.BINANCE_PAY,
      BYBIT_PAY: DEFAULT_WALLET_ADDRESSES.BYBIT_PAY,
    },
  });
  console.log('Wallet settings seeded.');

  // Seed initial exchange rate
  const existingRate = await prisma.exchangeRate.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!existingRate) {
    await prisma.exchangeRate.create({
      data: { ghsPerUsd: 15.5, setByAdmin: 'system', note: 'Initial seed rate' },
    });
    console.log('Exchange rate seeded.');
  }

  // Seed MTN bundles
  const mtnCount = await prisma.dataBundle.count({ where: { network: 'MTN' } });
  if (mtnCount === 0) {
    await prisma.dataBundle.createMany({
      data: MTN_BUNDLES.map(b => ({ ...b, network: 'MTN' })),
    });
    console.log('MTN bundles seeded.');
  }

  // Seed Telecel bundles
  const telecelCount = await prisma.dataBundle.count({ where: { network: 'Telecel' } });
  if (telecelCount === 0) {
    await prisma.dataBundle.createMany({
      data: TELECEL_BUNDLES.map(b => ({ ...b, network: 'Telecel' })),
    });
    console.log('Telecel bundles seeded.');
  }

  // Seed AirtelTigo bundles
  const airteltigoCount = await prisma.dataBundle.count({ where: { network: 'AirtelTigo' } });
  if (airteltigoCount === 0) {
    await prisma.dataBundle.createMany({
      data: AIRTELTIGO_BUNDLES.map(b => ({ ...b, network: 'AirtelTigo' })),
    });
    console.log('AirtelTigo bundles seeded.');
  }

  console.log('Seeding complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
