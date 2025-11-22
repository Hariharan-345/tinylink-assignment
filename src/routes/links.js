const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET all links
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM links ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST create new link
router.post('/', async (req, res) => {
  const { original_url } = req.body;
  if (!original_url) {
    return res.status(400).json({ error: 'original_url is required' });
  }
  const short_code = require('nanoid').nanoid(7);
  try {
    await pool.query(
      'INSERT INTO links (original_url, short_code) VALUES ($1, $2) ON CONFLICT (short_code) DO NOTHING',
      [original_url, short_code]
    );
    const result = await pool.query('SELECT * FROM links WHERE original_url=$1', [original_url]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET stats for one short_code
router.get('/:code', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM links WHERE short_code=$1', [req.params.code]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// DELETE a short_code link
router.delete('/:code', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM links WHERE short_code=$1 RETURNING *', [req.params.code]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
