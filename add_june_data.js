const pool = require('./db');

async function addSampleData() {
  try {
    console.log('Adding sample data for June 2026...');

    // 1. Add Income for Nimal (user_id = 1) for June 2026
    await pool.query(`
      INSERT INTO INCOME (user_id, month_key, salary_amount, extra_income) 
      VALUES (1, '2026-06', 85000.00, 4500.00)
      ON DUPLICATE KEY UPDATE salary_amount = 85000.00;
    `);

    // 2. Add Budgets for Nimal for June 2026
    const budgets = [
      [1, 1, '2026-06', 22000.00], // Food
      [1, 2, '2026-06', 9000.00],  // Transport
      [1, 3, '2026-06', 6000.00],  // Bills
      [1, 4, '2026-06', 25000.00], // Rent
      [1, 6, '2026-06', 12000.00]  // Shopping
    ];
    for (const b of budgets) {
      await pool.query(`
        INSERT INTO BUDGET (user_id, category_id, month_key, budget_amount) 
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE budget_amount = VALUES(budget_amount);
      `, b);
    }

    // 3. Add Expenses for Nimal for June 2026
    const expenses = [
      [1, 1, 3200.00, '2026-06-01', 'Supermarket groceries'],
      [1, 2, 1500.00, '2026-06-02', 'Train tickets'],
      [1, 4, 25000.00, '2026-06-02', 'Monthly Rent'],
      [1, 1, 1200.00, '2026-06-03', 'Lunch at cafe'],
      [1, 6, 8500.00, '2026-06-04', 'New sneakers']
    ];
    
    for (const e of expenses) {
      await pool.query(`
        INSERT INTO EXPENSE (user_id, category_id, amount, expense_date, note) 
        VALUES (?, ?, ?, ?, ?)
      `, e);
    }

    console.log('✅ June 2026 sample data successfully added for Nimal!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

addSampleData();
