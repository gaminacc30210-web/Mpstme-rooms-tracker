const express = require("express");
const multer = require("multer");
const { extractTimetableFields } = require("./gemini");

const router = express.Router();

// Keep the uploaded file in memory only — we forward it straight to
// Gemini and never write it to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type: " + file.mimetype));
    }
  }
});

router.post("/", upload.single("timetable"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Expected field name 'timetable'." });
    }

    const base64Data = req.file.buffer.toString("base64");

    const parsed = await extractTimetableFields({
      base64Data,
      mimeType: req.file.mimetype
    });

    // The frontend only ever sees the parsed fields, never the Gemini
    // response verbatim and never the API key.
    return res.json({ fields: parsed });
  } catch (err) {
    console.error("upload-timetable error:", err.message);
    return res.status(500).json({ error: "Could not read the timetable. Try a clearer photo, or enter it manually." });
  }
});

module.exports = router;
