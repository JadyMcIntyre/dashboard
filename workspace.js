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
let currentSearchEntries = [];

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
function closeWorkspaceSearch() {
  workspaceSearch.value = "";
  searchResults.hidden = true;
  workspaceMain.hidden = false;
}
function updateClinicContext() {
  const clinic = clinicLocations[selectedLocationId];
  const phone = document.querySelector("#context-phone");
  phone.hidden = !clinic;
  if (clinic) {
    phone.textContent = clinic.phone;
    phone.href = `tel:${clinic.phone.replace(/\D/g, "")}`;
    document.querySelector("#context-address").textContent = clinic.address.replace(", USA", "");
  }
  if (workspaceSearch.value.trim()) renderWorkspaceSearch();
}
function buildWorkspaceSearchEntries() {
  const entries = [];
  const add = (title, subtitle, body, view, extra = {}) => entries.push({ title, subtitle, body, view, ...extra });
  const groups = { inNetwork: "In network", outOfNetwork: "Out of network · Schedule evaluation", outOfNetworkWithBenefits: "OON benefits: evaluation · No OON benefits: IVK consultation / SCA", consultOnly: "IVK consultation only", doNotSchedule: "Do not schedule evaluation" };
  for (const [clinicId, clinic] of Object.entries(clinicLocations)) {
    const catalog = insuranceCatalogByState[clinic.state];
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
function renderWorkspaceSearch() {
  const query = workspaceSearch.value.trim().toLocaleLowerCase();
  if (!query) {
    searchResults.hidden = true;
    workspaceMain.hidden = false;
    return;
  }
  const matches = buildWorkspaceSearchEntries().filter((entry) =>
    `${entry.title} ${entry.subtitle} ${entry.body}`.toLocaleLowerCase().includes(query));
  const clinic = clinicLocations[selectedLocationId];
  const groups = [
    [clinic?.name || clinic?.hoursName, matches.filter((entry) => entry.clinic && entry.clinic === selectedLocationId)],
    [clinic ? "Other clinics" : "All clinics", matches.filter((entry) => entry.clinic && entry.clinic !== selectedLocationId)],
    ["Shared resources and templates", matches.filter((entry) => !entry.clinic)]
  ];
  currentSearchEntries = [];
  searchResults.hidden = false;
  workspaceMain.hidden = true;
  document.querySelector("#workspace-search-status").textContent = matches.length
    ? `${matches.length} ${matches.length === 1 ? "result" : "results"}`
    : "No results. Try an insurer, template name, ingredient or resource.";
  const items = document.querySelector("#workspace-search-items");
  items.innerHTML = groups.filter(([, entries]) => entries.length).map(([label, entries]) => {
    const buttons = entries.map((entry) => {
      const index = currentSearchEntries.push(entry) - 1;
      const content = `<span>${escapeHtml(entry.title)}<small>${escapeHtml(entry.subtitle)}</small></span><span class="search-result-category">${escapeHtml(viewNames[entry.view])} →</span>`;
      return `<button type="button" class="search-result" data-search-result="${index}">${content}</button>`;
    }).join("");
    return `<h3 class="search-result-group">${escapeHtml(label)}</h3>${buttons}`;
  }).join("");
  items.scrollTop = 0;
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
  closeWorkspaceSearch();
  showWorkspaceView(entry.view, true);
  if (entry.companyEmail) document.querySelector("#company-emails").scrollIntoView({ block: "start" });
  workspaceMain.focus({ preventScroll: true });
});
workspaceSearch.addEventListener("input", renderWorkspaceSearch);
document.querySelector("#workspace-search-close").addEventListener("click", () => { closeWorkspaceSearch(); workspaceSearch.focus(); });
document.addEventListener("keydown", (event) => {
  if (appointmentModal.classList.contains("is-visible")) return;
  const editing = event.target.closest("input, textarea, select, [contenteditable]");
  if (event.key === "/" && !editing && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); workspaceSearch.focus(); }
  if (event.key === "Escape" && !searchResults.hidden) { closeWorkspaceSearch(); workspaceSearch.focus(); }
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
