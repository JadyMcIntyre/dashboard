/* Renue Wellness Dashboard
 * Original design and development by J Mc Intyre, 2026.
 * See AUTHORS.md for project attribution and release verification.
 */

const viewNames = {
  "insurance-title": "Insurance",
  "treatment-title": "Treatment guide",
  "vitamins-title": "Vitamins & IV",
  "messages-title": "Messages",
  "templates-title": "Manage templates",
  "advisor-hours-title": "Advisor hours",
  "voicemail-title": "Voicemail scripts",
  "travel-title": "Travel & transport",
  "hours-title": "Hours & contacts",
  "resources-title": "Resources",
  "financing-title": "Financing",
};
const workspaceSearch = document.querySelector("#workspace-search");
const searchResults = document.querySelector("#workspace-search-results");
const workspaceMain = document.querySelector("#workspace-main");
const searchTrigger = document.querySelector("#workspace-search-trigger");
const searchClear = document.querySelector("#workspace-search-clear");
const searchItems = document.querySelector("#workspace-search-items");
let currentSearchEntries = [];
let activeSearchIndex = -1;
let searchReturnFocus = null;

document.querySelector("#workspace-search-key").textContent =
  /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K";

const sidebarToggle = document.querySelector("#sidebar-toggle");
const workspaceShell = sidebarToggle.closest(".workspace-shell");
const sidebarPreferenceKey = "renue-sidebar-collapsed";

function setSidebarCollapsed(collapsed) {
  workspaceShell.classList.toggle("sidebar-collapsed", collapsed);
  sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  sidebarToggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
  sidebarToggle.title = sidebarToggle.getAttribute("aria-label");
}

try { setSidebarCollapsed(localStorage.getItem(sidebarPreferenceKey) === "true"); }
catch { /* The sidebar still works for this page. */ }

document.querySelectorAll(".workspace-nav a").forEach((link) => {
  link.dataset.label = link.textContent.trim();
});

sidebarToggle.addEventListener("click", () => {
  const collapsed = !workspaceShell.classList.contains("sidebar-collapsed");
  setSidebarCollapsed(collapsed);
  try { localStorage.setItem(sidebarPreferenceKey, String(collapsed)); }
  catch { /* Keep the selection for this page. */ }
});

const accountTrigger = document.querySelector("#workspace-account-trigger");
const accountMenu = document.querySelector("#workspace-account-menu");

function positionAccountMenu() {
  const trigger = accountTrigger.getBoundingClientRect();
  const width = Math.min(256, document.documentElement.clientWidth - 24);
  const spaceAbove = trigger.top - 8;
  const spaceBelow = window.innerHeight - trigger.bottom - 8;
  const above = spaceAbove >= 120 || spaceAbove >= spaceBelow;
  accountMenu.style.setProperty("--account-menu-width", `${width}px`);
  accountMenu.style.setProperty("--account-menu-left", `${Math.min(trigger.left, document.documentElement.clientWidth - width - 12)}px`);
  accountMenu.style.setProperty("--account-menu-top", above ? "auto" : `${trigger.bottom + 8}px`);
  accountMenu.style.setProperty("--account-menu-bottom", above ? `${window.innerHeight - spaceAbove}px` : "auto");
  accountMenu.style.setProperty("--account-menu-available", `${Math.max(0, (above ? spaceAbove : spaceBelow) - 8)}px`);
}

accountMenu.addEventListener("beforetoggle", (event) => {
  if (event.newState === "open") positionAccountMenu();
});

function repositionOpenAccountMenu() {
  if (accountMenu.matches(":popover-open")) positionAccountMenu();
}

window.addEventListener("resize", repositionOpenAccountMenu);
document.addEventListener("scroll", repositionOpenAccountMenu, true);

document.querySelector("#staff-sign-out").addEventListener("click", () => {
  accountMenu.hidePopover();
});

