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

