/* Renue Wellness Dashboard
 * Original design and development by J Mc Intyre, 2026.
 * See AUTHORS.md for project attribution and release verification.
 */

const clinicWeekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
let clinicSchedules = new Map();

function formatClinicHour(time) {
  const [hour, minute] = time.split(":");
  return `${Number(hour) % 12 || 12}:${minute} ${Number(hour) < 12 ? "AM" : "PM"}`;
}

function getClinicOfficeHours(clinicId) {
  const clinic = clinicLocations[clinicId];
  if (!clinic) return undefined;
  const office = officeHours.find(entry => entry.location === clinic.hoursName);
  const schedule = clinicSchedules.get(clinicId);
  if (!schedule) return office;
  return {
    ...office,
    location: clinic.hoursName,
    schedule: schedule.map((times, weekday) => ({
      day: clinicWeekdays[weekday],
      hours: times ? times.map(formatClinicHour).join(" - ") : "Closed"
    }))
  };
}

async function fetchClinicSchedules(client) {
  try {
    const { data, error } = await client.from("clinic_opening_hours").select("clinic_id, schedule");
    if (!error) return new Map(data.map(row => [row.clinic_id, row.schedule]));
  } catch {
    // Keep the published schedule available if the Data API is unreachable.
  }
  return new Map();
}

function createClinicHoursEditor(client) {
  const list = document.querySelector("#manage-clinic-hours-list");
  const status = document.querySelector("#manage-clinic-hours-status");
  const dialog = document.querySelector("#clinic-hours-editor");
  const form = dialog.querySelector("form");
  const fields = form.querySelector("fieldset");
  const feedback = form.querySelector("[role=status]");
  const save = form.querySelector("[type=submit]");
  const cancel = form.querySelector("[data-cancel-clinic-hours]");
  let canEdit = false;
  let revision = 0;
  let editing;

  function render() {
    list.innerHTML = canEdit ? Object.keys(clinicLocations).filter(id => clinicSchedules.has(id)).map(id => {
      const name = escapeHtml(clinicLocations[id].name);
      return `<button class="ds-button" type="button" data-edit-clinic-hours="${id}"
        aria-label="Edit opening hours for ${name}">${name}</button>`;
    }).join("") : "";
    status.textContent = canEdit && !list.children.length ? "Opening hours are unavailable for editing." : "";
  }

  function setSaving(saving) {
    fields.disabled = saving;
    save.disabled = saving;
    cancel.disabled = saving;
  }

  list.addEventListener("click", event => {
    const button = event.target.closest("[data-edit-clinic-hours]");
    if (!button || !canEdit) return;
    const id = button.dataset.editClinicHours;
    const schedule = clinicSchedules.get(id);
    editing = { id, schedule };
    dialog.querySelector("h3").textContent = `Edit opening hours for ${clinicLocations[id].name}`;
    feedback.textContent = "";
    fields.innerHTML = clinicWeekdays.map((day, index) => `
      <div class="advisor-hours-field-row">
        <strong>${day}</strong>
        <label class="advisor-hours-day-state">
          <input class="advisor-hours-switch" type="checkbox" role="switch" aria-label="${day} open"
            name="open-${index}" ${schedule[index] ? "checked" : ""}>
          <span aria-hidden="true"></span>
        </label>
        <div class="advisor-hours-times">
          <label class="field">Opens<input type="time" name="start-${index}" aria-label="${day} opens"
            value="${escapeHtml(schedule[index]?.[0] || "")}"></label>
          <label class="field">Closes<input type="time" name="end-${index}" aria-label="${day} closes"
            value="${escapeHtml(schedule[index]?.[1] || "")}"></label>
        </div>
      </div>`).join("");
    fields.querySelectorAll(".advisor-hours-field-row").forEach(row => {
      const toggle = row.querySelector("[role=switch]");
      const state = row.querySelector(".advisor-hours-day-state span");
      const times = row.querySelector(".advisor-hours-times");
      function updateDay() {
        state.textContent = toggle.checked ? "Open" : "Closed";
        times.hidden = !toggle.checked;
        times.querySelectorAll("input").forEach(input => {
          input.disabled = !toggle.checked;
          input.required = toggle.checked;
        });
      }
      toggle.addEventListener("change", updateDay);
      updateDay();
    });
    dialog.showModal();
  });

  cancel.addEventListener("click", () => dialog.close());
  dialog.addEventListener("cancel", event => { if (save.disabled) event.preventDefault(); });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!canEdit || !editing || save.disabled) return;
    const { id, schedule: prior } = editing;
    const schedule = clinicWeekdays.map((_, index) => form.elements[`open-${index}`].checked
      ? [form.elements[`start-${index}`].value, form.elements[`end-${index}`].value] : null);
    const invalid = schedule.findIndex(day => day && (!day[0] || !day[1] || day[0] >= day[1]));
    if (invalid !== -1) {
      feedback.textContent = `Closing time must be after opening time on ${clinicWeekdays[invalid]}.`;
      return;
    }
    if (JSON.stringify(schedule) === JSON.stringify(prior)) {
      dialog.close();
      return;
    }

    const request = revision;
    setSaving(true);
    feedback.textContent = "Saving opening hours…";
    try {
      const { data, error } = await client.from("clinic_opening_hours").update({ schedule })
        .eq("clinic_id", id).eq("schedule", JSON.stringify(prior)).select("schedule").maybeSingle();
      if (revision !== request) return;
      if (error) throw error;
      if (!data) {
        feedback.textContent = "These hours could not be updated. Reload to check the latest schedule.";
        return;
      }
      clinicSchedules.set(id, data.schedule);
      renderHours();
      updateFabHours();
      dialog.close();
      showToast("Clinic opening hours saved.");
    } catch {
      if (revision === request) feedback.textContent = "Could not save opening hours. Try again.";
    } finally {
      if (revision === request) setSaving(false);
    }
  });

  return (role, schedules = clinicSchedules) => {
    ++revision;
    clinicSchedules = schedules;
    canEdit = role === "manager" || role === "owner";
    editing = null;
    dialog.close();
    setSaving(false);
    render();
    renderHours();
    updateFabHours();
  };
}
