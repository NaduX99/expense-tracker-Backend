const nodemailer = require('nodemailer');

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransporter() {
  if (!hasSmtpConfig()) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendWelcomeEmail({ to, fullName }) {
  const appName = process.env.APP_NAME || 'GREEN FINANCE';
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const from = process.env.MAIL_FROM || `"${appName}" <${process.env.SMTP_USER || 'no-reply@greenfinance.local'}>`;
  const transporter = createTransporter();

  const message = {
    from,
    to,
    subject: `Welcome to ${appName}`,
    text: [
      `Hi ${fullName},`,
      '',
      `Your ${appName} account was created successfully.`,
      'You can now log in and start tracking expenses, budgets, income, and monthly insights.',
      '',
      `Login: ${loginUrl}`,
      '',
      'Thank you,',
      `${appName} Team`
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;background:#f6f8fb;padding:28px;color:#0f172a;">
        <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:16px;padding:28px;border:1px solid #e2e8f0;">
          <h1 style="margin:0 0 12px;color:#16a34a;">Welcome to ${appName}</h1>
          <p style="font-size:16px;line-height:1.6;">Hi ${fullName},</p>
          <p style="font-size:16px;line-height:1.6;">Your account was created successfully. You can now track expenses, manage budgets, compare income, and review monthly insights.</p>
          <a href="${loginUrl}" style="display:inline-block;margin-top:14px;background:#22c55e;color:#020617;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">Open Dashboard</a>
          <p style="margin-top:24px;color:#64748b;font-size:13px;">If you did not create this account, please ignore this email.</p>
        </div>
      </div>
    `
  };

  if (!transporter) {
    console.log(`[SIMULATED EMAIL] Welcome email to ${to}`);
    console.log(message.text);
    return { sent: false, simulated: true };
  }

  await transporter.sendMail(message);
  return { sent: true, simulated: false };
}

async function sendPasswordResetEmail({ to, fullName, resetUrl }) {
  const appName = process.env.APP_NAME || 'GREEN FINANCE';
  const from = process.env.MAIL_FROM || `"${appName}" <${process.env.SMTP_USER || 'no-reply@greenfinance.local'}>`;
  const transporter = createTransporter();

  const message = {
    from,
    to,
    subject: `${appName} password reset`,
    text: [
      `Hi ${fullName || 'there'},`,
      '',
      `Use this link to reset your ${appName} password:`,
      resetUrl,
      '',
      'This link expires in 30 minutes.',
      'If you did not request this, you can ignore this email.',
      '',
      `${appName} Team`
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;background:#f6f8fb;padding:28px;color:#0f172a;">
        <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:16px;padding:28px;border:1px solid #e2e8f0;">
          <h1 style="margin:0 0 12px;color:#16a34a;">Reset your password</h1>
          <p style="font-size:16px;line-height:1.6;">Hi ${fullName || 'there'},</p>
          <p style="font-size:16px;line-height:1.6;">Click the button below to create a new password. This link expires in 30 minutes.</p>
          <a href="${resetUrl}" style="display:inline-block;margin-top:14px;background:#22c55e;color:#020617;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">Reset Password</a>
          <p style="margin-top:24px;color:#64748b;font-size:13px;">If you did not request this, please ignore this email.</p>
        </div>
      </div>
    `
  };

  if (!transporter) {
    console.log(`[SIMULATED EMAIL] Password reset email to ${to}`);
    console.log(message.text);
    return { sent: false, simulated: true };
  }

  await transporter.sendMail(message);
  return { sent: true, simulated: false };
}

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail
};
