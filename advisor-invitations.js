/* Renue Wellness Dashboard
 * Original design and development by J Mc Intyre, 2026.
 * See AUTHORS.md for project attribution and release verification.
 */

function createAdvisorInvitations(client) {
  const panel = document.querySelector("#advisor-invitations .advisor-invitations");
  const form = panel.querySelector("form");
  const email = form.elements.email;
  const send = form.querySelector("button");
  const status = panel.querySelector("[role=status]");
  const list = panel.querySelector("ul");
  let canInvite = false;
  let accessRevision = 0;
  let listRevision = 0;

  async function load() {
    const request = ++listRevision;
    try {
      const { data, error } = await client.from("advisor_invitations")
        .select("email, requested_at, status").order("requested_at", { ascending: false });
      if (request !== listRevision) return;
      if (error) throw error;
      const states = { sending: "Sending", pending: "Awaiting setup", accepted: "Joined" };
      list.replaceChildren(...data.map(invite => {
        const row = document.createElement("li");
        const address = document.createElement("span");
        address.textContent = invite.email;
        const label = document.createElement("strong");
        label.textContent = states[invite.status];
        row.append(address, label);
        return row;
      }));
    } catch {
      if (request === listRevision) status.textContent = "Invitation history is unavailable. Reopen Manage users to retry.";
    }
  }

  document.addEventListener("workspace-view-change", () => {
    if (canInvite && !panel.closest("[data-workspace-view]").hidden) void load();
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!canInvite || panel.closest("[data-workspace-view]").hidden || send.disabled) return;
    const request = accessRevision;
    send.disabled = true;
    email.readOnly = true;
    status.textContent = "Sending invitation…";
    try {
      const { error } = await client.functions.invoke("invite-advisor", { body: { email: email.value.trim() } });
      if (error) {
        const result = await error.context?.json?.().catch(() => null);
        const messages = {
          already_invited: "This email already has an invitation. Check its status below.",
          account_exists: "This email already has an account. Use Add advisor or Link account in Advisor hours.",
          email_limit: "The email service has reached its sending limit. Try again later.",
          manager_required: "Only managers and owners can invite advisors."
        };
        throw new Error(messages[result?.code] || "Could not send the invitation. Try again.");
      }
      if (request !== accessRevision) return;
      form.reset();
      status.textContent = "Invitation sent.";
      await load();
    } catch (error) {
      if (request === accessRevision) status.textContent = error.message || "Could not send the invitation. Try again.";
    } finally {
      if (request === accessRevision) {
        email.readOnly = false;
        send.disabled = false;
      }
    }
  });

  return allowed => {
    canInvite = allowed;
    ++accessRevision;
    ++listRevision;
    list.replaceChildren();
    form.reset();
    email.readOnly = false;
    send.disabled = false;
    status.textContent = "";
  };
}
