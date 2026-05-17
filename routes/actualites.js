const express = require('express');
const multer  = require('multer');
const { getSupabase } = require('../lib/supabase');
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
    const sb = getSupabase();
    const { categorie, featured, limit } = req.query;

    let query = sb.from('actualites').select('*').eq('published', true);

    if (categorie && categorie !== 'Toutes') query = query.eq('categorie', categorie);
    if (featured === '1') query = query.eq('featured', true);

    query = query.order('created_at', { ascending: false });
    if (limit) query = query.limit(parseInt(limit));

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('GET /actualites error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const sb = getSupabase();
    const { titre, extrait, contenu, categorie, icon, featured, auteur, published } = req.body;
    if (!titre || !extrait || !categorie || !auteur)
      return res.status(400).json({ error: 'Champs requis manquants' });

    const isFeatured = featured === 'true' || featured === '1';
    if (isFeatured) {
      const { error: resetErr } = await sb.from('actualites').update({ featured: false }).neq('id', 0);
      if (resetErr) throw resetErr;
    }

    let image = null;
    if (req.file) {
      const { publicUrl } = await uploadFile('actualites', req.file.buffer, req.file.originalname, req.file.mimetype);
      image = publicUrl;
    }

    const { data, error } = await sb.from('actualites').insert({
      titre,
      extrait,
      contenu: contenu || null,
      categorie,
      icon: icon || '📰',
      featured: isFeatured,
      auteur,
      published: published !== 'false',
      image
    }).select('id').single();
    if (error) throw error;

    res.status(201).json({ id: data.id });
  } catch (e) {
    console.error('POST /actualites error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const sb = getSupabase();
    const { titre, extrait, contenu, categorie, icon, featured, auteur, published } = req.body;
    const isFeatured = featured === 'true' || featured === '1';

    if (isFeatured) {
      const { error: resetErr } = await sb.from('actualites').update({ featured: false }).neq('id', req.params.id);
      if (resetErr) throw resetErr;
    }

    const { data: existing, error: fetchErr } = await sb.from('actualites').select('image').eq('id', req.params.id).single();
    if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;

    let image = existing?.image || null;
    if (req.file) {
      if (image) await deleteFile('actualites', image);
      const { publicUrl } = await uploadFile('actualites', req.file.buffer, req.file.originalname, req.file.mimetype);
      image = publicUrl;
    }

    const { error } = await sb.from('actualites').update({
      titre,
      extrait,
      contenu: contenu || null,
      categorie,
      icon: icon || '📰',
      featured: isFeatured,
      auteur,
      published: published !== 'false',
      image
    }).eq('id', req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (e) {
    console.error('PUT /actualites/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: actu, error: fetchErr } = await sb.from('actualites').select('image').eq('id', req.params.id).single();
    if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;

    if (actu?.image) await deleteFile('actualites', actu.image);

    const { error } = await sb.from('actualites').delete().eq('id', req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /actualites/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
