const signIn = document.querySelector("#staff-sign-in");
const signInButton = signIn.querySelector("button");
const signInStatus = document.querySelector("#staff-sign-in-status");
const accessScreen = document.querySelector("#staff-access");
const workspace = document.querySelector(".workspace-shell");
const account = document.querySelector("#staff-account");
const signOutButton = document.querySelector("#staff-sign-out");

if (!window.supabase) {
  signInStatus.textContent = "Sign-in could not load. Refresh the page to try again.";
} else {
  const client = window.supabase.createClient(
    "https://xzpgodvdffpazhcvzxkq.supabase.co",
    "sb_publishable_A-tlM6YuoENyosTMzY0mqQ_aNj7iWqM"
  );
  const templateEditors = createPersonalTemplateEditors(client);
  const setCommunityOwner = createTemplateCommunity(client, templateEditors.manageSharedTemplate);
  let revision = 0;
  let submitting = false;
  let visibleUserId = null;

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
    renderVoicemails();
    account.textContent = data.display_name + " · " + role;
    signIn.reset();
    signInStatus.textContent = "";
    accessScreen.hidden = true;
    workspace.hidden = false;
  }

  client.auth.onAuthStateChange((event, session) => {
    if (session && session.user.id === visibleUserId &&
        (event === "TOKEN_REFRESHED" || event === "SIGNED_IN")) return;
    const currentRevision = ++revision;
    visibleUserId = null;
    staffDisplayName = "";
    templateEditors.setOwner(null);
    setCommunityOwner(null);
    closeAppointmentModal(null);
    workspace.hidden = true;
    account.textContent = "";
    accessScreen.hidden = false;
    if (!session) {
      signInButton.disabled = submitting;
      if (event === "INITIAL_SESSION") signInStatus.textContent = "";
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
