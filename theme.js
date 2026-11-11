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
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const icon = theme === "dark" ? "☀" : "☾";
      const label = theme === "dark" ? "Light mode" : "Dark mode";
      const iconSlot = button.querySelector("[data-theme-icon]");
      if (iconSlot) {
        iconSlot.textContent = icon;
        button.querySelector("[data-theme-label]").textContent = label;
      } else {
        button.textContent = `${icon}  ${label}`;
      }
      button.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
      button.title = button.getAttribute("aria-label");
      button.setAttribute("aria-pressed", String(theme === "dark"));
    });
  }
  applyTheme();
  document.addEventListener("DOMContentLoaded", applyTheme);
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-theme-toggle]")) return;
    preference = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
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
