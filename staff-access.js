const signIn = document.querySelector("#staff-sign-in");
const signInButton = signIn.querySelector("button");
const setPassword = document.querySelector("#staff-set-password");
const setPasswordButton = setPassword.querySelector("button");
const setPasswordStatus = setPassword.querySelector("[role=status]");
const accessTitle = document.querySelector("#staff-access-title");
const signInStatus = document.querySelector("#staff-sign-in-status");
const accessScreen = document.querySelector("#staff-access");
const workspace = document.querySelector(".workspace-shell");
const account = document.querySelector("#staff-account");
const signOutButton = document.querySelector("#staff-sign-out");

if (!window.supabase) {
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

  const client = window.supabase.createClient(
    "https://xzpgodvdffpazhcvzxkq.supabase.co",
    "sb_publishable_A-tlM6YuoENyosTMzY0mqQ_aNj7iWqM"
  );
  const setAdvisorHoursOwner = createAdvisorHours(client);
  const templateEditors = createPersonalTemplateEditors(client);
  const setCommunityOwner = createTemplateCommunity(client, templateEditors.manageSharedTemplate);
  let revision = 0;
  let submitting = false;
  let visibleUserId = null;
  let inviteSession = null;

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

    const directory = await fetchContactDirectory(client);
    if (currentRevision !== revision) return;
    await workspaceInitialisation;
    if (currentRevision !== revision) return;
    applyContactDirectory(directory);

    const role = data.role.charAt(0).toUpperCase() + data.role.slice(1);
    visibleUserId = session.user.id;
    staffDisplayName = data.display_name;
    templateEditors.setOwner(visibleUserId, data.role);
    setCommunityOwner(visibleUserId);
    setAdvisorHoursOwner(visibleUserId, data.role);
    renderVoicemails();
    account.textContent = data.display_name + " · " + role;
    signIn.reset();
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
    staffDisplayName = "";
    templateEditors.setOwner(null);
    setCommunityOwner(null);
    setAdvisorHoursOwner(null);
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
    try {
      const { error } = await client.auth.signInWithPassword({
        email: signIn.elements.email.value.trim(),
        password: signIn.elements.password.value
      });
      if (error) signInStatus.textContent = "Sign-in failed. Check your email and password and try again.";
    } catch {
      signInStatus.textContent = "Sign-in is unavailable. Please try again.";
    } finally {
      signIn.elements.password.value = "";
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
