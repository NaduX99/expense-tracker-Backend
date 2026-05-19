const express = require("express");
const router = express.Router();
const db = require("../db");

// Add Expense using Procedure
router.post("/add", (req, res) => {
    const { user_id, category_id, amount, expense_date, note } = req.body;

    db.query(
        "CALL sp_add_expense(?, ?, ?, ?, ?)",
        [user_id, category_id, amount, expense_date, note],
        (err, result) => {
            if (err) {
                console.error("Error adding expense:", err);
                if (err.errno === 1452) {
                    return res.status(400).json({ error: "Invalid User ID or Category ID. Please ensure they exist." });
                }
                return res.status(500).json({ error: "Failed to add expense", details: err.sqlMessage });
            }
            res.status(201).json({ message: "Expense Added" });
        }
    );
});

// Get All Expenses for a user
router.get("/user/:id", (req, res) => {
    const user_id = req.params.id;
    db.query(
        "SELECT * FROM expenses WHERE user_id = ?",
        [user_id],
        (err, result) => {
            if (err) {
                console.error("Error fetching expenses:", err);
                return res.status(500).json({ error: "Failed to fetch expenses" });
            }
            res.json(result);
        }
    );
});

// Delete Expense
router.delete("/delete/:id", (req, res) => {
    const id = req.params.id;
    db.query(
        "CALL sp_delete_expense(?)",
        [id],
        (err, result) => {
            if (err) {
                console.error("Error deleting expense:", err);
                return res.status(500).json({ error: "Failed to delete expense" });
            }
            res.json({ message: "Deleted" });
        }
    );
});

// Update Expense
router.put("/update/:id", (req, res) => {
    const id = req.params.id;
    const { category_id, amount, expense_date, note } = req.body;
    db.query(
        "CALL sp_update_expense(?, ?, ?, ?, ?)",
        [id, category_id, amount, expense_date, note],
        (err, result) => {
            if (err) {
                console.error("Error updating expense:", err);
                return res.status(500).json({ error: "Failed to update expense" });
            }
            res.json({ message: "Updated" });
        }
    );
});

module.exports = router;