const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { getSupabase } = require('../lib/supabase');
const { SECRET } = require('../middleware/auth');
const { sendConfirmationEmail } = require('../lib/mailer');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const sb = getSupabase();
    const { name, email, password, code_postal } = req.body;
    if (!name || !email || !password || !code_postal)
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    if (!code_postal.startsWith('63'))
      return res.status(400).json({ error: 'Service réservé aux habitants du Puy-de-Dôme (63)' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Mot de passe trop court (8 caractères minimum)' });

    const { data: existing } = await sb.from('users').select('id').eq('email', email).single();
    if (existing)
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });

    const hash = await bcrypt.hash(password, 10);
    const emailToken = crypto.randomBytes(32).toString('hex');

    const { data, error } = await sb.from('users').insert({
      name,
      email,
      password_hash: hash,
      code_postal,
      email_verified: false,
      email_token: emailToken
    }).select('id').single();
    if (error) throw error;

    let emailSent = false;
    try {
      await sendConfirmationEmail(email, name, emailToken);
      emailSent = true;
      console.log(`Confirmation email sent to ${email}`);
    } catch (mailErr) {
      console.error('Email send error:', mailErr.message, '| GMAIL_USER:', process.env.GMAIL_USER, '| HAS_PASSWORD:', !!process.env.GMAIL_APP_PASSWORD);
    }

    res.json({
      message: emailSent
        ? 'Inscription réussie ! Vérifiez votre email pour activer votre compte.'
        : 'Inscription réussie ! (Email de confirmation non envoyé — contactez contactambertentraide@gmail.com pour activer votre compte.)'
    });
  } catch (e) {
    console.error('register error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const sb = getSupabase();
    const { token } = req.query;
    if (!token) return res.status(400).send('Token manquant.');

    const { data: user, error } = await sb
      .from('users')
      .select('id,email_verified')
      .eq('email_token', token)
      .single();

    if (error || !user) return res.status(400).send('Lien invalide ou expiré.');
    if (user.email_verified) return res.redirect('/?verified=already');

    const { error: updateErr } = await sb
      .from('users')
      .update({ email_verified: true, email_token: null })
      .eq('id', user.id);
    if (updateErr) throw updateErr;

    res.redirect('/?verified=1');
  } catch (e) {
    console.error('verify-email error:', e.message);
    res.status(500).send('Erreur serveur.');
  }
});

router.post('/google', async (req, res) => {
  try {
    const sb = getSupabase();
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Token Google manquant' });

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const { email, name, sub: googleId } = ticket.getPayload();

    // Find or create user
    const { data: existing } = await sb.from('users').select('*').eq('email', email).single();

    let user;
    if (existing) {
      if (!existing.is_active) return res.status(403).json({ error: "Compte désactivé. Contactez l'administration." });
      user = existing;
    } else {
      const { data: created, error: createErr } = await sb.from('users').insert({
        name,
        email,
        password_hash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
        code_postal: '63000',
        email_verified: true,
        google_id: googleId
      }).select('*').single();
      if (createErr) throw createErr;
      user = created;
    }

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    console.error('google auth error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const sb = getSupabase();
    const { email, password } = req.body;

    const { data: user, error } = await sb.from('users').select('*').eq('email', email).single();
    if (error && error.code !== 'PGRST116') throw error;

    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    if (!user.is_active)
      return res.status(403).json({ error: "Compte désactivé. Contactez l'administration." });
    if (user.email_verified === false)
      return res.status(403).json({ error: 'Veuillez confirmer votre adresse email avant de vous connecter.' });

    const { id, name, role } = user;
    const token = jwt.sign({ id, name, email, role }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, name, email, role } });
  } catch (e) {
    console.error('login error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
