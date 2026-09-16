const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from your .env file");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Below this, we treat the identity as "not clearly visible" and refuse
// to write anything guessed to the database. See upload.js for the gate
// that actually enforces this.
const MIN_IDENTITY_CONFIDENCE = 0.6;

const EXTRACTION_PROMPT = `
You are reading a photo or PDF of a college class timetable. A real
timetable usually covers one whole DIVISION for a semester, not a
single batch — most classes are attended by the whole division, and
only some slots (usually practicals/labs) split the division into
batches (e.g. B1 goes to one room, B2 to another, at the same hour).

Respond with STRICT JSON, nothing else, no markdown fences, no commentary:

{
  "branch": "diploma" | "btech" | "btech-mba" | "mtech",
  "specialisation": string,
  "semester": number,          // 1-10
  "division": string,          // single letter, A-F

  "confidence": {
    "branch": number,          // 0-1, how clearly this was printed/visible
    "specialisation": number,
    "semester": number,
    "division": number
  },

  "schedule": {
    "Mon": [ [...slot entries...], [...], ... 10 arrays, one per hourly slot ],
    "Tue": [ ... ],
    "Wed": [ ... ],
    "Thu": [ ... ],
    "Fri": [ ... ],
    "Sat": [ ... ]
  }
}

The 10 arrays per day correspond, in order, to: 8-9, 9-10, 10-11,
11-12, 12-1, 1-2, 2-3, 3-4, 4-5, 5-6.

Each slot entry is an array of objects like:
  { "batch": "ALL", "room": "CR-108" }
for a class the whole division attends together in that room, OR
  { "batch": "B1", "room": "CL-705" }, { "batch": "B2", "room": "CL-408" }
for a slot where the division splits into batches across different
rooms at the same hour.

Leave a slot's array EMPTY ([]) if: there is no class, it's a lunch
or library period, it's a break, or the room is a physical lab
(Physics Lab, Chemistry Lab, BEE Lab, Workshop, etc — anything that
isn't literally a CR/CL/TR/CC room code). Do not guess a lab's room
code as if it were a classroom.

Only ever report a room code exactly as printed (e.g. "CR-403",
"CL-408", "TR-401", "CC-701"). Never invent a division or batch that
isn't visually present in the image. If the identity fields
(branch/specialisation/semester/division) are genuinely not legible
in the image, still return your best guess for them but give an
honest, low confidence score — do not inflate confidence to seem sure.
`;

async function extractTimetableFields({ base64Data, mimeType }) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent([
    { text: EXTRACTION_PROMPT },
    {
      inlineData: {
        data: base64Data,
        mimeType
      }
    }
  ]);

  const responseText = result.response.text().trim();

  // Gemini is instructed not to use markdown fences, but strip them
  // defensively in case it does anyway.
  const cleaned = responseText.replace(/^```json\s*|```$/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error("Gemini did not return valid JSON: " + responseText);
  }

  return parsed;
}

module.exports = { extractTimetableFields, MIN_IDENTITY_CONFIDENCE };
