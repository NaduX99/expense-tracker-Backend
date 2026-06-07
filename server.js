const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authGuard = require('./middleware/auth');

const authRoutes = require('./routes/auth.routes');
const expenseRoutes = require('./routes/expense.routes');
const budgetRoutes = require('./routes/budget.routes');
const incomeRoutes = require('./routes/income.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();

// ======================
// MIDDLEWARE
// ======================
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json());

// ======================
// ROUTES
// ======================

// Public
app.use('/api/auth', authRoutes);

// Protected
app.use('/api/expenses', authGuard, expenseRoutes);
app.use('/api/budgets', authGuard, budgetRoutes);
app.use('/api/income', authGuard, incomeRoutes);
app.use('/api/dashboard', authGuard, dashboardRoutes);
app.use('/api/ai', authGuard, aiRoutes);

// ======================
// HEALTH CHECK
// ======================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Expense API is running!'
  });
});

// ======================
// ERROR HANDLER
// ======================
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  });
});

// ❌ REMOVE app.listen (Vercel does NOT allow it)

// ======================
// EXPORT (IMPORTANT FOR VERCEL)
// ======================
module.exports = app;
