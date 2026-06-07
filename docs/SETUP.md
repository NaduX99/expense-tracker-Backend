# Setup

## Environment

Create a `.env` file from `.env.example` and configure these groups:

- Database: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Auth: `JWT_SECRET`
- Server: `PORT`, `FRONTEND_URL`, `APP_NAME`
- AI: `GROQ_API_KEY`
- Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`

## Database

Import the project SQL schema before starting the API. The backend expects tables, views, and stored procedures used by the route files.

## Run

```bash
npm install
npm run dev
```
