const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── Liste des conversations ───────────────────────────────────
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const sb = getSupabase();
    const uid = req.user.id;

    const { data: convs, error: convsErr } = await sb
      .from('conversations')
      .select('*, annonces(titre,type), demandeur:users!demandeur_id(name,avatar), proprietaire:users!proprietaire_id(name,avatar)')
      .or(`demandeur_id.eq.${uid},proprietaire_id.eq.${uid}`);
    if (convsErr) throw convsErr;

    if (!convs.length) return res.json([]);

    const convIds = convs.map(c => c.id);

    // Fetch all messages for these conversations in one query
    const { data: allMessages, error: msgsErr } = await sb
      .from('messages')
      .select('conversation_id,content,created_at,lu,sender_id')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });
    if (msgsErr) throw msgsErr;

    // Group messages by conversation
    const msgsByConv = {};
    for (const m of allMessages) {
      if (!msgsByConv[m.conversation_id]) msgsByConv[m.conversation_id] = [];
      msgsByConv[m.conversation_id].push(m);
    }

    const result = convs.map(c => {
      const msgs = msgsByConv[c.id] || [];
      const lastMsg = msgs[0]; // already ordered desc
      const unread_count = msgs.filter(m => !m.lu && m.sender_id !== uid).length;

      return {
        ...c,
        annonce_titre:       c.annonces?.titre   || 'Message direct',
        annonce_type:        c.annonces?.type    || 'system',
        demandeur_name:      c.demandeur?.name,
        demandeur_avatar:    c.demandeur?.avatar,
        proprietaire_name:   c.proprietaire?.name,
        proprietaire_avatar: c.proprietaire?.avatar,
        last_message:        lastMsg?.content    || null,
        last_message_at:     lastMsg?.created_at || c.created_at,
        unread_count,
        annonces:     undefined,
        demandeur:    undefined,
        proprietaire: undefined,
      };
    });

    result.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
    res.json(result);
  } catch (e) {
    console.error('GET /conversations error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Créer ou récupérer une conversation ──────────────────────
router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const sb = getSupabase();
    const { annonce_id } = req.body;
    if (!annonce_id) return res.status(400).json({ error: 'annonce_id requis' });

    const { data: annonce, error: annonceErr } = await sb
      .from('annonces')
      .select('*')
      .eq('id', annonce_id)
      .eq('status', 'approved')
      .single();
    if (annonceErr && annonceErr.code !== 'PGRST116') throw annonceErr;
    if (!annonce) return res.status(404).json({ error: 'Annonce introuvable' });
    if (annonce.user_id === req.user.id)
      return res.status(400).json({ error: 'Vous ne pouvez pas vous contacter vous-même' });

    const { data: existingConv, error: convFetchErr } = await sb
      .from('conversations')
      .select('*')
      .eq('annonce_id', annonce_id)
      .eq('demandeur_id', req.user.id)
      .single();
    if (convFetchErr && convFetchErr.code !== 'PGRST116') throw convFetchErr;

    if (existingConv) return res.json(existingConv);

    const { data: newConv, error: convInsertErr } = await sb
      .from('conversations')
      .insert({ annonce_id, demandeur_id: req.user.id, proprietaire_id: annonce.user_id })
      .select('*')
      .single();
    if (convInsertErr) throw convInsertErr;

    res.json(newConv);
  } catch (e) {
    console.error('POST /conversations error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Messages d'une conversation ──────────────────────────────
router.get('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const sb = getSupabase();
    const uid = req.user.id;

    const { data: conv, error: convErr } = await sb
      .from('conversations')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (convErr && convErr.code !== 'PGRST116') throw convErr;
    if (!conv) return res.status(404).json({ error: 'Conversation introuvable' });
    if (conv.demandeur_id !== uid && conv.proprietaire_id !== uid)
      return res.status(403).json({ error: 'Accès refusé' });

    // Mark messages as read
    const { error: markErr } = await sb
      .from('messages')
      .update({ lu: true })
      .eq('conversation_id', req.params.id)
      .neq('sender_id', uid);
    if (markErr) throw markErr;

    const { data: rawMessages, error: msgsErr } = await sb
      .from('messages')
      .select('*, sender:users!sender_id(name,avatar)')
      .eq('conversation_id', req.params.id)
      .order('created_at', { ascending: true });
    if (msgsErr) throw msgsErr;

    const messages = rawMessages.map(m => ({
      ...m,
      sender_name:   m.sender?.name,
      sender_avatar: m.sender?.avatar,
      sender:        undefined
    }));

    const annonce = conv.annonce_id
      ? await (async () => {
          const { data, error } = await sb.from('annonces').select('id,titre,type').eq('id', conv.annonce_id).single();
          if (error && error.code !== 'PGRST116') throw error;
          return data || { id: null, titre: 'Message direct', type: 'system' };
        })()
      : { id: null, titre: 'Message direct', type: 'system' };

    const otherId = conv.demandeur_id === uid ? conv.proprietaire_id : conv.demandeur_id;
    const { data: other_user, error: otherErr } = await sb
      .from('users')
      .select('id,name,avatar')
      .eq('id', otherId)
      .single();
    if (otherErr && otherErr.code !== 'PGRST116') throw otherErr;

    res.json({ conv, messages, annonce, other_user });
  } catch (e) {
    console.error('GET /conversations/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Envoyer un message ────────────────────────────────────────
router.post('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const sb = getSupabase();
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message vide' });

    const uid = req.user.id;
    const { data: conv, error: convErr } = await sb
      .from('conversations')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (convErr && convErr.code !== 'PGRST116') throw convErr;
    if (!conv) return res.status(404).json({ error: 'Conversation introuvable' });
    if (conv.demandeur_id !== uid && conv.proprietaire_id !== uid)
      return res.status(403).json({ error: 'Accès refusé' });

    const { data: inserted, error: insertErr } = await sb
      .from('messages')
      .insert({ conversation_id: conv.id, sender_id: uid, content: content.trim() })
      .select('id')
      .single();
    if (insertErr) throw insertErr;

    const { data: rawMsg, error: msgErr } = await sb
      .from('messages')
      .select('*, sender:users!sender_id(name,avatar)')
      .eq('id', inserted.id)
      .single();
    if (msgErr) throw msgErr;

    const msg = {
      ...rawMsg,
      sender_name:   rawMsg.sender?.name,
      sender_avatar: rawMsg.sender?.avatar,
      sender:        undefined
    };

    res.status(201).json(msg);
  } catch (e) {
    console.error('POST /conversations/:id error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Compteur de non-lus ───────────────────────────────────────
router.get('/unread', requireAuth, async (req, res) => {
  try {
    const sb = getSupabase();
    const uid = req.user.id;

    // Get all conversation IDs the user belongs to
    const { data: convRows, error: convErr } = await sb
      .from('conversations')
      .select('id')
      .or(`demandeur_id.eq.${uid},proprietaire_id.eq.${uid}`);
    if (convErr) throw convErr;

    if (!convRows.length) return res.json({ count: 0 });

    const convIds = convRows.map(c => c.id);
    const { count, error: countErr } = await sb
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .neq('sender_id', uid)
      .eq('lu', false);
    if (countErr) throw countErr;

    res.json({ count: count || 0 });
  } catch (e) {
    console.error('GET /unread error:', e.message, e.code, e.stack?.split('\n')[0]);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
