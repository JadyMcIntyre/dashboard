/* Renue Wellness Dashboard
 * Original design and development by J Mc Intyre, 2026.
 * See AUTHORS.md for project attribution and release verification.
 */

let organizationContacts = null;

async function fetchContactDirectory(client) {
  const [organization, clinics, emails] = await Promise.all([
    client.from("organization_contacts")
      .select("fax, website_url, carecredit_url, advance_care_url, access_a_ride_url, access_a_ride_phone").single(),
    client.from("clinic_contacts").select("clinic_id, name, address, phone"),
    client.from("company_email_contacts").select("id, label, email").order("sort_order").order("id")
  ]);
  for (const result of [organization, clinics, emails]) {
    if (result.error) throw result.error;
  }
  const clinicsById = new Map(clinics.data.map((clinic) => [clinic.clinic_id, clinic]));
  if (!Object.keys(clinicLocations).every((id) => clinicsById.has(id))) {
    throw new Error("The contact directory is missing a clinic.");
  }
  return { organization: organization.data, clinicsById, emails: emails.data };
}

const clinicNumberMention = /(?<![\w@.+-])@clinic[ -]number(?![\w@-])/i;

function selectedClinicPhone(clinicId = selectedLocationId) {
  return clinicLocations[clinicId]?.phone;
}

function resolveContactReferences(body, clinicId = selectedLocationId) {
  if (!organizationContacts) return body;
  const links = {
    website: organizationContacts.website_url,
    advancecare: organizationContacts.advance_care_url
  };
  return body
    .replace(new RegExp(clinicNumberMention.source, "gi"), () => selectedClinicPhone(clinicId) || "[Select a clinic for its phone number]")
    .replace(/\{\{org:(website|advancecare)\}\}/g, (_, key) => links[key])
    .replace(/(?<![\w@.+-])@(renuesite|advancecare)(?![\w@-])/gi, (_, key) =>
      links[key.toLowerCase() === "renuesite" ? "website" : "advancecare"])
    .replace(/(?<![\w@.+-])@(NY|NJ|FL|CHELSEA)-number(?![\w@-])/gi, (_, id) =>
      clinicLocations[id.toUpperCase()].phone);
}

function applyContactDirectory({ organization, clinicsById, emails }) {
  organizationContacts = organization;
  for (const [id, clinic] of Object.entries(clinicLocations)) {
    const { name, address, phone } = clinicsById.get(id);
    Object.assign(clinic, { name, address, phone });
  }
  for (const template of messageTemplates) {
    if (template.locationId) template.subtitle = clinicLocations[template.locationId].name;
  }

  financingClientLinks.carecredit.url = organization.carecredit_url;
  financingClientLinks.advancecare.url = organization.advance_care_url;
  for (const resource of resources) {
    resource.url = resolveContactReferences(resource.sourceUrl ??= resource.url);
  }

  document.querySelector("#organization-fax").textContent = organization.fax;
  document.querySelector("#access-a-ride-link").href = organization.access_a_ride_url;
  const transportPhone = document.querySelector("#access-a-ride-phone");
  transportPhone.textContent = organization.access_a_ride_phone;
  transportPhone.href = "tel:" + organization.access_a_ride_phone.replace(/\D/g, "");
  document.querySelector(".email-count").textContent = emails.length + (emails.length === 1 ? " contact" : " contacts");

  const emailRows = emails.map(({ label, email }) => {
    const row = document.createElement("tr");
    const heading = document.createElement("th");
    heading.scope = "row";
    heading.textContent = label;
    const cell = document.createElement("td");
    const link = document.createElement("a");
    link.href = "mailto:" + email;
    link.textContent = email;
    cell.append(link);
    row.append(heading, cell);
    return row;
  });
  document.querySelector(".company-email-table tbody").replaceChildren(...emailRows);
  renderHours();
  renderInsuranceTable();
  updateHeroTime();
  renderResources();
  renderFinancingOptions();
  document.dispatchEvent(new Event("workspace-data-ready"));
}


function createClinicContactEditor(client) {
  const edit = document.querySelector("#edit-clinic-contact");
  const dialog = document.querySelector("#clinic-contact-editor");
  const form = document.querySelector("#clinic-contact-form");
  const phone = form.elements.phone;
  const address = form.elements.address;
  const status = form.querySelector("[role=status]");
  const save = form.querySelector("[type=submit]");
  const cancel = form.querySelector("[data-cancel-clinic-contact]");
  let directory = null;
  let original = null;
  let saving = false;
  let revision = 0;

  function updateVisibility() {
    edit.hidden = !directory?.clinicsById.has(selectedLocationId);
  }

  edit.addEventListener("click", () => {
    original = directory?.clinicsById.get(selectedLocationId);
    if (!original) return;
    document.querySelector("#clinic-contact-editor-name").textContent = original.name;
    phone.value = original.phone;
    address.value = original.address;
    status.textContent = "";
    dialog.showModal();
  });
  cancel.addEventListener("click", () => dialog.close());
  dialog.addEventListener("cancel", (event) => {
    if (saving) event.preventDefault();
  });
  document.addEventListener("workspace-clinic-change", updateVisibility);

  function setSaving(value) {
    saving = value;
    save.disabled = value;
    cancel.disabled = value;
    phone.readOnly = value;
    address.readOnly = value;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!directory || !original || saving) return;
    const values = { phone: phone.value.trim(), address: address.value.trim() };
    if (!values.address || !/^[+\d().\s-]+$/.test(values.phone) ||
        !/^(1)?\d{10}$/.test(values.phone.replace(/\D/g, ""))) {
      status.textContent = "Enter a US phone number and a complete address.";
      return;
    }

    const request = revision;
    setSaving(true);
    status.textContent = "Saving…";
    try {
      const { data, error } = await client.from("clinic_contacts").update(values)
        .eq("clinic_id", original.clinic_id)
        .eq("phone", original.phone).eq("address", original.address)
        .select("clinic_id, name, phone, address").maybeSingle();
      if (request !== revision) return;
      if (error) throw error;
      if (!data) {
        status.textContent = "The contact could not be updated. Reload the dashboard and check for newer details.";
        return;
      }

      const addressChanged = original.address !== data.address;
      directory.clinicsById.set(data.clinic_id, data);
      applyContactDirectory(directory);
      renderMessages();
      renderVoicemails();
      if (addressChanged) document.querySelector("#travel-results").hidden = true;
      dialog.close();
      showToast("Clinic contact saved.");
    } catch {
      if (request === revision) status.textContent = "Could not save the clinic contact. Try again.";
    } finally {
      if (request === revision) setSaving(false);
    }
  });

  return (userId, role, contacts) => {
    ++revision;
    directory = userId && ["manager", "owner"].includes(role) ? contacts : null;
    original = null;
    dialog.close();
    setSaving(false);
    updateVisibility();
  };
}
