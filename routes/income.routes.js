const router = require('express').Router();
const pool = require('../db');

// ── GET /api/income/:month ───────────────────────────────────────
router.get('/:month', async (req, res) => {
  const { month } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT income_id, salary_amount, extra_income FROM INCOME WHERE user_id = ? AND month_key = ?',
      [req.user.user_id, month]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/income ─────────────────────────────────────────────
// Add/Update income using stored procedure
router.post('/', async (req, res) => {
  const { month_key, salary_amount, extra_income } = req.body;

  if (!month_key || salary_amount === undefined) {
    return res.status(400).json({ success: false, message: 'Month key and salary amount are required.' });
  }

  try {
    const [result] = await pool.query(
      'CALL sp_add_income(?, ?, ?, ?)',
      [req.user.user_id, month_key, salary_amount, extra_income || 0]
    );
    res.status(200).json({ success: true, message: 'Income updated.', data: result[0][0] });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
