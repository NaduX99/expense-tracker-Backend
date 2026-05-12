const express = require("express");
const router = express.Router();
const db = require("../db");

// Set Budget
router.post("/set", (req, res) => {
    const { user_id, month, year, amount } = req.body;
    db.query(
        "INSERT INTO budget (user_id, month, year, amount) VALUES (?, ?, ?, ?)",
        [user_id, month, year, amount],
        (err, result) => {
            if (err) {
                console.error("Error setting budget:", err);
                return res.status(500).json({ error: "Failed to set budget", details: err.sqlMessage });
            }
            res.status(201).json({ message: "Budget Set", budget_id: result.insertId });
        }
    );
});

// Get Budget for a user
router.get("/user/:id", (req, res) => {
    const user_id = req.params.id;
    db.query(
        "SELECT * FROM budget WHERE user_id = ?",
        [user_id],
        (err, result) => {
            if (err) return res.status(500).json({ error: "Failed to fetch budget" });
            res.json(result);
        }
    );
});

module.exports = router;
