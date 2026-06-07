const router = require('express').Router();
const pool = require('../db');

// ── GET /api/dashboard/summary/:month ────────────────────────────
// Get monthly summary using vw_monthly_summary view
router.get('/summary/:month', async (req, res) => {
  const { month } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT total_income, total_expense, remaining_balance FROM vw_monthly_summary WHERE user_id = ? AND month_key = ?',
      [req.user.user_id, month]
    );
    res.json({ success: true, data: rows[0] || { total_income: 0, total_expense: 0, remaining_balance: 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/dashboard/category-spending/:month ──────────────────
// Get budget vs actual spend per category using sp_category_cursor_summary
router.get('/category-spending/:month', async (req, res) => {
  const { month } = req.params;
  try {
    const [result] = await pool.query(
      'CALL sp_category_cursor_summary(?, ?)',
      [req.user.user_id, month]
    );
    res.json({ success: true, data: result[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/dashboard/alerts ────────────────────────────────────
// Get unread alerts
router.get('/alerts', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.alert_id, c.category_name, a.month_key, a.alert_message, a.alert_date 
       FROM ALERTS a
       JOIN CATEGORY c ON a.category_id = c.category_id
       WHERE a.user_id = ? 
       ORDER BY a.alert_date DESC LIMIT 10`,
      [req.user.user_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/dashboard/trends ────────────────────────────────────
// Get monthly income vs expense trends
router.get('/trends', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT month_key, total_income, total_expense, remaining_balance FROM vw_monthly_summary WHERE user_id = ? ORDER BY month_key ASC LIMIT 12',
      [req.user.user_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
