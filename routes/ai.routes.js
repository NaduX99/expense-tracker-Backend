const router = require('express').Router();
const pool = require('../db');
const Groq = require('groq-sdk');

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

function clampAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount / 100) * 100;
}

function buildFallbackBudgetPlan(categories, spendingRows, totalIncome) {
  const spentByCategory = new Map(
    spendingRows.map((row) => [Number(row.category_id), Number(row.spent || 0)])
  );
  const income = Math.max(Number(totalIncome || 0), 0);
  const flexiblePool = income > 0 ? income * 0.75 : 0;
  const equalShare = categories.length > 0 ? flexiblePool / categories.length : 0;

  return categories
    .map((category) => {
      const spent = spentByCategory.get(Number(category.category_id)) || 0;
      const hasHistory = spent > 0;
      const suggested = clampAmount(hasHistory ? Math.max(spent * 0.9, equalShare * 0.35) : equalShare * 0.45);

      return {
        category_id: category.category_id,
        category_name: category.category_name,
        suggested_amount: suggested,
        reason: hasHistory
          ? 'Based on this month spending, with a small reduction target.'
          : 'Starter target based on available monthly income.'
      };
    })
    .filter((item) => item.suggested_amount > 0);
}

function normalizeBudgetPlan(rawPlan, categories) {
  const validCategories = new Map(categories.map((category) => [Number(category.category_id), category]));

  return rawPlan
    .map((item) => {
      const categoryId = Number(item.category_id);
      const category = validCategories.get(categoryId);
      if (!category) return null;

      return {
        category_id: category.category_id,
        category_name: category.category_name,
        suggested_amount: clampAmount(item.suggested_amount),
        reason: String(item.reason || 'Recommended target for this category.').slice(0, 180)
      };
    })
    .filter((item) => item && item.suggested_amount > 0);
}

// ── GET /api/ai/tips/:month ────────────────────────────
// Get personalized financial tips based on the current month's summary
router.get('/tips/:month', async (req, res) => {
  const { month } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT total_income, total_expense, remaining_balance FROM vw_monthly_summary WHERE user_id = ? AND month_key = ?',
      [req.user.user_id, month]
    );
    
    const summary = rows[0] || { total_income: 0, total_expense: 0, remaining_balance: 0 };
    
    const prompt = `You are a financial advisor. A user has a total income of Rs ${summary.total_income}, total expenses of Rs ${summary.total_expense}, and a remaining balance of Rs ${summary.remaining_balance} for the month of ${month}. 
Provide exactly 3 concise, highly actionable, and encouraging financial tips tailored to this situation. Format them as a JSON array of strings, with no additional formatting or markdown. Example: ["Tip 1", "Tip 2", "Tip 3"]`;

    if (!groq) {
      return res.json({
        success: true,
        data: [
          "Track every expense to understand where your money goes.",
          "Set aside a portion of your income for an emergency fund.",
          "Review your budget weekly to stay on track."
        ],
        source: 'fallback'
      });
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 250,
    });

    let tips = [];
    try {
      // Parse the JSON array from the response
      const content = chatCompletion.choices[0]?.message?.content || '[]';
      // Basic cleanup in case model wrapped in ```json
      const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
      tips = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse Groq response:', chatCompletion.choices[0]?.message?.content);
      tips = [
        "Track every expense to understand where your money goes.",
        "Set aside a portion of your income for an emergency fund.",
        "Review your budget weekly to stay on track."
      ];
    }

    res.json({ success: true, data: tips });
  } catch (err) {
    console.error('AI Tips Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate tips' });
  }
});

// ── POST /api/ai/chat ────────────────────────────────────
// Chat endpoint for general financial advice
router.get('/budget-plan/:month', async (req, res) => {
  const { month } = req.params;

  try {
    const [[summaryRows], [categories], [spendingRows], [budgetRows]] = await Promise.all([
      pool.query(
        'SELECT total_income, total_expense, remaining_balance FROM vw_monthly_summary WHERE user_id = ? AND month_key = ?',
        [req.user.user_id, month]
      ),
      pool.query('SELECT category_id, category_name FROM CATEGORY ORDER BY category_name'),
      pool.query(
        `SELECT c.category_id, c.category_name, COALESCE(SUM(e.amount), 0) AS spent
         FROM CATEGORY c
         LEFT JOIN EXPENSE e ON e.category_id = c.category_id
          AND e.user_id = ?
          AND DATE_FORMAT(e.expense_date, '%Y-%m') = ?
         GROUP BY c.category_id, c.category_name
         ORDER BY c.category_name`,
        [req.user.user_id, month]
      ),
      pool.query(
        `SELECT c.category_id, c.category_name, b.budget_amount
         FROM BUDGET b
         JOIN CATEGORY c ON c.category_id = b.category_id
         WHERE b.user_id = ? AND b.month_key = ?`,
        [req.user.user_id, month]
      )
    ]);

    const summary = summaryRows[0] || { total_income: 0, total_expense: 0, remaining_balance: 0 };
    const fallbackPlan = buildFallbackBudgetPlan(categories, spendingRows, summary.total_income);

    if (!groq) {
      return res.json({
        success: true,
        data: fallbackPlan,
        source: 'fallback',
        message: 'AI service is not configured, so a rule-based budget plan was created.'
      });
    }

    const prompt = `Create a monthly budget plan for ${month}. Return only a JSON array.
Each item must be {"category_id": number, "suggested_amount": number, "reason": string}.
Use only these categories: ${JSON.stringify(categories)}.
Monthly summary: ${JSON.stringify(summary)}.
Current category spending: ${JSON.stringify(spendingRows)}.
Existing budgets: ${JSON.stringify(budgetRows)}.
Prefer practical LKR targets, round to the nearest 100, keep total suggested budgets below income when income is available, and include categories even if no budget exists yet.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.35,
      max_tokens: 900
    });

    const content = chatCompletion.choices[0]?.message?.content || '[]';
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedPlan = JSON.parse(cleanContent);
    const plan = normalizeBudgetPlan(Array.isArray(parsedPlan) ? parsedPlan : [], categories);

    res.json({
      success: true,
      data: plan.length > 0 ? plan : fallbackPlan,
      source: plan.length > 0 ? 'ai' : 'fallback'
    });
  } catch (err) {
    console.error('AI Budget Plan Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate budget plan' });
  }
});

router.post('/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, message: 'Invalid messages format' });
  }

  try {
    if (!groq) {
      return res.json({
        success: true,
        data: {
          role: 'assistant',
          content: 'AI chat is not configured yet. Add GROQ_API_KEY to the backend .env file to enable live chat.'
        }
      });
    }

    // Prefix system message to guide the AI
    const systemMessage = {
      role: 'system',
      content: 'You are an expert, friendly financial advisor integrated into a daily expense tracking app called Smart Expense Tracker. Provide concise, helpful, and professional advice.'
    };
    
    const apiMessages = [systemMessage, ...messages];

    const chatCompletion = await groq.chat.completions.create({
      messages: apiMessages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = chatCompletion.choices[0]?.message?.content || 'I am currently unable to provide advice. Please try again later.';
    res.json({ success: true, data: { role: 'assistant', content: reply } });
  } catch (err) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ success: false, message: 'Failed to chat with AI' });
  }
});

module.exports = router;
