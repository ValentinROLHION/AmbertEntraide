-- ============================================================
-- AmbertEntraide — Schéma PostgreSQL pour Supabase
-- À coller dans : Supabase → SQL Editor → New query → Run
-- ============================================================

-- ── Utilisateurs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT    NOT NULL,
  email         TEXT    UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL,
  code_postal   TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'user',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  avatar        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Annonces ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS annonces (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  type        TEXT    NOT NULL CHECK(type IN ('don','service')),
  titre       TEXT    NOT NULL,
  description TEXT    NOT NULL,
  categorie   TEXT    NOT NULL,
  etat        TEXT,
  status      TEXT    NOT NULL DEFAULT 'pending'
                      CHECK(status IN ('pending','approved','rejected','deleted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Photos des annonces ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS photos (
  id         SERIAL PRIMARY KEY,
  annonce_id INTEGER NOT NULL REFERENCES annonces(id) ON DELETE CASCADE,
  filename   TEXT    NOT NULL,   -- URL publique Supabase Storage
  ordre      INTEGER NOT NULL DEFAULT 0
);

-- ── Actualités ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS actualites (
  id         SERIAL PRIMARY KEY,
  titre      TEXT    NOT NULL,
  extrait    TEXT    NOT NULL,
  contenu    TEXT,
  categorie  TEXT    NOT NULL,
  icon       TEXT    NOT NULL DEFAULT '📰',
  featured   BOOLEAN NOT NULL DEFAULT false,
  auteur     TEXT    NOT NULL,
  published  BOOLEAN NOT NULL DEFAULT true,
  image      TEXT,              -- URL publique Supabase Storage
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Conversations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id              SERIAL PRIMARY KEY,
  annonce_id      INTEGER REFERENCES annonces(id),   -- NULL = message direct admin
  demandeur_id    INTEGER NOT NULL REFERENCES users(id),
  proprietaire_id INTEGER NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index unique : une seule conversation par (annonce, demandeur) sauf pour les NULL
CREATE UNIQUE INDEX IF NOT EXISTS convs_annonce_demandeur
  ON conversations (annonce_id, demandeur_id)
  WHERE annonce_id IS NOT NULL;

-- ── Messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       INTEGER NOT NULL REFERENCES users(id),
  content         TEXT    NOT NULL,
  lu              BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Compte administrateur (à exécuter séparément) ────────────
-- Remplacez le hash par celui généré par seed-admin.js
-- INSERT INTO users (name, email, password_hash, code_postal, role)
-- VALUES ('Administrateur', 'admin@ambert-entraide.fr', '<HASH>', '63600', 'admin');
