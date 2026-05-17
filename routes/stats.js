const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [dons, services, users] = await Promise.all([
      db.query("SELECT COUNT(*)::int AS n FROM annonces WHERE type='don'    AND status!='deleted'"),
      db.query("SELECT COUNT(*)::int AS n FROM annonces WHERE type='service' AND status!='deleted'"),
      db.query("SELECT COUNT(*)::int AS n FROM users WHERE is_active=true AND role='user'"),
    ]);
    res.json({
      total_dons_ever:     dons.rows[0].n,
      total_services_ever: services.rows[0].n,
      active_users:        users.rows[0].n,
    });
  } catch (e) {
    console.error('GET /stats error:', e.message);
    res.status(500).json({ error: e.message, db_url_set: !!process.env.DATABASE_URL });
  }
});

module.exports = router;
