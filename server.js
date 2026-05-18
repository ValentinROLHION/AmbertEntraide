require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/annonces',   require('./routes/annonces'));
app.use('/api/actualites', require('./routes/actualites'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/stats',      require('./routes/stats'));
app.use('/api/profile',    require('./routes/profile'));
app.use('/api/messages',   require('./routes/messages'));

// Serve static frontend files — cache CSS/JS/images agressively, HTML never
app.use(express.static(path.join(__dirname), {
  etag: true,
  lastModified: true,
  setHeaders(res, filePath) {
    if (/\.(woff2?|ttf|otf|eot|ico|png|jpe?g|webp|svg|gif)$/i.test(filePath)) {
      // Images et fonts : cache long (ne changent pas souvent)
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (/\.(css|js)$/i.test(filePath)) {
      // JS/CSS : revalidation systématique via ETag
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// En local : démarrer le serveur normalement
// Sur Vercel : exporter l'app (pas de listen)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🌿 AmbertEntraide → http://localhost:${PORT}`);
  });
}

module.exports = app;
