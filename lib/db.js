const { createClient } = require('@supabase/supabase-js');

let _client = null;

function getClient() {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { auth: { persistSession: false } }
    );
  }
  return _client;
}

/**
 * Compatibilité avec l'ancienne API `db.query(sql, params)`.
 * Passe par la fonction RPC `exec_sql` créée dans Supabase.
 */
async function query(sql, params = []) {
  const sb = getClient();
  const { data, error } = await sb.rpc('exec_sql', { sql_query: sql, sql_params: params });
  if (error) throw new Error(error.message);
  return { rows: data ?? [] };
}

module.exports = { query };
