const menuSearch = document.querySelector("#menu-search");
const menuSort = document.querySelector("#menu-sort");
const vitaminGrid = document.querySelector("#vitamin-grid");
let descriptionsExpanded = false;
const categoryLabels = { iv: "IV therapy", shot: "Vitamin shot", addon: "Add-on drip" };

function escapeMenuText(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function renderVitaminMenu() {
  const category = document.querySelector('input[name="menu-category"]:checked').value;
  const query = menuSearch.value.trim().toLocaleLowerCase();
  const items = vitaminMenu.filter((item) => {
    const searchable = [item.name, item.summary, ...item.ingredients, ...item.benefits, item.note || ""].join(" ").toLocaleLowerCase();
    return (category === "all" || item.category === category) && searchable.includes(query);
  });
  if (menuSort.value === "price-low") items.sort((a, b) => a.price - b.price);
  if (menuSort.value === "price-high") items.sort((a, b) => b.price - a.price);

  document.querySelector("#menu-count").textContent = `${items.length} ${items.length === 1 ? "option" : "options"}${category === "all" ? " across the menu" : ` · ${categoryLabels[category]}`}`;
  document.querySelector("#menu-empty").hidden = items.length > 0;
  vitaminGrid.innerHTML = items.map((item) => `
    <article class="vitamin-card category-${item.category}" aria-labelledby="${item.id}-title">
      <div class="vitamin-card-top"><span class="treatment-category">${categoryLabels[item.category]}</span><span class="treatment-price">$${item.price}</span></div>
      <h2 id="${item.id}-title">${escapeMenuText(item.name)}</h2>
      <p class="treatment-summary">${escapeMenuText(item.summary)}</p>
      <div class="treatment-ingredients"><h3>Listed ingredients</h3>${item.ingredients.length ? `<ul>${item.ingredients.map((ingredient) => `<li>${escapeMenuText(ingredient)}</li>`).join("")}</ul>` : '<p class="not-listed">Ask the clinic for the full ingredient list.</p>'}</div>
      ${item.note ? `<p class="treatment-note">${escapeMenuText(item.note)}</p>` : ""}
      <details class="treatment-description" ${descriptionsExpanded ? "open" : ""}><summary>Treatment details<span aria-hidden="true">+</span></summary><ul>${item.benefits.map((benefit) => `<li>${escapeMenuText(benefit)}</li>`).join("")}</ul>${item.sourceNote ? `<p>${escapeMenuText(item.sourceNote)}</p>` : ""}</details>
    </article>`).join("");
}
menuSearch.addEventListener("input", renderVitaminMenu);
menuSort.addEventListener("change", renderVitaminMenu);
document.querySelectorAll('input[name="menu-category"]').forEach((input) => input.addEventListener("change", renderVitaminMenu));
document.querySelector("#menu-reset").addEventListener("click", () => {
  menuSearch.value = "";
  menuSort.value = "menu";
  document.querySelector('input[name="menu-category"][value="all"]').checked = true;
  renderVitaminMenu();
  menuSearch.focus();
});
menuSearch.value = new URLSearchParams(window.location.search).get("q") || "";
renderVitaminMenu();

document.querySelector("#menu-expand").addEventListener("click", (event) => {
  descriptionsExpanded = !descriptionsExpanded;
  event.currentTarget.setAttribute("aria-pressed", String(descriptionsExpanded));
  event.currentTarget.textContent = descriptionsExpanded ? "Collapse descriptions" : "Expand descriptions";
  vitaminGrid.querySelectorAll("details").forEach((details) => { details.open = descriptionsExpanded; });
});

function setVitaminMenuSearch(query) {
  menuSearch.value = query;
  document.querySelector('input[name="menu-category"][value="all"]').checked = true;
  renderVitaminMenu();
}
