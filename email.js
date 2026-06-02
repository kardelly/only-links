import nodemailer from 'nodemailer';

// ── Transport ─────────────────────────────────────────────

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null; // Email not configured — log to console instead
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM_NAME    = process.env.EMAIL_FROM_NAME    || 'OnlyLinks';
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'noreply@onlylinks.id';
const BASE_URL     = process.env.BASE_URL            || 'https://onlylinks.id';

// ── Send helper ───────────────────────────────────────────

async function sendEmail({ to, subject, html, text }) {
  const transport = createTransport();

  if (!transport) {
    // Dev fallback: print to console
    console.log('\n📧 EMAIL (SMTP not configured — would have sent):');
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:    ${text}\n`);
    return;
  }

  await transport.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to,
    subject,
    html,
    text,
  });
}

// ── Templates ─────────────────────────────────────────────

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f9f7f4;
  margin: 0;
  padding: 0;
`;

const cardStyle = `
  max-width: 480px;
  margin: 40px auto;
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e8e4df;
  overflow: hidden;
`;

const headerStyle = `
  background: #1a2a4a;
  padding: 28px 36px;
`;

const bodyStyle = `
  padding: 32px 36px;
  color: #1a1a14;
`;

const mutedStyle = `
  font-size: 14px;
  color: #7a7670;
  line-height: 1.6;
`;

const btnStyle = `
  display: inline-block;
  background: #2d5be3;
  color: #ffffff;
  text-decoration: none;
  padding: 12px 28px;
  border-radius: 980px;
  font-weight: 600;
  font-size: 15px;
  margin: 20px 0;
`;

const footerStyle = `
  padding: 20px 36px;
  border-top: 1px solid #e8e4df;
  font-size: 12px;
  color: #7a7670;
  text-align: center;
`;

function wrapEmail(content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle}">
      <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.02em;">OnlyLinks</span>
    </div>
    <div style="${bodyStyle}">${content}</div>
    <div style="${footerStyle}">
      © ${new Date().getFullYear()} OnlyLinks &nbsp;·&nbsp;
      <a href="${BASE_URL}/privacy" style="color:#7a7670;">Privacy</a> &nbsp;·&nbsp;
      <a href="${BASE_URL}/terms" style="color:#7a7670;">Terms</a>
    </div>
  </div>
</body>
</html>`;
}

// ── Welcome email ─────────────────────────────────────────

export async function sendWelcomeEmail({ to, username }) {
  const subject = `Welcome to OnlyLinks, @${username}`;

  const html = wrapEmail(`
    <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;margin:0 0 8px;">
      Welcome, @${username}.
    </h1>
    <p style="${mutedStyle}">
      Your account is ready. Start saving links, tagging everything, and discovering what people you trust are reading.
    </p>
    <a href="${BASE_URL}/app" style="${btnStyle}">Open OnlyLinks</a>
    <p style="${mutedStyle}">
      A few things to try first:
    </p>
    <ul style="${mutedStyle};padding-left:20px;">
      <li>Save your first link with <strong>+ New bookmark</strong></li>
      <li>Add the <a href="${BASE_URL}/extension" style="color:#2d5be3;">Chrome Extension</a> or <a href="${BASE_URL}/bookmarklet" style="color:#2d5be3;">bookmarklet</a> to save from anywhere</li>
      <li>Make your profile public so others can follow your curation</li>
    </ul>
  `);

  const text = `Welcome to OnlyLinks, @${username}!\n\nYour account is ready.\n\nOpen the app: ${BASE_URL}/app\n\nInstall the extension: ${BASE_URL}/extension`;

  await sendEmail({ to, subject, html, text });
}

// ── Password reset email ──────────────────────────────────

export async function sendPasswordResetEmail({ to, username, resetToken }) {
  const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`;
  const subject  = 'Reset your OnlyLinks password';

  const html = wrapEmail(`
    <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;margin:0 0 8px;">
      Reset your password
    </h1>
    <p style="${mutedStyle}">
      Hi @${username}, we received a request to reset your password.
      Click the button below — this link expires in <strong>1 hour</strong>.
    </p>
    <a href="${resetUrl}" style="${btnStyle}">Reset password</a>
    <p style="${mutedStyle}">
      If you didn't request this, you can safely ignore this email.
      Your password won't change until you click the link above.
    </p>
    <p style="font-size:12px;color:#7a7670;word-break:break-all;margin-top:16px;">
      Or copy this URL: ${resetUrl}
    </p>
  `);

  const text = `Hi @${username},\n\nReset your OnlyLinks password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`;

  await sendEmail({ to, subject, html, text });
}
