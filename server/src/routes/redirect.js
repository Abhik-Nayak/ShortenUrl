const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');

const router = express.Router();

// GET /:shortCode
router.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    const { rows } = await db.query(
      'SELECT * FROM urls WHERE short_code = $1',
      [shortCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const url = rows[0];

    if (url.expires_at && new Date(url.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This short URL has expired' });
    }

    // Record click in background
    const referrer = req.headers.referer || req.headers.referrer || null;
    const user_agent = req.headers['user-agent'] || null;
    const ip = req.ip || '';
    const visitor_hash = crypto
      .createHash('sha256')
      .update(ip + (user_agent || ''))
      .digest('hex')
      .substring(0, 16);

    db.query(
      'INSERT INTO clicks (url_id, referrer, user_agent, visitor_hash) VALUES ($1, $2, $3, $4)',
      [url.id, referrer, user_agent, visitor_hash]
    ).catch(() => {});

    res.redirect(301, url.original_url);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
