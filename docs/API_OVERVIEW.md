# API Overview

All protected routes require an `Authorization: Bearer <token>` header.

## Public Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/recover`
- `POST /api/auth/reset-password`
- `GET /api/health`

## Protected Routes

- `/api/auth/me`
- `/api/expenses`
- `/api/budgets`
- `/api/income`
- `/api/dashboard`
- `/api/ai`

Most responses use the shape:

```json
{
  "success": true,
  "data": {}
}
```
