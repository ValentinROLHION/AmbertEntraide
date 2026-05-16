const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── Liste des conversations ───────────────────────────────────
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const convs = (await db.query(`
      SELECT
        c.*,
        COALESCE(a.titre, 'Message direct') AS annonce_titre,
        COALESCE(a.type,  'system')          AS annonce_type,
        u1.name   AS demandeur_name,
        u1.avatar AS demandeur_avatar,
        u2.name   AS proprietaire_name,
        u2.avatar AS proprietaire_avatar,
        (SELECT content    FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
        (SELECT COUNT(*)   FROM messages WHERE conversation_id = c.id AND lu = false AND sender_id != $1)::int AS unread_count
      FROM conversations c
      LEFT JOIN annonces a ON c.annonce_id = a.id
      JOIN users u1 ON c.demandeur_id    = u1.id
      JOIN users u2 ON c.proprietaire_id = u2.id
      WHERE c.demandeur_id = $2 OR c.proprietaire_id = $3
      ORDER BY COALESCE(
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1),
        c.created_at
      ) DESC
    `, [uid, uid, uid])).rows;
    res.json(convs);
  } catch (e) {
    console.error('GET /conversations error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Créer ou récupérer une conversation ──────────────────────
router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const { annonce_id } = req.body;
    if (!annonce_id) return res.status(400).json({ error: 'annonce_id requis' });

    const annonce = (await db.query("SELECT * FROM annonces WHERE id = $1 AND status = 'approved'", [annonce_id])).rows[0];
    if (!annonce) return res.status(404).json({ error: 'Annonce introuvable' });
    if (annonce.user_id === req.user.id)
      return res.status(400).json({ error: 'Vous ne pouvez pas vous contacter vous-même' });

    let conv = (await db.query(
      'SELECT * FROM conversations WHERE annonce_id = $1 AND demandeur_id = $2',
      [annonce_id, req.user.id]
    )).rows[0];

    if (!conv) {
      conv = (await db.query(
        'INSERT INTO conversations (annonce_id, demandeur_id, proprietaire_id) VALUES ($1,$2,$3) RETURNING *',
        [annonce_id, req.user.id, annonce.user_id]
      )).rows[0];
    }

    res.json(conv);
  } catch (e) {
    console.error('POST /conversations error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Messages d'une conversation ──────────────────────────────
router.get('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const uid  = req.user.id;
    const conv = (await db.query('SELECT * FROM conversations WHERE id = $1', [req.params.id])).rows[0];
    if (!conv) return res.status(404).json({ error: 'Conversation introuvable' });
    if (conv.demandeur_id !== uid && conv.proprietaire_id !== uid)
      return res.status(403).json({ error: 'Accès refusé' });

    await db.query('UPDATE messages SET lu = true WHERE conversation_id = $1 AND sender_id != $2', [req.params.id, uid]);

    const messages = (await db.query(`
      SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
      FROM messages m JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1 ORDER BY m.created_at ASC
    `, [req.params.id])).rows;

    const annonce = conv.annonce_id
      ? (await db.query('SELECT id, titre, type FROM annonces WHERE id = $1', [conv.annonce_id])).rows[0]
      : { id: null, titre: 'Message direct', type: 'system' };

    const other_user = (await db.query(
      'SELECT id, name, avatar FROM users WHERE id = $1',
      [conv.demandeur_id === uid ? conv.proprietaire_id : conv.demandeur_id]
    )).rows[0];

    res.json({ conv, messages, annonce, other_user });
  } catch (e) {
    console.error('GET /conversations/:id error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Envoyer un message ────────────────────────────────────────
router.post('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message vide' });

    const uid  = req.user.id;
    const conv = (await db.query('SELECT * FROM conversations WHERE id = $1', [req.params.id])).rows[0];
    if (!conv) return res.status(404).json({ error: 'Conversation introuvable' });
    if (conv.demandeur_id !== uid && conv.proprietaire_id !== uid)
      return res.status(403).json({ error: 'Accès refusé' });

    const result = await db.query(
      'INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1,$2,$3) RETURNING id',
      [conv.id, uid, content.trim()]
    );
    const id = result.rows[0].id;

    const msg = (await db.query(`
      SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
      FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = $1
    `, [id])).rows[0];

    res.status(201).json(msg);
  } catch (e) {
    console.error('POST /conversations/:id error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Compteur de non-lus ───────────────────────────────────────
router.get('/unread', requireAuth, async (req, res) => {
  try {
    const uid = req.user.id;
    const result = await db.query(`
      SELECT COUNT(*)::int AS n FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE (c.demandeur_id = $1 OR c.proprietaire_id = $2)
        AND m.sender_id != $3 AND m.lu = false
    `, [uid, uid, uid]);
    res.json({ count: result.rows[0].n });
  } catch (e) {
    console.error('GET /unread error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
