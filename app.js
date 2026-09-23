// ============================================================
// Poznámky - webová verze. Vše běží čistě v prohlížeči,
// data se ukládají do localStorage (žádný server, žádný X11).
// ============================================================

const STORAGE_KEY = "poznamky_data_v1";
const TRASH = "__trash__";
const ALL = "__all__";
const NONE = "__none__";
const DAY_NAMES_SHORT = ["Po", "Út", "St", "Čt", "Pá"];
const TRASH_KEEP_DAYS = 7;

function defaultPeriodTimes() {
  return {
    1: "08:00", 2: "08:50", 3: "09:50", 4: "10:40",
    5: "11:40", 6: "12:30", 7: "13:20", 8: "14:10",
    9: "15:00", 10: "15:50", 11: "16:40", 12: "17:30",
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.periodTimes = Object.assign(defaultPeriodTimes(), parsed.periodTimes || {});
      parsed.settings = Object.assign({ fontSize: 16 }, parsed.settings || {});
      parsed.schedule = parsed.schedule || {};
      parsed.categories = parsed.categories || [];
      parsed.notes = parsed.notes || [];
      parsed.nextId = parsed.nextId || 1;
      return parsed;
    }
  } catch (e) { /* fall through to defaults */ }
  return {
    categories: [],
    notes: [],
    schedule: {},
    periodTimes: defaultPeriodTimes(),
    settings: { fontSize: 16 },
    nextId: 1,
  };
}

let state = loadState();
let currentCategoryFilter = ALL;
let currentNoteId = null;
let autosaveTimer = null;

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nextId() {
  return state.nextId++;
}

function nowIso() {
  return new Date().toISOString();
}

function pad2(n) { return String(n).padStart(2, "0"); }

function todayStr() {
  const d = new Date();
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function dateStrFrom(d) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function hourLabel(hour, isDouble) {
  if (!hour) return "";
  return isDouble ? `${hour}.-${hour + 1}. hodina` : `${hour}. hodina`;
}

function purgeOldTrash() {
  const cutoff = Date.now() - TRASH_KEEP_DAYS * 24 * 60 * 60 * 1000;
  state.notes = state.notes.filter(n => !(n.deletedAt && new Date(n.deletedAt).getTime() < cutoff));
}

function hourByCurrentTime(now) {
  const entries = Object.entries(state.periodTimes)
    .map(([h, t]) => [parseInt(h, 10), t])
    .sort((a, b) => a[0] - b[0]);
  if (!entries.length) return 1;
  const cur = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  let hour = entries[0][0];
  for (const [hn, start] of entries) {
    if (cur >= start) hour = hn; else break;
  }
  return hour;
}

function categoryById(id) {
  return state.categories.find(c => c.id === id) || null;
}

// ============================================================
// DOM refs
// ============================================================
const $ = (id) => document.getElementById(id);
const categoryRail = $("categoryRail");
const notesUl = $("notesUl");
const searchInput = $("searchInput");
const titleInput = $("titleInput");
const categorySelect = $("categorySelect");
const dateInput = $("dateInput");
const hourInput = $("hourInput");
const doubleCheckbox = $("doubleCheckbox");
const hourPreview = $("hourPreview");
const editorContent = $("editorContent");
const statusBar = $("statusBar");
const normalActions = $("normalActions");
const trashActions = $("trashActions");
const btnNew = $("btnNew");

// ============================================================
// Kategorie / rail
// ============================================================
function renderCategoryRail() {
  categoryRail.innerHTML = "";

  const makeItem = (label, filterValue, extraClass) => {
    const li = document.createElement("li");
    li.className = "rail-item" + (extraClass ? " " + extraClass : "");
    if (currentCategoryFilter === filterValue) li.classList.add("active");
    li.textContent = label;
    li.addEventListener("click", () => setCategoryFilter(filterValue));
    categoryRail.appendChild(li);
  };

  makeItem("Všechny", ALL);
  makeItem("Bez kategorie", NONE);

  state.categories
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "cs"))
    .forEach(cat => makeItem(cat.name, cat.id));

  makeItem("🗑 Koš", TRASH, "trash");

  renderCategorySelect();
}

function renderCategorySelect() {
  categorySelect.innerHTML = "";
  const noneOpt = document.createElement("option");
  noneOpt.value = NONE;
  noneOpt.textContent = "Bez kategorie";
  categorySelect.appendChild(noneOpt);

  state.categories
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "cs"))
    .forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      categorySelect.appendChild(opt);
    });
}

