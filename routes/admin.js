const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

// ── Dashboard stats ───────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [users, pending, approved, dons, services, actualites] = await Promise.all([
      db.query("SELECT COUNT(*)::int AS n FROM users WHERE role!='admin'"),
      db.query("SELECT COUNT(*)::int AS n FROM annonces WHERE status='pending'"),
      db.query("SELECT COUNT(*)::int AS n FROM annonces WHERE status='approved'"),
      db.query("SELECT COUNT(*)::int AS n FROM annonces WHERE type='don'"),
      db.query("SELECT COUNT(*)::int AS n FROM annonces WHERE type='service'"),
      db.query('SELECT COUNT(*)::int AS n FROM actualites'),
    ]);
    res.json({
      users:          users.rows[0].n,
      pending:        pending.rows[0].n,
      approved:       approved.rows[0].n,
      total_dons:     dons.rows[0].n,
      total_services: services.rows[0].n,
      actualites:     actualites.rows[0].n,
    });
  } catch (e) {
    console.error('GET /admin/stats error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Utilisateurs ─────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id,name,email,code_postal,role,is_active,created_at FROM users WHERE role!='admin' ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (e) {
    console.error('GET /admin/users error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { is_active } = req.body;
    await db.query('UPDATE users SET is_active=$1 WHERE id=$2', [!!is_active, req.params.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('PUT /admin/users/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Envoyer un message à un utilisateur ──────────────────────
router.post('/users/:id/message', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message vide' });

    const userId  = parseInt(req.params.id);
    const adminId = req.user.id;
    if (userId === adminId) return res.status(400).json({ error: 'Impossible' });

    const user = (await db.query('SELECT id FROM users WHERE id = $1', [userId])).rows[0];
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    let conv = (await db.query(
      'SELECT * FROM conversations WHERE annonce_id IS NULL AND demandeur_id = $1 AND proprietaire_id = $2',
      [userId, adminId]
    )).rows[0];

    if (!conv) {
      conv = (await db.query(
        'INSERT INTO conversations (annonce_id, demandeur_id, proprietaire_id) VALUES (NULL, $1, $2) RETURNING *',
        [userId, adminId]
      )).rows[0];
    }

    await db.query(
      'INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1,$2,$3)',
      [conv.id, adminId, content.trim()]
    );
    res.json({ success: true, conv_id: conv.id });
  } catch (e) {
    console.error('POST /admin/users/:id/message error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Annonces ──────────────────────────────────────────────────
router.get('/annonces', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT a.*, u.name AS auteur_name FROM annonces a JOIN users u ON a.user_id = u.id`;
    const params = [];
    if (status) { sql += ' WHERE a.status = $1'; params.push(status); }
    sql += ' ORDER BY a.created_at DESC';

    const annonces = (await db.query(sql, params)).rows;
    const withPhotos = await Promise.all(annonces.map(async a => ({
      ...a,
      photos: (await db.query('SELECT * FROM photos WHERE annonce_id = $1 ORDER BY ordre', [a.id])).rows
    })));
    res.json(withPhotos);
  } catch (e) {
    console.error('GET /admin/annonces error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/annonces/:id', async (req, res) => {
  try {
    const { status, titre, description, categorie, etat } = req.body;
    if (status) {
      await db.query("UPDATE annonces SET status=$1, updated_at=NOW() WHERE id=$2", [status, req.params.id]);
    } else {
      await db.query(
        "UPDATE annonces SET titre=$1, description=$2, categorie=$3, etat=$4, updated_at=NOW() WHERE id=$5",
        [titre, description, categorie, etat || null, req.params.id]
      );
    }
    res.json({ success: true });
  } catch (e) {
    console.error('PUT /admin/annonces/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/annonces/:id', async (req, res) => {
  try {
    await db.query("UPDATE annonces SET status='deleted' WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /admin/annonces/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
