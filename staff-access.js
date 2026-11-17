/* Renue Wellness Dashboard
 * Original design and development by J Mc Intyre, 2026.
 * See AUTHORS.md for project attribution and release verification.
 */

const signIn = document.querySelector("#staff-sign-in");
const signInButton = signIn.querySelector("button[type=submit]");
const setPassword = document.querySelector("#staff-set-password");
const setPasswordButton = setPassword.querySelector("button[type=submit]");
const setPasswordStatus = setPassword.querySelector("[role=status]");
const accessTitle = document.querySelector("#staff-access-title");
const signInStatus = document.querySelector("#staff-sign-in-status");
const accessScreen = document.querySelector("#staff-access");
const workspace = document.querySelector(".workspace-shell");
const account = document.querySelector("#staff-account");
const signOutButton = document.querySelector("#staff-sign-out");

document.querySelectorAll(".password-visibility").forEach((button) => {
  const input = document.getElementById(button.getAttribute("aria-controls"));
  const fieldLabel = input.labels[0].textContent.toLowerCase();
  function setVisible(visible) {
    input.type = visible ? "text" : "password";
    button.textContent = visible ? "Hide" : "Show";
    button.setAttribute("aria-label", `${button.textContent} ${fieldLabel}`);
  }
  button.hidden = false;
  button.addEventListener("click", () => setVisible(input.type === "password"));
  input.form.addEventListener("reset", () => setVisible(false));
  input.form.addEventListener("password-cleared", () => setVisible(false));
});

const rememberEmail = signIn.elements.remember_email;
const rememberedEmailKey = "renue-remembered-email";
let rememberedEmail = "";

function restoreRememberedEmail() {
  signIn.elements.email.value = rememberedEmail;
  rememberEmail.checked = Boolean(rememberedEmail);
}

function saveRememberedEmail(email) {
  rememberedEmail = email;
  try {
    if (email) localStorage.setItem(rememberedEmailKey, email);
    else localStorage.removeItem(rememberedEmailKey);
  } catch { /* Sign-in still works if browser storage is unavailable. */ }
}

try { rememberedEmail = localStorage.getItem(rememberedEmailKey) || ""; }
catch { /* Continue with an empty email field. */ }
restoreRememberedEmail();

rememberEmail.addEventListener("change", () => {
  if (!rememberEmail.checked) saveRememberedEmail("");
});

