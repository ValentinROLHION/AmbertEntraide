const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { getSupabase } = require('../lib/supabase');
const { SECRET } = require('../middleware/auth');
const { sendConfirmationEmail } = require('../lib/mailer');

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

    try {
      await sendConfirmationEmail(email, name, emailToken);
    } catch (mailErr) {
      console.error('Email send error:', mailErr.message);
    }

    res.json({ message: 'Inscription réussie ! Vérifiez votre email pour activer votre compte.' });
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
