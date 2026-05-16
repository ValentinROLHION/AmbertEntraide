/**
 * Crée le compte administrateur dans Supabase.
 * Usage : DATABASE_URL=... node seed-admin.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  const hash = await bcrypt.hash('Admin1234!', 10);

  const existing = await pool.query("SELECT id FROM users WHERE role='admin'");
  if (existing.rows.length > 0) {
    console.log('✅ Admin existe déjà — aucune action.');
    await pool.end();
    return;
  }

  await pool.query(
    "INSERT INTO users (name, email, password_hash, code_postal, role) VALUES ($1,$2,$3,$4,$5)",
    ['Administrateur', 'admin@ambert-entraide.fr', hash, '63600', 'admin']
  );
  console.log('✅ Admin créé → admin@ambert-entraide.fr / Admin1234!');
  console.log('⚠️  Changez le mot de passe après la première connexion !');
  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
