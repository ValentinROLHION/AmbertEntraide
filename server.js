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

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌿 AmbertEntraide → http://localhost:${PORT}`);
});
