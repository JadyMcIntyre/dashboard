/* Renue Wellness Dashboard
 * Original design and development by J Mc Intyre, 2026.
 * See AUTHORS.md for project attribution and release verification.
 */

let selectedTreatmentGuide = "ivk";

function treatmentIcon(name) {
  return `<svg class="ds-icon" aria-hidden="true" focusable="false"><use href="./assets/renue-icons.svg#${name}"></use></svg>`;
}

const treatmentGuideIcons = { ivk: "infusion", spravato: "spray", tms: "activity" };

function renderGuideFact([label, value]) {
  const price = value.match(/^(\$[\d,]+)( per session)$/);
  return `<div class="guide-fact${price ? " guide-fact-price" : ""}"><dt>${escapeHtml(label)}</dt><dd>${price
    ? `<strong>${escapeHtml(price[1])}</strong><span>${escapeHtml(price[2])}</span>`
    : escapeHtml(value)}</dd></div>`;
}

function renderTreatmentGuide() {
  const guide = treatmentGuides.find((item) => item.id === selectedTreatmentGuide) || treatmentGuides[0];
  document.querySelectorAll("[data-treatment-guide]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.treatmentGuide === guide.id));
  });
  let facts = guide.facts;
  let note = guide.note;
  if (guide.id === "ivk") {
    const pricing = ivkPricingByClinic[selectedLocationId];
    facts = guide.facts.filter(([label]) => label !== "Pricing");
    if (pricing) {
      facts = [...facts, ["Standard price", `$${pricing.standard} per session`], ["Promotional price", `$${pricing.promo} per session`]];
      if (pricing.openingSale) facts.push(["Chelsea opening sale", `$${pricing.openingSale} per session`]);
      note = pricing.openingSale ? "Chelsea opening-sale rate: $400 per session, available only at Chelsea." : "Prices shown are for the selected clinic.";
    } else {
      facts = [...facts, ["Pricing", selectedLocationId ? "No IVK pricing listed for this clinic" : "Select a clinic to see its prices"]];
      note = "Select New Hyde Park, Chelsea or Paramus for clinic-specific IVK pricing.";
    }
  }
  document.querySelector("#treatment-guide-content").innerHTML = `
    <div class="guide-layout">
      <div class="guide-heading">
        <span class="guide-emblem">${treatmentIcon(treatmentGuideIcons[guide.id])}</span>
        <div><p class="script-reading-label">${escapeHtml(guide.label)}</p><h3>${escapeHtml(guide.name)}</h3><p>${escapeHtml(guide.summary)}</p></div>
      </div>
      <aside class="guide-quick-reference" aria-labelledby="guide-reference-heading">
        <h4 id="guide-reference-heading">${treatmentIcon("activity")} At a glance</h4>
        <dl class="guide-facts">${facts.map(renderGuideFact).join("")}</dl>
        <p class="template-note ds-notice">${treatmentIcon("info")}<span>${escapeHtml(note)}</span></p>
      </aside>
      <div class="guide-sections">${guide.sections.map(([title, text]) => `<article><h4>${escapeHtml(title)}</h4><p>${escapeHtml(text)}</p></article>`).join("")}</div>
    </div>
    <div class="guide-links">
      <h4 class="guide-link-heading">Related tools</h4>
      <div class="guide-actions">
        <button type="button" class="button-secondary ds-button" data-workspace-target="insurance-title">Clinic insurance rules ${treatmentIcon("arrow-up-right")}</button>
        <button type="button" class="button-secondary ds-button" data-workspace-target="financing-title">Financing &amp; copyable links ${treatmentIcon("arrow-up-right")}</button>
        <button type="button" class="button-secondary ds-button" data-workspace-target="travel-title">Transport requirements ${treatmentIcon("arrow-up-right")}</button>
      </div>
    </div>`;

}

document.addEventListener("click", (event) => {
  const guideButton = event.target.closest("[data-treatment-guide]");
  if (guideButton) {
    selectedTreatmentGuide = guideButton.dataset.treatmentGuide;
    renderTreatmentGuide();
  }
  const targetButton = event.target.closest("[data-workspace-target]");
  if (targetButton) {
    closeWorkspaceSearch();
    showWorkspaceView(targetButton.dataset.workspaceTarget, true);
    workspaceMain.focus({ preventScroll: true });
  }
});
for (const id of ["message-search", "message-category"]) {
  document.querySelector(`#${id}`).addEventListener(id.endsWith("search") ? "input" : "change", renderMessages);
}
document.querySelector("#message-clear").addEventListener("click", () => {
  document.querySelector("#message-search").value = "";
  document.querySelector("#message-category").value = "all";
  renderMessages();
});
for (const id of ["resource-search", "resource-category"]) {
  document.querySelector(`#${id}`).addEventListener(id.endsWith("search") ? "input" : "change", renderResources);
}
document.querySelector("#resource-clear").addEventListener("click", () => {
  document.querySelector("#resource-search").value = "";
  document.querySelector("#resource-category").value = "all";
  renderResources();
});
renderTreatmentGuide();

document.addEventListener("workspace-clinic-change", renderTreatmentGuide);
document.addEventListener("workspace-data-ready", renderTreatmentGuide);
