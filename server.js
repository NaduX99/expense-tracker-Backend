const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/expense", require("./routes/expense"));
app.use("/api/user", require("./routes/user"));
app.use("/api/category", require("./routes/category"));
app.use("/api/budget", require("./routes/budget"));

app.get("/", (req, res) => {
    res.send("Backend Running");
});

app.listen(5000, () => {
    console.log(`Server running on port 5000`);
});