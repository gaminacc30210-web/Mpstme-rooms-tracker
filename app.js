/* ---------------- backend config ---------------- */
// The browser only ever talks to this local server — never to Gemini
// or Supabase directly. No API keys live anywhere in this file.
const API_BASE = "https://mpstme-rooms-tracker.onrender.com";

/* ---------------- data ---------------- */
const FLOORS = ["LG","G","1","2","3","4","5","6","7","8"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat"];
const SLOTS = ["8-9","9-10","10-11","11-12","12-1","1-2","2-3","3-4","4-5","5-6"];
const TYPES = { CR:"Classroom", CL:"Computer lab", TR:"Tutorial room", CC:"CC room" };

// Real room directory, pulled from the floor plan signage. Codes have the
// "E" prefix dropped (it just meant "Electronics building block" on the
// signage, not a room type). Every room starts with no data — schedules
// only fill in once real timetables are uploaded, no seeded demo data.
const ROOM_CODES = {
  LG: { tracked: ["CR-LG1"], excluded: ["Small Auditorium","Cafeteria","Big Seminar Hall","Student Council Room","Kitchen Area"] },
  G:  { tracked: ["CR-G1","CR-G2","CR-G3","CR-G4","CR-G5"], excluded: ["IBMS Room","Exam 1","Exam 2","Exam 3","E Yantra Lab","Administration","Kitchen Area"] },
  "1": { tracked: ["CL-101","CL-102","CR-103","CR-104","CR-105","CR-106","CR-107","CR-108"], excluded: ["Dean's Office Area","Hardware Lab 1","Hardware Lab 2","Hardware Lab 3","Kitchen Area"] },
  "2": { tracked: ["CC-201","CR-201","CR-202","CR-203","CR-204","CR-205","CR-206","CR-207","CR-208","CR-209","TR-201","TR-202","TR-203"], excluded: ["Physics Lab","Commerce Library"] },
  "3": { tracked: ["CC-301","CR-301","CR-302","CR-303","CR-304","CR-305","CR-306","CR-307","CR-308","CR-309","CR-310","TR-301","TR-302","TR-303"], excluded: ["Girl Common Room"] },
  "4": { tracked: ["CL-401","CL-402","CL-403","CL-404","CL-405","CL-406","CL-407","CL-408","CR-401","CR-402","CR-403","CR-404","CR-405","CR-406","CR-407","CR-408","TR-401"], excluded: ["Digital Electronic Lab","Embedded System Lab"] },
  "5": { tracked: ["CL-501","CL-502","CL-503","CL-504","CL-505","CL-506","CR-501","CR-502","CR-503","CR-504","CR-505","CR-506","CR-507","CR-508","CR-509","TR-501"], excluded: ["Boys Common Room"] },
  "6": { tracked: ["CL-601","CL-602","CL-603","CR-601","CR-602","CR-603","CR-604","CR-605","CR-606","CR-607","CR-608","CR-609","TR-601"], excluded: ["Robotics Lab","AI Lab","Basic Communication Lab","Advanced Communication Lab","Common Component Studio"] },
  "7": { tracked: ["CL-701","CL-702","CL-703","CL-704","CL-705","CL-706","CR-701","CR-702","CC-701","CC-702"], excluded: ["AR/VR Lab","Library"] },
  "8": { tracked: ["CR-801","CL-801","CL-804","CC-802","CC-803"], excluded: ["Hydraulics Lab","Automation Lab","Sensor/IoT Lab","Pneumatics Lab","Additive Manufacturing Lab","Recording Studio"] }
};

function typeFromCode(code){
  return code.split("-")[0]; // "CR-104" -> "CR"
}

// Reverse lookup: room code -> floor, built once from ROOM_CODES so a
// typed code (e.g. "CL-102") resolves to a real floor instead of null.
const ROOM_TO_FLOOR = {};
Object.entries(ROOM_CODES).forEach(([floor, { tracked }]) => {
  tracked.forEach(code => { ROOM_TO_FLOOR[code.toUpperCase()] = floor; });
});
function floorForRoom(code){
  return ROOM_TO_FLOOR[code.toUpperCase()] || null;
}

function buildRooms(){
  const rooms = {};
  FLOORS.forEach(floor => {
    const { tracked, excluded } = ROOM_CODES[floor];
    const list = tracked.map(code => ({
      code,
      type: typeFromCode(code),
      floor,
      // occupants[day][slot] = array of {branch, specialisation, semester, division, batch}
      // Empty array = no data. Never assumed free — see fetchLiveRoomData().
      occupants: DAYS.map(() => SLOTS.map(() => []))
    }));
    rooms[floor] = { list, excluded };
  });
  return rooms;
}
const ROOMS = buildRooms();

async function fetchLiveRoomData(){
  try{
    const res = await fetch(`${API_BASE}/api/rooms`);
    if(!res.ok) return; // backend not reachable yet — leave everything as "no data"
    const { rooms } = await res.json();

    Object.values(ROOMS).forEach(floorData => {
      floorData.list.forEach(room => {
        const liveRoom = rooms[room.code];
        if(!liveRoom) return;
        DAYS.forEach((day, di) => {
          const liveDay = liveRoom[day];
          if(!liveDay) return;
          SLOTS.forEach((_, si) => {
            const occ = liveDay[si];
            if(occ) room.occupants[di][si] = occ;
          });
        });
      });
    });
  } catch(err){
    console.warn("Could not load live room data — showing no data for everything.", err.message);
  }
}

function describeOccupant(o){
  const parts = [];
  parts.push(`Div ${o.division}${o.batch ? " " + o.batch : ""}`);
  if(o.specialisation) parts.push(o.specialisation);
  return parts.join(" · ");
}

const SPECS = {
  diploma: ["Common (Year 1, all specialisations)","Computer engineering","Computer science and engineering","Information technology","Mechanical"],
  btech: ["Computer engineering","Computer science","Cybersecurity","Information technology","Artificial intelligence","Data science","Mechanical","Civil","Chemical","EXTC","Mechatronics"],
  "btech-mba": ["Computer engineering","Information technology","Data science","Artificial intelligence"],
  mtech: ["Computer engineering","Mechanical","Civil"]
};

/* ---------------- view switching ---------------- */
function showView(id){
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  const tabMap = { "view-home":"home", "view-upload":"upload", "view-file":"upload", "view-confirm":"upload", "view-schedule":"upload", "view-success":"upload", "view-room":"home" };
  const t = document.querySelector(`.tab-btn[data-view="${tabMap[id]}"]`);
  if(t) t.classList.add("active");
}
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    showView(btn.dataset.view === "home" ? "view-home" : "view-upload");
  });
});

