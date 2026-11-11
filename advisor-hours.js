function createAdvisorHours(client) {
  const panel = document.querySelector("#advisor-hours-panel");
  const status = panel.querySelector("[role=status]");
  const table = panel.querySelector("table");
  const body = table.tBodies[0];
  const dialog = panel.querySelector("dialog");
  const form = dialog.querySelector("form");
  const fields = form.querySelector("fieldset");
  const formStatus = form.querySelector("[role=status]");
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let userId = null;
  let canEdit = false;
  let revision = 0;
  let editing = null;

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
      row.append(dayLabel);
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
        row.append(label);
      }
      return row;
    }));
    dialog.showModal();
  }

  function render(advisors) {
    table.tHead.querySelector("[data-advisor-hours-actions]").hidden = !canEdit;
    body.replaceChildren(...advisors.map((advisor) => {
      const row = document.createElement("tr");
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
      weekdays.forEach((_, weekday) => {
        const cell = row.insertCell();
        const shift = advisor.advisor_weekly_hours.find((entry) => entry.weekday === weekday);
        if (shift?.starts_at && shift.ends_at) {
          cell.textContent = `${formatTime(shift.starts_at)} – ${formatTime(shift.ends_at)}`;
          if (shift.ends_at < shift.starts_at) {
            const nextDay = document.createElement("small");
            nextDay.textContent = "Ends next day";
            cell.append(nextDay);
          }
        } else {
          cell.textContent = "Off";
          cell.className = "advisor-hours-off";
        }
      });
      if (canEdit) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button-secondary";
        button.textContent = "Edit";
        button.setAttribute("aria-label", `Edit hours for ${advisor.name}`);
        button.addEventListener("click", () => edit(advisor));
        row.insertCell().append(button);
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
    } catch {
      if (request === revision) status.textContent = "Could not load advisor hours. Try Refresh.";
    }
  }

  panel.querySelector("[data-advisor-hours-refresh]").addEventListener("click", () => void load());
  document.addEventListener("workspace-view-change", () => { if (!panel.hidden) void load(); });
  form.querySelector("[data-advisor-hours-cancel]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("cancel", (event) => { if (fields.disabled) event.preventDefault(); });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editing || !userId || !canEdit || fields.disabled) return;
    const shifts = weekdays.map((_, weekday) => ({
      advisor_id: editing.id,
      weekday,
      starts_at: form.elements[`starts_at-${weekday}`].value || null,
      ends_at: form.elements[`ends_at-${weekday}`].value || null,
    }));
    const invalid = shifts.find(({ starts_at, ends_at }) =>
      Boolean(starts_at) !== Boolean(ends_at) || (starts_at && starts_at === ends_at));
    if (invalid) {
      formStatus.textContent = `Enter different start and end times for ${weekdays[invalid.weekday]}, or leave both blank for a day off.`;
      return;
    }
    const changes = shifts.filter(({ weekday, starts_at, ends_at }) => {
      const prior = editing.advisor_weekly_hours.find((shift) => shift.weekday === weekday);
      return starts_at !== (prior?.starts_at?.slice(0, 5) || null) ||
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
