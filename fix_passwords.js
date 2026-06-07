const bcrypt = require('bcryptjs');
const pool = require('./db');

async function fixPasswords() {
  try {
    const hash1 = await bcrypt.hash('password123', 12);
    const hash2 = await bcrypt.hash('securepass', 12);
    const hash3 = await bcrypt.hash('mypassword', 12);

    await pool.query('UPDATE USER_ACCOUNT SET password = ? WHERE user_id = 1', [hash1]); // Nimal
    await pool.query('UPDATE USER_ACCOUNT SET password = ? WHERE user_id = 2', [hash2]); // Kamala
    await pool.query('UPDATE USER_ACCOUNT SET password = ? WHERE user_id = 3', [hash3]); // Ruwan

    console.log('✅ Passwords updated to bcrypt hashes successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixPasswords();