/* ---------------- clock ---------------- */
function tickClock(){
  const now = new Date();
  document.getElementById("clock").textContent = now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
}
tickClock(); setInterval(tickClock, 30000);

/* ---------------- home / floor grid ---------------- */
let currentFloor = "1";
const currentHourIndex = (() => {
  const h = new Date().getHours();
  const idx = h - 8;
  return idx >= 0 && idx < SLOTS.length ? idx : 0;
})();
const currentDayIndex = (() => {
  const d = new Date().getDay(); // 0 Sun .. 6 Sat
  return d === 0 ? 5 : d - 1;    // map Sun->Sat's slot as fallback
})();

function renderFloorRail(){
  const rail = document.getElementById("floor-rail");
  rail.innerHTML = "";
  FLOORS.forEach(f => {
    const b = document.createElement("button");
    b.textContent = f;
    if(f === currentFloor) b.classList.add("active");
    b.addEventListener("click", () => { currentFloor = f; renderFloorRail(); renderRoomGrid(); });
    rail.appendChild(b);
  });
}

function renderRoomGrid(){
  const grid = document.getElementById("room-grid");
  grid.innerHTML = "";
  const data = ROOMS[currentFloor];
  let occupiedCount = 0;

  data.list.forEach(room => {
    const occ = room.occupants[currentDayIndex][currentHourIndex];
    const isBusy = occ.length > 0;
    if(isBusy) occupiedCount++;
    const card = document.createElement("button");
    card.className = "room-card " + (isBusy ? "busy" : "nodata");
    card.innerHTML = `
      <div class="code">${room.code}</div>
      <div class="status">${isBusy ? "Occupied — " + occ.map(describeOccupant).join(" / ") : "No data"}</div>
    `;
    card.addEventListener("click", () => openRoomDetail(room));
    grid.appendChild(card);
  });

  document.getElementById("free-count").textContent = `${occupiedCount} occupied right now`;

  const note = document.getElementById("excluded-note");
  note.textContent = data.excluded.length
    ? `Also on this floor, not tracked: ${data.excluded.join(", ")}.`
    : "";
}

