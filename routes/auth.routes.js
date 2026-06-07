// routes/auth.routes.js – Register & Login
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
const authGuard = require('../middleware/auth');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/mailer');

// ── POST /api/auth/register ──────────────────────────────────────
router.post('/register', async (req, res) => {
  const { full_name, email, phone, password } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Full name, email and password are required.' });
  }

  try {
    // Check duplicate email
    const [existing] = await pool.query(
      'SELECT user_id FROM USER_ACCOUNT WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO USER_ACCOUNT (full_name, email, phone, password) VALUES (?, ?, ?, ?)',
      [full_name, email, phone || null, hash]
    );

    const token = jwt.sign(
      { user_id: result.insertId, email, full_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    let emailStatus = { sent: false, simulated: false };
    try {
      emailStatus = await sendWelcomeEmail({ to: email, fullName: full_name });
    } catch (mailErr) {
      console.error(`[MAIL ERROR] Welcome email failed for ${email}:`, mailErr.message);
    }

    res.status(201).json({
      success: true,
      message: emailStatus.sent
        ? 'Account created successfully. A welcome email has been sent.'
        : emailStatus.simulated
        ? 'Account created successfully. Email is simulated because SMTP is not configured.'
        : 'Account created successfully. Welcome email could not be sent right now.',
      emailSent: emailStatus.sent,
      emailSimulated: emailStatus.simulated,
      token,
      user: { user_id: result.insertId, full_name, email }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT user_id, full_name, email, password FROM USER_ACCOUNT WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: { user_id: user.user_id, full_name: user.full_name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/recover ───────────────────────────────────────
router.get('/me', authGuard, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT user_id, full_name, email, phone FROM USER_ACCOUNT WHERE user_id = ?',
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/me', authGuard, async (req, res) => {
  const { full_name, email, phone, current_password, new_password } = req.body;

  if (!full_name || !email) {
    return res.status(400).json({ success: false, message: 'Full name and email are required.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT user_id, password FROM USER_ACCOUNT WHERE user_id = ?',
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const [duplicateEmail] = await pool.query(
      'SELECT user_id FROM USER_ACCOUNT WHERE email = ? AND user_id <> ?',
      [email, req.user.user_id]
    );

    if (duplicateEmail.length > 0) {
      return res.status(409).json({ success: false, message: 'Email is already used by another account.' });
    }

    let nextPasswordHash = rows[0].password;
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ success: false, message: 'Current password is required to set a new password.' });
      }

      const passwordOk = await bcrypt.compare(current_password, rows[0].password);
      if (!passwordOk) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }

      if (new_password.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      }

      nextPasswordHash = await bcrypt.hash(new_password, 12);
    }

    await pool.query(
      'UPDATE USER_ACCOUNT SET full_name = ?, email = ?, phone = ?, password = ? WHERE user_id = ?',
      [full_name, email, phone || null, nextPasswordHash, req.user.user_id]
    );

    const token = jwt.sign(
      { user_id: req.user.user_id, email, full_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      token,
      user: { user_id: req.user.user_id, full_name, email, phone: phone || null }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/me', authGuard, async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required to delete your account.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT password FROM USER_ACCOUNT WHERE user_id = ?',
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const passwordOk = await bcrypt.compare(password, rows[0].password);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Password is incorrect.' });
    }

    await pool.query('DELETE FROM USER_ACCOUNT WHERE user_id = ?', [req.user.user_id]);
    res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/recover', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT user_id, full_name, email FROM USER_ACCOUNT WHERE email = ?',
      [email]
    );

    if (rows.length > 0) {
      const user = rows[0];
      const resetToken = jwt.sign(
        { user_id: user.user_id, email: user.email, purpose: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      );
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl}?resetToken=${encodeURIComponent(resetToken)}`;

      try {
        await sendPasswordResetEmail({ to: user.email, fullName: user.full_name, resetUrl });
      } catch (mailErr) {
        console.error(`[MAIL ERROR] Password reset email failed for ${email}:`, mailErr.message);
      }
    }

    res.json({ success: true, message: 'If the email exists, a recovery link has been sent.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Reset token and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ success: false, message: 'Invalid reset token.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'UPDATE USER_ACCOUNT SET password = ? WHERE user_id = ? AND email = ?',
      [hash, decoded.user_id, decoded.email]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Invalid or expired reset link.' });
  }
});

module.exports = router;
