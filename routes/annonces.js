const express = require('express');
const multer  = require('multer');
const { getSupabase } = require('../lib/supabase');
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
    const sb = getSupabase();
    const { type, categorie, search, limit } = req.query;

    let query = sb
      .from('annonces')
      .select('*, users!user_id(name)')
      .eq('status', 'approved');

    if (type)                              query = query.eq('type', type);
    if (categorie && categorie !== 'Tous') query = query.eq('categorie', categorie);
    if (search)                            query = query.or(`titre.ilike.%${search}%,description.ilike.%${search}%`);

    query = query.order('created_at', { ascending: false });
    if (limit) query = query.limit(parseInt(limit));

    const { data, error } = await query;
    if (error) throw error;

    const annonces = data.map(a => ({
      ...a,
      auteur_name: a.users?.name,
      users: undefined
    }));

    if (!annonces.length) return res.json([]);

    const ids = annonces.map(a => a.id);
    const { data: photos, error: photosErr } = await sb
      .from('photos')
      .select('*')
      .in('annonce_id', ids)
      .order('ordre');
    if (photosErr) throw photosErr;

    const photosByAnnonce = {};
    for (const p of photos) {
      if (!photosByAnnonce[p.annonce_id]) photosByAnnonce[p.annonce_id] = [];
      photosByAnnonce[p.annonce_id].push(p);
    }

    const withPhotos = annonces.map(a => ({
      ...a,
      photos: photosByAnnonce[a.id] || []
    }));

    res.json(withPhotos);
  } catch (e) {
    console.error('GET /annonces error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /annonces/:id ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('annonces')
      .select('*, users!user_id(name)')
      .eq('id', req.params.id)
      .eq('status', 'approved')
      .single();

    if (error && error.code === 'PGRST116') return res.status(404).json({ error: 'Annonce introuvable' });
    if (error) throw error;

    const annonce = { ...data, auteur_name: data.users?.name, users: undefined };

    const { data: photos, error: photosErr } = await sb
      .from('photos')
      .select('*')
      .eq('annonce_id', annonce.id)
      .order('ordre');
    if (photosErr) throw photosErr;

    annonce.photos = photos;
    res.json(annonce);
  } catch (e) {
    console.error('GET /annonces/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /annonces ───────────────────────────────────────────
router.post('/', requireAuth, upload.array('photos', 5), async (req, res) => {
  try {
    const sb = getSupabase();
    const { type, titre, description, categorie, etat } = req.body;
    if (!type || !titre || !description || !categorie)
      return res.status(400).json({ error: 'Champs requis manquants' });

    const { data, error } = await sb.from('annonces').insert({
      user_id: req.user.id,
      type,
      titre,
      description,
      categorie,
      etat: etat || null
    }).select('id').single();
    if (error) throw error;

    const id = data.id;

    if (req.files?.length) {
      for (let i = 0; i < req.files.length; i++) {
        const f = req.files[i];
        const { publicUrl } = await uploadFile('annonces', f.buffer, f.originalname, f.mimetype);
        const { error: photoErr } = await sb.from('photos').insert({ annonce_id: id, filename: publicUrl, ordre: i });
        if (photoErr) throw photoErr;
      }
    }

    res.status(201).json({ id, message: "Annonce soumise — en attente de validation par l'administration." });
  } catch (e) {
    console.error('POST /annonces error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
