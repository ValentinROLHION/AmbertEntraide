const express = require('express');
const multer  = require('multer');
const db      = require('../db');
const { requireAdmin } = require('../middleware/auth');
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

router.get('/', async (req, res) => {
  try {
    const { categorie, featured, limit } = req.query;
    let sql = 'SELECT * FROM actualites WHERE published = true';
    const params = [];
    let idx = 1;

    if (categorie && categorie !== 'Toutes') { sql += ` AND categorie = $${idx++}`; params.push(categorie); }
    if (featured === '1') { sql += ' AND featured = true'; }
    sql += ' ORDER BY created_at DESC';
    if (limit) { sql += ` LIMIT $${idx++}`; params.push(parseInt(limit)); }

    res.json((await db.query(sql, params)).rows);
  } catch (e) {
    console.error('GET /actualites error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { titre, extrait, contenu, categorie, icon, featured, auteur, published } = req.body;
    if (!titre || !extrait || !categorie || !auteur)
      return res.status(400).json({ error: 'Champs requis manquants' });

    const isFeatured = featured === 'true' || featured === '1';
    if (isFeatured) await db.query('UPDATE actualites SET featured = false');

    let image = null;
    if (req.file) {
      const { publicUrl } = await uploadFile('actualites', req.file.buffer, req.file.originalname, req.file.mimetype);
      image = publicUrl;
    }

    const result = await db.query(
      'INSERT INTO actualites (titre, extrait, contenu, categorie, icon, featured, auteur, published, image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [titre, extrait, contenu || null, categorie, icon || '📰', isFeatured, auteur, published !== 'false', image]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (e) {
    console.error('POST /actualites error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { titre, extrait, contenu, categorie, icon, featured, auteur, published } = req.body;
    const isFeatured = featured === 'true' || featured === '1';
    if (isFeatured) await db.query('UPDATE actualites SET featured = false WHERE id != $1', [req.params.id]);

    const existing = (await db.query('SELECT image FROM actualites WHERE id = $1', [req.params.id])).rows[0];
    let image = existing?.image || null;
    if (req.file) {
      if (image) await deleteFile('actualites', image);
      const { publicUrl } = await uploadFile('actualites', req.file.buffer, req.file.originalname, req.file.mimetype);
      image = publicUrl;
    }

    await db.query(
      `UPDATE actualites SET titre=$1, extrait=$2, contenu=$3, categorie=$4, icon=$5, featured=$6, auteur=$7, published=$8, image=$9 WHERE id=$10`,
      [titre, extrait, contenu || null, categorie, icon || '📰', isFeatured, auteur, published !== 'false', image, req.params.id]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('PUT /actualites/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const actu = (await db.query('SELECT image FROM actualites WHERE id = $1', [req.params.id])).rows[0];
    if (actu?.image) await deleteFile('actualites', actu.image);
    await db.query('DELETE FROM actualites WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /actualites/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
