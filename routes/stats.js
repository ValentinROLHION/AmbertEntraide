const express = require('express');
const { getSupabase } = require('../lib/supabase');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const sb = getSupabase();
    const [r1, r2, r3] = await Promise.all([
      sb.from('annonces').select('*', { count: 'exact', head: true }).neq('status', 'deleted').eq('type', 'don'),
      sb.from('annonces').select('*', { count: 'exact', head: true }).neq('status', 'deleted').eq('type', 'service'),
      sb.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('role', 'user'),
    ]);
    if (r1.error) throw r1.error;
    if (r2.error) throw r2.error;
    if (r3.error) throw r3.error;
    res.json({
      total_dons_ever:     r1.count ?? 0,
      total_services_ever: r2.count ?? 0,
      active_users:        r3.count ?? 0,
    });
  } catch (e) {
    console.error('GET /stats error:', e.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
