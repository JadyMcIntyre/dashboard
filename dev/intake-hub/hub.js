import { advisors, clinics, treatments, milestones, barriers, day, makeRecords, queues, stage, reached, opportunities } from "./model.js";

const records = makeRecords();
const views = {
  Advisor: ["My Day", "My Patients", "Follow-ups"],
  Manager: ["Overview", "Patient Journey", "Operational Opportunities", "Team Workload", "Explore Insights"]
};
const descriptions = {
  "My Day": "Appointments and follow-ups that may need your attention.",
  "My Patients": "Find an assigned patient and pick up where you left off.",
  "Follow-ups": "Review outstanding follow-ups and requests for further contact.",
  "Overview": "Track how patients move through intake and where they’re waiting.",
  "Patient Journey": "Explore recorded milestones and the patients behind each count.",
  "Operational Opportunities": "Investigate delays and coordination gaps recorded in the demo.",
  "Team Workload": "See where the intake team may need support.",
  "Explore Insights": "Prepare a question with synthetic aggregate statistics."
};
const $ = id => document.getElementById(id);
const safe = value => String(value ?? "").replace(/[&<>"']/g, char =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const button = (text, attrs = "") => `<button type="button" class="ds-button" ${attrs}>${safe(text)}</button>`;
const options = values => values.map(value => `<option>${safe(value)}</option>`).join("");
let view = "My Day";
let drill = null;
let selected = null;
let duplicateConfirmed = false;
const role = () => $("role").value;
const scope = () => records.filter(record => role() === "Manager" || record.advisor === advisors[0]);

$("filters").innerHTML = `<input id="query" class="ds-input" type="search" aria-label="Search patients" placeholder="Search patients">
<select id="treatment" class="ds-input" aria-label="Filter treatment">${options(["All treatments", ...treatments, "Unsure"])}</select>
<select id="clinic" class="ds-input" aria-label="Filter clinic">${options(["All clinics", ...clinics, "Unknown"])}</select>
<select id="stage" class="ds-input" aria-label="Filter stage">${options(["All stages", "New enquiry", ...milestones, "Paused", "Chose not to proceed"])}</select>
<select id="follow" class="ds-input" aria-label="Filter follow-ups">${options(["Any follow-up", "Due or overdue", "Scheduled", "No follow-up"])}</select>
<label>Added from <input class="ds-input" id="from" type="date"></label><label>Through <input class="ds-input" id="through" type="date"></label>
<select id="sort" class="ds-input" aria-label="Sort patients">${options(["Newest first", "Name A–Z"])}</select>`;
function filtered() {
  const query = $("query").value.trim().toLowerCase();
  const result = scope().filter(r => {
    const follow = $("follow").selectedIndex;
    return r.name.toLowerCase().includes(query) &&
      (!$("treatment").selectedIndex || r.treatment === $("treatment").value) &&
      (!$("clinic").selectedIndex || r.clinic === $("clinic").value) &&
      (!$("stage").selectedIndex || stage(r) === $("stage").value) &&
      (!follow || (follow === 1 && r.followUp && r.followUp <= day() && !r.closed && !r.paused) ||
        (follow === 2 && r.followUp) || (follow === 3 && !r.followUp)) &&
      (!$("from").value || r.added >= $("from").value) && (!$("through").value || r.added <= $("through").value);
  });
  return result.sort((a, b) => $("sort").selectedIndex ? a.name.localeCompare(b.name) : b.added.localeCompare(a.added));
}

function table(rows) {
  if (!rows.length) return '<p class="ds-card">No records match this view.</p>';
  return `<div class="table-wrap"><table class="ds-table"><thead><tr><th>Patient</th><th>Treatment</th><th>Clinic</th><th>Journey</th><th>Follow-up</th></tr></thead><tbody>${rows.map(r =>
    `<tr><th scope="row">${button(r.name, `data-patient="${r.id}"`)}</th><td>${safe(r.treatment)}</td><td>${safe(r.clinic)}</td><td>${safe(stage(r))}</td><td>${safe(r.followUp || "—")}</td></tr>`).join("")}</tbody></table></div>`;
}
function queueCards(rows) {
  return `<div class="grid">${Object.entries(queues(rows)).filter(([label]) => view !== "Follow-ups" || /follow-up/i.test(label)).map(([label, group]) =>
    `<section class="ds-card"><h2>${safe(label)}</h2><small>${group.length} records</small>${group.slice(0, 4).map(r =>
      `<button class="ds-button queue" data-patient="${r.id}">${safe(r.name)} <small>${safe(r.treatment)}</small></button>`).join("")}
      ${!group.length ? '<p>No patients in this queue.</p>' : group.length > 4 ? button("View all", `data-queue="${safe(label)}"`) : ""}</section>`).join("")}</div>`;
}
function analytics(rows) {
  const booked = rows.filter(r => reached(r, milestones[0])).length;
  return `<div class="grid">${milestones.map((label, index) => {
    const count = rows.filter(r => reached(r, label)).length;
    return `<button class="ds-button metric" data-milestone="${index}"><span>${label}</span><strong>${count}</strong><meter min="0" max="${booked || 1}" value="${count}" aria-label="${count} of ${booked} booked"></meter><small>${count} of ${booked} with a recorded booking</small></button>`;
  }).join("")}</div><p><small>Cohort uses the intake date filters. Milestones count recorded events. Recent bookings may still be in progress.</small></p>`;
}
function insights(rows) {
  return `<div class="ds-card stack"><label class="ds-field">Question<select class="ds-input" id="question">${options(["Where are patients experiencing the most delays?", "Which processes could benefit from automation?", "What patterns should management investigate?"])}</select></label>
  <fieldset><legend>Include aggregate data</legend><label><input type="checkbox" id="export-journey" checked> Journey milestones</label> <label><input type="checkbox" id="export-barriers"> Operational barriers</label></fieldset>
  <textarea id="prompt" class="ds-input" readonly rows="8" aria-label="Prompt preview"></textarea>
  ${button("Copy Prompt", 'id="copy-prompt"')}</div>`;
}
function updatePrompt(rows) {
  if (!$("prompt")) return;
  const sections = [];
  if ($("export-journey").checked) sections.push("Recorded milestone counts: " + milestones.map(label => `${label}: ${rows.filter(r => reached(r, label)).length}`).join(", "));
  if ($("export-barriers").checked) sections.push("Active operational patterns: " + opportunities(rows).map(([label, , group]) => `${label}: ${group.length}`).join(", "));
  $("prompt").value = `Synthetic healthcare intake demo\nQuestion: ${$("question").value}\nIntake dates: ${$("from").value || "All dates"} through ${$("through").value || "present"}\nTreatment and clinic: ${$("treatment").value}, ${$("clinic").value}\n${sections.join("\n")}\nDistinguish observations from assumptions. Respect patient autonomy and clinical boundaries. Do not infer causation, eligibility, missing facts, or financial outcomes.`;
}
function render() {
  $("nav").innerHTML = views[role()].map(label => button(label, `data-view="${label}" aria-pressed="${view === label}"`)).join("");
  $("heading").innerHTML = `<h1>${view}</h1><p>${descriptions[view]}</p>`;
  $("filters").hidden = !(view === "My Patients" || role() === "Manager");
  const rows = $("filters").hidden ? scope() : filtered();
  let output;
  if (drill) output = `<div class="stack">${button("Back to " + view, 'data-back') }<h2>${safe(drill.label)}</h2>${table(drill.select(rows))}</div>`;
  else if (view === "My Patients") output = table(rows);
  else if (view === "My Day" || view === "Follow-ups") output = queueCards(rows);
  else if (view === "Operational Opportunities") output = `<div class="grid">${opportunities(rows).map(([label, description, group], index) =>
    `<article class="ds-card stack"><h2>${label}</h2><strong>${group.length} records</strong><p>${description}</p>${button("Explore records", `data-opportunity="${index}"`)}</article>`).join("")}</div>`;
  else if (view === "Team Workload") output = `<div class="grid">${advisors.map(name => {
    const active = rows.filter(r => r.advisor === name && !r.closed && !r.paused && !reached(r, milestones[3]));
    return `<section class="ds-card"><h2>${name}</h2><p>${active.length} active journeys</p><p>${queues(active)["Upcoming evaluations"].length} upcoming evaluations</p><p>${active.filter(r => r.followUp && r.followUp <= day()).length} follow-ups due</p></section>`;
  }).join("")}</div>`;
  else if (view === "Explore Insights") output = insights(rows);
  else output = analytics(rows);
  $("content").innerHTML = output;
  updatePrompt(rows);
}

function openRecord(record, show = true) {
  selected = record;
  const r = record;
  const next = r.closed ? "Journey concluded at the patient’s request." : r.paused ? "Follow-up is paused." :
    r.followUp ? "Follow up on " + r.followUp : r.evaluation && r.evaluation >= day() && !r.confirmed ? "Review appointment confirmation." :
    r.barrier ? "Review recorded barrier: " + r.barrier : r.requested ? "Review requested contact." : "Review the next step with the patient.";
  $("record-content").innerHTML = `<div class="stack"><div><small>${safe(stage(r))}</small><h2 id="record-title">${safe(r.name)}</h2><p>${safe(r.advisor)} · ${safe(r.treatment)} · ${safe(r.clinic)}</p></div>
  <section class="ds-card"><h3>Next action</h3><p>${safe(next)}</p><p>Evaluation: ${safe(r.evaluation || "Unscheduled")}${r.evaluation ? (r.confirmed ? " · Confirmed" : " · Awaiting confirmation") : ""}</p><p>Treatment start: ${safe(r.start || "Unscheduled")}</p><p>Barrier: ${safe(r.barrier || "None recorded")}</p></section>
  <form id="update"><label class="ds-field">Record an update<select class="ds-input" name="action">${options(["Schedule follow-up", "Complete follow-up", "Schedule or reschedule evaluation", "Confirm evaluation", "Record barrier", "Add activity note", "Pause follow-ups", "Resume follow-ups", "Record decision not to proceed", "Record evaluation completion", "Record decision to move to treatment", "Schedule treatment start", "Record treatment started"])}</select></label>
  <label class="ds-field" data-field="date">Date<input class="ds-input" type="date" name="date" value="${day()}"></label>
  <label class="ds-field" data-field="barrier" hidden>Barrier<select name="barrier" class="ds-input">${options(["None", ...barriers])}</select></label>
  <label class="ds-field" data-field="note" hidden>Fictional note<textarea class="ds-input" name="note" maxlength="300"></textarea></label>
  <p id="update-feedback" role="status"></p><button class="ds-button" data-variant="primary">Save update</button></form>
  <section><h3>Journey timeline</h3><ol class="timeline">${[...r.events].reverse().map(e => `<li><small>${safe(e.date)}</small> · ${safe(e.label)}</li>`).join("")}</ol></section></div>`;
  const form = $("update");
  form.elements.action.addEventListener("change", () => {
    const i = form.elements.action.selectedIndex;
    for (const [key, visible] of [["date", i === 0 || i === 2 || i === 11], ["barrier", i === 4], ["note", i === 5]]) {
      form.querySelector(`[data-field="${key}"]`).hidden = !visible;
      form.elements[key].required = visible;
    }
  });
  form.elements.date.required = true;
  if (show) $("record").showModal();
}

$("record").addEventListener("submit", event => {
  if (event.target.id !== "update" || !selected) return;
  event.preventDefault();
  const r = selected;
  const data = new FormData(event.target);
  const action = data.get("action");
  const date = data.get("date");
  let label = action;
  const milestoneActions = {
    "Record evaluation completion": 1,
    "Record decision to move to treatment": 2,
    "Record treatment started": 3,
  };
  const milestoneIndex = milestoneActions[action];
  if (milestoneIndex !== undefined) {
    if (r.closed || !reached(r, milestones[milestoneIndex - 1]) || reached(r, milestones[milestoneIndex])) {
      $("update-feedback").textContent = "Check the earlier recorded milestones before adding this update.";
      return;
    }
    label = milestones[milestoneIndex];
    if (milestoneIndex === 3 && !r.start) r.start = day();
  }
  if (action === "Schedule treatment start") {
    if (r.closed || !reached(r, milestones[2]) || reached(r, milestones[3])) {
      $("update-feedback").textContent = "A recorded decision to move to treatment is required.";
      return;
    }
    r.start = date;
    label = "Treatment start scheduled for " + date;
  }
  if (action === "Schedule follow-up") { r.followUp = date; label = "Follow-up scheduled for " + date; }
  if (action === "Complete follow-up") { r.followUp = ""; r.requested = false; label = "Follow-up completed"; }
  if (action === "Schedule or reschedule evaluation") {
    label = reached(r, milestones[0]) ? "Evaluation rescheduled to " + date : milestones[0];
    r.evaluation = date;
    r.confirmed = false;
  }
  if (action === "Confirm evaluation") {
    if (!r.evaluation) { $("update-feedback").textContent = "Schedule an evaluation first."; return; }
    r.confirmed = true;
    label = "Evaluation confirmed";
  }
  if (action === "Record barrier") { r.barrier = data.get("barrier") === "None" ? "" : data.get("barrier"); r.barrierSince = day(); label = r.barrier || "Barrier cleared"; }
  if (action === "Add activity note") label = "Note: " + data.get("note").trim();
  if (action === "Pause follow-ups") r.paused = true;
  if (action === "Resume follow-ups") r.paused = false;
  if (action === "Record decision not to proceed") r.closed = true;
  r.events.push({ date: day(), label });
  render();
  openRecord(r, false);
  $("update").elements.action.focus();
  $("announcement").textContent = "Update saved.";
});

function navigate(target) { view = target; drill = null; render(); }
$("role").addEventListener("change", () => {
  $("filters").querySelectorAll("input").forEach(input => { input.value = ""; });
  $("filters").querySelectorAll("select").forEach(select => { select.selectedIndex = 0; });
  navigate(views[role()][0]);
});
$("nav").addEventListener("click", e => { if (e.target.dataset.view) navigate(e.target.dataset.view); });
$("filters").addEventListener("input", render);
$("content").addEventListener("change", () => updatePrompt(filtered()));
$("content").addEventListener("click", async event => {
  const control = event.target.closest("button");
  if (!control) return;
  const { patient, milestone, opportunity, queue, back } = control.dataset;
  if (patient) { openRecord(scope().find(r => r.id === patient)); return; }
  if (control.id === "copy-prompt") {
    await navigator.clipboard.writeText($("prompt").value);
    control.textContent = "Copied";
    return;
  }
  if (milestone !== undefined) drill = { label: milestones[milestone], select: rows => rows.filter(r => reached(r, milestones[milestone])) };
  if (opportunity !== undefined) drill = { label: opportunities(filtered())[opportunity][0], select: rows => opportunities(rows)[opportunity][2] };
  if (queue) drill = { label: queue, select: rows => queues(rows)[queue] };
  if (back !== undefined) drill = null;
  render();
});

function newIntake() {
  if (document.querySelector("dialog[open]")) return;
  duplicateConfirmed = false;
  $("intake-form").reset();
  $("duplicate").textContent = "";
  $("intake").showModal();
  $("intake-form").elements.patient.focus();
}
$("new").addEventListener("click", newIntake);
function search() {
  if (document.querySelector("dialog[open]")) return;
  navigate(role() === "Advisor" ? "My Patients" : "Patient Journey");
  if (role() === "Manager") {
    drill = { label: "Patient records", select: rows => rows };
    render();
  }
  $("query").focus();
}
$("search").addEventListener("click", search);
document.addEventListener("keydown", event => {
  if (!(event.metaKey || event.ctrlKey)) return;
  if (event.key.toLowerCase() === "k") { event.preventDefault(); search(); }
  if (event.shiftKey && event.key.toLowerCase() === "i") { event.preventDefault(); newIntake(); }
});
$("theme").addEventListener("click", () => {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
});
document.querySelectorAll("[data-close]").forEach(control => control.addEventListener("click", () => control.closest("dialog").close()));
$("intake-form").addEventListener("input", () => { duplicateConfirmed = false; $("duplicate").textContent = ""; });
$("intake-form").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  const name = data.get("patient").trim();
  if (!name) { $("duplicate").textContent = "Enter a fictional patient name."; return; }
  if (!duplicateConfirmed && records.some(r => r.name.toLowerCase() === name.toLowerCase())) {
    duplicateConfirmed = true;
    $("duplicate").textContent = "A matching name exists. Save again if this is a different patient.";
    return;
  }
  const events = [{ label: "Added to intake", date: day() }];
  if (data.get("note").trim()) events.push({ label: "Note: " + data.get("note").trim(), date: day() });
  records.push({ id: String(records.length + 1), name, advisor: advisors[0], treatment: data.get("treatment"), clinic: data.get("clinic"), added: day(),
    confirmed: false, evaluation: "", followUp: "", start: "", events });
  render();
  $("announcement").textContent = "Intake saved.";
  if (event.submitter?.value === "another") { form.reset(); duplicateConfirmed = false; $("duplicate").textContent = ""; form.elements.patient.focus(); }
  else { $("intake").close(); search(); $("query").value = name; render(); }
});
render();
