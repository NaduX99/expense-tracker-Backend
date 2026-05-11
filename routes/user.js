const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");

// Register User
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    
    try {
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        db.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, hashedPassword],
            (err, result) => {
                if (err) {
                    console.error("Error creating user:", err);
                    return res.status(500).json({ error: "Failed to create user", details: err.sqlMessage });
                }
                res.status(201).json({ message: "User Created", user_id: result.insertId });
            }
        );
    } catch (error) {
        console.error("Hashing error:", error);
        res.status(500).json({ error: "Server error during registration" });
    }
});

// Login User
router.post("/login", (req, res) => {
    const { email, password } = req.body;
    
    // 1. Find user by email
    db.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, result) => {
            if (err) {
                console.error("Login Error:", err);
                return res.status(500).json({ error: "Login failed" });
            }

            if (result.length > 0) {
                const user = result[0];
                
                // 2. Compare hashed password
                const isMatch = await bcrypt.compare(password, user.password);
                
                if (isMatch) {
                    // Remove password from response for security
                    const { password, ...userWithoutPassword } = user;
                    res.json({ message: "Login Successful", user: userWithoutPassword });
                } else {
                    res.status(401).json({ error: "Invalid email or password" });
                }
            } else {
                res.status(401).json({ error: "Invalid email or password" });
            }
        }
    );
});

// Get All Users
router.get("/", (req, res) => {
    db.query("SELECT * FROM users", (err, result) => {
        if (err) return res.status(500).json({ error: "Failed to fetch users" });
        res.json(result);
    });
});

module.exports = router;
