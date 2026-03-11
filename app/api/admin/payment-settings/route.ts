import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/api/lib/jwt';
import { prisma } from '@/app/api/lib/prisma';

function requireAdmin(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const user = token ? verifyToken(token) : null;
  return user?.isAdmin ? user : null;
}

// GET /api/admin/payment-settings — get all admin payment configurations
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const settings = await prisma.adminPaymentSetting.findMany();
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('PAYMENT SETTINGS GET ERROR:', err);
    return NextResponse.json({ error: 'Failed to fetch payment settings' }, { status: 500 });
  }
}

// POST /api/admin/payment-settings — upsert a payment setting
export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      settingType,
      bankName,
      bankAccount,
      bankAcctName,
      momoProvider,
      momoNumber,
      momoAcctName,
      isActive,
    } = body;

    const validTypes = ['bank_details', 'mtn_details', 'telecel_details', 'airteltigo_details'];
    if (!settingType || !validTypes.includes(settingType)) {
      return NextResponse.json(
        { error: `Invalid settingType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const setting = await prisma.adminPaymentSetting.upsert({
      where: { settingType },
      create: {
        settingType,
        bankName: bankName ?? null,
        bankAccount: bankAccount ?? null,
        bankAcctName: bankAcctName ?? null,
        momoProvider: momoProvider ?? null,
        momoNumber: momoNumber ?? null,
        momoAcctName: momoAcctName ?? null,
        isActive: isActive !== undefined ? isActive : true,
      },
      update: {
        ...(bankName !== undefined && { bankName }),
        ...(bankAccount !== undefined && { bankAccount }),
        ...(bankAcctName !== undefined && { bankAcctName }),
        ...(momoProvider !== undefined && { momoProvider }),
        ...(momoNumber !== undefined && { momoNumber }),
        ...(momoAcctName !== undefined && { momoAcctName }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ setting });
  } catch (err) {
    console.error('PAYMENT SETTINGS POST ERROR:', err);
    return NextResponse.json({ error: 'Failed to update payment setting' }, { status: 500 });
  }
}
