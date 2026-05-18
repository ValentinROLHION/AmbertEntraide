const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }
  return _transporter;
}

async function sendConfirmationEmail(email, name, token) {
  const baseUrl = process.env.BASE_URL || 'https://ambertentraide-qczolbwwb-valou-s-projects.vercel.app';
  const link = `${baseUrl}/api/auth/verify-email?token=${token}`;

  await getTransporter().sendMail({
    from: `"Ambert Entraide" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Confirmez votre adresse email — Ambert Entraide',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#2d6a4f">Bienvenue sur Ambert Entraide, ${name} !</h2>
        <p>Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte.</p>
        <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2d6a4f;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
          Confirmer mon email
        </a>
        <p style="color:#666;font-size:.85rem">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.</p>
      </div>
    `
  });
}

module.exports = { sendConfirmationEmail };
