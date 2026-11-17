const treatmentPriceFields = ["standard_price", "promotional_price", "offer_price"];
const treatmentPriceColumns = ["clinic_id", ...treatmentPriceFields].join(", ");
let ivkPrices = null;

function getIvkPricing(clinicId) {
  return ivkPrices === null ? legacyIvkPricing[clinicId] : ivkPrices.get(clinicId);
}

function formatTreatmentPrice(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2
  }).format(value);
}

async function fetchIvkPricing(client) {
  try {
    const { data, error } = await client.from("clinic_treatment_prices")
      .select(treatmentPriceColumns).eq("treatment", "ivk");
    if (error) return ["42P01", "PGRST205"].includes(error.code) ? null : new Map();
    return new Map(data.map(row => [row.clinic_id, row]));
  } catch {
    return new Map();
  }
}

function createTreatmentPricingEditor(client) {
  const table = document.querySelector("#treatment-pricing-table");
  const body = table.querySelector("tbody");
  const status = document.querySelector("#treatment-pricing-status");
  const dialog = document.querySelector("#treatment-pricing-editor");
  const form = document.querySelector("#treatment-pricing-form");
  const feedback = form.querySelector("[role=status]");
  const cancel = form.querySelector("[data-cancel-treatment-pricing]");
  const save = form.querySelector("[type=submit]");
  let canEdit = false;
  let revision = 0;
  let original = null;

  function render() {
    table.hidden = !canEdit || !ivkPrices?.size;
    status.textContent = canEdit && table.hidden ? "Pricing records are unavailable. Reload to try again." : "";
    body.innerHTML = table.hidden ? "" : Object.keys(clinicLocations).filter(id => ivkPrices.has(id)).map(id => {
      const record = ivkPrices.get(id);
      const name = escapeHtml(clinicLocations[id].name);
      const prices = treatmentPriceFields.map(field =>
        `<td>${record[field] == null ? "—" : formatTreatmentPrice(record[field])}</td>`).join("");
      return `<tr><th scope="row">${name}</th>${prices}<td><button class="ds-button" type="button"
        data-edit-pricing="${escapeHtml(id)}" aria-label="Edit ${name} prices">Edit</button></td></tr>`;
    }).join("");
  }

  function setSaving(saving) {
    save.disabled = saving;
    cancel.disabled = saving;
    treatmentPriceFields.forEach(field => { form.elements[field].readOnly = saving; });
  }

  body.addEventListener("click", event => {
    const button = event.target.closest("[data-edit-pricing]");
    if (!button || !canEdit) return;
    original = ivkPrices.get(button.dataset.editPricing);
    dialog.querySelector("h3").textContent = `Edit ${clinicLocations[original.clinic_id].name} prices`;
    document.querySelector("#treatment-pricing-offer-label").textContent =
      original.clinic_id === "CHELSEA" ? "Chelsea opening sale (USD)" : "Clinic offer (USD)";
    treatmentPriceFields.forEach(field => { form.elements[field].value = original[field] ?? ""; });
    feedback.textContent = "";
    dialog.showModal();
  });
  cancel.addEventListener("click", () => dialog.close());
  dialog.addEventListener("cancel", event => { if (save.disabled) event.preventDefault(); });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!canEdit || !original || save.disabled) return;
    const values = Object.fromEntries(treatmentPriceFields.map(field => {
      const input = form.elements[field];
      return [field, input.value === "" ? null : input.valueAsNumber];
    }));
    if (values.standard_price === null && (values.promotional_price !== null || values.offer_price !== null)) {
      feedback.textContent = "Enter a standard price before adding a promotion or offer.";
      return;
    }

    const request = revision;
    setSaving(true);
    feedback.textContent = "Saving…";
    try {
      let query = client.from("clinic_treatment_prices").update(values)
        .eq("clinic_id", original.clinic_id).eq("treatment", "ivk");
      for (const field of treatmentPriceFields) {
        query = original[field] == null ? query.is(field, null) : query.eq(field, original[field]);
      }
      const { data, error } = await query.select(treatmentPriceColumns).maybeSingle();
      if (request !== revision) return;
      if (error) throw error;
      if (!data) {
        feedback.textContent = "These prices could not be updated. Reload to check the latest prices.";
        return;
      }
      ivkPrices.set(data.clinic_id, data);
      renderTreatmentGuide();
      dialog.close();
      render();
      body.querySelector(`[data-edit-pricing="${CSS.escape(data.clinic_id)}"]`)?.focus();
      showToast("Treatment prices saved.");
    } catch {
      if (request === revision) feedback.textContent = "Could not save treatment prices. Try again.";
    } finally {
      if (request === revision) setSaving(false);
    }
  });

  return (role, prices = ivkPrices) => {
    ++revision;
    ivkPrices = prices;
    canEdit = role === "manager" || role === "owner";
    original = null;
    dialog.close();
    setSaving(false);
    render();
    renderTreatmentGuide();
  };
}
