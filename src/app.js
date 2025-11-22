const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./db');
const linksRouter = require('./routes/links');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/links', linksRouter);

// Favicon handler
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Stats page (MUST BE ABOVE redirect route)
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
          <head>
            <title>404 Not Found - TinyLink</title>
            <style>
              body { font-family: Segoe UI, Arial, sans-serif; background: #eef5fd; color: #3163b8; text-align: center; margin-top: 8em; }
              h1 { font-size: 3em; margin-bottom: 0.5em;}
              p { font-size: 1.2em;}
            </style>
          </head>
          <body>
            <h1>404 - Link Not Found</h1>
            <p>This short URL does not exist or has been deleted.</p>
          </body>
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

// Health check (important for Render & Railway)
app.get('/healthz', (req, res) => res.json({ status: "ok" }));

// Home page (root)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server normally (for local + Render + Railway)
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
