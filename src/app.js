const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./db');
const linksRouter = require('./routes/links');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/links', linksRouter);

// Favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Health check FIRST
app.get('/healthz', (req, res) => res.json({ status: "ok" }));

// Home page 
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Stats page
app.get('/code/:code', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/stats.html'));
});

// Redirect for short URLs
app.get('/:code', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM links WHERE short_code=$1',
      [req.params.code]
    );

    if (result.rowCount === 0) {
      return res.status(404).send(`
        <html>
        <head><title>404 Not Found - TinyLink</title></head>
        <body><h1>404 - Link Not Found</h1><p>This short URL does not exist or has been deleted.</p></body>
        </html>
      `);
    }

    const link = result.rows[0];
    await pool.query(
      'UPDATE links SET click_count = click_count + 1, last_clicked = CURRENT_TIMESTAMP WHERE short_code=$1',
      [req.params.code]
    );

    return res.redirect(link.original_url);

  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

// Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
