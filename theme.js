(() => {
  const key = "renue-theme";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let preference = null;
  try { preference = localStorage.getItem(key); } catch { /* The theme still works when storage is unavailable. */ }
  if (!["light", "dark"].includes(preference)) preference = null;

  function applyTheme() {
    const theme = preference || (systemTheme.matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const toggle = document.querySelector("[data-theme-switch]");
    if (toggle) toggle.checked = theme === "dark";
  }
  applyTheme();
  document.addEventListener("DOMContentLoaded", applyTheme);
  document.addEventListener("change", (event) => {
    if (!event.target.matches("[data-theme-switch]")) return;
    preference = event.target.checked ? "dark" : "light";
    try { localStorage.setItem(key, preference); } catch { /* Keep the selection for this page. */ }
    applyTheme();
  });
  systemTheme.addEventListener("change", () => { if (!preference) applyTheme(); });
  window.addEventListener("storage", (event) => {
    if (event.key !== key) return;
    preference = ["light", "dark"].includes(event.newValue) ? event.newValue : null;
    applyTheme();
  });
})();
