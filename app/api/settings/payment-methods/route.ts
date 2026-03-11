import { NextResponse } from 'next/server';
import { prisma } from '@/app/api/lib/prisma';

// GET /api/settings/payment-methods — public endpoint to get active payment method config for UI
export async function GET() {
  try {
    const settings = await prisma.adminPaymentSetting.findMany({
      where: { isActive: true },
    });

    const result: Record<string, unknown> = {};
    for (const s of settings) {
      result[s.settingType] = s;
    }

    return NextResponse.json({ paymentMethods: result });
  } catch {
    return NextResponse.json({ paymentMethods: {} });
  }
}
