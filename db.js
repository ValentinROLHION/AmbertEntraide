const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL manquante — vérifiez les variables d\'environnement Vercel');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

// Test de connexion au démarrage
pool.query('SELECT 1').then(() => {
  console.log('✅ Base de données connectée');
}).catch(err => {
  console.error('❌ Erreur connexion DB:', err.message);
});

module.exports = pool;
