const express = require("express");
const router = express.Router();
const db = require("../db");

// Create Category
router.post("/add", (req, res) => {
    const { name, user_id } = req.body;
    db.query(
        "INSERT INTO categories (category_name, user_id) VALUES (?, ?)",
        [name, user_id],
        (err, result) => {
            if (err) {
                console.error("Error creating category:", err);
                return res.status(500).json({ error: "Failed to create category", details: err.sqlMessage });
            }
            res.status(201).json({ message: "Category Created", category_id: result.insertId });
        }
    );
});

// Get All Categories
router.get("/", (req, res) => {
    db.query("SELECT * FROM categories", (err, result) => {
        if (err) return res.status(500).json({ error: "Failed to fetch categories" });
        res.json(result);
    });
});

module.exports = router;
