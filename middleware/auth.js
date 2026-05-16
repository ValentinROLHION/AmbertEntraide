const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'ambert-entraide-secret-2026';

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentification requise' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    next();
  });
}

module.exports = { requireAuth, requireAdmin, SECRET };