function showWorkspaceView(id, updateUrl = false) {
  const view = Object.hasOwn(viewNames, id) ? id : "insurance-title";
  if (updateUrl && window.location.hash !== `#${view}`) history.pushState(null, "", `#${view}`);
  document.querySelectorAll("[data-workspace-view]").forEach((panel) => {
    panel.hidden = panel.dataset.workspaceView !== view;
  });
  document.querySelectorAll('.workspace-nav a[href^="#"]').forEach((link) => {
    if (link.hash === `#${view}`) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.querySelector("#workspace-view-title").textContent = viewNames[view];
  document.title = `${viewNames[view]} · Renue Wellness`;
  window.scrollTo(0, 0);
  document.dispatchEvent(new Event("workspace-view-change"));
}
function openWorkspaceSearch() {
  if (workspaceShell.hidden || document.querySelector("dialog[open]") || appointmentModal.classList.contains("is-visible")) return;
  searchReturnFocus = document.activeElement;
  renderWorkspaceSearch();
  searchResults.showModal();
  workspaceSearch.focus();
}

function closeWorkspaceSearch(restoreFocus = false) {
  if (!searchResults.open) return;
  searchResults.close();
  workspaceSearch.value = "";
  currentSearchEntries = [];
  activeSearchIndex = -1;
  workspaceSearch.removeAttribute("aria-activedescendant");
  if (restoreFocus && searchReturnFocus?.isConnected) searchReturnFocus.focus({ preventScroll: true });
  searchReturnFocus = null;
}

function updateClinicContext() {
  const clinic = clinicLocations[selectedLocationId];
  const phone = document.querySelector("#context-phone");
  const address = document.querySelector("#context-address");
  phone.hidden = !clinic?.phone;
  phone.textContent = clinic?.phone || "";
  if (clinic?.phone) phone.href = `tel:${clinic.phone.replace(/\D/g, "")}`;
  else phone.removeAttribute("href");
  address.textContent = clinic?.address?.replace(", USA", "") || "Select a clinic to see its contact details.";
  document.querySelector('[data-copy-clinic="phone"]').hidden = !clinic?.phone;
  document.querySelector('[data-copy-clinic="address"]').hidden = !clinic?.address;
  if (searchResults.open) renderWorkspaceSearch();
}

document.querySelector(".clinic-contact").addEventListener("click", async (event) => {
  const control = event.target.closest("[data-copy-clinic]");
  if (!control) return;
  const isPhone = control.dataset.copyClinic === "phone";
  const value = document.querySelector(isPhone ? "#context-phone" : "#context-address").textContent;
  try {
    await copyText(value);
    showToast(isPhone ? "Clinic phone number copied." : "Clinic address copied.");
  } catch {
    showToast("Copy failed. Please try again.");
  }
});

function buildWorkspaceSearchEntries() {
  const entries = [];
  const add = (title, subtitle, body, view, extra = {}) => entries.push({ title, subtitle, body, view, ...extra });
  const groups = { inNetwork: "In network", outOfNetwork: "Out of network · Schedule evaluation", outOfNetworkWithBenefits: "OON benefits: evaluation · No OON benefits: IVK consultation / SCA", consultOnly: "IVK consultation only", doNotSchedule: "Do not schedule evaluation" };
  for (const [clinicId, clinic] of Object.entries(clinicLocations)) {
    const catalog = insuranceCatalogByState[clinic.state] || {};
    const name = clinic.name || clinic.hoursName;
    for (const [group, label] of Object.entries(groups)) {
      (catalog[group] || []).forEach((insurer) =>
        add(insurer, `${name} · ${label}`, insurer, "insurance-title", { insurer, clinic: clinicId }));
    }
    const office = officeHours.find((entry) => entry.location === clinic.hoursName);
    if (office) {
      const schedule = office.schedule.map(({ day, hours }) => `${day} ${hours}`).join(" ");
      add(name, [clinic.address || office.addressLines.join(", "), clinic.phone].filter(Boolean).join(" · "),
        `hours ${clinic.hoursName} ${schedule} ${clinic.phone.replace(/\D/g, "")}`, "hours-title", { clinic: clinicId });
    }
    const pricing = ivkPricingByClinic[clinicId];
    if (pricing) {
      add("IV ketamine pricing", name, Object.values(pricing).map((price) => `$${price}`).join(" "),
        "treatment-title", { treatment: "ivk", clinic: clinicId });
    }
  }
  activeMessages.forEach((template, index) => {
    const clinic = clinicLocations[template.locationId];
    const subtitle = clinic ? `Message template · ${clinic.name || clinic.hoursName}` : "Message template";
    add(template.subtitle, subtitle, messagePreviewText(template.body, template.locationId || selectedLocationId),
      "messages-title", { message: index, clinic: template.locationId });
  });
  activeVoicemails.forEach((script, index) => {
    const clinic = clinicLocations[script.locationId];
    const subtitle = clinic ? `Voicemail script · ${clinic.name || clinic.hoursName}` : "Voicemail script";
    add(script.title, subtitle, messagePreviewText(voicemailWithStaffName(script.body), script.locationId || selectedLocationId),
      "voicemail-title", { voicemail: index, clinic: script.locationId });
  });
  resources.forEach((resource, index) => add(resource.title, `${resource.category} · ${resource.stage || resource.note}`, resource.url, "resources-title", { resource: index }));
  treatmentGuides.forEach((guide) => add(guide.name, "Treatment guide", `${guide.summary} ${guide.facts.flat().join(" ")} ${guide.sections.flat().join(" ")}`, "treatment-title", { treatment: guide.id }));
  if (organizationContacts) add("Shared fax number", "All locations · " + organizationContacts.fax, "fax " + organizationContacts.fax.replace(/\D/g, ""), "hours-title");
  document.querySelectorAll(".company-email-table tbody tr").forEach((row) => {
    const label = row.querySelector("th").textContent;
    const email = row.querySelector("a").textContent;
    add(label, email, `company email ${email}`, "hours-title", { companyEmail: true });
  });
  add("Travel & transport", "Directions · Access-A-Ride · MASS", "transport travel route address ZIP car public transit disability access-a-ride MASS Medicaid insurance patients only", "travel-title");
  add("Financing options", "CareCredit · Advance Care · HSA · FSA", financingContentContainer.textContent, "financing-title");
  vitaminMenu.forEach((item) => add(item.name, `NJ vitamins · $${item.price}`, `${item.summary} ${item.ingredients.join(" ")} ${item.benefits.join(" ")}`, "vitamins-title", { vitaminQuery: item.name, clinic: "NJ" }));
  return entries;
}
const searchGroups = {
  "insurance-title": "Insurance", "treatment-title": "Treatments", "vitamins-title": "Treatments",
  "messages-title": "Messages and scripts", "voicemail-title": "Messages and scripts",
  "hours-title": "Clinics and contacts", "resources-title": "Resources"
};

const searchIcons = {
  "insurance-title": "insurance", "treatment-title": "treatment",
  "vitamins-title": "vitamins", "messages-title": "messages",
  "voicemail-title": "voicemail", "hours-title": "hours",
  "advisor-hours-title": "calendar", "resources-title": "resources",
  "travel-title": "travel", "financing-title": "financing", "templates-title": "templates"
};
const callShortcuts = ["insurance-title", "treatment-title", "messages-title", "hours-title"];

function searchRank(entry, query) {
  const title = entry.title.toLocaleLowerCase();
  if (title === query) return 0;
  if (title.startsWith(query)) return 1;
  if (title.includes(query)) return 2;
  if (String(entry.subtitle || "").toLocaleLowerCase().includes(query)) return 3;
  return String(entry.body || "").toLocaleLowerCase().includes(query) ? 4 : -1;
}

function highlightSearchResult(index, scroll = true) {
  const option = searchItems.querySelector(`[data-search-result="${index}"]`);
  searchItems.querySelector('[aria-selected="true"]')?.setAttribute("aria-selected", "false");
  activeSearchIndex = option ? index : -1;
  if (!option) {
    workspaceSearch.removeAttribute("aria-activedescendant");
    return;
  }
  option.setAttribute("aria-selected", "true");
  workspaceSearch.setAttribute("aria-activedescendant", option.id);
  if (scroll) option.scrollIntoView({ block: "nearest" });
}

function renderWorkspaceSearch() {
  const query = workspaceSearch.value.trim().toLocaleLowerCase();
  const currentView = document.querySelector('[data-workspace-view]:not([hidden])')?.dataset.workspaceView;
  const suggestions = callShortcuts.filter(view => view !== currentView);
  const shortcuts = Object.entries(viewNames).map(([view, title]) => ({ view, title, subtitle: "" }));
  searchClear.hidden = !workspaceSearch.value;
  const matches = query
    ? [...buildWorkspaceSearchEntries(), ...shortcuts.filter(({ view }) => view !== "travel-title")]
      .map((entry) => ({ entry, rank: searchRank(entry, query) }))
      .filter(({ rank }) => rank >= 0)
      .sort((a, b) => a.rank - b.rank
        || Number(Boolean(b.entry.clinic && b.entry.clinic === selectedLocationId))
         - Number(Boolean(a.entry.clinic && a.entry.clinic === selectedLocationId)))
    : [...suggestions.map(view => shortcuts.find(entry => entry.view === view)),
       ...shortcuts.filter(entry => entry.view !== currentView && !suggestions.includes(entry.view))]
      .map(entry => ({ entry, rank: -1 }));
  const groups = new Map();
  for (const { entry, rank } of matches) {
    const label = !query
      ? (suggestions.includes(entry.view) ? "Suggested for intake" : "Workspace pages")
      : rank === 0 ? "Exact matches" : searchGroups[entry.view] || "Workspace tools";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(entry);
  }
  currentSearchEntries = [];
  searchItems.innerHTML = [...groups.entries()].map(([label, entries], groupIndex) => {
    const groupId = `command-group-${groupIndex}`;
    const options = entries.map((entry) => {
      const index = currentSearchEntries.push(entry) - 1;
      return `<div class="search-result" role="option" id="command-result-${index}" data-search-result="${index}" aria-selected="false">
        <svg class="ds-icon command-result-icon" aria-hidden="true"><use href="./assets/renue-icons.svg#${searchIcons[entry.view]}"></use></svg>
        <span class="command-result-label"><strong>${escapeHtml(entry.title)}</strong>${entry.subtitle ? `<small>${escapeHtml(entry.subtitle)}</small>` : ""}</span>
        <span class="search-result-category">${escapeHtml(viewNames[entry.view])}</span>
      </div>`;
    }).join("");
    return `<div role="group" aria-labelledby="${groupId}"><h3 class="search-result-group" id="${groupId}">${label}</h3>${options}</div>`;
  }).join("");
  searchItems.scrollTop = 0;
  highlightSearchResult(0, false);
  document.querySelector("#workspace-search-empty").hidden = Boolean(matches.length);
  document.querySelector("#workspace-search-status").textContent = query
    ? `${matches.length} ${matches.length === 1 ? "result" : "results"}` : "Workspace pages";
}

document.querySelectorAll('.workspace-nav a[href^="#"], .workspace-sidebar .brand-home').forEach((link) => {
  link.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    closeWorkspaceSearch();
    showWorkspaceView(link.hash.slice(1), true);
    workspaceMain.focus({ preventScroll: true });
  });
});
document.addEventListener("click", (event) => {
  const resultButton = event.target.closest("[data-search-result]");
  if (!resultButton) return;
  const entry = currentSearchEntries[Number(resultButton.dataset.searchResult)];
  if (!entry) return;
  closeWorkspaceSearch();
  if (entry.clinic && entry.clinic !== selectedLocationId) {
    const radio = document.querySelector(`input[name="call-state"][value="${entry.clinic}"]`);
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event("change")); }
  }
  if (entry.message !== undefined) {
    document.querySelector("#message-search").value = "";
    document.querySelector("#message-category").value = "all";
    selectedMessageIndex = entry.message;
    if (activeMessages[entry.message].locationId && activeMessages[entry.message].locationId !== selectedLocationId) showAllMessagesInput.checked = true;
    renderMessages();
  }
  if (entry.voicemail !== undefined) { selectedVoicemailIndex = entry.voicemail; renderVoicemails(); }
  if (entry.insurer) { document.querySelector("#insurance-search").value = entry.insurer; filterInsuranceItems(); }
  if (entry.companyEmail) document.querySelector("#company-emails").open = true;
  if (entry.vitaminQuery) setVitaminMenuSearch(entry.vitaminQuery);
  if (entry.treatment) { selectedTreatmentGuide = entry.treatment; renderTreatmentGuide(); }
  if (entry.resource !== undefined) {
    document.querySelector("#resource-category").value = "all";
    document.querySelector("#resource-search").value = resources[entry.resource].title;
    renderResources();
  }
  showWorkspaceView(entry.view, true);
  if (entry.companyEmail) document.querySelector("#company-emails").scrollIntoView({ block: "start" });
  workspaceMain.focus({ preventScroll: true });
});
workspaceSearch.addEventListener("input", renderWorkspaceSearch);
searchTrigger.addEventListener("click", openWorkspaceSearch);
searchClear.addEventListener("click", () => {
  workspaceSearch.value = "";
  workspaceSearch.focus();
  renderWorkspaceSearch();
});
document.querySelector("#workspace-search-close").addEventListener("click", () => closeWorkspaceSearch(true));
searchResults.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || event.isComposing) return;
  event.preventDefault();
  event.stopPropagation();
  closeWorkspaceSearch(true);
});
searchResults.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeWorkspaceSearch(true);
});
searchResults.addEventListener("click", (event) => {
  if (event.target === searchResults) closeWorkspaceSearch(true);
});
searchItems.addEventListener("pointermove", (event) => {
  const option = event.target.closest("[data-search-result]");
  if (option && Number(option.dataset.searchResult) !== activeSearchIndex) highlightSearchResult(Number(option.dataset.searchResult), false);
});
workspaceSearch.addEventListener("keydown", (event) => {
  if (event.isComposing || !currentSearchEntries.length) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    highlightSearchResult((activeSearchIndex + direction + currentSearchEntries.length) % currentSearchEntries.length);
  } else if (event.key === "Enter") {
    event.preventDefault();
    searchItems.querySelector(`[data-search-result="${activeSearchIndex}"]`)?.click();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.isComposing || event.defaultPrevented || workspaceShell.hidden || appointmentModal.classList.contains("is-visible")) return;
  const editing = event.target.closest("input, textarea, select, [contenteditable]");
  const slash = event.key === "/" && !editing && !event.ctrlKey && !event.metaKey && !event.altKey;
  const command = event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey) && !event.altKey;
  if (!slash && !command) return;
  if (searchResults.open && command) {
    event.preventDefault();
    closeWorkspaceSearch(true);
  } else if (!document.querySelector("dialog[open]")) {
    event.preventDefault();
    openWorkspaceSearch();
  }
});
window.addEventListener("hashchange", () => { closeWorkspaceSearch(); showWorkspaceView(window.location.hash.slice(1)); });
window.addEventListener("popstate", () => { closeWorkspaceSearch(); showWorkspaceView(window.location.hash.slice(1)); });
document.addEventListener("workspace-data-ready", updateClinicContext);
document.addEventListener("workspace-clinic-change", () => {
  updateClinicContext();
  filterInsuranceItems();
});
document.querySelector("#messages-grid").className = "script-workspace";
document.querySelector("#voicemail-list").className = "script-workspace";
showWorkspaceView(window.location.hash.slice(1));
updateClinicContext();

// Native fragment scrolling runs during page load; keep routed views at their header.
window.addEventListener("load", () => {
  requestAnimationFrame(() => window.scrollTo(0, 0));
});
