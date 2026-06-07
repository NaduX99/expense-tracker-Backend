const router = require('express').Router();
const pool = require('../db');

// ── GET /api/expenses/categories ─────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT category_id, category_name FROM CATEGORY ORDER BY category_name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/expenses ────────────────────────────────────────────
// Get expenses for a specific month (format: YYYY-MM)
router.get('/', async (req, res) => {
  const { month } = req.query; // optional, e.g., '2026-05'
  try {
    let query = `
      SELECT e.expense_id, c.category_name, e.amount, e.expense_date, e.note 
      FROM EXPENSE e
      JOIN CATEGORY c ON c.category_id = e.category_id
      WHERE e.user_id = ?
    `;
    const params = [req.user.user_id];

    if (month) {
      query += ` AND DATE_FORMAT(e.expense_date, '%Y-%m') = ?`;
      params.push(month);
    }
    
    query += ` ORDER BY e.expense_date DESC`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/expenses ───────────────────────────────────────────
// Add a new expense using the stored procedure
router.post('/', async (req, res) => {
  const { category_id, amount, expense_date, note } = req.body;

  if (!category_id || !amount || !expense_date) {
    return res.status(400).json({ success: false, message: 'Category, amount, and date are required.' });
  }

  try {
    // Calling stored procedure: sp_add_expense(p_user_id, p_category_id, p_amount, p_date, p_note)
    const [result] = await pool.query(
      'CALL sp_add_expense(?, ?, ?, ?, ?)',
      [req.user.user_id, category_id, amount, expense_date, note || null]
    );

    // Procedures return an array of result sets. The first result set is at index 0.
    res.status(201).json({
      success: true,
      message: 'Expense added successfully.',
      data: result[0][0] 
    });
  } catch (err) {
    // Handle SQL exceptions (like triggers blocking negative amounts)
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/expenses/:id ─────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM EXPENSE WHERE expense_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found or unauthorized.' });
    }
    res.json({ success: true, message: 'Expense deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
