// ===== STATE =====
const state = {
  page: 'accueil',
  user: null,
  filterDon: 'Tous',
  filterService: 'Tous',
  filterActu: 'Toutes',
  searchDon: '',
  searchService: '',
  adminTab: 'annonces',
  adminAnnonceStatus: 'pending',
  profileTab: 'annonces',
  cache: { dons: [], services: [], actualites: [] }
};

// ===== UTILS =====
function $(id) { return document.getElementById(id); }

function showToast(msg, type = 'success') {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = `toast toast-${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ICONS = {
  'Mobilier':'🛋️','Électroménager':'🔌','Vêtements':'👕','Livres & BD':'📚',
  'Jeux & Jouets':'🎲','Sport & Loisirs':'🏃','Enfants & Bébés':'👶',
  'Aide quotidienne':'🤝','Transport':'🚗','Cours & Formation':'📐',
  'Jardinage':'🌿','Informatique':'💻','Animaux':'🐾','Travaux':'🔧',
};
function getIcon(cat, type) { return ICONS[cat] || (type === 'don' ? '📦' : '🤝'); }
function initiales(name) { return (name||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase(); }
// Gère les URLs Supabase Storage (https://...) et les anciens chemins locaux (/uploads/...)
function imgSrc(url, localPrefix) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return '/uploads/' + (localPrefix ? localPrefix + '/' : '') + url;
}

// ===== NAVIGATION =====
function navigate(page) {
  if (page === 'admin' && (!state.user || state.user.role !== 'admin')) { return; }
  state.page = page;
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  const fab = document.querySelector('.fab');
  if (fab) fab.style.display = (page === 'dons' || page === 'services') ? 'flex' : 'none';
  $('nav').classList.remove('open');
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== RENDER =====
let _renderId = 0;
async function render() {
  const rid = ++_renderId;
  const app = $('app');
  app.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;

  let html = '';
  try {
    switch (state.page) {
      case 'accueil':    html = await renderAccueil();    break;
      case 'dons':       html = await renderDons();       break;
      case 'services':   html = await renderServices();   break;
      case 'actualites': html = await renderActualites(); break;
      case 'admin':      html = await renderAdmin();      break;
      case 'profile':    html = await renderProfile();    break;
      default:           html = await renderAccueil();
    }
  } catch (err) {
    html = `<div class="empty-state container" style="padding:80px 24px">
      <div class="empty-icon">⚠️</div>
      <h3>Erreur de chargement</h3>
      <p>${err.message}</p>
    </div>`;
  }

  if (rid !== _renderId) return; // stale render
  app.innerHTML = html;
  bindPageEvents();
}

// ===== PAGE ACCUEIL =====
async function renderAccueil() {
  const [stats, dons, services, actus] = await Promise.all([
    api.getStats(),
    api.getAnnonces({ type: 'don', limit: 3 }),
    api.getAnnonces({ type: 'service', limit: 3 }),
    api.getActualites({ limit: 4 }),
  ]);
  state.cache.dons = dons;
  state.cache.services = services;
  state.cache.actualites = actus;

  const featuredActu = actus.find(a => a.featured) || actus[0];
  const recentActus  = actus.filter(a => !a.featured).slice(0, 3);

  return `
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-content">
          <div class="hero-badge">📍 Ambert — Puy-de-Dôme</div>
          <h1>Donnez, partagez,<br><em>entraidez-vous</em></h1>
          <p>La plateforme gratuite des habitantes et habitants d'Ambert pour donner des objets et échanger des services en toute simplicité.</p>
          <div class="hero-actions">
            <button class="btn btn-amber btn-lg" data-page="dons">Voir les dons</button>
            <button class="btn btn-outline btn-lg" style="border-color:rgba(255,255,255,.5);color:#fff;" data-page="services">Trouver un service</button>
          </div>
          <div class="hero-stats">
            <div class="stat-card">
              <div class="stat-num">${stats.total_dons_ever}</div>
              <div class="stat-label">Objets donnés</div>
            </div>
            <div class="stat-card">
              <div class="stat-num">${stats.total_services_ever}</div>
              <div class="stat-label">Services proposés</div>
            </div>
            <div class="stat-card">
              <div class="stat-num">${stats.active_users}</div>
              <div class="stat-label">Habitants inscrits</div>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          ${dons.slice(0,3).map(d => `
            <div class="mini-card">
              <div class="mini-card-icon">${getIcon(d.categorie,'don')}</div>
              <div class="mini-card-text">
                <strong>${d.titre}</strong>
                <span>📍 Ambert · ${formatDate(d.created_at)}</span>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </section>

    ${featuredActu ? `
    <section class="section">
      <div class="container">
        <div class="featured-actu">
          <div class="featured-actu-inner">
            <div>
              <div class="featured-label">⭐ À la une</div>
              <h3>${featuredActu.titre}</h3>
              <p>${featuredActu.extrait}</p>
              <button class="btn btn-primary" data-page="actualites">Voir toutes les actus</button>
            </div>
            <div class="featured-visual">${featuredActu.icon}</div>
          </div>
        </div>
      </div>
    </section>` : ''}

    <section class="section">
      <div class="container">
        <div class="section-header">
          <div>
            <div class="section-tag">Dons récents</div>
            <h2>Objets à donner</h2>
            <p>Des voisins partagent leurs affaires gratuitement</p>
          </div>
          <button class="btn btn-outline" data-page="dons">Voir tout →</button>
        </div>
        <div class="cards-grid">
          ${dons.length ? dons.map(d => renderCard(d,'don')).join('') : '<p style="color:var(--gray-400)">Aucun don pour le moment.</p>'}
        </div>
      </div>
    </section>

    <section class="section" style="background:var(--white);padding-top:0">
      <div class="container">
        <div class="section-header">
          <div>
            <div class="section-tag" style="background:#dbeafe;color:#1e40af">Nouvelles offres</div>
            <h2>Échanges de services</h2>
            <p>Des habitants proposent leur aide bénévolement</p>
          </div>
          <button class="btn btn-outline" data-page="services">Voir tout →</button>
        </div>
        <div class="cards-grid">
          ${services.length ? services.map(d => renderCard(d,'service')).join('') : '<p style="color:var(--gray-400)">Aucun service pour le moment.</p>'}
        </div>
      </div>
    </section>

    <section class="section how-section">
      <div class="container">
        <div class="section-header" style="justify-content:center;text-align:center;display:block;margin-bottom:48px">
          <div class="section-tag">Simple & gratuit</div>
          <h2>Comment ça marche ?</h2>
        </div>
        <div class="steps-grid">
          <div class="step"><div class="step-num">👤</div><h4>Créez votre compte</h4><p>Inscription gratuite réservée aux habitants d'Ambert et alentours.</p></div>
          <div class="step"><div class="step-num">📝</div><h4>Publiez une annonce</h4><p>Donnez un objet, proposez un service ou cherchez de l'aide.</p></div>
          <div class="step"><div class="step-num">💬</div><h4>Contactez & échangez</h4><p>Prenez contact directement avec l'auteur de l'annonce.</p></div>
          <div class="step"><div class="step-num">🤝</div><h4>Renforcez le lien</h4><p>Chaque échange renforce la solidarité locale à Ambert.</p></div>
        </div>
      </div>
    </section>

    ${recentActus.length ? `
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div>
            <div class="section-tag" style="background:var(--amber-light);color:#92400e">Ambert</div>
            <h2>Actualités locales</h2>
          </div>
          <button class="btn btn-outline" data-page="actualites">Voir tout →</button>
        </div>
        <div class="news-grid">
          ${recentActus.map(renderNewsCard).join('')}
        </div>
      </div>
    </section>` : ''}
  `;
}

// ===== PAGE DONS =====
async function renderDons() {
  const annonces = await api.getAnnonces({
    type: 'don',
    categorie: state.filterDon !== 'Tous' ? state.filterDon : undefined,
    search: state.searchDon || undefined,
  });
  state.cache.dons = annonces;

  const cats = ['Tous','Mobilier','Électroménager','Vêtements','Livres & BD','Jeux & Jouets','Sport & Loisirs','Enfants & Bébés','Autre'];
  return `
    <div class="page-header">
      <div class="container">
        <h1>🎁 Dons d'objets</h1>
        <p>Des habitants d'Ambert donnent leurs objets gratuitement.</p>
      </div>
    </div>
    <section class="section">
      <div class="container">
        <div class="search-bar">
          <span>🔍</span>
          <input type="text" id="search-don" placeholder="Rechercher un objet…" value="${state.searchDon}" />
          <button class="btn btn-primary btn-sm" id="btn-search-don">Rechercher</button>
        </div>
        <div class="search-filters">
          ${cats.map(c => `<button class="filter-chip ${state.filterDon===c?'active':''}" data-filter="${c}" data-type="don">${c}</button>`).join('')}
        </div>
        ${annonces.length
          ? `<div class="cards-grid">${annonces.map(d => renderCard(d,'don')).join('')}</div>`
          : `<div class="empty-state"><div class="empty-icon">📦</div><h3>Aucun don trouvé</h3><p>Essayez un autre filtre ou revenez plus tard.</p></div>`}
      </div>
    </section>`;
}

// ===== PAGE SERVICES =====
async function renderServices() {
  const annonces = await api.getAnnonces({
    type: 'service',
    categorie: state.filterService !== 'Tous' ? state.filterService : undefined,
    search: state.searchService || undefined,
  });
  state.cache.services = annonces;

  const cats = ['Tous','Aide quotidienne','Transport','Cours & Formation','Jardinage','Informatique','Animaux','Travaux','Autre'];
  return `
    <div class="page-header" style="background:linear-gradient(135deg,#1e3a5f,#2563eb)">
      <div class="container">
        <h1>🤝 Échanges de services</h1>
        <p>Des habitants proposent leur aide et leurs compétences gratuitement.</p>
      </div>
    </div>
    <section class="section">
      <div class="container">
        <div class="search-bar">
          <span>🔍</span>
          <input type="text" id="search-service" placeholder="Rechercher un service…" value="${state.searchService}" />
          <button class="btn btn-primary btn-sm" id="btn-search-service">Rechercher</button>
        </div>
        <div class="search-filters">
          ${cats.map(c => `<button class="filter-chip ${state.filterService===c?'active':''}" data-filter="${c}" data-type="service">${c}</button>`).join('')}
        </div>
        ${annonces.length
          ? `<div class="cards-grid">${annonces.map(d => renderCard(d,'service')).join('')}</div>`
          : `<div class="empty-state"><div class="empty-icon">🔧</div><h3>Aucun service trouvé</h3><p>Essayez un autre filtre ou revenez plus tard.</p></div>`}
      </div>
    </section>`;
}

// ===== PAGE ACTUALITÉS =====
async function renderActualites() {
  const actus = await api.getActualites({
    categorie: state.filterActu !== 'Toutes' ? state.filterActu : undefined,
  });
  state.cache.actualites = actus;
  const featured = actus.find(a => a.featured);
  const rest     = actus.filter(a => !a.featured);
  const cats = ['Toutes','Événement','Culture','Sport','Travaux & Voirie','Nature & Sport','Patrimoine'];

  return `
    <div class="page-header" style="background:linear-gradient(135deg,#78350f,#d97706)">
      <div class="container">
        <h1>📰 Actualités d'Ambert</h1>
        <p>Restez informé de la vie locale : événements, travaux, culture et patrimoine.</p>
      </div>
    </div>
    <section class="section">
      <div class="container">
        <div class="search-filters" style="margin-bottom:32px">
          ${cats.map(c => `<button class="filter-chip ${state.filterActu===c?'active':''}" data-filter="${c}" data-type="actu">${c}</button>`).join('')}
        </div>
        ${actus.length
          ? `<div class="news-grid">
               ${featured ? renderNewsCard(featured) : ''}
               ${rest.map(renderNewsCard).join('')}
             </div>`
          : `<div class="empty-state"><div class="empty-icon">📰</div><h3>Aucune actualité</h3><p>Revenez bientôt !</p></div>`}
      </div>
    </section>`;
}

// ===== PAGE ADMIN =====
async function renderAdmin() {
  if (!state.user || state.user.role !== 'admin') { navigate('accueil'); return ''; }
  const stats = await api.admin.getStats();

  return `
    <div class="admin-panel">
      <div class="admin-header">
        <div class="container">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
            <div>
              <h1>⚙️ Administration</h1>
              <p>Modération et gestion du site AmbertEntraide</p>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              ${stats.pending > 0 ? `<span class="admin-badge-alert">⏳ ${stats.pending} en attente</span>` : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="container" style="padding-top:32px">
        <div class="admin-stats-grid">
          <div class="admin-stat-card"><div class="admin-stat-num">${stats.pending}</div><div class="admin-stat-label">⏳ En attente</div></div>
          <div class="admin-stat-card"><div class="admin-stat-num">${stats.users}</div><div class="admin-stat-label">👥 Utilisateurs</div></div>
          <div class="admin-stat-card"><div class="admin-stat-num">${stats.total_dons}</div><div class="admin-stat-label">🎁 Dons total</div></div>
          <div class="admin-stat-card"><div class="admin-stat-num">${stats.total_services}</div><div class="admin-stat-label">🤝 Services total</div></div>
          <div class="admin-stat-card"><div class="admin-stat-num">${stats.approved}</div><div class="admin-stat-label">✅ Publiées</div></div>
          <div class="admin-stat-card"><div class="admin-stat-num">${stats.actualites}</div><div class="admin-stat-label">📰 Actualités</div></div>
        </div>

        <div class="admin-tabs">
          <button class="admin-tab ${state.adminTab==='annonces'?'active':''}"   data-admin-tab="annonces">📋 Annonces</button>
          <button class="admin-tab ${state.adminTab==='users'?'active':''}"      data-admin-tab="users">👥 Utilisateurs</button>
          <button class="admin-tab ${state.adminTab==='actualites'?'active':''}" data-admin-tab="actualites">📰 Actualités</button>
        </div>

        <div id="admin-tab-content">
          ${await renderAdminTab()}
        </div>
      </div>
    </div>`;
}

async function renderAdminTab() {
  switch (state.adminTab) {
    case 'annonces':   return await renderAdminAnnonces();
    case 'users':      return await renderAdminUsers();
    case 'actualites': return await renderAdminActualites();
    default:           return await renderAdminAnnonces();
  }
}

async function renderAdminAnnonces() {
  const annonces = await api.admin.getAnnonces(state.adminAnnonceStatus || undefined);
  const statuses = [
    { val: '',          label: 'Toutes' },
    { val: 'pending',   label: '⏳ En attente' },
    { val: 'approved',  label: '✅ Approuvées' },
    { val: 'rejected',  label: '❌ Refusées' },
  ];

  return `
    <div class="admin-section">
      <div class="admin-section-header">
        <h3>Modération des annonces</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${statuses.map(s => `
            <button class="filter-chip ${state.adminAnnonceStatus===(s.val)?'active':''}"
                    data-admin-filter="${s.val}">${s.label}</button>`).join('')}
        </div>
      </div>

      ${annonces.length === 0
        ? `<div class="empty-state"><div class="empty-icon">✅</div><h3>Aucune annonce</h3></div>`
        : `<div class="admin-table-wrap"><table class="admin-table">
            <thead><tr>
              <th>Annonce</th><th>Auteur</th><th>Type</th><th>Catégorie</th><th>Date</th><th>Statut</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${annonces.map(a => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      ${a.photos?.length
                        ? `<img src="${imgSrc(a.photos[0].filename)}" style="width:40px;height:40px;border-radius:6px;object-fit:cover">`
                        : `<div style="width:40px;height:40px;border-radius:6px;background:var(--gray-100);display:flex;align-items:center;justify-content:center;font-size:1.3rem">${getIcon(a.categorie,a.type)}</div>`}
                      <div>
                        <div style="font-weight:600;font-size:.9rem">${a.titre}</div>
                        <div style="font-size:.75rem;color:var(--gray-400)">${a.description.substring(0,60)}…</div>
                      </div>
                    </div>
                  </td>
                  <td style="font-size:.875rem">${a.auteur_name}</td>
                  <td><span class="card-badge ${a.type==='don'?'badge-don':'badge-service'}" style="position:static;display:inline-block">${a.type==='don'?'Don':'Service'}</span></td>
                  <td style="font-size:.8rem;color:var(--gray-600)">${a.categorie}</td>
                  <td style="font-size:.8rem;color:var(--gray-400)">${formatDate(a.created_at)}</td>
                  <td><span class="status-badge status-${a.status}">${{pending:'En attente',approved:'Approuvée',rejected:'Refusée',deleted:'Supprimée'}[a.status]}</span></td>
                  <td>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      ${a.status==='pending' ? `
                        <button class="btn btn-sm btn-primary admin-approve" data-id="${a.id}">✅ Approuver</button>
                        <button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;border:none" data-id="${a.id}" class="admin-reject">❌ Refuser</button>` : ''}
                      ${a.status==='approved' ? `
                        <button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;border:none" data-id="${a.id}" class="admin-reject">❌ Refuser</button>` : ''}
                      ${a.status==='rejected' ? `
                        <button class="btn btn-sm btn-primary admin-approve" data-id="${a.id}">✅ Approuver</button>` : ''}
                      <button class="btn btn-sm btn-ghost admin-delete-annonce" data-id="${a.id}">🗑️</button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table></div>`}
    </div>`;
}

async function renderAdminUsers() {
  const users = await api.admin.getUsers();
  return `
    <div class="admin-section">
      <div class="admin-section-header">
        <h3>Comptes utilisateurs</h3>
        <span style="font-size:.875rem;color:var(--gray-400)">${users.length} comptes</span>
      </div>
      ${users.length === 0
        ? `<div class="empty-state"><div class="empty-icon">👥</div><h3>Aucun utilisateur</h3></div>`
        : `<div class="admin-table-wrap"><table class="admin-table">
            <thead><tr><th>Nom</th><th>Email</th><th>Code postal</th><th>Inscription</th><th>Statut</th><th>Action</th></tr></thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div style="width:34px;height:34px;border-radius:50%;background:var(--green-pale);color:var(--green-dark);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem">${initiales(u.name)}</div>
                      <span style="font-weight:600;font-size:.9rem">${u.name}</span>
                    </div>
                  </td>
                  <td style="font-size:.875rem">${u.email}</td>
                  <td style="font-size:.875rem">${u.code_postal}</td>
                  <td style="font-size:.8rem;color:var(--gray-400)">${formatDate(u.created_at)}</td>
                  <td><span class="status-badge ${u.is_active?'status-approved':'status-rejected'}">${u.is_active?'Actif':'Désactivé'}</span></td>
                  <td>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      <button class="btn btn-sm ${u.is_active?'btn-ghost':'btn-primary'} admin-toggle-user"
                              data-id="${u.id}" data-active="${u.is_active}">
                        ${u.is_active?'🚫 Bloquer':'✅ Débloquer'}
                      </button>
                      <button class="btn btn-sm btn-outline admin-message-user" data-id="${u.id}" data-name="${u.name}">
                        ✉️ Message
                      </button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table></div>`}
    </div>`;
}

async function renderAdminActualites() {
  const actus = await api.getActualites();
  return `
    <div class="admin-section">
      <div class="admin-section-header">
        <h3>Gestion des actualités</h3>
        <button class="btn btn-primary btn-sm" id="btn-new-actu">+ Nouvelle actualité</button>
      </div>
      ${actus.length === 0
        ? `<div class="empty-state"><div class="empty-icon">📰</div><h3>Aucune actualité</h3></div>`
        : `<div style="display:flex;flex-direction:column;gap:12px">
            ${actus.map(a => `
              <div style="background:var(--white);border:1px solid var(--gray-200);border-radius:var(--radius);padding:16px 20px;display:flex;align-items:center;gap:16px">
                <div style="font-size:2rem">${a.icon}</div>
                <div style="flex:1">
                  <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
                    <span style="font-weight:700;font-size:.95rem">${a.titre}</span>
                    ${a.featured ? '<span style="background:var(--amber-light);color:#92400e;font-size:.7rem;font-weight:700;padding:2px 10px;border-radius:100px">⭐ À la une</span>' : ''}
                    ${!a.published ? '<span style="background:var(--gray-100);color:var(--gray-400);font-size:.7rem;font-weight:700;padding:2px 10px;border-radius:100px">Masqué</span>' : ''}
                  </div>
                  <div style="font-size:.8rem;color:var(--gray-400)">${a.categorie} · ${a.auteur} · ${formatDate(a.created_at)}</div>
                </div>
                <div style="display:flex;gap:8px">
                  <button class="btn btn-sm btn-ghost admin-edit-actu" data-id="${a.id}">✏️ Modifier</button>
                  <button class="btn btn-sm btn-ghost admin-delete-actu" data-id="${a.id}" style="color:var(--red)">🗑️</button>
                </div>
              </div>`).join('')}
          </div>`}
    </div>`;
}

// ===== CARD RENDERERS =====
function renderCard(item, type = 'don') {
  const imgHtml = item.photos?.length
    ? `<img src="${imgSrc(item.photos[0].filename)}" alt="${item.titre}" style="width:100%;height:100%;object-fit:cover" />`
    : `<span style="font-size:3.5rem">${getIcon(item.categorie, type)}</span>`;

  return `
    <div class="card" data-id="${item.id}" data-type="${type}">
      <div class="card-img">
        ${imgHtml}
        <div class="card-badge ${type==='don'?'badge-don':'badge-service'}">${type==='don'?'Don':'Service'}</div>
      </div>
      <div class="card-body">
        <div class="card-title">${item.titre}</div>
        <div class="card-desc">${item.description}</div>
        <div class="card-meta">
          <div class="card-avatar">${initiales(item.auteur_name)}</div>
          <div class="card-meta-info">
            <strong>${item.auteur_name || 'Anonyme'}</strong>
            <span class="card-meta-date">📍 Ambert · ${formatDate(item.created_at)}</span>
          </div>
          ${item.categorie ? `<span style="font-size:.75rem;background:var(--gray-100);padding:3px 10px;border-radius:100px;color:var(--gray-600)">${item.categorie}</span>` : ''}
        </div>
      </div>
    </div>`;
}

function renderNewsCard(actu) {
  const imgHtml = actu.image
    ? `<img src="${imgSrc(actu.image)}" alt="${actu.titre}" style="width:100%;height:100%;object-fit:cover" />`
    : `<span>${actu.icon}</span>`;
  return `
    <div class="news-card ${actu.featured ? 'featured' : ''}" data-id="${actu.id}" data-type="actu">
      <div class="news-img">${imgHtml}</div>
      <div class="news-body">
        <div class="news-cat">${actu.categorie}</div>
        <div class="news-title">${actu.titre}</div>
        <div class="news-excerpt">${actu.extrait}</div>
        <div class="news-footer">
          <span>✍️ ${actu.auteur}</span>
          <span>📅 ${formatDate(actu.created_at)}</span>
        </div>
      </div>
    </div>`;
}

// ===== MODAL DÉTAIL ANNONCE =====
function openAnnonceModal(item, type) {
  const overlay = $('annonce-overlay');
  const content = $('annonce-content');

  if (type === 'actu') {
    content.innerHTML = `
      <div class="annonce-detail">
        <div class="annonce-detail-img"><span>${item.icon}</span></div>
        <div class="news-cat">${item.categorie}</div>
        <div class="annonce-detail-title">${item.titre}</div>
        <div class="annonce-detail-meta">
          <span>✍️ ${item.auteur}</span>
          <span>📅 ${formatDate(item.created_at)}</span>
        </div>
        <div class="annonce-detail-desc">${item.extrait}${item.contenu ? '<br><br>' + item.contenu : ''}</div>
      </div>`;
  } else {
    const typeFr = type === 'don' ? 'Don d\'objet' : 'Échange de service';
    const photosHtml = item.photos?.length > 0 ? `
      <div class="photos-gallery">
        ${item.photos.map(p => `<img src="${imgSrc(p.filename)}" class="gallery-img" alt="${item.titre}" />`).join('')}
      </div>` : `<div class="annonce-detail-img">${getIcon(item.categorie, type)}</div>`;

    content.innerHTML = `
      <div class="annonce-detail">
        ${photosHtml}
        <div class="card-badge ${type==='don'?'badge-don':'badge-service'}" style="position:static;display:inline-block;margin-bottom:12px">${typeFr}</div>
        <div class="annonce-detail-title">${item.titre}</div>
        <div class="annonce-detail-meta">
          <span>📂 ${item.categorie}</span>
          ${item.etat ? `<span>✅ ${item.etat}</span>` : ''}
          <span>📅 ${formatDate(item.created_at)}</span>
          <span>📍 Ambert</span>
        </div>
        <div class="annonce-detail-desc">${item.description}</div>
        <div class="contact-box">
          <div class="contact-avatar">${initiales(item.auteur_name)}</div>
          <div class="contact-info">
            <strong>${item.auteur_name || 'Anonyme'}</strong>
            <span>Habitant·e d'Ambert</span>
          </div>
          <button class="btn btn-primary" id="btn-contact-annonce" style="margin-left:auto">💬 Contacter</button>
        </div>
      </div>`;

    $('btn-contact-annonce')?.addEventListener('click', async () => {
      if (!state.user) {
        $('annonce-overlay').classList.remove('open');
        setTimeout(() => openAuthModal('login'), 200);
        showToast('Connectez-vous pour envoyer un message');
        return;
      }
      if (state.user.id === item.user_id) {
        $('annonce-overlay').classList.remove('open');
        state.profileTab = 'messages';
        navigate('profile');
        return;
      }
      const btn = $('btn-contact-annonce');
      btn.disabled = true; btn.textContent = '⏳ Connexion…';
      try {
        const conv = await api.messages.createConversation(item.id);
        await openConversationModal(conv.id);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false; btn.textContent = '💬 Contacter';
      }
    });
  }

  overlay.classList.add('open');
}

// ===== MODAL AUTH =====
function openAuthModal(mode = 'login') {
  const overlay = $('modal-overlay');
  const content = $('modal-content');

  const googleBtn = `<div id="google-signin-btn" style="margin:8px 0"></div>
      <div class="auth-divider"><span>ou</span></div>`;

  if (mode === 'login') {
    content.innerHTML = `
      <div class="form-title">Bon retour 👋</div>
      <div class="form-subtitle">Connectez-vous pour accéder à toutes les fonctionnalités</div>
      <div id="auth-error"></div>
      ${googleBtn}
      <div class="form-group"><label>Email</label><input type="email" id="login-email" placeholder="vous@exemple.fr" /></div>
      <div class="form-group"><label>Mot de passe</label><input type="password" id="login-password" placeholder="••••••••" /></div>
      <button class="btn btn-primary btn-full" id="btn-do-login">Se connecter</button>
      <div class="form-switch">Pas encore de compte ? <a href="#" id="switch-register">S'inscrire</a></div>`;
    $('switch-register').onclick = e => { e.preventDefault(); openAuthModal('register'); };
    $('btn-do-login').onclick = doLogin;
    $('login-password').onkeydown = e => { if (e.key === 'Enter') doLogin(); };
  } else {
    content.innerHTML = `
      <div class="form-title">Rejoignez la communauté 🌿</div>
      <div class="form-subtitle">Compte gratuit réservé aux habitants d'Ambert et alentours</div>
      <div id="auth-error"></div>
      ${googleBtn}
      <div class="form-group"><label>Prénom et nom</label><input type="text" id="reg-name" placeholder="Marie Dupont" /></div>
      <div class="form-group"><label>Email</label><input type="email" id="reg-email" placeholder="vous@exemple.fr" /></div>
      <div class="form-group"><label>Code postal</label><input type="text" id="reg-cp" placeholder="63600" maxlength="5" /></div>
      <div class="form-group"><label>Mot de passe</label><input type="password" id="reg-password" placeholder="Minimum 8 caractères" /></div>
      <button class="btn btn-primary btn-full" id="btn-do-register">Créer mon compte</button>
      <div class="form-switch">Déjà un compte ? <a href="#" id="switch-login">Se connecter</a></div>`;
    $('switch-login').onclick = e => { e.preventDefault(); openAuthModal('login'); };
    $('btn-do-register').onclick = doRegister;
  }
  overlay.classList.add('open');
  _initGoogleButton();
}

function _initGoogleButton() {
  if (!window.google?.accounts?.id) {
    setTimeout(_initGoogleButton, 300);
    return;
  }
  google.accounts.id.initialize({
    client_id: '443317881995-9r3vk43d9p2lo2srdi2be900d7s5vf74.apps.googleusercontent.com',
    callback: async ({ credential }) => {
      try {
        const { token, user } = await api.loginWithGoogle(credential);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        state.user = user;
        $('modal-overlay').classList.remove('open');
        updateHeader();
        showToast(`Bienvenue ${user.name} ! 🎉`);
        pollUnreadCount();
      } catch (err) {
        const errEl = $('auth-error');
        if (errEl) errEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
      }
    }
  });
  const container = $('google-signin-btn');
  if (container) {
    google.accounts.id.renderButton(container, {
      type: 'standard', theme: 'outline', size: 'large',
      text: 'continue_with', shape: 'rectangular', width: '100%'
    });
  }
}

async function doLogin() {
  const email    = $('login-email').value.trim();
  const password = $('login-password').value;
  const errEl    = $('auth-error');
  if (!email || !password) { errEl.innerHTML = '<div class="alert alert-error">Remplissez tous les champs</div>'; return; }

  const btn = $('btn-do-login');
  btn.disabled = true; btn.textContent = 'Connexion…';
  try {
    const { token, user } = await api.login(email, password);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    state.user = user;
    $('modal-overlay').classList.remove('open');
    updateHeader();
    showToast(`Bienvenue ${user.name} ! 🎉`);
  } catch (err) {
    errEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    btn.disabled = false; btn.textContent = 'Se connecter';
  }
}

async function doRegister() {
  const name     = $('reg-name').value.trim();
  const email    = $('reg-email').value.trim();
  const cp       = $('reg-cp').value.trim();
  const password = $('reg-password').value;
  const errEl    = $('auth-error');
  if (!name || !email || !cp || !password) { errEl.innerHTML = '<div class="alert alert-error">Remplissez tous les champs</div>'; return; }

  const btn = $('btn-do-register');
  btn.disabled = true; btn.textContent = 'Création…';
  try {
    await api.register({ name, email, password, code_postal: cp });
    $('modal-overlay').classList.remove('open');
    errEl.innerHTML = '';
    showToast('✅ Compte créé ! Consultez votre email pour activer votre compte.');
  } catch (err) {
    errEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    btn.disabled = false; btn.textContent = 'Créer mon compte';
  }
}

function logout() {
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateHeader();
  navigate('accueil');
  showToast('Vous êtes déconnecté');
}

// ===== MODAL NOUVELLE ANNONCE =====
function openNewAnnonceModal() {
  if (!state.user) { openAuthModal('login'); showToast('Connectez-vous pour publier une annonce'); return; }
  const overlay = $('annonce-overlay');
  const content = $('annonce-content');
  const cats = ['Mobilier','Électroménager','Vêtements','Livres & BD','Jeux & Jouets','Sport & Loisirs','Enfants & Bébés','Aide quotidienne','Transport','Cours & Formation','Jardinage','Informatique','Animaux','Travaux','Autre'];

  content.innerHTML = `
    <div class="form-title">📝 Publier une annonce</div>
    <div class="form-subtitle">Partagez un objet ou proposez un service gratuitement</div>
    <div id="annonce-error"></div>
    <div class="form-group">
      <label>Type d'annonce</label>
      <select id="annonce-type">
        <option value="don">🎁 Don d'objet</option>
        <option value="service">🤝 Échange de service</option>
      </select>
    </div>
    <div class="form-group">
      <label>Titre</label>
      <input type="text" id="annonce-titre" placeholder="Ex : Vélo enfant, Cours de guitare…" maxlength="100" />
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="annonce-desc" placeholder="Décrivez votre objet ou service en quelques lignes…" maxlength="1000"></textarea>
    </div>
    <div class="form-group">
      <label>Catégorie</label>
      <select id="annonce-cat">
        ${cats.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" id="etat-group">
      <label>État de l'objet</label>
      <select id="annonce-etat">
        <option value="Comme neuf">Comme neuf</option>
        <option value="Bon état">Bon état</option>
        <option value="État correct">État correct</option>
        <option value="Usé mais fonctionnel">Usé mais fonctionnel</option>
        <option value="Ne fonctionne plus">Ne fonctionne plus</option>
      </select>
    </div>
    <div class="form-group">
      <label>Photos <span style="font-weight:400;color:var(--gray-400)">(optionnel — max 5 photos, 5 Mo chacune)</span></label>
      <div class="photo-upload-area" id="photo-drop-area">
        <input type="file" id="annonce-photos" accept="image/*" multiple />
        <div class="photo-upload-hint">
          <span style="font-size:2rem">📷</span>
          <span>Cliquez ou glissez vos photos ici</span>
          <span style="font-size:.8rem;color:var(--gray-400)">JPG, PNG, WebP · 5 Mo max par photo</span>
        </div>
      </div>
      <div class="photo-previews" id="photo-previews"></div>
    </div>
    <button class="btn btn-primary btn-full" id="btn-submit-annonce">Publier l'annonce</button>`;

  // Show/hide état field based on type
  $('annonce-type').onchange = () => {
    $('etat-group').style.display = $('annonce-type').value === 'don' ? 'block' : 'none';
  };

  // Photo preview
  $('annonce-photos').onchange = () => updatePhotoPreviews();

  overlay.classList.add('open');
  $('btn-submit-annonce').onclick = submitAnnonce;
}

function updatePhotoPreviews() {
  const files   = $('annonce-photos').files;
  const preview = $('photo-previews');
  preview.innerHTML = '';
  if (!files.length) return;
  const max = Math.min(files.length, 5);
  for (let i = 0; i < max; i++) {
    const url = URL.createObjectURL(files[i]);
    const wrapper = document.createElement('div');
    wrapper.className = 'photo-preview-wrapper';
    wrapper.innerHTML = `
      <img src="${url}" class="photo-preview" alt="Photo ${i+1}" />
      <span class="photo-preview-num">${i+1}</span>`;
    preview.appendChild(wrapper);
  }
}

async function submitAnnonce() {
  const titre = $('annonce-titre').value.trim();
  const desc  = $('annonce-desc').value.trim();
  const type  = $('annonce-type').value;
  const cat   = $('annonce-cat').value;
  const etat  = type === 'don' ? $('annonce-etat').value : null;
  const files = $('annonce-photos').files;
  const errEl = $('annonce-error');

  if (!titre || !desc) { errEl.innerHTML = '<div class="alert alert-error">Remplissez le titre et la description</div>'; return; }

  const btn = $('btn-submit-annonce');
  btn.disabled = true; btn.textContent = 'Publication…';

  try {
    const fd = new FormData();
    fd.append('type', type);
    fd.append('titre', titre);
    fd.append('description', desc);
    fd.append('categorie', cat);
    if (etat) fd.append('etat', etat);
    for (let i = 0; i < Math.min(files.length, 5); i++) fd.append('photos', files[i]);

    await api.createAnnonce(fd);
    $('annonce-overlay').classList.remove('open');
    showToast('✅ Annonce soumise ! Elle sera visible après validation.');
  } catch (err) {
    errEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    btn.disabled = false; btn.textContent = 'Publier l\'annonce';
  }
}

// ===== MODAL ACTUALITÉ (admin) =====
function openActuModal(actu = null) {
  const overlay = $('annonce-overlay');
  const content = $('annonce-content');
  const cats = ['Événement','Culture','Sport','Travaux & Voirie','Nature & Sport','Patrimoine','Vie locale'];

  const currentImg = actu?.image
    ? `<div class="form-group"><label>Image actuelle</label><img src="${imgSrc(actu.image)}" style="max-width:100%;max-height:160px;border-radius:8px;object-fit:cover" /></div>`
    : '';

  content.innerHTML = `
    <div class="form-title">${actu ? '✏️ Modifier' : '➕ Nouvelle'} actualité</div>
    <div id="actu-error"></div>
    <div class="form-group"><label>Titre</label><input type="text" id="actu-titre" value="${actu?.titre || ''}" maxlength="120" /></div>
    <div class="form-group"><label>Extrait</label><textarea id="actu-extrait" maxlength="300">${actu?.extrait || ''}</textarea></div>
    <div class="form-group"><label>Contenu complet <span style="font-weight:400;color:var(--gray-400)">(optionnel)</span></label><textarea id="actu-contenu" style="min-height:120px">${actu?.contenu || ''}</textarea></div>
    <div class="form-group">
      <label>Catégorie</label>
      <select id="actu-cat">${cats.map(c => `<option value="${c}" ${actu?.categorie===c?'selected':''}>${c}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Icône emoji</label><input type="text" id="actu-icon" value="${actu?.icon || '📰'}" maxlength="2" style="width:80px;text-align:center;font-size:1.5rem" /></div>
    <div class="form-group"><label>Auteur / Source</label><input type="text" id="actu-auteur" value="${actu?.auteur || ''}" placeholder="Mairie d'Ambert" /></div>
    ${currentImg}
    <div class="form-group">
      <label>Image <span style="font-weight:400;color:var(--gray-400)">(optionnel — remplace l'image existante)</span></label>
      <div class="photo-upload-area" id="actu-img-drop">
        <input type="file" id="actu-image" accept="image/*" />
        <div class="photo-upload-hint">
          <span style="font-size:1.8rem">🖼️</span>
          <span>Cliquez pour choisir une image</span>
          <span style="font-size:.75rem;color:var(--gray-400)">JPG, PNG, WebP · 5 Mo max</span>
        </div>
      </div>
      <div id="actu-img-preview"></div>
    </div>
    <div class="form-group" style="display:flex;gap:20px;align-items:center">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="actu-featured" ${actu?.featured?'checked':''} />
        ⭐ Mettre à la une
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="actu-published" ${!actu || actu.published?'checked':''} />
        Publier
      </label>
    </div>
    <button class="btn btn-primary btn-full" id="btn-save-actu">${actu ? 'Enregistrer les modifications' : 'Publier l\'actualité'}</button>`;

  overlay.classList.add('open');

  // Image preview
  $('actu-image').onchange = () => {
    const file = $('actu-image').files[0];
    const preview = $('actu-img-preview');
    if (file) {
      const url = URL.createObjectURL(file);
      preview.innerHTML = `<img src="${url}" style="max-width:100%;max-height:140px;border-radius:8px;margin-top:8px;object-fit:cover" />`;
    } else {
      preview.innerHTML = '';
    }
  };

  $('btn-save-actu').onclick = async () => {
    const titre   = $('actu-titre').value.trim();
    const extrait = $('actu-extrait').value.trim();
    const auteur  = $('actu-auteur').value.trim();
    if (!titre || !extrait || !auteur) {
      $('actu-error').innerHTML = '<div class="alert alert-error">Remplissez les champs obligatoires</div>'; return;
    }
    const btn = $('btn-save-actu');
    btn.disabled = true; btn.textContent = 'Enregistrement…';
    try {
      const fd = new FormData();
      fd.append('titre',     titre);
      fd.append('extrait',   extrait);
      fd.append('contenu',   $('actu-contenu').value.trim());
      fd.append('categorie', $('actu-cat').value);
      fd.append('icon',      $('actu-icon').value.trim() || '📰');
      fd.append('auteur',    auteur);
      fd.append('featured',  $('actu-featured').checked ? '1' : '0');
      fd.append('published', $('actu-published').checked ? '1' : '0');
      const imgFile = $('actu-image').files[0];
      if (imgFile) fd.append('image', imgFile);

      if (actu) await api.admin.updateActualite(actu.id, fd);
      else      await api.admin.createActualite(fd);
      overlay.classList.remove('open');
      showToast(actu ? 'Actualité modifiée ✅' : 'Actualité publiée ✅');
      navigate('admin');
    } catch (err) {
      $('actu-error').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
      btn.disabled = false; btn.textContent = actu ? 'Enregistrer' : 'Publier';
    }
  };
}

// ===== HEADER =====
function updateHeader() {
  const actions = document.querySelector('.header-actions');
  const navAuth = $('nav-auth');

  if (state.user) {
    const isAdmin = state.user.role === 'admin';
    const avatarInner = state.user.avatar
      ? `<img src="${imgSrc(state.user.avatar, 'avatars')}" class="header-avatar-img" alt="${state.user.name}" />`
      : `<span class="header-avatar-initials">${initiales(state.user.name)}</span>`;

    actions.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="btn-new-annonce">+ Publier</button>
      <div class="msg-btn-wrap">
        <button class="btn btn-outline btn-sm" id="btn-messagerie">💬 Messagerie</button>
        <span class="msg-badge" id="msg-badge" style="display:none"></span>
      </div>
      ${isAdmin ? `<button class="btn btn-outline btn-sm" id="btn-admin-panel">⚙️ Admin</button>` : ''}
      <div class="header-avatar-wrap" id="btn-profile" title="Mon profil — ${state.user.name}">
        ${avatarInner}
      </div>
      <button class="nav-toggle" id="nav-toggle"><span></span><span></span><span></span></button>`;

    if (navAuth) navAuth.innerHTML = `
      <div class="nav-auth-divider"></div>
      <a href="#" class="nav-auth-item" id="nav-profile-link">👤 Mon profil</a>
      ${isAdmin ? `<a href="#" class="nav-auth-item" id="nav-admin-link">⚙️ Administration</a>` : ''}
      <a href="#" class="nav-auth-item nav-auth-logout" id="nav-logout-link">Se déconnecter</a>`;

    $('btn-new-annonce').onclick = openNewAnnonceModal;
    $('btn-messagerie').onclick = () => { state.profileTab = 'messages'; navigate('profile'); };
    $('btn-profile').onclick = () => navigate('profile');
    if (isAdmin) $('btn-admin-panel').onclick = () => navigate('admin');
    $('nav-profile-link')?.addEventListener('click', e => { e.preventDefault(); navigate('profile'); });
    $('nav-admin-link')?.addEventListener('click', e => { e.preventDefault(); navigate('admin'); });
    $('nav-logout-link')?.addEventListener('click', e => { e.preventDefault(); logout(); });

    pollUnreadCount();
  } else {
    actions.innerHTML = `
      <button class="btn btn-outline" id="btn-login">Se connecter</button>
      <button class="btn btn-primary" id="btn-register">Créer un compte</button>
      <button class="nav-toggle" id="nav-toggle"><span></span><span></span><span></span></button>`;

    if (navAuth) navAuth.innerHTML = `
      <div class="nav-auth-divider"></div>
      <a href="#" class="nav-auth-item" id="nav-login-mobile">Se connecter</a>
      <a href="#" class="nav-auth-item nav-auth-primary" id="nav-register-mobile">Créer un compte</a>`;

    $('nav-login-mobile')?.addEventListener('click', e => { e.preventDefault(); $('nav').classList.remove('open'); openAuthModal('login'); });
    $('nav-register-mobile')?.addEventListener('click', e => { e.preventDefault(); $('nav').classList.remove('open'); openAuthModal('register'); });
    bindHeaderEvents();
  }
  bindNavToggle();
}

function bindNavToggle() {
  const t = $('nav-toggle');
  if (t) t.onclick = () => $('nav').classList.toggle('open');
}

// ===== BIND PAGE EVENTS =====
function bindPageEvents() {
  // Cards → modal détail
  document.querySelectorAll('.card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id   = parseInt(card.dataset.id);
      const type = card.dataset.type;
      const list = type === 'don' ? state.cache.dons : state.cache.services;
      const item = list.find(i => i.id === id);
      if (item) openAnnonceModal(item, type);
    });
  });

  // News cards → modal
  document.querySelectorAll('.news-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id   = parseInt(card.dataset.id);
      const item = state.cache.actualites.find(a => a.id === id);
      if (item) openAnnonceModal(item, 'actu');
    });
  });

  // Navigation interne
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
  });

  // Filtres
  document.querySelectorAll('.filter-chip[data-type]').forEach(chip => {
    chip.addEventListener('click', () => {
      const { filter, type } = chip.dataset;
      if (type === 'don')     { state.filterDon     = filter; render(); }
      if (type === 'service') { state.filterService = filter; render(); }
      if (type === 'actu')    { state.filterActu    = filter; render(); }
    });
  });

  // Recherche
  const sd = $('search-don');
  if (sd) {
    sd.onkeydown = e => { if (e.key === 'Enter') { state.searchDon = sd.value; render(); } };
    $('btn-search-don').onclick = () => { state.searchDon = sd.value; render(); };
  }
  const ss = $('search-service');
  if (ss) {
    ss.onkeydown = e => { if (e.key === 'Enter') { state.searchService = ss.value; render(); } };
    $('btn-search-service').onclick = () => { state.searchService = ss.value; render(); };
  }

  // Admin tabs
  document.querySelectorAll('[data-admin-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.adminTab = btn.dataset.adminTab;
      render();
    });
  });

  // Admin annonce status filter
  document.querySelectorAll('[data-admin-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.adminAnnonceStatus = btn.dataset.adminFilter;
      render();
    });
  });

  // Admin: approve
  document.querySelectorAll('.admin-approve').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.admin.updateAnnonce(btn.dataset.id, { status: 'approved' });
      showToast('Annonce approuvée ✅');
      render();
    });
  });

  // Admin: reject (using event delegation since class is duplicated)
  document.querySelectorAll('[class*="admin-reject"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.admin.updateAnnonce(btn.dataset.id, { status: 'rejected' });
      showToast('Annonce refusée');
      render();
    });
  });

  // Admin: delete annonce
  document.querySelectorAll('.admin-delete-annonce').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cette annonce ?')) return;
      await api.admin.deleteAnnonce(btn.dataset.id);
      showToast('Annonce supprimée');
      render();
    });
  });

  // Admin: toggle user
  document.querySelectorAll('.admin-toggle-user').forEach(btn => {
    btn.addEventListener('click', async () => {
      const isActive = parseInt(btn.dataset.active);
      await api.admin.updateUser(btn.dataset.id, { is_active: !isActive });
      showToast(isActive ? 'Compte désactivé' : 'Compte activé ✅');
      render();
    });
  });

  // Admin: message user
  document.querySelectorAll('.admin-message-user').forEach(btn => {
    btn.addEventListener('click', () => openAdminMessageModal(parseInt(btn.dataset.id), btn.dataset.name));
  });

  // Admin: new actualité
  $('btn-new-actu')?.addEventListener('click', () => openActuModal());

  // Admin: edit actualité
  document.querySelectorAll('.admin-edit-actu').forEach(btn => {
    btn.addEventListener('click', async () => {
      const actus = await api.getActualites();
      const actu  = actus.find(a => a.id === parseInt(btn.dataset.id));
      if (actu) openActuModal(actu);
    });
  });

  // Admin: delete actualité
  document.querySelectorAll('.admin-delete-actu').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cette actualité ?')) return;
      await api.admin.deleteActualite(btn.dataset.id);
      showToast('Actualité supprimée');
      render();
    });
  });

  // Profile tabs
  document.querySelectorAll('[data-profile-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.profileTab = btn.dataset.profileTab;
      render();
    });
  });

  // Profile: edit own annonce
  document.querySelectorAll('.my-edit-annonce').forEach(btn => {
    btn.addEventListener('click', () => openEditAnnonceModal(parseInt(btn.dataset.id)));
  });

  // Profile: delete own annonce
  document.querySelectorAll('.my-delete-annonce').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cette annonce ?')) return;
      try {
        await api.profile.deleteAnnonce(btn.dataset.id);
        showToast('Annonce supprimée');
        render();
      } catch (err) { showToast(err.message, 'error'); }
    });
  });

  // Profile: open conversation
  document.querySelectorAll('.conv-item[data-conv-id]').forEach(item => {
    item.addEventListener('click', () => openConversationModal(parseInt(item.dataset.convId)));
  });

  // Profile: avatar upload
  const avatarWrap  = $('profile-avatar-wrap');
  const avatarInput = $('avatar-input');
  if (avatarWrap && avatarInput) {
    avatarWrap.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', async () => {
      const file = avatarInput.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('avatar', file);
      try {
        const { avatar } = await api.profile.updateAvatar(fd);
        state.user.avatar = avatar;
        localStorage.setItem('user', JSON.stringify(state.user));
        updateHeader();
        render();
        showToast('Photo de profil mise à jour ✅');
      } catch (err) { showToast(err.message, 'error'); }
    });
  }
}

