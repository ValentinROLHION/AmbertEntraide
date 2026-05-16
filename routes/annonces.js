const express = require('express');
const multer  = require('multer');
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');
const { uploadFile } = require('../lib/storage');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  }
});

// ── GET /annonces ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { type, categorie, search, limit } = req.query;
    let sql = `SELECT a.*, u.name AS auteur_name
               FROM annonces a JOIN users u ON a.user_id = u.id
               WHERE a.status = 'approved'`;
    const params = [];
    let idx = 1;

    if (type)                              { sql += ` AND a.type = $${idx++}`;                                          params.push(type); }
    if (categorie && categorie !== 'Tous') { sql += ` AND a.categorie = $${idx++}`;                                    params.push(categorie); }
    if (search)                            { sql += ` AND (a.titre ILIKE $${idx} OR a.description ILIKE $${idx+1})`; params.push(`%${search}%`, `%${search}%`); idx += 2; }

    sql += ' ORDER BY a.created_at DESC';
    if (limit) { sql += ` LIMIT $${idx++}`; params.push(parseInt(limit)); }

    const annonces = (await db.query(sql, params)).rows;
    const withPhotos = await Promise.all(annonces.map(async a => ({
      ...a,
      photos: (await db.query('SELECT * FROM photos WHERE annonce_id = $1 ORDER BY ordre', [a.id])).rows
    })));
    res.json(withPhotos);
  } catch (e) {
    console.error('GET /annonces error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /annonces/:id ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, u.name AS auteur_name
      FROM annonces a JOIN users u ON a.user_id = u.id
      WHERE a.id = $1 AND a.status = 'approved'
    `, [req.params.id]);
    const annonce = result.rows[0];
    if (!annonce) return res.status(404).json({ error: 'Annonce introuvable' });
    annonce.photos = (await db.query('SELECT * FROM photos WHERE annonce_id = $1 ORDER BY ordre', [annonce.id])).rows;
    res.json(annonce);
  } catch (e) {
    console.error('GET /annonces/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /annonces ───────────────────────────────────────────
router.post('/', requireAuth, upload.array('photos', 5), async (req, res) => {
  try {
    const { type, titre, description, categorie, etat } = req.body;
    if (!type || !titre || !description || !categorie)
      return res.status(400).json({ error: 'Champs requis manquants' });

    const result = await db.query(
      'INSERT INTO annonces (user_id, type, titre, description, categorie, etat) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [req.user.id, type, titre, description, categorie, etat || null]
    );
    const id = result.rows[0].id;

    if (req.files?.length) {
      await Promise.all(req.files.map(async (f, i) => {
        const { publicUrl } = await uploadFile('annonces', f.buffer, f.originalname, f.mimetype);
        await db.query('INSERT INTO photos (annonce_id, filename, ordre) VALUES ($1,$2,$3)', [id, publicUrl, i]);
      }));
    }

    res.status(201).json({ id, message: "Annonce soumise — en attente de validation par l'administration." });
  } catch (e) {
    console.error('POST /annonces error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
