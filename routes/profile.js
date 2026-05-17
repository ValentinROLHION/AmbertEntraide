const express = require('express');
const multer  = require('multer');
const { getSupabase } = require('../lib/supabase');
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
    const sb = getSupabase();
    const { data, error } = await sb
      .from('users')
      .select('id,name,email,code_postal,role,is_active,avatar,created_at')
      .eq('id', req.user.id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(data);
  } catch (e) {
    console.error('GET /profile error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PUT avatar ────────────────────────────────────────────────
router.put('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const sb = getSupabase();
    if (!req.file) return res.status(400).json({ error: 'Aucune image fournie' });

    const { data: user, error: fetchErr } = await sb.from('users').select('avatar').eq('id', req.user.id).single();
    if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;
    if (user?.avatar) await deleteFile('avatars', user.avatar);

    const { publicUrl } = await uploadFile('avatars', req.file.buffer, req.file.originalname, req.file.mimetype);
    const { error } = await sb.from('users').update({ avatar: publicUrl }).eq('id', req.user.id);
    if (error) throw error;

    res.json({ avatar: publicUrl });
  } catch (e) {
    console.error('PUT /profile/avatar error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET mes annonces ──────────────────────────────────────────
router.get('/annonces', requireAuth, async (req, res) => {
  try {
    const sb = getSupabase();
    const uid = req.user.id;

    const { data: annonces, error: annoncesErr } = await sb
      .from('annonces')
      .select('*')
      .eq('user_id', uid)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });
    if (annoncesErr) throw annoncesErr;

    if (!annonces.length) return res.json([]);

    const ids = annonces.map(a => a.id);

    // Fetch conversation counts per annonce
    const { data: convData, error: convErr } = await sb
      .from('conversations')
      .select('annonce_id')
      .in('annonce_id', ids);
    if (convErr) throw convErr;

    const convCountByAnnonce = {};
    for (const c of convData) {
      convCountByAnnonce[c.annonce_id] = (convCountByAnnonce[c.annonce_id] || 0) + 1;
    }

    // Get all conversation IDs for these annonces to find unread messages
    const { data: convRows, error: convRowsErr } = await sb
      .from('conversations')
      .select('id,annonce_id')
      .in('annonce_id', ids);
    if (convRowsErr) throw convRowsErr;

    const convIds = convRows.map(c => c.id);
    const convAnnonceMap = {};
    for (const c of convRows) convAnnonceMap[c.id] = c.annonce_id;

    let unreadByAnnonce = {};
    if (convIds.length) {
      const { data: unreadData, error: unreadErr } = await sb
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('lu', false)
        .neq('sender_id', uid);
      if (unreadErr) throw unreadErr;

      for (const m of unreadData) {
        const aid = convAnnonceMap[m.conversation_id];
        if (aid) unreadByAnnonce[aid] = (unreadByAnnonce[aid] || 0) + 1;
      }
    }

    // Fetch all photos for these annonces
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
      nb_conversations: convCountByAnnonce[a.id] || 0,
      unread_count:     unreadByAnnonce[a.id]    || 0,
      photos:           photosByAnnonce[a.id]    || []
    }));

    res.json(withPhotos);
  } catch (e) {
    console.error('GET /profile/annonces error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── DELETE mon annonce ────────────────────────────────────────
router.delete('/annonces/:id', requireAuth, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: annonce, error: fetchErr } = await sb.from('annonces').select('user_id').eq('id', req.params.id).single();
    if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;
    if (!annonce) return res.status(404).json({ error: 'Annonce introuvable' });
    if (annonce.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

    const { error } = await sb.from('annonces').update({ status: 'deleted' }).eq('id', req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /profile/annonces/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PUT modifier mon annonce ──────────────────────────────────
router.put('/annonces/:id', requireAuth, upload.array('photos', 5), async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: annonce, error: fetchErr } = await sb.from('annonces').select('user_id').eq('id', req.params.id).single();
    if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;
    if (!annonce) return res.status(404).json({ error: 'Annonce introuvable' });
    if (annonce.user_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

    const { titre, description, categorie, etat, delete_photos } = req.body;
    if (!titre || !description) return res.status(400).json({ error: 'Titre et description requis' });

    const { error: updateErr } = await sb.from('annonces').update({
      titre,
      description,
      categorie,
      etat: etat || null,
      status: 'pending',
      updated_at: new Date().toISOString()
    }).eq('id', req.params.id);
    if (updateErr) throw updateErr;

    // Suppression des photos cochées
    if (delete_photos) {
      const ids = JSON.parse(delete_photos);
      for (const pid of ids) {
        const { data: photo, error: photoFetchErr } = await sb
          .from('photos')
          .select('*')
          .eq('id', pid)
          .eq('annonce_id', req.params.id)
          .single();
        if (photoFetchErr && photoFetchErr.code !== 'PGRST116') throw photoFetchErr;
        if (photo) {
          await deleteFile('annonces', photo.filename);
          const { error: photoDelErr } = await sb.from('photos').delete().eq('id', pid);
          if (photoDelErr) throw photoDelErr;
        }
      }
    }

    // Ajout de nouvelles photos
    if (req.files?.length) {
      const { data: maxRes, error: maxErr } = await sb
        .from('photos')
        .select('ordre')
        .eq('annonce_id', req.params.id)
        .order('ordre', { ascending: false })
        .limit(1);
      if (maxErr) throw maxErr;
      const maxOrdre = maxRes?.length ? Number(maxRes[0].ordre) : 0;

      for (let i = 0; i < req.files.length; i++) {
        const f = req.files[i];
        const { publicUrl } = await uploadFile('annonces', f.buffer, f.originalname, f.mimetype);
        const { error: photoInsErr } = await sb.from('photos').insert({
          annonce_id: req.params.id,
          filename: publicUrl,
          ordre: maxOrdre + i + 1
        });
        if (photoInsErr) throw photoInsErr;
      }
    }

    const { data: photos, error: photosErr } = await sb
      .from('photos')
      .select('*')
      .eq('annonce_id', req.params.id)
      .order('ordre');
    if (photosErr) throw photosErr;

    res.json({ success: true, photos });
  } catch (e) {
    console.error('PUT /profile/annonces/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
