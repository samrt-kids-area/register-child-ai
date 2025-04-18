const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

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

// Define Schema
const faceSchema = new mongoose.Schema({
  encoding: [Number],
  createdAt: { type: Date, default: Date.now },
  name: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
    required: true,
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parent",
  },
});

const Children = mongoose.model("Children", faceSchema);
const ParentModel = mongoose.model("Parent", {
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
    required: true,
  },
  photoData: {
    type: [String],
    required: true,
  },
  children: [
    {
      type: Schema.Types.ObjectId,
      ref: "childrens",
    },
  ],
});

// Upload route (register face)
app.post("/register-child", upload.single("photo"), async (req, res) => {
  const parent = await ParentModel.findById(req.body.parentId);
  if (!parent) {
    return res.status(400).send({ error: "Parent not found" });
  }

  const python = spawn("python3", ["process_image.py", req.file.path]);

  let result = "";
  python.stdout.on("data", (data) => {
    result += data.toString();
  });

  python.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  python.on("close", async (code) => {
    fs.unlinkSync(req.file.path); // Delete temp file
    let parsedResult;

    try {
      parsedResult = JSON.parse(result);
    } catch (e) {
      return res
        .status(400)
        .send({ error: "Invalid image or no face detected" });
    }

    // Save to MongoDB
    const child = new Children({
      encoding: parsedResult,
      name: req.body.name,
      photo: req.body.photoURL,
      parent: req.body.parentId,
    });
    parent.children.push(child._id);
    await parent.save();
    await child.save();

    res.send({ message: "Image processed and saved", data: parsedResult });
  });
});

// Live stream route
app.get("/start-stream", (req, res) => {
  const python = spawn("python3", ["detect_live.py"]);

  python.stdout.on("data", (data) => {
    console.log(`Python says: ${data}`);
  });

  python.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  python.on("close", (code) => {
    res.send({ message: "Stream ended" });
  });
});

app.post("/check-face", upload.single("image"), async (req, res) => {
  const { childId, image } = req?.body;
  //{ childId, image }
  if (!childId || !image) {
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    const child = await Children.findOne({ _id: childId });

    if (!child) return res.json({ found: false });

    // احفظ الصورة مؤقتاً
    const base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
    const filePath = path.join(__dirname, "temp.jpg");
    fs.writeFileSync(filePath, base64Data, "base64");

    // شغّل سكريبت بايثون مع الإحداثيات
    const python = spawn("python3", [
      "process_face.py",
      filePath,
      JSON.stringify(child.encoding),
    ]);

    let data = "";

    python.stdout.on("data", (chunk) => {
      data += chunk.toString();
    });

    python.stderr.on("data", (err) => {
      console.error("Python error:", err.toString());
    });

    python.on("close", (code) => {
      console.log("Python process exited with code", code);
      try {
        const result = JSON.parse(data);
        res.json(result); // { found: true, box: { top, left, width, height } }
      } catch (err) {
        console.error("Parse error:", err);
        res.json({ found: false });
      }
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