/* ---------------- room weekly detail ---------------- */
function openRoomDetail(room){
  document.getElementById("detail-code").textContent = room.code;
  document.getElementById("detail-type").textContent = TYPES[room.type];

  const table = document.getElementById("week-table");
  let html = "<thead><tr><th>Day</th>";
  SLOTS.forEach(s => html += `<th>${s}</th>`);
  html += "</tr></thead><tbody>";
  DAYS.forEach((day, di) => {
    html += `<tr><td>${day}</td>`;
    room.occupants[di].forEach(occ => {
      const isBusy = occ.length > 0;
      const cls = isBusy ? "busy" : "nodata";
      const label = isBusy ? occ.map(describeOccupant).join("<br>") : "—";
      html += `<td class="${cls}">${label}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody>";
  table.innerHTML = html;

  showView("view-room");
}
document.getElementById("back-to-home").addEventListener("click", () => showView("view-home"));

/* ---------------- upload flow ---------------- */
document.getElementById("opt-photo").addEventListener("click", () => {
  showView("view-file");
});
document.getElementById("opt-manual").addEventListener("click", () => {
  fillConfirmForm({ branch:"btech", spec:"Computer engineering", sem:1, division:"A", batch:"A1" });
  showView("view-confirm");
});

document.getElementById("dropzone").addEventListener("dragover", e => e.preventDefault());
document.getElementById("dropzone").addEventListener("drop", e => {
  e.preventDefault();
  if(e.dataTransfer.files.length){
    document.getElementById("f-file-input").files = e.dataTransfer.files;
    handleFileChosen(e.dataTransfer.files[0]);
  }
});
document.getElementById("f-file-input").addEventListener("change", e => {
  if(e.target.files.length) handleFileChosen(e.target.files[0]);
});
let selectedFile = null;
function handleFileChosen(file){
  selectedFile = file;
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  document.getElementById("dropzone-icon").textContent = isPdf ? "\u{1F4C4}" : "\u{1F5BC}\uFE0F";
  document.getElementById("dropzone-text").textContent = file.name + " (" + Math.round(file.size/1024) + " KB)";
  document.getElementById("file-continue").disabled = false;
}
document.getElementById("file-back").addEventListener("click", () => showView("view-upload"));

document.getElementById("file-continue").addEventListener("click", async () => {
  if(!selectedFile) return;

  const btn = document.getElementById("file-continue");
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Reading...";

  try{
    const formData = new FormData();
    formData.append("timetable", selectedFile);

    // The browser only talks to our own backend here. Gemini is called
    // server-side, using a key that never reaches this file.
    const res = await fetch(`${API_BASE}/api/upload-timetable`, {
      method: "POST",
      body: formData
    });

    if(!res.ok){
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Could not read the file.");
    }

    const { fields } = await res.json();

    // If a field wasn't clearly visible in the image, don't pre-fill a
    // guess at all — leave it blank so the student has to type it
    // themselves, rather than risk them not noticing a wrong guess and
    // it ending up in the database unverified.
    const CONFIDENCE_THRESHOLD = 0.5;
    const conf = fields.confidence || {};
    const keep = (key, val) => (conf[key] !== undefined && conf[key] < CONFIDENCE_THRESHOLD) ? "" : val;

    fillConfirmForm({
      branch: keep("branch", fields.branch) || "btech",
      spec: keep("specialisation", fields.specialisation),
      sem: keep("semester", fields.semester),
      division: keep("division", fields.division),
      batch: keep("batch", fields.batch)
    });
    // Gemini's raw guess at the weekly schedule pre-fills the editable
    // grid on the next screen — the student corrects it there, same as
    // any other OCR-misread field.
    pendingSchedule = fields.schedule || null;

    showView("view-confirm");
  } catch(err){
    alert(err.message + " You can also try entering it manually instead.");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

let pendingSchedule = null; // set by OCR path, null for manual entry

function fillConfirmForm(vals){
  const branchSel = document.getElementById("f-branch");
  const specSel = document.getElementById("f-spec");
  const semSel = document.getElementById("f-sem");
  const divSel = document.getElementById("f-division");
  const batchSel = document.getElementById("f-batch");

  branchSel.value = vals.branch;
  specSel.innerHTML = SPECS[vals.branch].map(s => `<option ${s===vals.spec?"selected":""}>${s}</option>`).join("");
  semSel.innerHTML = Array.from({length:10},(_,i)=>`<option value="${i+1}" ${i+1===vals.sem?"selected":""}>${i+1}</option>`).join("");
  divSel.innerHTML = Array.from({length:6},(_,i)=>{
    const l = String.fromCharCode(65+i);
    return `<option value="${l}" ${l===vals.division?"selected":""}>${l}</option>`;
  }).join("");
  fillBatchOptions(vals.division, vals.batch);

  divSel.onchange = () => { fillBatchOptions(divSel.value); validateForm(); };
  batchSel.onchange = validateForm;
  branchSel.onchange = () => { specSel.innerHTML = SPECS[branchSel.value].map(s=>`<option>${s}</option>`).join(""); };

  validateForm();
}

function fillBatchOptions(division, selected){
  const batchSel = document.getElementById("f-batch");
  const options = [`<option value="">Whole division (no split)</option>`];
  for(let i=1;i<=5;i++){
    const v = division + i;
    options.push(`<option value="${v}" ${v===selected?"selected":""}>${v}</option>`);
  }
  batchSel.innerHTML = options.join("");
  if(selected === undefined || selected === "") batchSel.value = "";
}

function validateForm(){
  const div = document.getElementById("f-division").value;
  const batch = document.getElementById("f-batch").value;
  const ok = batch === "" || batch.charAt(0) === div; // empty = whole division, always valid
  document.getElementById("f-error").style.display = ok ? "none" : "block";
  document.getElementById("f-division").classList.toggle("warn", !ok);
  document.getElementById("f-batch").classList.toggle("warn", !ok);
  return ok;
}

document.getElementById("f-back").addEventListener("click", () => showView("view-upload"));
document.getElementById("f-submit").addEventListener("click", () => {
  if(!validateForm()) return;
  renderScheduleTable(pendingSchedule);
  showView("view-schedule");
});

/* ---------------- weekly schedule input ---------------- */
// Each cell accepts "ROOMCODE" (whole division shares the room) or
// "ROOMCODE:BATCH" (only that sub-batch is there — e.g. "CL-102:B1"
// when the division splits for a lab while another sub-batch is
// elsewhere at the same hour).
const TRACKED_PREFIXES = ["CR","CL","TR","CC"];

function parseCell(raw){
  const [room, batch] = raw.trim().toUpperCase().split(":");
  return { room, batch: batch || null };
}

function renderScheduleTable(prefill){
  const table = document.getElementById("schedule-table");
  let html = "<thead><tr><th>Day</th>";
  SLOTS.forEach(s => html += `<th>${s}</th>`);
  html += "</tr></thead><tbody>";

  DAYS.forEach(day => {
    html += `<tr><td>${day}</td>`;
    SLOTS.forEach((_, si) => {
      const prefillVal = (prefill && prefill[day] && prefill[day][si]) ? prefill[day][si] : "";
      html += `<td><input type="text" data-day="${day}" data-slot="${si}" value="${prefillVal}" placeholder="—" /></td>`;
    });
    html += "</tr>";
  });
  html += "</tbody>";
  table.innerHTML = html;

  table.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", () => flagIfUntracked(input));
    flagIfUntracked(input);
  });

  updateScheduleHint();
}

function flagIfUntracked(input){
  const val = input.value.trim();
  if(val === ""){ input.classList.remove("excluded-type","unknown-code"); updateScheduleHint(); return; }
  const { room } = parseCell(val);
  const isTracked = TRACKED_PREFIXES.some(p => room.startsWith(p));
  input.classList.toggle("excluded-type", !isTracked);
  // A tracked-looking code (right prefix) that isn't in the real floor
  // directory at all is probably a typo, or a room the directory
  // doesn't have yet — flag it distinctly from "excluded by type".
  input.classList.toggle("unknown-code", isTracked && !floorForRoom(room));
  updateScheduleHint();
}

function updateScheduleHint(){
  const inputs = [...document.querySelectorAll("#schedule-table input")];
  const filled = inputs.filter(i => i.value.trim() !== "").length;
  const excluded = inputs.filter(i => i.classList.contains("excluded-type")).length;
  const unknown = inputs.filter(i => i.classList.contains("unknown-code")).length;
  let msg = `${filled} slots filled`;
  if(excluded) msg += ` — ${excluded} won't be counted (not a CR/CL/TR/CC code — check for a typo or a lab code)`;
  if(unknown) msg += ` — ${unknown} not found in the floor directory (check the code, or it may be missing from the directory)`;
  msg += `. Add ":B1" or ":B2" after a room code if only that batch is there (e.g. "CL-102:B1"); leave it off if the whole division shares the room.`;
  document.getElementById("schedule-hint").textContent = msg;
}

document.getElementById("sched-back").addEventListener("click", () => showView("view-confirm"));

document.getElementById("sched-submit").addEventListener("click", async () => {
  const branch = document.getElementById("f-branch").value;
  const spec = document.getElementById("f-spec").value;
  const sem = document.getElementById("f-sem").value;
  const div = document.getElementById("f-division").value;

  const roomSlots = [];
  document.querySelectorAll("#schedule-table input").forEach(input => {
    const raw = input.value.trim();
    if(!raw) return; // blank = no class / lunch / library / lab — not submitted
    const { room, batch } = parseCell(raw);
    if(!room) return;
    roomSlots.push({
      room,
      floor: floorForRoom(room), // resolved from the real floor directory, not hardcoded
      day: input.dataset.day,
      slotIndex: Number(input.dataset.slot),
      batch,       // null = whole division shares this room
      status: "busy" // a batch can only claim where it IS, never that another room is free
    });
  });

  if(roomSlots.length === 0){
    alert("Fill in at least one class slot before submitting.");
    return;
  }

  const btn = document.getElementById("sched-submit");
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Submitting...";

  try{
    const res = await fetch(`${API_BASE}/api/submit-timetable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch, specialisation: spec || null, semester: Number(sem), division: div, roomSlots })
    });

    if(!res.ok){
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Could not submit.");
    }

    const result = await res.json();
    document.getElementById("success-sub").textContent =
      `Sem ${sem}, Division ${div}: ${result.saved} slots saved` +

      (result.excluded ? `, ${result.excluded} excluded.` : ".");
    showView("view-success");
  } catch(err){
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

document.getElementById("s-another").addEventListener("click", () => showView("view-upload"));
document.getElementById("s-grid").addEventListener("click", () => showView("view-home"));

/* ---------------- init ---------------- */
renderFloorRail();
renderRoomGrid();
fetchLiveRoomData().then(() => renderRoomGrid()); // re-render once live data lands
