const express = require("express");
const { supabase } = require("./supabase");

const router = express.Router();

const ALLOWED_ROOM_PREFIXES = ["CR", "CL", "TR", "CC"];

function isValidBatchForDivision(division, batch) {
  // null/undefined batch = the whole division shares the room, always valid
  if (batch === null || batch === undefined || batch === "") return true;
  return typeof batch === "string" && batch.charAt(0) === division;
}

function isTrackedRoomType(roomCode) {
  return ALLOWED_ROOM_PREFIXES.some((prefix) => roomCode.startsWith(prefix));
}

router.post("/", async (req, res) => {
  try {
    const { branch, specialisation, semester, division, roomSlots } = req.body;

    // specialisation is optional — common-year programmes (e.g. Diploma
    // Year 1, shared across all specialisations) don't have one yet.
    if (!branch || !semester || !division) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (!Array.isArray(roomSlots)) {
      return res.status(400).json({ error: "No room schedule data provided." });
    }

    // A single batch's timetable can only tell us where THEY have a
    // class — never that some other room is free. So we only ever
    // accept "busy" claims here. "Free" is inferred later by the
    // frontend from the absence of any busy claim for that slot, once
    // enough batches have been collected — it's never written directly.
    const busyOnly = roomSlots.filter((s) => s.status === "busy");

    // Batch now lives per-slot: a single upload can legitimately mix
    // whole-division slots (batch omitted) with B1-only / B2-only
    // slots (lab sessions where the division splits). Re-validate
    // each one independently against the division.
    const validBatch = busyOnly.filter((s) => isValidBatchForDivision(division, s.batch));
    const invalidBatchCount = busyOnly.length - validBatch.length;

    // Drop anything that isn't a tracked room type (labs, etc), even if
    // the client somehow sent them — same rule enforced twice.
    const cleanSlots = validBatch.filter((s) => typeof s.room === "string" && isTrackedRoomType(s.room.toUpperCase()));

    if (cleanSlots.length === 0) {
      return res.status(400).json({ error: "No trackable classroom slots found in this submission." });
    }

    const rows = cleanSlots.map((s) => ({
      room: s.room.toUpperCase(),
      floor: s.floor || null, // unknown until a real room directory exists
      day: s.day,             // "Mon".."Sat"
      slot_index: s.slotIndex, // 0-9, matches 8-9 .. 5-6
      status: "busy",
      branch,
      specialisation: specialisation || null,
      semester,
      division,
      batch: s.batch || null, // null = whole division shares this room
      submitted_at: new Date().toISOString()
    }));

    // Whole-division rows (batch null) and sub-batch rows dedupe against
    // two different unique constraints in the schema, so they need two
    // separate upserts.
    const wholeDivisionRows = rows.filter((r) => r.batch === null);
    const subBatchRows = rows.filter((r) => r.batch !== null);

    let savedCount = 0;
    if (wholeDivisionRows.length) {
      const { data, error } = await supabase
        .from("room_slots")
        .upsert(wholeDivisionRows, { onConflict: "room,day,slot_index,division", ignoreDuplicates: false })
        .select();
      if (error) {
        console.error("Supabase insert error (whole division):", error.message);
        return res.status(500).json({ error: "Could not save to the database." });
      }
      savedCount += data.length;
    }
    if (subBatchRows.length) {
      const { data, error } = await supabase
        .from("room_slots")
        .upsert(subBatchRows, { onConflict: "room,day,slot_index,division,batch" })
        .select();
      if (error) {
        console.error("Supabase insert error (sub-batch):", error.message);
        return res.status(500).json({ error: "Could not save to the database." });
      }
      savedCount += data.length;
    }

    return res.json({
      saved: savedCount,
      excluded: roomSlots.length - cleanSlots.length,
      invalidBatch: invalidBatchCount
    });
  } catch (err) {
    console.error("submit-timetable error:", err.message);
    return res.status(500).json({ error: "Something went wrong while submitting." });
  }
});

module.exports = router;
