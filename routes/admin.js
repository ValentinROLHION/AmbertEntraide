const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

// ── Dashboard stats ───────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const sb = getSupabase();
    const [
      { count: users,      error: e1 },
      { count: pending,    error: e2 },
      { count: approved,   error: e3 },
      { count: dons,       error: e4 },
      { count: services,   error: e5 },
      { count: actualites, error: e6 },
    ] = await Promise.all([
      sb.from('users').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
      sb.from('annonces').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('annonces').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      sb.from('annonces').select('*', { count: 'exact', head: true }).eq('type', 'don'),
      sb.from('annonces').select('*', { count: 'exact', head: true }).eq('type', 'service'),
      sb.from('actualites').select('*', { count: 'exact', head: true }),
    ]);
    for (const err of [e1, e2, e3, e4, e5, e6]) { if (err) throw err; }

    res.json({
      users,
      pending,
      approved,
      total_dons:     dons,
      total_services: services,
      actualites,
    });
  } catch (e) {
    console.error('GET /admin/stats error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Utilisateurs ─────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('users')
      .select('id,name,email,code_postal,role,is_active,created_at')
      .neq('role', 'admin')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('GET /admin/users error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { is_active } = req.body;
    const { error } = await sb.from('users').update({ is_active: !!is_active }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('PUT /admin/users/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Envoyer un message à un utilisateur ──────────────────────
router.post('/users/:id/message', async (req, res) => {
  try {
    const sb = getSupabase();
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message vide' });

    const userId  = parseInt(req.params.id);
    const adminId = req.user.id;
    if (userId === adminId) return res.status(400).json({ error: 'Impossible' });

    const { data: user, error: userErr } = await sb.from('users').select('id').eq('id', userId).single();
    if (userErr && userErr.code !== 'PGRST116') throw userErr;
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const { data: existingConv, error: convFetchErr } = await sb
      .from('conversations')
      .select('*')
      .is('annonce_id', null)
      .eq('demandeur_id', userId)
      .eq('proprietaire_id', adminId)
      .single();
    if (convFetchErr && convFetchErr.code !== 'PGRST116') throw convFetchErr;

    let conv = existingConv;
    if (!conv) {
      const { data: newConv, error: convInsertErr } = await sb
        .from('conversations')
        .insert({ annonce_id: null, demandeur_id: userId, proprietaire_id: adminId })
        .select('*')
        .single();
      if (convInsertErr) throw convInsertErr;
      conv = newConv;
    }

    const { error: msgErr } = await sb.from('messages').insert({
      conversation_id: conv.id,
      sender_id: adminId,
      content: content.trim()
    });
    if (msgErr) throw msgErr;

    res.json({ success: true, conv_id: conv.id });
  } catch (e) {
    console.error('POST /admin/users/:id/message error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Annonces ──────────────────────────────────────────────────
router.get('/annonces', async (req, res) => {
  try {
    const sb = getSupabase();
    const { status } = req.query;

    let query = sb.from('annonces').select('*, users!user_id(name)');
    if (status) query = query.eq('status', status);
    query = query.order('created_at', { ascending: false });

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
    console.error('GET /admin/annonces error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/annonces/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { status, titre, description, categorie, etat } = req.body;

    let updateData;
    if (status) {
      updateData = { status, updated_at: new Date().toISOString() };
    } else {
      updateData = { titre, description, categorie, etat: etat || null, updated_at: new Date().toISOString() };
    }

    const { error } = await sb.from('annonces').update(updateData).eq('id', req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (e) {
    console.error('PUT /admin/annonces/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/annonces/:id', async (req, res) => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('annonces').update({ status: 'deleted' }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /admin/annonces/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
