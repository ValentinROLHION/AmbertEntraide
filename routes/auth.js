const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, code_postal } = req.body;
    if (!name || !email || !password || !code_postal)
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    if (!code_postal.startsWith('63'))
      return res.status(400).json({ error: 'Service réservé aux habitants du Puy-de-Dôme (63)' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Mot de passe trop court (8 caractères minimum)' });

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0])
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, code_postal) VALUES ($1,$2,$3,$4) RETURNING id',
      [name, email, hash, code_postal]
    );
    const id = result.rows[0].id;

    const token = jwt.sign({ id, name, email, role: 'user' }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, name, email, role: 'user' } });
  } catch (e) {
    console.error('register error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    if (!user.is_active)
      return res.status(403).json({ error: "Compte désactivé. Contactez l'administration." });

    const { id, name, role } = user;
    const token = jwt.sign({ id, name, email, role }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, name, email, role } });
  } catch (e) {
    console.error('login error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
