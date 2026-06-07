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

// Middleware
app.use(cors());
app.use(express.json());

// Public Routes
app.use('/api/auth', authRoutes);

// Protected Routes
app.use('/api/expenses', authGuard, expenseRoutes);
app.use('/api/budgets', authGuard, budgetRoutes);
app.use('/api/income', authGuard, incomeRoutes);
app.use('/api/dashboard', authGuard, dashboardRoutes);
app.use('/api/ai', authGuard, aiRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Smart Expense API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ðŸš€ Server running on port ${PORT}`);
});
