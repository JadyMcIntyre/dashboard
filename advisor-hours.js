/* Renue Wellness Dashboard
 * Original design and development by J Mc Intyre, 2026.
 * See AUTHORS.md for project attribution and release verification.
 */

function createAdvisorHours(client) {
  const panel = document.querySelector("#advisor-hours-panel");
  const status = panel.querySelector("[role=status]");
  const table = panel.querySelector("table");
  const body = table.tBodies[0];
  const dialog = panel.querySelector("dialog");
  const form = dialog.querySelector("form");
  const fields = form.querySelector("fieldset");
  const formStatus = form.querySelector("[role=status]");
  const addAdvisor = panel.querySelector("[data-add-advisor]");
  const accountDialog = panel.querySelector("#advisor-account-dialog");
  const accountForm = accountDialog.querySelector("form");
  const accountStatus = accountForm.querySelector("[role=status]");
  const accountEmail = accountForm.elements.email;
  const accountSubmit = accountForm.querySelector("[type=submit]");
  const accountCancel = accountForm.querySelector("[data-cancel-advisor-account]");
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let userId = null;
  let canEdit = false;
  let revision = 0;
  let editing = null;
  let rosterTarget = null;
  let accessRevision = 0;

  function setAssigning(assigning) {
    accountEmail.readOnly = assigning;
    accountSubmit.disabled = assigning;
    accountCancel.disabled = assigning;
  }

  function openAccountDialog(advisor = null) {
    if (!canEdit) return;
    rosterTarget = advisor;
    accountForm.reset();
    accountStatus.textContent = "";
    accountDialog.querySelector("h3").textContent = advisor ? `Link account for ${advisor.name}` : "Add advisor";
    accountDialog.querySelector("#advisor-account-help").textContent = advisor
      ? "Enter the email of an existing advisor. The saved hours will stay with this roster entry."
      : "Enter the email of an existing advisor account. You can set their weekly hours next.";
    accountSubmit.textContent = advisor ? "Link account" : "Add advisor";
    accountDialog.showModal();
    accountEmail.focus();
  }

  function formatTime(time) {
    const [hour, minute] = time.split(":").map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
  }

  function edit(advisor) {
    editing = advisor;
    formStatus.textContent = "";
    dialog.querySelector("h3").textContent = `Edit ${advisor.name}’s hours`;
    fields.replaceChildren(...weekdays.map((day, weekday) => {
      const shift = advisor.advisor_weekly_hours.find((entry) => entry.weekday === weekday);
      const row = document.createElement("div");
      row.className = "advisor-hours-field-row";
      const dayLabel = document.createElement("strong");
      dayLabel.textContent = day;
      const working = document.createElement("input");
      working.type = "checkbox";
      working.name = `working-${weekday}`;
      working.className = "advisor-hours-switch";
      working.setAttribute("role", "switch");
      working.setAttribute("aria-label", `${day} working`);
      working.checked = Boolean(shift?.starts_at || shift?.ends_at);

      const state = document.createElement("label");
      state.className = "advisor-hours-day-state";
      const stateText = document.createElement("span");
      stateText.setAttribute("aria-hidden", "true");
      state.append(working, stateText);
      const times = document.createElement("div");
      times.className = "advisor-hours-times";
      row.append(dayLabel, state, times);
      for (const [key, labelText] of [["starts_at", "Start"], ["ends_at", "End"]]) {
        const label = document.createElement("label");
        label.className = "field";
        label.textContent = labelText;
        const input = document.createElement("input");
        input.type = "time";
        input.name = `${key}-${weekday}`;
        input.setAttribute("aria-label", `${day} ${labelText.toLowerCase()}`);
        input.value = shift?.[key]?.slice(0, 5) || "";
        label.append(input);
        times.append(label);
      }
      function updateDay() {
        stateText.textContent = working.checked ? "Working" : "Day off";
        times.hidden = !working.checked;
        times.querySelectorAll("input").forEach(input => {
          input.disabled = !working.checked;
          input.required = working.checked;
        });
      }
      working.addEventListener("change", updateDay);
      updateDay();
      return row;
    }));
    dialog.showModal();
  }

  function render(advisors) {
    addAdvisor.hidden = !canEdit;
    table.tHead.querySelector("[data-advisor-hours-actions]").hidden = !canEdit;
    body.replaceChildren(...advisors.map((advisor) => {
      const row = document.createElement("tr");
      const needsHours = advisor.advisor_weekly_hours.length === 0;
      const heading = document.createElement("th");
      heading.scope = "row";
      heading.textContent = advisor.name;
      if (advisor.user_id === userId) {
        row.className = "advisor-hours-own";
        const you = document.createElement("small");
        you.textContent = "You";
        heading.append(you);
      }
      row.append(heading);
      if (needsHours) {
        row.classList.add("advisor-hours-unscheduled");
        const notice = row.insertCell();
        notice.colSpan = weekdays.length;
        notice.textContent = "Hours need to be set";
      } else for (const [weekday] of weekdays.entries()) {
        const cell = row.insertCell();
        const shift = advisor.advisor_weekly_hours.find((entry) => entry.weekday === weekday);
        if (shift?.starts_at && shift.ends_at) {
          cell.textContent = `${formatTime(shift.starts_at)} – ${formatTime(shift.ends_at)}`;
          if (advisor.name !== "Emma" && shift.ends_at < shift.starts_at) {
            const nextDay = document.createElement("small");
            nextDay.textContent = "Ends next day";
            cell.append(nextDay);
          }
        } else {
          cell.textContent = "Off";
          cell.className = "advisor-hours-off";
        }
      }
      if (canEdit) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ds-button";
        button.textContent = needsHours ? "Set hours" : "Edit";
        button.dataset.editAdvisor = advisor.id;
        button.setAttribute("aria-label", `${needsHours ? "Set" : "Edit"} hours for ${advisor.name}`);
        button.addEventListener("click", () => edit(advisor));
        const actions = document.createElement("div");
        actions.className = "template-toolbar";
        actions.append(button);
        if (!advisor.user_id) {
          const link = document.createElement("button");
          link.type = "button";
          link.className = "ds-button";
          link.textContent = "Link account";
          link.setAttribute("aria-label", `Link account for ${advisor.name}`);
          link.addEventListener("click", () => openAccountDialog(advisor));
          actions.append(link);
        }
        row.insertCell().append(actions);
      }
      return row;
    }));
    table.hidden = !advisors.length;
  }

  async function load(message = "") {
    if (!userId || panel.hidden) return;
    const request = ++revision;
    status.textContent = "Loading advisor hours…";
    try {
      const { data, error } = await client.from("advisor_roster")
        .select("id, name, user_id, advisor_weekly_hours(weekday, starts_at, ends_at)")
        .order("name");
      if (request !== revision) return;
      if (error) throw error;
      render(data);
      status.textContent = data.length ? message : "No advisor schedules are available.";
      return data;
    } catch {
      if (request === revision) status.textContent = "Could not load advisor hours. Try Refresh.";
    }
  }

  addAdvisor.addEventListener("click", () => openAccountDialog());
  accountCancel.addEventListener("click", () => accountDialog.close());
  accountDialog.addEventListener("cancel", event => {
    if (accountSubmit.disabled) event.preventDefault();
  });

  accountForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!canEdit || accountSubmit.disabled) return;
    const request = accessRevision;
    const target = rosterTarget;
    setAssigning(true);
    accountStatus.textContent = "Saving…";
    try {
      const { data: advisorId, error } = await client.rpc("assign_advisor_roster", {
        account_email: accountEmail.value.trim(), roster_id: target?.id ?? null
      });
      if (request !== accessRevision) return;
      if (error) {
        const messages = {
          PT404: "No existing advisor account matches that email.",
          PT409: "This roster entry is already linked or no longer available.",
          23505: "That account or name is already on the roster. Use Link account on an unlinked entry."
        };
        accountStatus.textContent = messages[error.code] ?? "Could not update the roster. Try again.";
        return;
      }
      accountDialog.close();
      const advisors = await load(target ? "Advisor account linked." : "Advisor added. Set their weekly hours.");
      if (request !== accessRevision || panel.hidden) return;
      const advisor = advisors?.find(entry => entry.id === advisorId);
      if (!target && advisor) edit(advisor);
      else if (target) body.querySelector(`[data-edit-advisor="${target.id}"]`)?.focus();
    } catch {
      if (request === accessRevision) accountStatus.textContent = "Could not update the roster. Try again.";
    } finally {
      if (request === accessRevision) setAssigning(false);
    }
  });

  panel.querySelector("[data-advisor-hours-refresh]").addEventListener("click", () => void load());
  document.addEventListener("workspace-view-change", () => { if (!panel.hidden) void load(); });
  form.querySelector("[data-advisor-hours-cancel]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("cancel", (event) => { if (fields.disabled) event.preventDefault(); });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editing || !userId || !canEdit || fields.disabled) return;
    const shifts = weekdays.map((_, weekday) => {
      const working = form.elements[`working-${weekday}`].checked;
      return {
        advisor_id: editing.id,
        weekday,
        starts_at: working ? form.elements[`starts_at-${weekday}`].value : null,
        ends_at: working ? form.elements[`ends_at-${weekday}`].value : null,
      };
    });
    const invalid = shifts.find(({ starts_at, ends_at }) =>
      starts_at !== null && (!starts_at || !ends_at || starts_at === ends_at));
    if (invalid) {
      formStatus.textContent = `Enter different start and end times for ${weekdays[invalid.weekday]}, or turn its Working switch off.`;
      return;
    }
    const changes = shifts.filter(({ weekday, starts_at, ends_at }) => {
      const prior = editing.advisor_weekly_hours.find((shift) => shift.weekday === weekday);
      return !editing.advisor_weekly_hours.length || starts_at !== (prior?.starts_at?.slice(0, 5) || null) ||
        ends_at !== (prior?.ends_at?.slice(0, 5) || null);
    });
    if (!changes.length) {
      dialog.close();
      return;
    }
    const account = userId;
    fields.disabled = true;
    form.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    formStatus.textContent = "Saving hours…";
    try {
      const { error } = await client.from("advisor_weekly_hours").upsert(changes, { onConflict: "advisor_id,weekday" });
      if (account !== userId) return;
      if (error) throw error;
      dialog.close();
      await load("Schedule saved.");
    } catch {
      if (account === userId) formStatus.textContent = "Could not save the schedule. Try again.";
    } finally {
      if (account === userId) {
        fields.disabled = false;
        form.querySelectorAll("button").forEach((button) => { button.disabled = false; });
      }
    }
  });

  return (owner, role) => {
    ++revision;
    ++accessRevision;
    accountDialog.close();
    setAssigning(false);
    userId = owner;
    canEdit = role === "manager" || role === "owner";
    editing = null;
    dialog.close();
    fields.disabled = false;
    form.querySelectorAll("button").forEach((button) => { button.disabled = false; });
    render([]);
    status.textContent = "";
    if (owner) void load();
  };
}
