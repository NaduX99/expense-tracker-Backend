const router = require('express').Router();
const pool = require('../db');

// ── GET /api/budgets/:month ──────────────────────────────────────
router.get('/:month', async (req, res) => {
  const { month } = req.params; // format: YYYY-MM
  try {
    const [rows] = await pool.query(
      `SELECT b.budget_id, c.category_id, c.category_name, b.budget_amount 
       FROM BUDGET b
       JOIN CATEGORY c ON c.category_id = b.category_id
       WHERE b.user_id = ? AND b.month_key = ?`,
      [req.user.user_id, month]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/budgets ────────────────────────────────────────────
// Set budget using stored procedure
router.post('/', async (req, res) => {
  const { category_id, month_key, amount } = req.body;

  if (!category_id || !month_key || amount === undefined) {
    return res.status(400).json({ success: false, message: 'Category, month_key, and amount are required.' });
  }

  try {
    const [result] = await pool.query(
      'CALL sp_set_budget(?, ?, ?, ?)',
      [req.user.user_id, category_id, month_key, amount]
    );
    res.status(200).json({ success: true, message: 'Budget set successfully.', data: result[0][0] });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