function bindHeaderEvents() {
  $('btn-login')?.addEventListener('click', () => openAuthModal('login'));
  $('btn-register')?.addEventListener('click', () => openAuthModal('register'));
}

// ===== MODAL MODIFIER ANNONCE =====
async function openEditAnnonceModal(annonceId) {
  const overlay = $('annonce-overlay');
  const content = $('annonce-content');
  content.innerHTML = `<div style="text-align:center;padding:60px"><div class="spinner"></div></div>`;
  overlay.classList.add('open');

  try {
    const annonce = await api.getAnnonce(annonceId);
    const cats = ['Mobilier','Électroménager','Vêtements','Livres & BD','Jeux & Jouets','Sport & Loisirs','Enfants & Bébés','Aide quotidienne','Transport','Cours & Formation','Jardinage','Informatique','Animaux','Travaux','Autre'];
    const etats = ['Comme neuf','Bon état','État correct','Usé mais fonctionnel','Ne fonctionne plus'];

    const photosHtml = annonce.photos?.length ? `
      <div class="form-group">
        <label>Photos actuelles <span style="font-weight:400;color:var(--gray-400)">(cochez pour supprimer)</span></label>
        <div class="edit-photos-current">
          ${annonce.photos.map(p => `
            <label class="edit-photo-item">
              <img src="${imgSrc(p.filename)}" alt="" />
              <input type="checkbox" class="delete-photo-cb" value="${p.id}" />
              <span class="edit-photo-del">🗑️</span>
            </label>`).join('')}
        </div>
      </div>` : '';

    content.innerHTML = `
      <div class="form-title">✏️ Modifier l'annonce</div>
      <div id="annonce-error"></div>
      <div class="form-group">
        <label>Type d'annonce</label>
        <select id="annonce-type" disabled>
          <option value="don" ${annonce.type==='don'?'selected':''}>🎁 Don d'objet</option>
          <option value="service" ${annonce.type==='service'?'selected':''}>🤝 Échange de service</option>
        </select>
      </div>
      <div class="form-group">
        <label>Titre</label>
        <input type="text" id="annonce-titre" value="${annonce.titre}" maxlength="100" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="annonce-desc" maxlength="1000">${annonce.description}</textarea>
      </div>
      <div class="form-group">
        <label>Catégorie</label>
        <select id="annonce-cat">
          ${cats.map(c => `<option value="${c}" ${annonce.categorie===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      ${annonce.type === 'don' ? `
      <div class="form-group" id="etat-group">
        <label>État de l'objet</label>
        <select id="annonce-etat">
          ${etats.map(e => `<option value="${e}" ${annonce.etat===e?'selected':''}>${e}</option>`).join('')}
        </select>
      </div>` : ''}
      ${photosHtml}
      <div class="form-group">
        <label>Ajouter des photos <span style="font-weight:400;color:var(--gray-400)">(optionnel)</span></label>
        <div class="photo-upload-area" id="photo-drop-area">
          <input type="file" id="annonce-photos" accept="image/*" multiple />
          <div class="photo-upload-hint">
            <span style="font-size:2rem">📷</span>
            <span>Cliquez pour ajouter des photos</span>
          </div>
        </div>
        <div class="photo-previews" id="photo-previews"></div>
      </div>
      <p style="font-size:.8rem;color:var(--gray-400);margin-bottom:12px">⚠️ La modification remet l'annonce en attente de validation.</p>
      <button class="btn btn-primary btn-full" id="btn-submit-edit">Enregistrer les modifications</button>`;

    $('annonce-photos').onchange = () => updatePhotoPreviews();

    $('btn-submit-edit').onclick = async () => {
      const titre = $('annonce-titre').value.trim();
      const desc  = $('annonce-desc').value.trim();
      if (!titre || !desc) { $('annonce-error').innerHTML = '<div class="alert alert-error">Remplissez le titre et la description</div>'; return; }

      const btn = $('btn-submit-edit');
      btn.disabled = true; btn.textContent = 'Enregistrement…';

      try {
        const fd = new FormData();
        fd.append('titre', titre);
        fd.append('description', desc);
        fd.append('categorie', $('annonce-cat').value);
        if ($('annonce-etat')) fd.append('etat', $('annonce-etat').value);

        const toDelete = [...document.querySelectorAll('.delete-photo-cb:checked')].map(cb => cb.value);
        if (toDelete.length) fd.append('delete_photos', JSON.stringify(toDelete.map(Number)));

        const files = $('annonce-photos').files;
        for (let i = 0; i < Math.min(files.length, 5); i++) fd.append('photos', files[i]);

        await api.profile.updateAnnonce(annonceId, fd);
        overlay.classList.remove('open');
        showToast('✅ Annonce modifiée — en attente de validation');
        state.profileTab = 'annonces';
        render();
      } catch (err) {
        $('annonce-error').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
        btn.disabled = false; btn.textContent = 'Enregistrer les modifications';
      }
    };
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>${err.message}</h3></div>`;
  }
}

// ===== PAGE PROFIL =====
async function renderProfile() {
  if (!state.user) { navigate('accueil'); return ''; }

  const promises = [api.profile.get(), api.profile.getAnnonces()];
  if (state.profileTab === 'messages') promises.push(api.messages.getConversations());
  const results = await Promise.all(promises);
  const profile     = results[0];
  const annonces    = results[1];
  const conversations = results[2] || [];

  const avatarInner = profile.avatar
    ? `<img src="${imgSrc(profile.avatar, 'avatars')}" alt="${profile.name}" class="profile-avatar-img" />`
    : `<span class="profile-avatar-initials">${initiales(profile.name)}</span>`;

  const tabContent = state.profileTab === 'annonces'
    ? renderProfileAnnonces(annonces)
    : renderProfileMessages(conversations);

  return `
    <div class="profile-page">
      <div class="profile-hero">
        <div class="container">
          <div class="profile-hero-inner">
            <div class="profile-avatar-wrap" id="profile-avatar-wrap" title="Changer la photo de profil">
              ${avatarInner}
              <div class="profile-avatar-edit">📷</div>
              <input type="file" id="avatar-input" accept="image/*" style="display:none" />
            </div>
            <div class="profile-info">
              <h1>${profile.name}</h1>
              <p>📍 ${profile.code_postal} · Membre depuis ${formatDate(profile.created_at)}</p>
              ${profile.role === 'admin' ? '<span class="profile-admin-badge">⚙️ Administrateur</span>' : ''}
            </div>
            <button class="btn btn-ghost btn-sm profile-logout-btn" onclick="logout()">Se déconnecter</button>
          </div>
        </div>
      </div>

      <div class="container profile-body">
        <div class="profile-tabs">
          <button class="profile-tab ${state.profileTab==='annonces'?'active':''}" data-profile-tab="annonces">
            📋 Mes annonces${annonces.length ? ` <span class="tab-badge">${annonces.length}</span>` : ''}
          </button>
          <button class="profile-tab ${state.profileTab==='messages'?'active':''}" data-profile-tab="messages">
            💬 Messages
          </button>
        </div>
        <div id="profile-tab-content">${tabContent}</div>
      </div>
    </div>`;
}

function renderProfileAnnonces(annonces) {
  if (!annonces.length) return `
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>Aucune annonce</h3>
      <p>Publiez votre premier don ou service !</p>
      <button class="btn btn-primary" onclick="openNewAnnonceModal()">+ Publier une annonce</button>
    </div>`;

  return `<div class="my-annonces-list">
    ${annonces.map(a => {
      const photo   = a.photos?.[0];
      const unread  = a.unread_count > 0;
      return `
        <div class="my-annonce-card">
          <div class="my-annonce-img">
            ${photo ? `<img src="${imgSrc(photo.filename)}" alt="${a.titre}" />` : `<span>${getIcon(a.categorie, a.type)}</span>`}
          </div>
          <div class="my-annonce-info">
            <div class="my-annonce-top">
              <span class="card-badge ${a.type==='don'?'badge-don':'badge-service'}" style="position:static;display:inline-block">${a.type==='don'?'Don':'Service'}</span>
              <span class="status-badge status-${a.status}">${{pending:'En attente',approved:'Publiée',rejected:'Refusée',deleted:'Supprimée'}[a.status]}</span>
            </div>
            <div class="my-annonce-title">${a.titre}</div>
            <div class="my-annonce-meta">
              ${a.categorie} · ${formatDate(a.created_at)}
              ${a.nb_conversations > 0 ? ` · <strong>${a.nb_conversations}</strong> demande${a.nb_conversations>1?'s':''}` : ''}
              ${unread ? `<span class="unread-dot"> · ${a.unread_count} non lu${a.unread_count>1?'s':''}</span>` : ''}
            </div>
          </div>
          <div class="my-annonce-actions">
            ${a.status !== 'deleted' ? `
              <button class="btn btn-sm btn-outline my-edit-annonce" data-id="${a.id}">✏️ Modifier</button>
              <button class="btn btn-sm btn-ghost my-delete-annonce" data-id="${a.id}" style="color:var(--red)">🗑️</button>
            ` : ''}
          </div>
        </div>`;
    }).join('')}
  </div>`;
}

function renderProfileMessages(conversations) {
  if (!conversations.length) return `
    <div class="empty-state">
      <div class="empty-icon">💬</div>
      <h3>Aucun message</h3>
      <p>Vos échanges avec d'autres habitants apparaîtront ici.</p>
    </div>`;

  return `<div class="conv-list">
    ${conversations.map(c => {
      const isOwner    = c.proprietaire_id === state.user.id;
      const otherName  = isOwner ? c.demandeur_name  : c.proprietaire_name;
      const otherAvatar= isOwner ? c.demandeur_avatar : c.proprietaire_avatar;
      const unread     = c.unread_count > 0;
      const avatarHtml = otherAvatar
        ? `<img src="${imgSrc(otherAvatar, 'avatars')}" class="conv-avatar-img" alt="${otherName}" />`
        : `<div class="conv-avatar">${initiales(otherName)}</div>`;
      return `
        <div class="conv-item ${unread?'conv-unread':''}" data-conv-id="${c.id}">
          <div class="conv-avatar-wrap">${avatarHtml}</div>
          <div class="conv-info">
            <div class="conv-name">${otherName}</div>
            <div class="conv-annonce">Re : ${c.annonce_titre}</div>
            <div class="conv-last">${c.last_message || 'Aucun message'}</div>
          </div>
          <div class="conv-meta">
            <div class="conv-time">${c.last_message_at ? formatDate(c.last_message_at) : ''}</div>
            ${unread ? `<div class="conv-badge">${c.unread_count}</div>` : ''}
          </div>
        </div>`;
    }).join('')}
  </div>`;
}

// ===== CHAT MODAL =====
async function openConversationModal(convId) {
  const overlay = $('annonce-overlay');
  const content = $('annonce-content');
  content.innerHTML = `<div style="text-align:center;padding:60px"><div class="spinner"></div></div>`;
  overlay.classList.add('open');

  try {
    const { conv, messages, annonce, other_user } = await api.messages.getConversation(convId);
    const otherAvatarHtml = other_user.avatar
      ? `<img src="${imgSrc(other_user.avatar, 'avatars')}" class="chat-avatar-img" alt="${other_user.name}" />`
      : `<div class="chat-avatar">${initiales(other_user.name)}</div>`;

    content.innerHTML = `
      <div class="chat-modal">
        <div class="chat-header">
          <div class="chat-header-avatar">${otherAvatarHtml}</div>
          <div class="chat-header-info">
            <div class="chat-header-name">${other_user.name}</div>
            <div class="chat-header-annonce">📋 ${annonce.titre}</div>
          </div>
        </div>
        <div class="chat-messages" id="chat-messages">
          ${messages.length
            ? messages.map(renderChatMessage).join('')
            : `<div class="chat-empty">Commencez la conversation 👋</div>`}
        </div>
        <div class="chat-input-area">
          <textarea id="chat-input" placeholder="Votre message…" rows="2"></textarea>
          <button class="btn btn-primary" id="btn-send-message">Envoyer</button>
        </div>
      </div>`;

    const chatMsgs = $('chat-messages');
    chatMsgs.scrollTop = chatMsgs.scrollHeight;

    $('chat-input').onkeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(convId); }
    };
    $('btn-send-message').onclick = () => sendChatMessage(convId);

    // Refresh unread count after opening
    pollUnreadCount();
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>${err.message}</h3></div>`;
  }
}

function renderChatMessage(msg) {
  const isMine = msg.sender_id === state.user?.id;
  const avatarHtml = msg.sender_avatar
    ? `<img src="${imgSrc(msg.sender_avatar, 'avatars')}" class="msg-avatar-img" alt="${msg.sender_name}" />`
    : `<div class="msg-avatar">${initiales(msg.sender_name)}</div>`;
  return `
    <div class="chat-msg ${isMine ? 'chat-msg-mine' : 'chat-msg-theirs'}">
      ${!isMine ? `<div class="msg-avatar-wrap">${avatarHtml}</div>` : ''}
      <div class="chat-bubble-wrap">
        <div class="chat-bubble">${msg.content.replace(/\n/g, '<br>')}</div>
        <div class="chat-time">${formatDate(msg.created_at)}</div>
      </div>
    </div>`;
}

async function sendChatMessage(convId) {
  const input   = $('chat-input');
  const content = input?.value.trim();
  if (!content) return;

  const btn = $('btn-send-message');
  if (btn) btn.disabled = true;
  if (input) input.disabled = true;

  try {
    const msg     = await api.messages.sendMessage(convId, content);
    input.value   = '';
    const chatMsgs = $('chat-messages');
    const emptyEl  = chatMsgs?.querySelector('.chat-empty');
    if (emptyEl) emptyEl.remove();
    chatMsgs?.insertAdjacentHTML('beforeend', renderChatMessage(msg));
    if (chatMsgs) chatMsgs.scrollTop = chatMsgs.scrollHeight;
    pollUnreadCount();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (input) { input.disabled = false; input.focus(); }
  }
}

// ===== ADMIN: MODAL MESSAGE UTILISATEUR =====
function openAdminMessageModal(userId, userName) {
  const overlay = $('modal-overlay');
  const content = $('modal-content');
  content.innerHTML = `
    <div class="form-title">✉️ Message à ${userName}</div>
    <div class="form-subtitle">Le message apparaîtra dans la messagerie de l'utilisateur.</div>
    <div id="admin-msg-error"></div>
    <div class="form-group">
      <label>Message</label>
      <textarea id="admin-msg-content" placeholder="Votre message…" style="min-height:120px"></textarea>
    </div>
    <button class="btn btn-primary btn-full" id="btn-admin-send-msg">Envoyer le message</button>`;
  overlay.classList.add('open');

  $('btn-admin-send-msg').onclick = async () => {
    const content_text = $('admin-msg-content').value.trim();
    if (!content_text) { $('admin-msg-error').innerHTML = '<div class="alert alert-error">Message vide</div>'; return; }
    const btn = $('btn-admin-send-msg');
    btn.disabled = true; btn.textContent = 'Envoi…';
    try {
      await api.admin.sendMessageToUser(userId, content_text);
      overlay.classList.remove('open');
      showToast(`Message envoyé à ${userName} ✅`);
    } catch (err) {
      $('admin-msg-error').innerHTML = `<div class="alert alert-error">${err.message}</div>`;
      btn.disabled = false; btn.textContent = 'Envoyer le message';
    }
  };
}

// ===== UNREAD POLLING =====
let _unreadPollTimer = null;
let _lastUnreadCount = 0;

async function pollUnreadCount() {
  if (!state.user) return;
  try {
    const { count } = await api.messages.getUnread();

    // Notification toast si nouveaux messages depuis le dernier poll
    if (count > _lastUnreadCount && _lastUnreadCount >= 0) {
      const diff = count - _lastUnreadCount;
      showToast(`💬 ${diff} nouveau${diff > 1 ? 'x' : ''} message${diff > 1 ? 's' : ''} !`, 'success');
    }
    _lastUnreadCount = count;

    // Badge sur le bouton Messagerie
    const badge = $('msg-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch {}
  clearTimeout(_unreadPollTimer);
  if (state.user) _unreadPollTimer = setTimeout(pollUnreadCount, 30000);
}

// ===== INIT =====
function init() {
  // Restore session
  const savedToken = localStorage.getItem('token');
  const savedUser  = localStorage.getItem('user');
  if (savedToken && savedUser) {
    try { state.user = JSON.parse(savedUser); } catch {}
  }

  // Nav links
  document.querySelectorAll('.nav-link').forEach(l => {
    l.addEventListener('click', e => { e.preventDefault(); navigate(l.dataset.page); });
  });
  document.querySelectorAll('.footer-links a[data-page]').forEach(l => {
    l.addEventListener('click', e => { e.preventDefault(); navigate(l.dataset.page); });
  });
  document.querySelector('.logo').addEventListener('click', e => { e.preventDefault(); navigate('accueil'); });

  // Modals close
  $('modal-close').onclick   = () => $('modal-overlay').classList.remove('open');
  $('annonce-close').onclick = () => $('annonce-overlay').classList.remove('open');
  $('modal-overlay').addEventListener('click',  e => { if (e.target === $('modal-overlay'))  $('modal-overlay').classList.remove('open'); });
  $('annonce-overlay').addEventListener('click', e => { if (e.target === $('annonce-overlay')) $('annonce-overlay').classList.remove('open'); });

  // FAB
  const fab = document.createElement('button');
  fab.className = 'fab'; fab.title = 'Publier une annonce'; fab.innerHTML = '+';
  fab.style.display = 'none'; fab.onclick = openNewAnnonceModal;
  document.body.appendChild(fab);

  updateHeader();
  render();

  // Handle email verification redirect
  const params = new URLSearchParams(window.location.search);
  if (params.get('verified') === '1') {
    setTimeout(() => showToast('✅ Email confirmé ! Vous pouvez maintenant vous connecter.', 'success'), 300);
    history.replaceState({}, '', '/');
  } else if (params.get('verified') === 'already') {
    setTimeout(() => showToast('Email déjà confirmé.', 'success'), 300);
    history.replaceState({}, '', '/');
  }
}

// Add api.js script tag if not present, then init
document.addEventListener('DOMContentLoaded', init);