function setCategoryFilter(value) {
  currentCategoryFilter = value;
  currentNoteId = null;
  clearEditor();
  setTrashMode(value === TRASH);
  renderCategoryRail();
  renderNotesList();
}

function setTrashMode(isTrash) {
  normalActions.hidden = isTrash;
  trashActions.hidden = !isTrash;
  btnNew.disabled = isTrash;
  titleInput.disabled = isTrash;
  dateInput.disabled = isTrash;
  hourInput.disabled = isTrash;
  doubleCheckbox.disabled = isTrash;
  categorySelect.disabled = isTrash;
  editorContent.contentEditable = !isTrash;
  $("btnBold").disabled = isTrash;
  $("btnItalic").disabled = isTrash;
}

$("btnAddCategory").addEventListener("click", () => {
  const name = prompt("Název kategorie:");
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  if (state.categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
    alert("Tato kategorie už existuje.");
    return;
  }
  state.categories.push({ id: nextId(), name: trimmed });
  save();
  renderCategoryRail();
});

$("btnDeleteCategory").addEventListener("click", () => {
  if (currentCategoryFilter === ALL || currentCategoryFilter === NONE || currentCategoryFilter === TRASH) {
    alert("Nejdřív vyber konkrétní kategorii v seznamu vlevo.");
    return;
  }
  const cat = categoryById(currentCategoryFilter);
  if (!cat) return;
  if (!confirm(`Smazat kategorii „${cat.name}“? Poznámky v ní zůstanou, jen přijdou o kategorii.`)) return;
  state.categories = state.categories.filter(c => c.id !== cat.id);
  state.notes.forEach(n => { if (n.categoryId === cat.id) n.categoryId = null; });
  Object.keys(state.schedule).forEach(k => {
    if (state.schedule[k] === cat.id) delete state.schedule[k];
  });
  currentCategoryFilter = ALL;
  save();
  renderCategoryRail();
  renderNotesList();
});

