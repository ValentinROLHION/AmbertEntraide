const express = require('express');
const multer  = require('multer');
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');
const { uploadFile, deleteFile } = require('../lib/storage');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  }
});

// ── GET profil ────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, code_postal, role, is_active, avatar, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(result.rows[0]);
  } catch (e) {
    console.error('GET /profile error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PUT avatar ────────────────────────────────────────────────
router.put('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucune image fournie' });

    const user = (await db.query('SELECT avatar FROM users WHERE id = $1', [req.user.id])).rows[0];
    if (user?.avatar) await deleteFile('avatars', user.avatar);

    const { publicUrl } = await uploadFile('avatars', req.file.buffer, req.file.originalname, req.file.mimetype);
    await db.query('UPDATE users SET avatar = $1 WHERE id = $2', [publicUrl, req.user.id]);
    res.json({ avatar: publicUrl });
  } catch (e) {
    console.error('PUT /profile/avatar error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET mes annonces ──────────────────────────────────────────
router.get('/annonces', requireAuth, async (req, res) => {
  try {
    const annonces = (await db.query(`
      SELECT a.*,
        (SELECT COUNT(*) FROM conversations c WHERE c.annonce_id = a.id)::int AS nb_conversations,
        (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id
         WHERE c.annonce_id = a.id AND m.lu = false AND m.sender_id != $1)::int AS unread_count
      FROM annonces a
      WHERE a.user_id = $2 AND a.status != 'deleted'
      ORDER BY a.created_at DESC
    `, [req.user.id, req.user.id])).rows;

    const withPhotos = await Promise.all(annonces.map(async a => ({
      ...a,
      photos: (await db.query('SELECT * FROM photos WHERE annonce_id = $1 ORDER BY ordre', [a.id])).rows
    })));
    res.json(withPhotos);
  } catch (e) {
    console.error('GET /profile/annonces error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── DELETE mon annonce ────────────────────────────────────────
router.delete('/annonces/:id', requireAuth, async (req, res) => {
  try {
    const annonce = (await db.query('SELECT user_id FROM annonces WHERE id = $1', [req.params.id])).rows[0];
    if (!annonce) return res.status(404).json({ error: 'Annonce introuvable' });
    if (annonce.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });
    await db.query("UPDATE annonces SET status = 'deleted' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /profile/annonces/:id error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PUT modifier mon annonce ──────────────────────────────────
router.put('/annonces/:id', requireAuth, upload.array('photos', 5), async (req, res) => {
  try {
    const annonce = (await db.query('SELECT user_id FROM annonces WHERE id = $1', [req.params.id])).rows[0];
    if (!annonce) return res.status(404).json({ error: 'Annonce introuvable' });
    if (annonce.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

    const { titre, description, categorie, etat, delete_photos } = req.body;
    if (!titre || !description) return res.status(400).json({ error: 'Titre et description requis' });

    await db.query(
      `UPDATE annonces SET titre=$1, description=$2, categorie=$3, etat=$4, status='pending', updated_at=NOW() WHERE id=$5`,
      [titre, description, categorie, etat || null, req.params.id]
    );

    // Suppression des photos cochées
    if (delete_photos) {
      const ids = JSON.parse(delete_photos);
      await Promise.all(ids.map(async pid => {
        const photo = (await db.query('SELECT * FROM photos WHERE id = $1 AND annonce_id = $2', [pid, req.params.id])).rows[0];
        if (photo) {
          await deleteFile('annonces', photo.filename);
          await db.query('DELETE FROM photos WHERE id = $1', [pid]);
        }
      }));
    }

    // Ajout de nouvelles photos
    if (req.files?.length) {
      const maxRes = await db.query('SELECT COALESCE(MAX(ordre),0) AS m FROM photos WHERE annonce_id=$1', [req.params.id]);
      const maxOrdre = Number(maxRes.rows[0].m);
      await Promise.all(req.files.map(async (f, i) => {
        const { publicUrl } = await uploadFile('annonces', f.buffer, f.originalname, f.mimetype);
        await db.query('INSERT INTO photos (annonce_id, filename, ordre) VALUES ($1,$2,$3)', [req.params.id, publicUrl, maxOrdre + i + 1]);
      }));
    }

    const photos = (await db.query('SELECT * FROM photos WHERE annonce_id = $1 ORDER BY ordre', [req.params.id])).rows;
    res.json({ success: true, photos });
  } catch (e) {
    console.error('PUT /profile/annonces/:id error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
