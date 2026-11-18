/* Renue Wellness Dashboard
 * Original design and development by J Mc Intyre, 2026.
 * See AUTHORS.md for project attribution and release verification.
 */

function createStaffDirectory(client) {
  const panel = document.querySelector("#staff-directory-title").closest("[data-workspace-view]");
  const table = panel.querySelector(".staff-directory table");
  const status = panel.querySelector("#staff-directory-status");
  const dialog = panel.querySelector("#staff-account-dialog");
  const form = dialog.querySelector("form");
  const submit = form.querySelector("[type=submit]");
  const cancel = form.querySelector("[data-cancel-staff-action]");
  const feedback = form.querySelector("[role=status]");
  const roleField = form.querySelector("[data-staff-role-field]");
  const access = form.elements.role;
  let role = null;
  let userId = null;
  let session = 0;
  let loadRevision = 0;
  let action = null;

  function setBusy(busy) {
    access.disabled = busy || roleField.hidden;
    submit.disabled = busy;
    cancel.disabled = busy;
  }

  function openAction(account, type) {
    const deleting = type === "delete";
    action = { account, type };
    dialog.querySelector("h3").textContent = deleting ? "Delete staff account" : "Change access level";
    dialog.querySelector("#staff-account-dialog-description").textContent = deleting
      ? `Permanently delete ${account.email || account.display_name}? This removes their sign-in, personal templates and copy history. Their advisor hours stay on the roster.`
      : `Choose an access level for ${account.email || account.display_name}.`;
    roleField.hidden = deleting;
    access.value = account.role === "manager" ? "manager" : "advisor";
    submit.textContent = deleting ? "Delete account" : "Save access";
    submit.dataset.variant = deleting ? "danger" : "primary";
    feedback.textContent = "";
    setBusy(false);
    dialog.showModal();
    (deleting ? cancel : access).focus();
  }

  function render(accounts) {
    const owner = role === "owner";
    table.querySelector("[data-staff-actions]").hidden = !owner;
    const body = table.tBodies[0];
    body.replaceChildren();
    for (const account of accounts) {
      const row = body.insertRow();
      const name = document.createElement("th");
      name.scope = "row";
      name.textContent = account.display_name;
      row.append(name);
      row.insertCell().textContent = account.email || "—";
      row.insertCell().textContent = account.role[0].toUpperCase() + account.role.slice(1);
      if (!owner) continue;
      const cell = row.insertCell();
      if (account.user_id === userId || account.role === "owner") continue;
      const actions = document.createElement("div");
      actions.className = "template-toolbar";
      for (const [type, label] of [["access", "Change access"], ["delete", "Delete"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ds-button";
        button.textContent = label;
        button.setAttribute("aria-label", `${label} for ${account.display_name}`);
        button.addEventListener("click", () => openAction(account, type));
        actions.append(button);
      }
      cell.append(actions);
    }
    table.hidden = !accounts.length;
  }

  async function load(message = "") {
    const revision = ++loadRevision;
    status.textContent = "Loading staff accounts…";
    try {
      const { data, error } = await client.rpc("list_staff_accounts");
      if (revision !== loadRevision) return;
      if (error) throw error;
      render(data);
      status.textContent = data.length ? message : "No staff accounts found.";
    } catch {
      if (revision === loadRevision) status.textContent = "Staff accounts are unavailable. Reopen Manage users to retry.";
    }
  }

  document.addEventListener("workspace-view-change", () => {
    if (["manager", "owner"].includes(role) && !panel.hidden) void load();
  });
  cancel.addEventListener("click", () => dialog.close());
  dialog.addEventListener("cancel", event => { if (submit.disabled) event.preventDefault(); });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (role !== "owner" || !action || submit.disabled) return;
    const { account, type } = action;
    const revision = session;
    const deleting = type === "delete";
    setBusy(true);
    feedback.textContent = deleting ? "Deleting account…" : "Saving access…";
    try {
      const { error } = deleting
        ? await client.functions.invoke("delete-staff-account", { body: { user_id: account.user_id, role: account.role } })
        : await client.rpc("change_staff_access", { target_id: account.user_id, expected_role: account.role, new_role: access.value });
      if (revision !== session) return;
      if (error) throw error;
      dialog.close();
      await load(deleting ? "Account deleted." : "Access updated.");
    } catch {
      if (revision === session) feedback.textContent = "The account could not be updated. Check the current account details and try again.";
    } finally {
      if (revision === session) setBusy(false);
    }
  });

  return (viewRole, accountId) => {
    ++session;
    ++loadRevision;
    role = viewRole;
    userId = accountId;
    action = null;
    dialog.close();
    setBusy(false);
    render([]);
    status.textContent = "";
  };
}
