# Maintenance Notes

## Security

- Keep `.env` out of git.
- Rotate API keys and SMTP app passwords if they are exposed.
- Use a long random `JWT_SECRET` in production.

## Data Helpers

- `add_june_data.js` inserts sample June 2026 data for local testing.
- `fix_passwords.js` updates known sample users with bcrypt password hashes.

Review helper scripts before running them against shared databases.
