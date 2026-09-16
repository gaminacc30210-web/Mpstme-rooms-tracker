const express = require("express");
const { supabase } = require("../lib/supabase");

const router = express.Router();

// GET /api/rooms?floor=4  (floor optional — omit to get everything)
router.get("/", async (req, res) => {
  try {
    let query = supabase.from("room_slots").select("*");
    if (req.query.floor) {
      query = query.eq("floor", req.query.floor);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Supabase read error:", error.message);
      return res.status(500).json({ error: "Could not load room data." });
    }

    // Group into { [room]: { [day]: { [slotIndex]: [occupant, ...] } } }
    // A slot can have more than one occupant row if the division split
    // into sub-batches using different rooms doesn't collide here, but
    // the SAME room/day/slot could in theory get claimed by more than
    // one division if there's a real scheduling conflict — surfacing
    // that as a list (rather than picking one) makes a contradiction
    // visible instead of silently overwriting it.
    const grouped = {};
    for (const row of data) {
      grouped[row.room] ??= {};
      grouped[row.room][row.day] ??= {};
      grouped[row.room][row.day][row.slot_index] ??= [];
      grouped[row.room][row.day][row.slot_index].push({
        branch: row.branch,
        specialisation: row.specialisation,
        semester: row.semester,
        division: row.division,
        batch: row.batch // null = whole division
      });
    }

    return res.json({ rooms: grouped });
  } catch (err) {
    console.error("rooms read error:", err.message);
    return res.status(500).json({ error: "Something went wrong loading room data." });
  }
});

module.exports = router;
