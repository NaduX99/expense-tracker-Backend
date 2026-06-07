# Smart Expense Tracker Backend

Express and MySQL REST API for the Smart Daily Expenses Tracking and Management System.

## Features

- JWT authentication for protected finance routes
- User registration, login, profile update, account deletion, and password recovery
- Expense, budget, income, dashboard, and AI advisor endpoints
- MySQL connection pooling with stored procedure and view support
- Optional Groq AI integration with rule-based fallbacks
- Optional SMTP email delivery with simulated email fallback

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Update `.env` with your MySQL, JWT, AI, and SMTP settings before running the API.

## Scripts

- `npm start` runs the API with Node.
- `npm run dev` runs the API with Nodemon.

The default API port is `5000`.
