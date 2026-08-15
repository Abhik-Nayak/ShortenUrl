const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// POST /api/urls
router.post('/', async (req, res) => {
  try {
    const { original_url, expires_at } = req.body;

    if (!original_url) {
      return res.status(400).json({ error: 'original_url is required' });
    }

    const short_code = nanoid(7);

    const { rows } = await db.query(
      'INSERT INTO urls (user_id, short_code, original_url, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, short_code, original_url, expires_at || null]
    );

    res.status(201).json({ url: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create short URL' });
  }
});

// GET /api/urls
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.*, COUNT(c.id)::int AS click_count
       FROM urls u
       LEFT JOIN clicks c ON c.url_id = u.id
       WHERE u.user_id = $1
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [req.user.id]
    );

    res.json({ urls: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

// GET /api/urls/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.*, COUNT(c.id)::int AS click_count
       FROM urls u
       LEFT JOIN clicks c ON c.url_id = u.id
       WHERE u.id = $1 AND u.user_id = $2
       GROUP BY u.id`,
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }

    res.json({ url: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/urls/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM urls WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }

    res.json({ message: 'URL deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete URL' });
  }
});

// GET /api/urls/:id/analytics
router.get('/:id/analytics', async (req, res) => {
  try {
    // Verify ownership
    const urlResult = await db.query(
      'SELECT id, short_code, original_url, created_at FROM urls WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (urlResult.rows.length === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }

    const url = urlResult.rows[0];

    // All clicks
    const clicksResult = await db.query(
      'SELECT * FROM clicks WHERE url_id = $1 ORDER BY clicked_at DESC',
      [req.params.id]
    );
    const clicks = clicksResult.rows;

    // Clicks by date
    const clicksByDate = {};
    clicks.forEach((c) => {
      const date = c.clicked_at.toISOString().split('T')[0];
      clicksByDate[date] = (clicksByDate[date] || 0) + 1;
    });

    // Top referrers
    const refCounts = {};
    clicks.forEach((c) => {
      const ref = c.referrer || 'Direct';
      refCounts[ref] = (refCounts[ref] || 0) + 1;
    });
    const topReferrers = Object.entries(refCounts)
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top user agents
    const uaCounts = {};
    clicks.forEach((c) => {
      const ua = c.user_agent || 'Unknown';
      uaCounts[ua] = (uaCounts[ua] || 0) + 1;
    });
    const topUserAgents = Object.entries(uaCounts)
      .map(([user_agent, count]) => ({ user_agent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Unique visitors
    const uniqueVisitors = new Set(clicks.map((c) => c.visitor_hash)).size;

    res.json({
      url,
      total_clicks: clicks.length,
      unique_visitors: uniqueVisitors,
      clicks_by_date: clicksByDate,
      top_referrers: topReferrers,
      top_user_agents: topUserAgents,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