// ============================================================
// Seznam poznámek
// ============================================================
function visibleNotes() {
  const q = searchInput.value.trim().toLowerCase();
  return state.notes
    .filter(n => {
      if (currentCategoryFilter === TRASH) return !!n.deletedAt;
      if (n.deletedAt) return false;
      if (currentCategoryFilter === NONE) return !n.categoryId;
      if (currentCategoryFilter !== ALL) return n.categoryId === currentCategoryFilter;
      return true;
    })
    .filter(n => {
      if (!q) return true;
      const plain = (n.contentHtml || "").replace(/<[^>]+>/g, " ").toLowerCase();
      return n.title.toLowerCase().includes(q) || plain.includes(q);
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function renderNotesList() {
  const notes = visibleNotes();
  notesUl.innerHTML = "";

  if (!notes.length) {
    const div = document.createElement("div");
    div.className = "empty-hint";
    div.textContent = currentCategoryFilter === TRASH ? "Koš je prázdný." : "Žádné poznámky.";
    notesUl.appendChild(div);
    return;
  }

  notes.forEach(n => {
    const li = document.createElement("li");
    li.className = "note-li" + (n.id === currentNoteId ? " selected" : "");

    const badge = document.createElement("span");
    badge.className = "hour-badge";
    const hl = hourLabel(n.hour, n.isDouble);
    badge.textContent = n.hour ? (n.isDouble ? `${n.hour}-${n.hour + 1}` : `${n.hour}.`) : "–";
    li.appendChild(badge);

    const meta = document.createElement("div");
    meta.className = "note-meta";
    const title = document.createElement("div");
    title.className = "note-title";
    title.textContent = n.title || "(bez názvu)";
    const date = document.createElement("div");
    date.className = "note-date";
    date.textContent = [n.date, hl].filter(Boolean).join(" · ");
    meta.appendChild(title);
    meta.appendChild(date);
    li.appendChild(meta);

    li.addEventListener("click", () => openNote(n.id));
    notesUl.appendChild(li);
  });
}

searchInput.addEventListener("input", renderNotesList);

// ============================================================
// Editor
// ============================================================
function clearEditor() {
  titleInput.value = "";
  editorContent.innerHTML = "";
  dateInput.value = "";
  hourInput.value = "";
  doubleCheckbox.checked = false;
  categorySelect.value = NONE;
  hourPreview.textContent = "";
  statusBar.textContent = "Připraveno";
}

function openNote(id) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;
  currentNoteId = id;

  titleInput.value = note.title || "";
  editorContent.innerHTML = note.contentHtml || "";
  dateInput.value = note.date || "";
  hourInput.value = note.hour || "";
  doubleCheckbox.checked = !!note.isDouble;
  categorySelect.value = note.categoryId != null ? note.categoryId : NONE;
  updateHourPreview();

  statusBar.textContent = currentCategoryFilter === TRASH ? "V koši (jen ke čtení)" : "Uloženo";
  renderNotesList();
}

function updateHourPreview() {
  const hour = parseInt(hourInput.value, 10);
  const label = hourLabel(hour, doubleCheckbox.checked);
  hourPreview.textContent = label ? `→ ${label}` : "";
}

function scheduleAutosave() {
  updateHourPreview();
  if (currentNoteId == null || currentCategoryFilter === TRASH) return;
  statusBar.textContent = "Píšu...";
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveCurrentNote, 500);
}

function saveCurrentNote() {
  const note = state.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  note.title = titleInput.value.trim() || "(bez názvu)";
  note.contentHtml = editorContent.innerHTML;
  note.date = dateInput.value.trim() || null;
  const h = parseInt(hourInput.value, 10);
  note.hour = Number.isFinite(h) ? h : null;
  note.isDouble = doubleCheckbox.checked;
  const catVal = categorySelect.value;
  note.categoryId = catVal === NONE ? null : parseInt(catVal, 10);
  note.updatedAt = nowIso();
  save();
  const now = new Date();
  statusBar.textContent = `Uloženo ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  renderNotesList();
}

[titleInput, dateInput, hourInput].forEach(el => el.addEventListener("input", scheduleAutosave));
doubleCheckbox.addEventListener("change", scheduleAutosave);
categorySelect.addEventListener("change", scheduleAutosave);
editorContent.addEventListener("input", scheduleAutosave);

// ============================================================
// Nová poznámka / mazání / koš
// ============================================================
function newNote() {
  if (currentCategoryFilter === TRASH) return;
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 0=Po .. 6=Ne
  const hour = hourByCurrentTime(now);

  let categoryId = null;
  let title = "Nová poznámka";
  const scheduled = state.schedule[`${dow}-${hour}`];
  if (scheduled != null) {
    const cat = categoryById(scheduled);
    if (cat) { categoryId = cat.id; title = cat.name; }
  }

  const note = {
    id: nextId(),
    title,
    contentHtml: "",
    categoryId,
    date: todayStr(),
    hour,
    isDouble: false,
    updatedAt: nowIso(),
    deletedAt: null,
  };
  state.notes.unshift(note);
  save();
  renderNotesList();
  openNote(note.id);
  if (title === "Nová poznámka") titleInput.value = "";
  editorContent.focus();
}
btnNew.addEventListener("click", newNote);

$("btnTrashNote").addEventListener("click", () => {
  if (currentNoteId == null) { alert("Nejdřív vyber poznámku v seznamu."); return; }
  const note = state.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  note.deletedAt = nowIso();
  save();
  currentNoteId = null;
  clearEditor();
  renderNotesList();
  statusBar.textContent = `Přesunuto do koše (mažu se natrvalo po ${TRASH_KEEP_DAYS} dnech)`;
});

$("btnRestore").addEventListener("click", () => {
  if (currentNoteId == null) return;
  const note = state.notes.find(n => n.id === currentNoteId);
  if (!note) return;
  note.deletedAt = null;
  save();
  currentNoteId = null;
  clearEditor();
  renderNotesList();
});

$("btnPurgeOne").addEventListener("click", () => {
  if (currentNoteId == null) return;
  if (!confirm("Tohle už nejde vzít zpět. Opravdu smazat natrvalo?")) return;
  state.notes = state.notes.filter(n => n.id !== currentNoteId);
  currentNoteId = null;
  clearEditor();
  save();
  renderNotesList();
});

// ============================================================
// Formátování (tučně / kurzíva)
// ============================================================
function toggleFormat(cmd) {
  editorContent.focus();
  document.execCommand(cmd, false, null);
  scheduleAutosave();
}
$("btnBold").addEventListener("click", () => toggleFormat("bold"));
$("btnItalic").addEventListener("click", () => toggleFormat("italic"));

// ============================================================
// Zoom textu
// ============================================================
function applyFontSize() {
  editorContent.style.fontSize = state.settings.fontSize + "px";
  save();
}
function zoom(delta) {
  state.settings.fontSize = Math.max(12, Math.min(30, state.settings.fontSize + delta));
  applyFontSize();
  statusBar.textContent = `Velikost textu: ${state.settings.fontSize}`;
}
editorContent.addEventListener("wheel", (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  zoom(e.deltaY < 0 ? 1 : -1);
}, { passive: false });

// ============================================================
// Sdílení / export .txt
// ============================================================
function htmlToMarked(node) {
  let out = "";
  node.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += child.textContent;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase();
      if (tag === "br") { out += "\n"; return; }
      const inner = htmlToMarked(child);
      if (tag === "b" || tag === "strong") out += `**${inner}**`;
      else if (tag === "i" || tag === "em") out += `_${inner}_`;
      else if (tag === "div" || tag === "p") out += inner + "\n";
      else out += inner;
    }
  });
  return out;
}

$("btnShare").addEventListener("click", () => {
  if (currentNoteId == null) { alert("Nejdřív otevři poznámku, kterou chceš sdílet."); return; }
  const title = titleInput.value.trim() || "(bez názvu)";
  const plain = htmlToMarked(editorContent).replace(/\n{3,}/g, "\n\n").trim();

  const metaBits = [];
  if (dateInput.value.trim()) metaBits.push(`Datum: ${dateInput.value.trim()}`);
  const hl = hourLabel(parseInt(hourInput.value, 10), doubleCheckbox.checked);
  if (hl) metaBits.push(hl);
  const catOpt = categorySelect.options[categorySelect.selectedIndex];
  if (catOpt && catOpt.value !== NONE) metaBits.push(`Kategorie: ${catOpt.textContent}`);

  let out = title + "\n" + "=".repeat(title.length) + "\n";
  if (metaBits.length) out += metaBits.join(" | ") + "\n";
  out += "\n" + plain + "\n";

  const safeName = title.replace(/[^a-zA-Z0-9 \-_ěščřžýáíéóúůťďňĚŠČŘŽÝÁÍÉÓÚŮŤĎŇ]/g, "").trim() || "poznamka";
  const blob = new Blob([out], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = safeName + ".txt";
  a.click();
  URL.revokeObjectURL(a.href);
  statusBar.textContent = "Exportováno";
});

// ============================================================
// Modály - obecně
// ============================================================
document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.target.closest(".modal-overlay").hidden = true;
  });
});
document.querySelectorAll(".modal-overlay").forEach(ov => {
  ov.addEventListener("click", (e) => { if (e.target === ov) ov.hidden = true; });
});

// ---------- Rozvrh dne ----------
let dayModalDate = new Date();
function renderDayModal() {
  $("dayLabel").textContent = dateStrFrom(dayModalDate);
  const dateStr = dateStrFrom(dayModalDate);
  const rows = $("dayRows");
  rows.innerHTML = "";
  for (let h = 1; h <= 12; h++) {
    const notesHere = state.notes.filter(n => !n.deletedAt && n.date === dateStr && n.hour === h);
    const row = document.createElement("div");
    row.className = "day-row";
    const hn = document.createElement("span");
    hn.className = "hn";
    hn.textContent = h + ".";
    row.appendChild(hn);
    if (!notesHere.length) {
      const none = document.createElement("span");
      none.className = "none";
      none.textContent = "—";
      row.appendChild(none);
    } else {
      notesHere.forEach(n => {
        const link = document.createElement("span");
        link.className = "note-link";
        link.textContent = (n.title || "(bez názvu)") + (n.isDouble ? "  (dvouhodinovka)" : "");
        link.addEventListener("click", () => {
          currentCategoryFilter = ALL;
          setTrashMode(false);
          renderCategoryRail();
          renderNotesList();
          openNote(n.id);
          $("dayModalOverlay").hidden = true;
        });
        row.appendChild(link);
      });
    }
    rows.appendChild(row);
  }
}
$("btnDaySchedule").addEventListener("click", () => {
  dayModalDate = new Date();
  renderDayModal();
  $("dayModalOverlay").hidden = false;
});
$("dayPrev").addEventListener("click", () => { dayModalDate.setDate(dayModalDate.getDate() - 1); renderDayModal(); });
$("dayNext").addEventListener("click", () => { dayModalDate.setDate(dayModalDate.getDate() + 1); renderDayModal(); });
$("dayToday").addEventListener("click", () => { dayModalDate = new Date(); renderDayModal(); });

// ---------- Týdenní rozvrh ----------
function renderWeeklyModal() {
  const grid = $("weekGrid");
  grid.innerHTML = "";
  grid.appendChild(document.createElement("div"));
  DAY_NAMES_SHORT.forEach(d => {
    const el = document.createElement("div");
    el.className = "dh";
    el.textContent = d;
    grid.appendChild(el);
  });

  if (!state.categories.length) {
    const msg = document.createElement("p");
    msg.className = "modal-hint";
    msg.style.gridColumn = "1 / -1";
    msg.textContent = "Nejdřív si vytvoř aspoň jednu kategorii (předmět) vlevo.";
    grid.style.display = "block";
    grid.appendChild(msg);
    return;
  }
  grid.style.display = "grid";

  for (let h = 1; h <= 12; h++) {
    const hh = document.createElement("div");
    hh.className = "hh";
    hh.textContent = h + ".";
    grid.appendChild(hh);

    for (let day = 0; day < 5; day++) {
      const select = document.createElement("select");
      const noneOpt = document.createElement("option");
      noneOpt.value = "-";
      noneOpt.textContent = "–";
      select.appendChild(noneOpt);
      state.categories
        .slice().sort((a, b) => a.name.localeCompare(b.name, "cs"))
        .forEach(cat => {
          const opt = document.createElement("option");
          opt.value = cat.id;
          opt.textContent = cat.name;
          select.appendChild(opt);
        });
      const key = `${day}-${h}`;
      select.value = state.schedule[key] != null ? state.schedule[key] : "-";
      select.addEventListener("change", () => {
        if (select.value === "-") delete state.schedule[key];
        else state.schedule[key] = parseInt(select.value, 10);
        save();
      });
      grid.appendChild(select);
    }
  }
}
$("btnWeekly").addEventListener("click", () => {
  renderWeeklyModal();
  $("weeklyModalOverlay").hidden = false;
});

// ---------- Časy hodin ----------
function renderTimesModal() {
  const rows = $("timesRows");
  rows.innerHTML = "";
  for (let h = 1; h <= 12; h++) {
    const row = document.createElement("div");
    row.className = "time-row";
    const label = document.createElement("label");
    label.textContent = `${h}. hodina`;
    const input = document.createElement("input");
    input.type = "text";
    input.value = state.periodTimes[h] || "";
    input.dataset.hour = h;
    row.appendChild(label);
    row.appendChild(input);
    rows.appendChild(row);
  }
}
$("btnPeriodTimes").addEventListener("click", () => {
  renderTimesModal();
  $("timesModalOverlay").hidden = false;
});
$("btnSaveTimes").addEventListener("click", () => {
  const inputs = $("timesRows").querySelectorAll("input");
  const draft = {};
  for (const input of inputs) {
    const val = input.value.trim();
    if (!val) continue;
    if (!/^\d{1,2}:\d{2}$/.test(val)) {
      alert(`Neplatný čas u ${input.dataset.hour}. hodiny: „${val}“. Použij formát HH:MM.`);
      return;
    }
    const [hh, mm] = val.split(":").map(Number);
    if (hh > 23 || mm > 59) {
      alert(`Neplatný čas u ${input.dataset.hour}. hodiny: „${val}“.`);
      return;
    }
    draft[input.dataset.hour] = `${pad2(hh)}:${pad2(mm)}`;
  }
  Object.assign(state.periodTimes, draft);
  save();
  $("timesModalOverlay").hidden = true;
});

// ============================================================
// Klávesové zkratky
// ============================================================
document.addEventListener("keydown", (e) => {
  if (!e.ctrlKey) return;
  switch (e.key.toLowerCase()) {
    case "n":
      e.preventDefault(); newNote(); break;
    case "f":
      e.preventDefault(); searchInput.focus(); searchInput.select(); break;
    case "r":
      e.preventDefault(); $("btnDaySchedule").click(); break;
    case "d":
      if (currentNoteId != null && currentCategoryFilter !== TRASH) {
        e.preventDefault();
        doubleCheckbox.checked = !doubleCheckbox.checked;
        scheduleAutosave();
      }
      break;
    case "b":
      if (document.activeElement === editorContent) { e.preventDefault(); toggleFormat("bold"); }
      break;
    case "i":
      if (document.activeElement === editorContent) { e.preventDefault(); toggleFormat("italic"); }
      break;
    case "0":
      e.preventDefault(); state.settings.fontSize = 16; applyFontSize(); break;
    case "+": case "=":
      e.preventDefault(); zoom(1); break;
    case "-":
      e.preventDefault(); zoom(-1); break;
  }
});

// ============================================================
// Start
// ============================================================
purgeOldTrash();
save();
applyFontSize();
renderCategoryRail();
renderNotesList();
clearEditor();
