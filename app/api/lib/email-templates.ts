// app/api/lib/email-templates.ts

export function orderConfirmationEmail(params: {
  userName: string;
  orderId: string;
  service: string;
  amount: number;
  cryptoAmount: string;
  crypto: string;
  walletAddress: string;
  recipient: string;
  recipientName: string;
  reference?: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #14532d; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #a3e635; margin: 0; font-size: 24px;">⚡ Exspend</h1>
        <p style="color: white; margin: 8px 0 0 0; font-size: 14px;">Order Confirmation</p>
      </div>
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #374151; font-size: 16px;">Hi <strong>${params.userName}</strong>,</p>
        <p style="color: #374151;">Your order has been received! Please send the crypto amount below to complete your transaction.</p>
        
        <div style="background: white; border: 1px solid #d1fae5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #14532d; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="color: #6b7280; padding: 4px 0;">Order ID</td><td style="color: #111827; font-weight: bold; text-align: right;">#${params.orderId.slice(0,8).toUpperCase()}</td></tr>
            <tr><td style="color: #6b7280; padding: 4px 0;">Service</td><td style="color: #111827; text-align: right;">${params.service}</td></tr>
            <tr><td style="color: #6b7280; padding: 4px 0;">Recipient</td><td style="color: #111827; text-align: right;">${params.recipient}</td></tr>
            <tr><td style="color: #6b7280; padding: 4px 0;">Name</td><td style="color: #111827; text-align: right;">${params.recipientName}</td></tr>
            <tr><td style="color: #6b7280; padding: 4px 0;">GHS Amount</td><td style="color: #111827; font-weight: bold; text-align: right;">GHS ${params.amount.toFixed(2)}</td></tr>
            ${params.reference ? `<tr><td style="color: #6b7280; padding: 4px 0;">Reference</td><td style="color: #111827; text-align: right;">${params.reference}</td></tr>` : ''}
          </table>
        </div>

        <div style="background: #fefce8; border: 2px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 14px;">💸 Send This Payment</h3>
          <p style="color: #92400e; margin: 0; font-size: 22px; font-weight: bold;">${params.cryptoAmount} ${params.crypto}</p>
          <p style="color: #78350f; margin: 8px 0 0 0; font-size: 13px;">To wallet address:</p>
          <p style="color: #111827; margin: 4px 0 0 0; font-size: 12px; background: white; padding: 8px; border-radius: 4px; word-break: break-all; font-family: monospace;">${params.walletAddress}</p>
        </div>

        <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">⏱ Once your payment is confirmed, we'll process your order within 5–30 minutes.</p>
        <p style="color: #6b7280; font-size: 13px;">Need help? Reply to this email or visit <a href="https://exspend.com/help" style="color: #16a34a;">exspend.com/help</a></p>
      </div>
      <div style="background: #f3f4f6; padding: 12px; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2026 Exspend. Ghana's crypto-to-GHS gateway.</p>
      </div>
    </div>
  `;
}

export function orderStatusUpdateEmail(params: {
  userName: string;
  orderId: string;
  service: string;
  amount: number;
  status: 'processing' | 'successful' | 'failed';
}): string {
  const statusConfig = {
    processing: { emoji: '⏳', color: '#1d4ed8', label: 'Processing', message: 'We have received your crypto payment and are processing your order.' },
    successful: { emoji: '✅', color: '#16a34a', label: 'Successful', message: 'Your payment has been processed successfully!' },
    failed: { emoji: '❌', color: '#dc2626', label: 'Failed', message: 'Unfortunately, your order could not be processed. Please contact support for a resolution.' },
  };
  const cfg = statusConfig[params.status];
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #14532d; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #a3e635; margin: 0; font-size: 24px;">⚡ Exspend</h1>
        <p style="color: white; margin: 8px 0 0 0; font-size: 14px;">Order Status Update</p>
      </div>
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #374151; font-size: 16px;">Hi <strong>${params.userName}</strong>,</p>
        <div style="text-align: center; padding: 16px;">
          <span style="font-size: 48px;">${cfg.emoji}</span>
          <h2 style="color: ${cfg.color}; margin: 8px 0 0 0;">Order ${cfg.label}</h2>
        </div>
        <p style="color: #374151; text-align: center;">${cfg.message}</p>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
          <p style="color: #6b7280; font-size: 13px; margin: 0;">Order #${params.orderId.slice(0,8).toUpperCase()} · ${params.service} · GHS ${params.amount.toFixed(2)}</p>
        </div>
        <p style="color: #6b7280; font-size: 13px; text-align: center;">Visit <a href="https://exspend.com/orders" style="color: #16a34a;">your orders page</a> to view details.</p>
      </div>
      <div style="background: #f3f4f6; padding: 12px; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2026 Exspend. Ghana's crypto-to-GHS gateway.</p>
      </div>
    </div>
  `;
}

export function passwordResetEmail(params: {
  userName: string;
  resetLink: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #14532d; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #a3e635; margin: 0; font-size: 24px;">⚡ Exspend</h1>
        <p style="color: white; margin: 8px 0 0 0; font-size: 14px;">Password Reset</p>
      </div>
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #374151; font-size: 16px;">Hi <strong>${params.userName}</strong>,</p>
        <p style="color: #374151;">You requested a password reset for your Exspend account. Click the button below to set a new password.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${params.resetLink}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Reset My Password</a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">This link expires in <strong>1 hour</strong>.</p>
        <p style="color: #6b7280; font-size: 13px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">Or copy this link: <a href="${params.resetLink}" style="color: #16a34a; word-break: break-all;">${params.resetLink}</a></p>
      </div>
      <div style="background: #f3f4f6; padding: 12px; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2026 Exspend. Ghana's crypto-to-GHS gateway.</p>
      </div>
    </div>
  `;
}

export function adminNewOrderEmail(params: {
  orderId: string;
  service: string;
  amount: number;
  cryptoAmount: string;
  crypto: string;
  recipient: string;
  recipientName: string;
  userName: string;
  userEmail: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #14532d; padding: 16px 20px; border-radius: 8px 8px 0 0;">
        <h2 style="color: #a3e635; margin: 0;">⚡ New Order — Action Required</h2>
      </div>
      <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="color: #374151;">A new order has been placed and is awaiting processing.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 12px 0;">
          <tr style="background: #f9fafb;"><td style="color: #6b7280; padding: 8px 12px; border: 1px solid #e5e7eb;">Order ID</td><td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold;">#${params.orderId.slice(0,8).toUpperCase()}</td></tr>
          <tr><td style="color: #6b7280; padding: 8px 12px; border: 1px solid #e5e7eb;">Service</td><td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${params.service}</td></tr>
          <tr style="background: #f9fafb;"><td style="color: #6b7280; padding: 8px 12px; border: 1px solid #e5e7eb;">GHS Amount</td><td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-weight: bold; color: #16a34a;">GHS ${params.amount.toFixed(2)}</td></tr>
          <tr><td style="color: #6b7280; padding: 8px 12px; border: 1px solid #e5e7eb;">Crypto</td><td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${params.cryptoAmount} ${params.crypto}</td></tr>
          <tr style="background: #f9fafb;"><td style="color: #6b7280; padding: 8px 12px; border: 1px solid #e5e7eb;">Recipient</td><td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${params.recipient} (${params.recipientName})</td></tr>
          <tr><td style="color: #6b7280; padding: 8px 12px; border: 1px solid #e5e7eb;">Customer</td><td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${params.userName} &lt;${params.userEmail}&gt;</td></tr>
        </table>
        <a href="https://exspend.com/admin/orders" style="display: inline-block; background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">View in Admin →</a>
      </div>
    </div>
  `;
}
