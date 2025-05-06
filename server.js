const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const mongoose = require("mongoose");
const cors = require("cors");

const Schema = mongoose.Schema;
const app = express();
const port = 8080;
app.use(cors());

const upload = multer({ dest: "uploads/" });

// MongoDB connection
mongoose
  .connect(
    "mongodb+srv://ah01211293047:1Sc5YkBzDBYORnbA@cluster0.5h4nt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.post("/register-child", upload.single("image"), async (req, res) => {
  try {
    const { childName, parentId } = req.body;
    const imagePath = req.file.path;

    if (!childName || !parentId) {
      return res.status(400).json({ error: "Missing name or parent ID" });
    }

    const python = spawn("python3", [
      "register_user.py",
      childName,
      imagePath,
      parentId,
    ]);

    let data = "";
    let error = "";

    python.stdout.on("data", (chunk) => {
      data += chunk.toString();
    });

    python.stderr.on("data", (err) => {
      error += err.toString();
    });

    python.on("close", (code) => {
      if (error) {
        console.error("Python error:", error);
      }

      if (data.includes("Success:")) {
        res.status(200).json({ success: true, message: data.trim() });
      } else {
        res.status(400).json({ success: false, message: data.trim() });
      }
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
