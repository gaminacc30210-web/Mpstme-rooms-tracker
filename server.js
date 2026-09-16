require("dotenv").config();

const express = require("express");
const cors = require("cors");

const uploadRoute = require("./routes/upload");
const submitRoute = require("./routes/submit");
const roomsRoute = require("./routes/rooms");

const app = express();

// Only allow requests from your own frontend's origin in production.
// While developing locally with a simple file server / live-server, this
// covers the common localhost ports. Tighten this list before deploying.
const ALLOWED_ORIGINS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (e.g. curl, Postman) during dev
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }
  })
);

app.use(express.json({ limit: "2mb" }));

app.use("/api/upload-timetable", uploadRoute);
app.use("/api/submit-timetable", submitRoute);
app.use("/api/rooms", roomsRoute);

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`MPSTME Rooms backend running on http://localhost:${PORT}`);
});