if (!window.supabase || !window.renueSupabaseConfig) {
  signInStatus.textContent = "Sign-in could not load. Refresh the page to try again.";
} else {
  const authRedirect = new URLSearchParams(window.location.hash.slice(1));
  let inviteToken = authRedirect.get("type") === "invite" ? authRedirect.get("access_token") : null;
  const inviteError = authRedirect.has("error_code") || authRedirect.has("error");
  const pendingInviteKey = "renue-pending-invite";
  let pendingInviteId = null;
  try { pendingInviteId = sessionStorage.getItem(pendingInviteKey); } catch { /* Continue without reload support. */ }

  function rememberInvite(id) {
    pendingInviteId = id;
    try {
      if (id) sessionStorage.setItem(pendingInviteKey, id);
      else sessionStorage.removeItem(pendingInviteKey);
    } catch { /* Keep this invitation open for this page. */ }
  }

  const { url, publishableKey } = window.renueSupabaseConfig;
  const client = window.supabase.createClient(url, publishableKey);
  const setAdvisorHoursOwner = createAdvisorHours(client);
  const setClinicContactEditor = createClinicContactEditor(client);
  const setTreatmentPricingEditor = createTreatmentPricingEditor(client);
  let clinicDirectory = null;
  const templateEditors = createPersonalTemplateEditors(client);
  const setCommunityOwner = createTemplateCommunity(client, templateEditors.manageSharedTemplate);
  let revision = 0;
  let submitting = false;
  let visibleUserId = null;
  let managerRole = null;

  workspaceViewMode.addEventListener("change", () => {
    if (!visibleUserId || !managerRole) return;
    const mode = workspaceViewMode.value;
    const viewRole = mode === "advisor" ? "advisor" : managerRole;
    templateEditors.setOwner(visibleUserId, viewRole);
    setAdvisorHoursOwner(visibleUserId, viewRole);
    setClinicContactEditor(visibleUserId, viewRole, clinicDirectory);
    setTreatmentPricingEditor(viewRole);
    applyWorkspaceViewMode(mode);
  });
  let inviteSession = null;

  function startMessageCopyUsage(userId) {
    const counts = new Map();
    const usage = {
      userId,
      counts,
      async record(key) {
        try {
          const { data, error } = await client.rpc("record_message_copy", {
            expected_user_id: userId,
            message_key: key
          });
          if (!error && typeof data === "number") counts.set(key, Math.max(data, counts.get(key) ?? 0));
        } catch { /* Clipboard copying is independent of usage storage. */ }
      }
    };
    setMessageCopyUsage(usage);

    void (async () => {
      try {
        const { data, error } = await client.from("message_copy_counts")
          .select("template_key, copy_count").eq("user_id", userId);
        if (error || messageCopyUsage !== usage) return;
        for (const { template_key, copy_count } of data) {
          counts.set(template_key, Math.max(copy_count, counts.get(template_key) ?? 0));
        }
        if (messageSort.value === "most-copied" && !messagesView.hidden) refreshMessageSort();
      } catch { /* The original template order remains available. */ }
    })();
  }

  async function loadProfile(session, currentRevision) {
    const { data, error } = await client.from("staff_profiles")
      .select("display_name, role").eq("user_id", session.user.id).maybeSingle();
    if (currentRevision !== revision) return;

    if (error || !data) {
      signInStatus.textContent = error
        ? "Your staff profile could not load. Sign in again to retry."
        : "This account needs a Renue staff profile. Contact your manager.";
      return;
    }

    const [directory, pricing] = await Promise.all([fetchContactDirectory(client), fetchIvkPricing(client)]);
    if (currentRevision !== revision) return;
    await workspaceInitialisation;
    if (currentRevision !== revision) return;
    clinicDirectory = directory;
    applyContactDirectory(directory);

    const role = data.role.charAt(0).toUpperCase() + data.role.slice(1);
    visibleUserId = session.user.id;
    startMessageCopyUsage(visibleUserId);
    staffDisplayName = data.display_name;
    templateEditors.setOwner(visibleUserId, data.role);
    setCommunityOwner(visibleUserId);
    setAdvisorHoursOwner(visibleUserId, data.role);
    setClinicContactEditor(visibleUserId, data.role, clinicDirectory);
    setTreatmentPricingEditor(data.role, pricing);
    managerRole = ["manager", "owner"].includes(data.role) ? data.role : null;
    workspaceViewControl.hidden = !managerRole;
    applyWorkspaceViewMode(managerRole ? "manager" : "advisor");
    renderVoicemails();
    account.textContent = data.display_name + " · " + role;
    signIn.reset();
    restoreRememberedEmail();
    signInStatus.textContent = "";
    accessScreen.hidden = true;
    workspace.hidden = false;
  }

  function handleAuthState(event, session) {
    if (inviteToken && session?.access_token === inviteToken) {
      inviteToken = null;
      rememberInvite(session.user.id);
    }
    if (session && session.user.id === pendingInviteId) {
      inviteSession = session;
      accessScreen.hidden = false;
      workspace.hidden = true;
      accessTitle.textContent = "Set your password";
      signIn.hidden = true;
      if (setPassword.hidden) {
        setPassword.hidden = false;
        setPassword.elements.first_name.focus();
      }
      return;
    }
    if (inviteSession || event === "SIGNED_OUT") rememberInvite(null);
    inviteSession = null;
    setPassword.hidden = true;
    accessTitle.textContent = "Staff sign-in";
    signIn.hidden = false;

    if (session && session.user.id === visibleUserId &&
        (event === "TOKEN_REFRESHED" || event === "SIGNED_IN")) return;
    const currentRevision = ++revision;
    visibleUserId = null;
    managerRole = null;
    workspaceViewControl.hidden = true;
    setMessageCopyUsage(null);
    staffDisplayName = "";
    templateEditors.setOwner(null);
    setCommunityOwner(null);
    setAdvisorHoursOwner(null);
    setClinicContactEditor(null);
    setTreatmentPricingEditor(null, null);
    clinicDirectory = null;
    closeAppointmentModal(null);
    workspace.hidden = true;
    account.textContent = "";
    accessScreen.hidden = false;
    if (!session) {
      signInButton.disabled = submitting;
      if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
        signInStatus.textContent = (inviteError || inviteToken)
          ? "This invitation link is invalid or has expired. Ask your manager for a fresh invitation."
          : "";
        if (inviteError || inviteToken) {
          history.replaceState(history.state, "", window.location.pathname + window.location.search);
          inviteToken = null;
        }
      }
      return;
    }

    signInStatus.textContent = "Loading your staff profile…";
    signInButton.disabled = true;
    // Defer the database request until the Auth callback releases its lock.
    window.setTimeout(async () => {
      try {
        await loadProfile(session, currentRevision);
      } catch {
        if (currentRevision === revision) signInStatus.textContent = "The staff workspace could not load. Sign in again to retry.";
      } finally {
        if (currentRevision === revision) signInButton.disabled = submitting;
      }
    }, 0);
  }
  client.auth.onAuthStateChange(handleAuthState);

  setPassword.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!inviteSession || setPasswordButton.disabled) return;
    const firstName = setPassword.elements.first_name.value.trim();
    if (!firstName || /[\s\p{Cc}]/u.test(firstName)) {
      setPasswordStatus.textContent = "Enter only your first name.";
      setPassword.elements.first_name.focus();
      return;
    }
    const password = setPassword.elements.password.value;
    if (password !== setPassword.elements.confirmation.value) {
      setPasswordStatus.textContent = "Passwords do not match.";
      setPassword.elements.confirmation.focus();
      return;
    }

    const invitedUserId = inviteSession.user.id;
    setPasswordButton.disabled = true;
    setPasswordStatus.textContent = "Setting up your staff account…";
    try {
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (sessionError || session?.user.id !== invitedUserId || inviteSession?.user.id !== invitedUserId) {
        setPasswordStatus.textContent = "Your invitation session has ended. Ask your manager for a fresh invitation.";
        return;
      }
      const { data, error } = await client.auth.updateUser({ password, data: { renue_first_name: firstName } });
      if (error) {
        setPasswordStatus.textContent = error.message || "Could not save your password. Try again.";
        return;
      }
      if (inviteSession?.user.id !== invitedUserId || data.user?.id !== invitedUserId) return;
      const completedSession = inviteSession;
      rememberInvite(null);
      inviteSession = null;
      setPassword.reset();
      setPasswordStatus.textContent = "";
      handleAuthState("SIGNED_IN", completedSession);
    } catch {
      setPasswordStatus.textContent = "Could not save your password. Try again.";
    } finally {
      setPasswordButton.disabled = false;
    }
  });

  signIn.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    submitting = true;
    signInButton.disabled = true;
    signInStatus.textContent = "Signing in…";
    const email = signIn.elements.email.value.trim();
    try {
      const { error } = await client.auth.signInWithPassword({
        email,
        password: signIn.elements.password.value
      });
      if (error) signInStatus.textContent = "Sign-in failed. Check your email and password and try again.";
      else if (rememberEmail.checked) saveRememberedEmail(email);
    } catch {
      signInStatus.textContent = "Sign-in is unavailable. Please try again.";
    } finally {
      signIn.elements.password.value = "";
      signIn.dispatchEvent(new Event("password-cleared"));
      submitting = false;
      signInButton.disabled = false;
    }
  });

  signOutButton.addEventListener("click", async () => {
    signOutButton.disabled = true;
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
      signIn.elements.email.focus();
    } catch {
      showToast("Sign-out failed. Please try again.");
    } finally {
      signOutButton.disabled = false;
    }
  });
}
