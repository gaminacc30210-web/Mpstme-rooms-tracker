const express = require("express");
const { supabase } = require("./supabase");

const router = express.Router();

const ALLOWED_ROOM_PREFIXES = ["CR", "CL", "TR", "CC"];

function isValidBatchForDivision(division, batch) {
  // '' (or missing) batch = the whole division shares the room, always valid
  if (!batch) return true;
  return typeof batch === "string" && batch.charAt(0) === division;
}

function isTrackedRoomType(roomCode) {
  return ALLOWED_ROOM_PREFIXES.some((prefix) => roomCode.startsWith(prefix));
}

router.post("/", async (req, res) => {
  try {
    const { branch, specialisation, semester, division, roomSlots } = req.body;

    if (!branch || !semester || !division) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (!Array.isArray(roomSlots)) {
      return res.status(400).json({ error: "No room schedule data provided." });
    }

    const busyOnly = roomSlots.filter((s) => s.status === "busy");
    const validBatch = busyOnly.filter((s) => isValidBatchForDivision(division, s.batch));
    const invalidBatchCount = busyOnly.length - validBatch.length;

    const cleanSlots = validBatch.filter((s) => typeof s.room === "string" && isTrackedRoomType(s.room.toUpperCase()));

    if (cleanSlots.length === 0) {
      return res.status(400).json({ error: "No trackable classroom slots found in this submission." });
    }

    const rows = cleanSlots.map((s) => ({
      room: s.room.toUpperCase(),
      floor: s.floor || null,
      day: s.day,
      slot_index: s.slotIndex,
      status: "busy",
      branch,
      specialisation: specialisation || null,
      semester,
      division,
      batch: s.batch || "",
      submitted_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from("room_slots")
      .upsert(rows, { onConflict: "room,day,slot_index,division,batch" })
      .select();

    if (error) {
      console.error("Supabase insert error:", error.message);
      return res.status(500).json({ error: "Could not save to the database." });
    }

    return res.json({
      saved: data.length,
      excluded: roomSlots.length - cleanSlots.length,
      invalidBatch: invalidBatchCount
    });
  } catch (err) {
    console.error("submit-timetable error:", err.message);
    return res.status(500).json({ error: "Something went wrong while submitting." });
  }
});

module.exports = router;
