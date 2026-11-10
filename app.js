let staffDisplayName = "";

const messageTemplates = [
  {
    key: "initial-follow-up",
    title: "Message 3",
    subtitle: "Initial Follow-Up",
    body: `Hi <>,

this is {{staffName}} with Renue Wellness! I tried reaching you earlier regarding your request for information about our treatment options. When you have a moment, feel free to call or text me back at this number. I'm happy to help.`,
  },
  {
    key: "lead-follow-up",
    title: "Message 4",
    subtitle: "Lead Follow-Up",
    body: `Hi <>,

this is {{staffName}} with Renue Wellness. You previously submitted a form looking for information on our mental health treatments. I was following up to see if you were still interested in learning more about how we can help. Please know that you can reach out to us anytime. We're here to support you. Wishing you nothing but the best.`,
  },
  {
    key: "inactive-status",
    title: "Message 5",
    subtitle: "Inactive Status Message",
    body: `Hi <>,

this is {{staffName}} with Renue Wellness. I hope today is treating you kindly.

We have attempted to reach you on multiple occasions but have been unable to connect. We will be moving your chart to an inactive status. Please know this does not close doors on your treatment - you are ALWAYS welcome to return whenever you're ready.

If you decide to move forward, you can text or call me and I will be happy to help you continue the process.

Always believe in the good things coming. Wishing you nothing but the best today and every day.

- The Renue Wellness Team`,
  },
  {
    key: "appointment-confirmation",
    title: "Message 6",
    subtitle: "Appointment Confirmation",
    body: `Hi <>,

This is Renue Wellness confirming your appointment for **{{appointmentDateTime}}**.

Please reply **YES** to confirm.
Please reply **NO** to cancel or reschedule.`,
  },
];

messageTemplates.push(...quickMessageTemplates);
const resources = careResources;


const financingClientLinks = {
  carecredit: { name: "CareCredit", url: "" },
  advancecare: { name: "Advance Care", url: "" },
};

const financingOptionsContent = `
  <div class="financing-options-grid">
    <article class="financing-option">
      <div class="financing-option-heading"><h3>CareCredit</h3><button class="button-secondary copy-link-icon" type="button" data-copy-financing="carecredit" aria-label="Copy CareCredit link" title="Copy CareCredit link"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 4H6a2 2 0 0 0-2 2v9"/></svg></button></div>
      <p><strong>What it is:</strong> A healthcare credit card issued by Synchrony Bank and used to pay for medical expenses.</p>
      <p><strong>How it works:</strong> Patients apply like a credit card. Approval is required.</p>
      <p><strong>Terms:</strong> Financing and promotional offers are subject to credit approval. Patients should review the offer’s repayment and interest terms.</p>
    </article>
    <article class="financing-option">
      <div class="financing-option-heading"><h3>Advance Care</h3><button class="button-secondary copy-link-icon" type="button" data-copy-financing="advancecare" aria-label="Copy Advance Care link" title="Copy Advance Care link"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 4H6a2 2 0 0 0-2 2v9"/></svg></button></div>
      <p><strong>What it is:</strong> Medical financing for procedures and expenses that insurance may not cover.</p>
      <p><strong>How it works:</strong> Patients apply online and receive a credit decision. Co-signers may be used.</p>
      <p><strong>Terms:</strong> Approval and financing offers depend on the application. Patients should review the available offer and repayment terms.</p>
    </article>
    <article class="financing-option">
      <h3>HSA</h3>
      <p><strong>What it is:</strong> A tax-advantaged Health Savings Account for medical expenses.</p>
      <p><strong>Who qualifies:</strong> Patients must have a high-deductible health plan.</p>
      <p><strong>How it works:</strong> The patient and/or employer contributes money, funds can be used for qualified medical expenses, and money rolls over every year.</p>
    </article>
    <article class="financing-option">
      <h3>FSA</h3>
      <p><strong>What it is:</strong> An employer-sponsored Flexible Spending Account for medical expenses using pre-tax dollars.</p>
      <p><strong>How it works:</strong> Patients elect an annual amount during open enrollment, and money is taken from their paycheck.</p>
      <p><strong>Key rule:</strong> Usually use-it-or-lose-it, though some plans allow a small rollover or grace period.</p>
    </article>
  </div>
`;

const clinicLocations = {
  NY: { state: "NY", timeZone: "America/New_York", name: "", address: "", hoursName: "New Hyde Park", phone: "" },
  CHELSEA: { state: "NY", timeZone: "America/New_York", name: "", address: "", hoursName: "NYC Chelsea", phone: "" },
  NJ: { state: "NJ", timeZone: "America/New_York", name: "", address: "", hoursName: "New Jersey", phone: "" },
  FL: { state: "FL", timeZone: "America/Chicago", name: "", address: "", hoursName: "Florida", phone: "" },
};

const clinicFollowUpBody = `Hi <>,

this is {{staffName}} with Renue Wellness!

We called you earlier and were unable to connect.
Please call {{phone}} to get in touch with one of our team members or reply to this message with a good time to reach you.

{{org:website}}`;

messageTemplates.unshift(...Object.entries(clinicLocations).map(([locationId]) => ({
  key: "clinic-callback-" + locationId,
  locationId,
  subtitle: "",
  body: clinicFollowUpBody.replace("{{phone}}", "@"+ locationId + "-number"),
})));

const messagesGrid = document.querySelector("#messages-grid");
const showAllMessagesInput = document.querySelector("#show-all-messages");
const messagesFilterNote = document.querySelector("#messages-filter-note");
const voicemailList = document.querySelector("#voicemail-list");
const resourcesList = document.querySelector("#resources-list");
const hoursList = document.querySelector("#hours-list");
const financingContentContainer = document.querySelector("#financing-content");
const insuranceTableContainer = document.querySelector("#insurance-table-container");
const toast = document.querySelector("#toast");
const heroTime = document.querySelector("#hero-time");
const appointmentModal = document.querySelector("#appointment-modal");
const appointmentForm = document.querySelector("#appointment-form");
const appointmentClientNameInput = document.querySelector("#appointment-client-name");
const appointmentDateInput = document.querySelector("#appointment-date");
const appointmentTimeInput = document.querySelector("#appointment-time");
const stateInputs = document.querySelectorAll('input[name="call-state"]');
const fabHoursEl = document.querySelector("#fab-hours");

const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

const fallbackVoicemailScriptsRaw = `Online Form

Hi [Name], this is {{staffName}} calling from Renue Wellness. I'm just reaching out because I saw that you completed our online form, and I wanted to personally follow up to see how we can help. I'd be happy to answer any questions you may have and talk through the treatment options we offer. Please feel free to give me a call back whenever it's convenient for you.

Returning a Call - Patient Requested Information

Hi [Name], this is {{staffName}} calling from Renue Wellness. I'm just returning your call as you had reached out to learn more about the treatments we offer. I would be more than happy to answer any questions you may have and walk you through the options available. Please feel free to give me a call back whenever it's convenient for you.

Missed Ketamine Appointment

Hi [Name], this is {{staffName}} from Renue Wellness. I'm just calling to check in as it looks like we missed you for your ketamine treatment appointment today. I wanted to make sure everything is okay and see if you would like help rescheduling. Please feel free to call us back when you have a moment. We're here to help.

Missed Consultation

Hi [Name], this is {{staffName}} calling from Renue Wellness. I just wanted to check in as it looks like we missed you at your consultation with the doctor today. I hope everything is okay. Whenever you're ready, we'd be more than happy to help you reschedule. Please feel free to give us a call back at your convenience. We're here to help. Take care.`;

const fallbackOfficeHours = [
  {
    location: "New Hyde Park",
    addressLines: [
      "1 Hollow Lane, Suite 201A",
      "New Hyde Park, NY 11042",
    ],
    schedule: [
  {
    "day": "Sunday",
    "hours": "10:00 AM - 6:30 PM"
  },
  {
    "day": "Monday",
    "hours": "12:00 PM - 8:30 PM"
  },
  {
    "day": "Tuesday",
    "hours": "9:30 AM - 8:00 PM"
  },
  {
    "day": "Wednesday",
    "hours": "12:00 PM - 8:30 PM"
  },
  {
    "day": "Thursday",
    "hours": "9:30 AM - 8:30 PM"
  },
  {
    "day": "Friday",
    "hours": "9:00 AM - 3:00 PM"
  }
,
  { "day": "Saturday", "hours": "Closed" }
],
  },
  {
    location: "NYC Chelsea",
    addressLines: ["147 W 25th St, 10th Floor", "New York, NY 10001"],
    schedule: [
  {
    "day": "Sunday",
    "hours": "10:00 AM - 6:30 PM"
  },
  {
    "day": "Monday",
    "hours": "9:30 AM - 8:30 PM"
  },
  {
    "day": "Tuesday",
    "hours": "Closed"
  },
  {
    "day": "Wednesday",
    "hours": "12:00 PM - 8:30 PM"
  },
  {
    "day": "Thursday",
    "hours": "9:30 AM - 8:30 PM"
  },
  {
    "day": "Friday",
    "hours": "Closed"
  },
  {
    "day": "Saturday",
    "hours": "Closed"
  }
],
  },
  {
    location: "New Jersey",
    addressLines: [
      "6 Forest Avenue, Suite 204",
      "Paramus, NJ 07652",
    ],
    schedule: [
  {
    "day": "Sunday",
    "hours": "10:00 AM - 6:30 PM"
  },
  {
    "day": "Monday",
    "hours": "9:15 AM - 5:30 PM"
  },
  {
    "day": "Tuesday",
    "hours": "10:00 AM - 8:00 PM"
  },
  {
    "day": "Wednesday",
    "hours": "9:15 AM - 5:30 PM"
  },
  {
    "day": "Thursday",
    "hours": "10:00 AM - 8:00 PM"
  },
  {
    "day": "Friday",
    "hours": "9:00 AM - 5:30 PM"
  }
,
  { "day": "Saturday", "hours": "Closed" }
],
  },
  {
    location: "Florida",
    addressLines: [
      "1299 Industrial Dr",
      "Crestview, FL 32539",
    ],
    schedule: [
  {
    "day": "Sunday",
    "hours": "Closed"
  },
  {
    "day": "Monday",
    "hours": "8:30 AM - 4:30 PM"
  },
  {
    "day": "Tuesday",
    "hours": "9:00 AM - 5:00 PM"
  },
  {
    "day": "Wednesday",
    "hours": "8:30 AM - 4:30 PM"
  },
  {
    "day": "Thursday",
    "hours": "9:00 AM - 5:00 PM"
  },
  {
    "day": "Friday",
    "hours": "8:30 AM - 4:30 PM"
  }
,
  { "day": "Saturday", "hours": "Closed" }
],
  },
];

const insuranceCatalogByState = {
  "NY": {
    "inNetwork": [
      "Fidelis",
      "Medicare",
      "Aetna",
      "Humana",
      "1199",
      "Fidelis Medicaid / UHC Medicaid",
      "Tricare",
      "Molina",
      "MagnaCare",
      "Clover Health",
      "Cigna"
    ],
    "outOfNetwork": [
      "Wellcare",
      "NYSHIP"
    ],
    "outOfNetworkWithBenefits": [
      "Emblem",
      "UHC",
      "Anthem",
      "Empire BCBS"
    ],
    "consultOnly": [
      "Healthfirst",
      "Metroplus",
      "MVP",
      "NY Medicaid (no other insurance)",
      "VA Community"
    ],
    "doNotSchedule": []
  },
  "NJ": {
    "inNetwork": [
      "Fidelis",
      "Medicare",
      "Aetna",
      "Aetna Better Health",
      "Horizon",
      "NJ Medicaid",
      "Tricare",
      "Jefferson Health",
      "WellCare Fidelis",
      "AmeriHealth",
      "Cigna",
      "Ambetter",
      "Clover Health",
      "Braven"
    ],
    "outOfNetwork": [
      "Emblem",
      "UHC",
      "BCBS — out of state"
    ],
    "consultOnly": [
      "Amerigroup / Wellpoint — sometimes Medicaid plan"
    ],
    "doNotSchedule": []
  },
  "FL": {
    "inNetwork": [
      "Medicare",
      "Aetna",
      "Cigna",
      "Tricare",
      "Champ VA"
    ],
    "outOfNetwork": [],
    "consultOnly": [],
    "doNotSchedule": [
      "Medicaid",
      "VA Community Care",
      "BCBS",
      "Florida Blue"
    ]
  }
};


let selectedState = "";
let selectedLocationId = "";
let selectedFlService = "TMS";
let appointmentModalResolver = null;
let appointmentModalTrigger = null;

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatVoicemailForDisplay(value) {
  const escaped = escapeHtml(value);
  const lines = escaped
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return `<p>${lines.join("<br /><br />")}</p>`;
}

function normalizeTemplateForCopy(value) {
  return value
    .replace(markdownLinkPattern, "$2")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .trim();
}

function parseVoicemailScripts(rawText) {
  const blocks = rawText
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter((b) => b && !b.startsWith("---"));

  const scripts = [];

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i]
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    if (lines.length >= 2) {
      // Title and body in the same block (e.g. "Title:\nBody text")
      scripts.push({
        title: lines[0].replace(/:$/, "").trim(),
        body: lines.slice(1).join("\n").trim(),
      });
    } else {
      // Title alone in its block — pair with the next block as body
      const nextBlock = blocks[i + 1];
      if (nextBlock) {
        scripts.push({
          title: lines[0].replace(/:$/, "").trim(),
          body: nextBlock.trim(),
        });
        i++;
      }
    }
  }

  return scripts;
}

let voicemailScripts = parseVoicemailScripts(fallbackVoicemailScriptsRaw);
let officeHours = fallbackOfficeHours;

function extractSection(rawText, heading, nextHeading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedNextHeading = nextHeading
    ? nextHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    : "";
  const sectionEndPattern = escapedNextHeading ? `\\n\\s*${escapedNextHeading}:|$` : "$";
  const pattern = new RegExp(
    `${escapedHeading}:\\s*([\\s\\S]*?)(?:${sectionEndPattern})`,
    "i"
  );
  const match = rawText.match(pattern);
  return match ? match[1].trim() : "";
}

function parseOfficeHours(rawText) {
  return rawText
    .split(/\n\s*\n/g)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.replace(/\u00a0/g, " ").trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length > 0)
    .map((lines) => {
      const location = lines[0];
      const addressLines = [];
      const schedule = [];
      let index = 1;

      while (index < lines.length && !lines[index].startsWith("•")) {
        addressLines.push(lines[index]);
        index += 1;
      }

      while (index < lines.length) {
        const dayLine = lines[index];
        if (!dayLine.startsWith("•")) {
          index += 1;
          continue;
        }

        const day = dayLine.replace(/^•\s*/, "").trim();
        const hours = lines[index + 1] || "";
        if (day && hours) {
          const [timeRange, ...notes] = hours.split(" | ");
          schedule.push({ day, hours: timeRange, note: notes.join(" | ") });
        }
        index += 2;
      }

      return { location, addressLines, schedule };
    })
    .filter((entry) => entry.location && entry.schedule.length > 0);
}

async function loadNewInfo() {
  try {
    const response = await fetch("./resources/new_info.txt", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const rawText = await response.text();
    const voicemailSection = extractSection(rawText, "Voicemails", "Hours");
    const hoursSection = extractSection(rawText, "Hours", "");
    const parsedVoicemails = parseVoicemailScripts(voicemailSection);
    const parsedHours = parseOfficeHours(hoursSection);

    if (parsedVoicemails.length > 0) {
      voicemailScripts = parsedVoicemails;
    }

    if (parsedHours.length > 0) {
      officeHours = parsedHours;
    }
  } catch (error) {
    console.warn("Unable to load resources/new_info.txt, using fallback content.", error);
  }
}

function applyClientName(template, clientName) {
  return template.replaceAll("<>", () => clientName.trim());
}

function applyAppointmentDateTime(template, appointmentDateTime) {
  return template.replaceAll("{{appointmentDateTime}}", appointmentDateTime);
}

function isAppointmentConfirmationTemplate(template) {
  return template.body.includes("{{appointmentDateTime}}");
}

function getDefaultAppointmentValues() {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  now.setHours(now.getHours() + 1);

  const dateValue = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const timeValue = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ].join(":");

  return { dateValue, timeValue };
}

function formatAppointmentDateTime(dateValue, timeValue) {
  const date = new Date(`${dateValue}T${timeValue}`);
  const datePart = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${datePart} at ${timePart}`;
}

function closeAppointmentModal(result = null) {
  if (!appointmentModalResolver) {
    return;
  }

  const resolve = appointmentModalResolver;
  appointmentModalResolver = null;
  appointmentModal.classList.remove("is-visible");
  appointmentModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  appointmentForm.reset();
  document.querySelector(".shell").inert = false;
  appointmentModalTrigger?.focus();
  resolve(result);
}

function openAppointmentModal(template) {
  const hasAppointment = isAppointmentConfirmationTemplate(template);
  const staffField = document.querySelector("#message-staff-field");
  const staffInput = document.querySelector("#message-staff-name");
  staffField.hidden = !template.body.includes("{{staffName}}");
  staffInput.disabled = staffField.hidden;
  staffInput.required = !staffField.hidden;
  staffInput.value = staffDisplayName;
  appointmentModal.querySelector(".field-row").hidden = !hasAppointment;
  appointmentDateInput.disabled = !hasAppointment;
  appointmentTimeInput.disabled = !hasAppointment;
  document.querySelector("#appointment-modal-title").textContent = "Personalise message";
  appointmentModal.querySelector(".section-kicker").textContent = template.subtitle;
  appointmentModalTrigger = document.activeElement;
  document.querySelector(".shell").inert = true;
  const defaults = getDefaultAppointmentValues();
  appointmentDateInput.value = defaults.dateValue;
  appointmentTimeInput.value = defaults.timeValue;
  appointmentClientNameInput.value = "";
  appointmentModal.classList.add("is-visible");
  appointmentModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  return new Promise((resolve) => {
    appointmentModalResolver = resolve;
    window.setTimeout(() => {
      appointmentClientNameInput.focus();
    }, 0);
  });
}

function plainMessageText(body) {
  return normalizeTemplateForCopy(body)
    .replaceAll("{{staffName}}", () => staffDisplayName || "[Your name]")
    .replaceAll("{{appointmentDateTime}}", "@appointment")
    .replaceAll("<>", "@patient");
}

function messageForPersonalisation(template) {
  return {
    ...template,
    body: resolveContactReferences(plainMessageText(template.body))
      .replace(/(?<![\w@.+-])@patient(?![\w@])/gi, "<>")
      .replace(/(?<![\w@.+-])@appointment(?![\w@])/gi, "{{appointmentDateTime}}")
  };
}

async function buildMessageForCopy(template) {
  const details = await openAppointmentModal(template);
  if (!details) return null;
  const message = applyClientName(normalizeTemplateForCopy(template.body), details.clientName).replaceAll("{{staffName}}", () => details.staffName);
  return isAppointmentConfirmationTemplate(template)
    ? applyAppointmentDateTime(message, details.appointmentDateTime)
    : message;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}


function updateFabHours() {
  if (!fabHoursEl) return;
  if (!selectedState) {
    fabHoursEl.textContent = "";
    return;
  }

  const clinic = clinicLocations[selectedLocationId];
  const location = officeHours.find((office) => office.location === clinic.hoursName);
  if (!location) {
    fabHoursEl.textContent = "";
    return;
  }

  const todayFull = new Intl.DateTimeFormat("en-US", {
    timeZone: clinic.timeZone,
    weekday: "long",
  }).format(new Date());

  const entry = location.schedule.find(
    (s) => s.day.toLowerCase() === todayFull.toLowerCase()
  );

  const shortDay = todayFull.slice(0, 3);

  fabHoursEl.textContent = entry
    ? `${shortDay} ${entry.hours.replace(/ - /g, "-")}`
    : `${shortDay} · Closed`;
}

function updateHeroTime() {
  const clinic = clinicLocations[selectedLocationId] || clinicLocations.CHELSEA;
  const localTime = new Intl.DateTimeFormat("en-US", {
    timeZone: clinic.timeZone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date());

  document.querySelector(".clock-label").textContent = clinic.name;
  heroTime.textContent = localTime;
}

let selectedMessageIndex = 0;
let selectedVoicemailIndex = 0;

let messageOverrides = new Map();

function messageWithPersonalEdit(template) {
  const body = messageOverrides.get(template.key);
  return body === undefined ? template : { ...template, body };
}

function renderMessages() {
  const showAll = showAllMessagesInput.checked || !selectedLocationId;
  const category = document.querySelector("#message-category").value;
  const query = document.querySelector("#message-search").value.trim().toLocaleLowerCase();
  const visible = messageTemplates.map((template, index) => ({ ...messageWithPersonalEdit(template), index }))
    .filter((template) => {
      const type = template.category || (template.locationId ? "Clinic callback" : isAppointmentConfirmationTemplate(messageTemplates[template.index]) ? "Appointments" : "Follow-up");
      return (showAll || !template.locationId || template.locationId === selectedLocationId)
        && (category === "all" || type === category)
        && `${template.subtitle} ${template.body}`.toLocaleLowerCase().includes(query);
    });
  if (!visible.some((template) => template.index === selectedMessageIndex)) selectedMessageIndex = visible[0]?.index;
  messagesFilterNote.textContent = showAll
    ? "All clinics · Choose a template to read and copy."
    : `${clinicLocations[selectedLocationId].name} · General templates are included.`;
  if (!visible.length) {
    messagesGrid.innerHTML = '<p class="insurance-empty">No matching templates. Clear the filters or try different wording.</p>';
    return;
  }
  const selected = messageWithPersonalEdit(messageTemplates[selectedMessageIndex]);
  messagesGrid.innerHTML = `<div class="script-list" aria-label="Message templates">${visible.map((template) => `
    <button type="button" class="script-choice" data-select-message="${template.index}" aria-pressed="${template.index === selectedMessageIndex}">${escapeHtml(template.subtitle)}<span>${escapeHtml(template.category || (template.locationId ? "Clinic callback" : isAppointmentConfirmationTemplate(messageTemplates[template.index]) ? "Appointments" : "Follow-up"))}</span></button>`).join("")}</div>
    <article class="script-reading" aria-label="Selected message"><p class="script-reading-label">Message preview</p><h3>${escapeHtml(selected.subtitle)}</h3><div class="message-body plain-message">${escapeHtml(resolveContactReferences(plainMessageText(selected.body)))}</div>${selected.note ? `<p class="template-note">${escapeHtml(selected.note)}</p>` : ""}<div class="card-actions"><button class="button" type="button" data-copy-message="${selectedMessageIndex}">Personalise &amp; copy</button></div></article>`;
}

function voicemailWithStaffName(body) {
  return body.replace(/\bKaylin\b|{{staffName}}/g, () => staffDisplayName || "[Your name]");
}

function renderVoicemails() {
  if (!voicemailScripts.length) {
    voicemailList.innerHTML = '<p class="insurance-empty">No voicemail scripts are available.</p>';
    return;
  }
  const selected = voicemailScripts[selectedVoicemailIndex] || voicemailScripts[0];
  voicemailList.innerHTML = `<div class="script-list" aria-label="Voicemail scripts">${voicemailScripts.map((script, index) => `
    <button type="button" class="script-choice" data-select-voicemail="${index}" aria-pressed="${index === selectedVoicemailIndex}">${escapeHtml(script.title)}<span>Readout script</span></button>`).join("")}</div>
    <article class="script-reading" aria-label="Selected voicemail"><p class="script-reading-label">Read aloud</p><h3>${escapeHtml(selected.title)}</h3><div class="voicemail-body">${formatVoicemailForDisplay(voicemailWithStaffName(selected.body))}</div><div class="card-actions"><button class="button" type="button" data-copy-default-voicemail>Copy script</button></div></article>`;
}

function renderHours() {
  if (!hoursList) {
    return;
  }

  if (officeHours.length === 0) {
    hoursList.innerHTML = `
      <article class="hours-card hours-card-empty">
        <p>Office hours are not available right now.</p>
      </article>
    `;
    return;
  }

  hoursList.innerHTML = officeHours
    .map((office) => {
      const clinic = Object.values(clinicLocations).find((entry) => entry.hoursName === office.location);
      return `
        <article class="hours-card">
          <div class="hours-card-header">
            <div>
              <h3>${escapeHtml(clinic?.name || office.location)}</h3>
              <p class="hours-address">${(clinic?.address ? [clinic.address.replace(/, USA$/, "")] : office.addressLines)
                .map((line) => escapeHtml(line))
                .join("<br />")}</p>
              ${clinic ? `<a class="clinic-phone" href="tel:${clinic.phone.replace(/\D/g, "")}">${escapeHtml(clinic.phone)}</a>` : ""}
            </div>
          </div>
          <div class="hours-table" role="list" aria-label="${escapeHtml(office.location)} office hours">
            ${office.schedule
              .map(
                (entry) => `
                  <div class="hours-row" role="listitem">
                    <span class="hours-day">${escapeHtml(entry.day)}</span>
                    <span class="hours-time">${escapeHtml(entry.hours)}</span>
                    ${entry.note ? `<span class="hours-schedule-note">${escapeHtml(entry.note)}</span>` : ""}
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderFinancingOptions() {
  if (!financingContentContainer) {
    return;
  }

  financingContentContainer.innerHTML = financingOptionsContent;
}

function renderResources() {
  const query = document.querySelector("#resource-search").value.trim().toLocaleLowerCase();
  const category = document.querySelector("#resource-category").value;
  const visible = resources.map((resource, index) => ({ ...resource, index })).filter((resource) =>
    (category === "all" || resource.category === category)
    && `${resource.title} ${resource.note} ${resource.stage || ""} ${resource.category}`.toLocaleLowerCase().includes(query));
  document.querySelector("#resource-count").textContent = `${visible.length} ${visible.length === 1 ? "resource" : "resources"}`;
  resourcesList.innerHTML = visible.length ? visible.map((resource) => `
    <article class="resource-card"><div class="resource-tags"><span>${escapeHtml(resource.category)}</span>${resource.stage ? `<span>${escapeHtml(resource.stage)}</span>` : ""}</div><h3 class="resource-title">${escapeHtml(resource.title)}</h3><p>${escapeHtml(resource.note)}</p><p class="financing-url">${escapeHtml(resource.url)}</p><div class="resource-actions"><button class="button-secondary" type="button" data-copy-resource="${resource.index}">Copy link</button></div></article>`).join("")
    : '<p class="insurance-empty">No matching resources. Clear the filters or try another treatment.</p>';
}

function renderInsuranceTable() {
  const catalog = insuranceCatalogByState[selectedState];
  if (!catalog) {
    insuranceTableContainer.innerHTML = `
      <div class="insurance-empty">
        Select a clinic in the call location picker to view its insurance lists.
      </div>
    `;
    return;
  }

  const locationName = clinicLocations[selectedLocationId].name;
  const insuranceTableNote = `<p class="insurance-table-note">If the insurer is not listed in the table, send it to the auth team and ask for a photo of the insurance card.</p>`;
  const outOfNetworkHeading = selectedState === "NY"
    ? `Out Of Network<span class="insurance-th-note">With benefits: schedule an eval.<br />Without: pivot to an IVK consult and offer a SCA; can take 2–6 weeks.</span>`
    : selectedState === "NJ"
    ? `Out Of Network<span class="insurance-th-note">With benefits: send to auth with a photo of the card.</span>`
    : "Out Of Network";
  const flBoldMap =
    selectedState === "FL"
      ? selectedFlService === "TMS"
        ? new Set(["Medicare", "Tricare"])
        : new Set(["Aetna"])
      : new Set();

  const renderInNetworkItem = (item) => {
    const label = escapeHtml(item);
    if (selectedState === "FL" && item === "Cigna") {
      return `<li>${label}<span class="insurance-item-note">Either TMS or Spravato</span></li>`;
    }
    if (selectedState === "FL" && selectedFlService === "SPR" && item === "Tricare") {
      return `<li>${label} — go TMS route</li>`;
    }
    return flBoldMap.has(item)
      ? `<li><strong>${label}</strong></li>`
      : `<li>${label}</li>`;
  };

  const flToggle =
    selectedState === "FL"
      ? `<div class="fl-service-toggle">
          <button aria-pressed="${selectedFlService === "TMS"}" class="fl-service-btn${selectedFlService === "TMS" ? " active" : ""}" data-fl-service="TMS">TMS</button>
          <button aria-pressed="${selectedFlService === "SPR"}" class="fl-service-btn${selectedFlService === "SPR" ? " active" : ""}" data-fl-service="SPR">SPR</button>
        </div>`
      : "";

  const serviceGuidance = selectedState === "FL"
    ? `<p class="insurance-service-guidance">Bold insurers: ${selectedFlService === "SPR" ? "Spravato (SPR)" : "TMS"} is the preferred treatment. Cigna allows either treatment.</p>`
    : "";
  const evaluationCosts = {
    NY: { standard: "$500", promo: "$450" },
    NJ: { standard: "$525", promo: "$475" },
  };
  const costs = evaluationCosts[selectedState];
  const costNote = costs
    ? `<span class="insurance-th-note">Cost: ${costs.standard}<br />Promo: ${costs.promo}</span>`
    : "";

  const renderInsuranceItems = (items) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const conditionalOon = catalog.outOfNetworkWithBenefits?.length
    ? `<div class="insurance-subgroup"><ul>${renderInsuranceItems(catalog.outOfNetworkWithBenefits)}</ul></div>`
    : "";
  const evaluationOnlyNote = selectedState === "FL" ? "" : '<span class="insurance-th-note">In network · Schedule evaluation</span>';
  const consultNote = catalog.consultOnly.length
    ? '<span class="insurance-th-note">IVK consultation only · Schedule a consultation instead.</span>'
    : "";
  const medicaidNote = selectedState === "NY"
    ? '<p class="insurance-service-guidance">For Medicaid, confirm the exact plan. The listed Medicaid MCOs are Fidelis Medicaid and UHC Medicaid. Standalone NY Medicaid is in the IVK consultation-only group.</p>'
    : "";

  insuranceTableContainer.innerHTML = `
    <div class="insurance-table-card">
      <div class="insurance-table-header-row">
        <p class="insurance-table-intro">
          Showing ${escapeHtml(locationName)} insurance information for intake scheduling decisions.
        </p>
        ${flToggle}
      </div>
      <p class="insurance-intake-question"><strong>Ask:</strong> Is your Medicare or Medicaid managed by another insurer?</p>
      ${insuranceTableNote}
      ${medicaidNote}
      ${serviceGuidance}
      ${selectedState === "NJ" ? '<p class="insurance-service-guidance"><a class="resource-url" href="#vitamins-title">View Paramus vitamin &amp; IV menu →</a></p>' : ""}
      <table class="insurance-table">
        <thead>
          <tr>
            <th>In Network${evaluationOnlyNote}</th>
            <th>${outOfNetworkHeading}</th>
            <th>Do Not Schedule Evaluation${consultNote}${costNote}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <ul>
                ${catalog.inNetwork.map(renderInNetworkItem).join("")}
              </ul>
            </td>
            <td>
              <ul>
                ${renderInsuranceItems(catalog.outOfNetwork)}
              </ul>
              ${conditionalOon}
            </td>
            <td>
              <ul>
                ${renderInsuranceItems(catalog.consultOnly)}
                ${renderInsuranceItems(catalog.doNotSchedule)}
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  filterInsuranceItems();
}

function filterInsuranceItems() {
  const query = document.querySelector("#insurance-search").value.trim().toLocaleLowerCase();
  let matches = 0;
  insuranceTableContainer.querySelectorAll("tbody td").forEach((cell) => {
    let columnMatches = 0;
    cell.querySelectorAll("li").forEach((item) => {
      item.hidden = !item.textContent.toLocaleLowerCase().includes(query);
      if (!item.hidden) columnMatches++;
    });
    matches += columnMatches;
    cell.querySelector(".insurance-column-empty")?.remove();
    if (query && !columnMatches) {
      const empty = document.createElement("p");
      empty.className = "insurance-column-empty";
      empty.textContent = "No matching insurer in this column.";
      cell.appendChild(empty);
    }
  });
  document.querySelector("#insurance-search-status").textContent = query
    ? `${matches} ${matches === 1 ? "match" : "matches"}${selectedState ? " for this clinic" : " · select a clinic first"}` : "";
}

document.querySelector("#insurance-search").addEventListener("input", filterInsuranceItems);

document.addEventListener("click", async (event) => {
  const financingButton = event.target.closest("[data-copy-financing]");
  if (financingButton) {
    const provider = financingClientLinks[financingButton.dataset.copyFinancing];
    if (!provider) return;
    try {
      await copyText(provider.url);
      showToast(`${provider.name} link copied to clipboard.`);
    } catch {
      showToast("Copy failed. Please try again.");
    }
    return;
  }
  const contactButton = event.target.closest("[data-copy-contact]");
  if (contactButton) {
    try {
      await copyText(organizationContacts.fax);
      showToast("Fax number copied to clipboard.");
    } catch {
      showToast("Copy failed. Please try again.");
    }
    return;
  }
  const messageChoice = event.target.closest("[data-select-message]");
  if (messageChoice) {
    selectedMessageIndex = Number(messageChoice.dataset.selectMessage);
    renderMessages();
    document.querySelector(`[data-select-message="${selectedMessageIndex}"]`)?.focus();
    return;
  }
  if (event.target.closest("[data-copy-default-voicemail]")) {
    const script = voicemailScripts[selectedVoicemailIndex] || voicemailScripts[0];
    try {
      await copyText(voicemailWithStaffName(script.body));
      showToast("Voicemail script copied.");
    } catch {
      showToast("Copy failed. Please try again.");
    }
    return;
  }
  const voicemailChoice = event.target.closest("[data-select-voicemail]");
  if (voicemailChoice) {
    selectedVoicemailIndex = Number(voicemailChoice.dataset.selectVoicemail);
    renderVoicemails();
    document.querySelector(`[data-select-voicemail="${selectedVoicemailIndex}"]`)?.focus();
    return;
  }
  const flServiceBtn = event.target.closest("[data-fl-service]");
  if (flServiceBtn) {
    selectedFlService = flServiceBtn.dataset.flService;
    renderInsuranceTable();
    document.querySelector(`[data-fl-service="${selectedFlService}"]`)?.focus();
    return;
  }

  const closeAppointmentButton = event.target.closest("[data-close-appointment-modal]");
  if (closeAppointmentButton) {
    closeAppointmentModal(null);
    return;
  }

  const messageButton = event.target.closest("[data-copy-message]");
  if (messageButton) {
    const template = messageWithPersonalEdit(messageTemplates[Number(messageButton.dataset.copyMessage)]);
    const messageToCopy = await buildMessageForCopy(messageForPersonalisation(template));
    if (!messageToCopy) {
      return;
    }

    try {
      await copyText(messageToCopy);
      showToast("Message copied to clipboard.");
    } catch (error) {
      showToast("Copy failed. Please try again.");
    }
    return;
  }

  const resourceButton = event.target.closest("[data-copy-resource]");
  if (resourceButton) {
    const resource = resources[Number(resourceButton.dataset.copyResource)];
    try {
      await copyText(resource.url);
      showToast("Link copied to clipboard.");
    } catch (error) {
      showToast("Copy failed. Please try again.");
    }
    return;
  }

});

appointmentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const clientName = appointmentClientNameInput.value.trim();
  const appointmentDate = appointmentDateInput.value;
  const appointmentTime = appointmentTimeInput.value;

  const staffInput = document.querySelector("#message-staff-name");
  const staffName = staffInput.disabled ? "" : staffInput.value.trim();
  if (!staffInput.disabled && !staffName) { showToast("Enter your name."); return; }
  const hasAppointment = !appointmentDateInput.disabled;
  if (!clientName || (hasAppointment && (!appointmentDate || !appointmentTime))) {
    showToast(hasAppointment ? "Enter the client name, date, and time." : "Enter the client name.");
    return;
  }

  closeAppointmentModal({
    clientName,
    staffName,
    appointmentDateTime: hasAppointment ? formatAppointmentDateTime(appointmentDate, appointmentTime) : null,
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Tab" && appointmentModalResolver) {
    const controls = [...appointmentModal.querySelectorAll("button, input")].filter((control) => !control.disabled && control.getClientRects().length);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  if (event.key === "Escape" && appointmentModalResolver) {
    closeAppointmentModal(null);
  }
});

async function init() {
  try {
    const savedClinic = localStorage.getItem("renue-clinic");
    if (clinicLocations[savedClinic]) {
      selectedLocationId = savedClinic;
      selectedState = clinicLocations[savedClinic].state;
      document.querySelector(`input[name="call-state"][value="${savedClinic}"]`).checked = true;
      selectedMessageIndex = messageTemplates.findIndex((template) => template.locationId === savedClinic);
    }
  } catch { /* Use the unselected state when storage is unavailable. */ }
  await loadNewInfo();
  renderMessages();
  renderVoicemails();
  renderResources();
  renderHours();
  renderFinancingOptions();
  renderInsuranceTable();
  updateFabHours();
  updateHeroTime();
  document.dispatchEvent(new Event("workspace-data-ready"));
  window.setInterval(() => {
    updateHeroTime();
    updateFabHours();
  }, 1000);
}

init();

stateInputs.forEach((input) => {
  input.addEventListener("change", () => {
    selectedLocationId = input.value;
    selectedState = clinicLocations[selectedLocationId].state;
    try { localStorage.setItem("renue-clinic", selectedLocationId); } catch { /* Clinic selection still works without storage. */ }
    selectedMessageIndex = messageTemplates.findIndex((template) => template.locationId === selectedLocationId);
    updateHeroTime();
    renderMessages();
    renderInsuranceTable();
    updateFabHours();
    document.dispatchEvent(new Event("workspace-clinic-change"));
  });
});

showAllMessagesInput.addEventListener("change", renderMessages);


const travelForm = document.querySelector("#travel-form");
const travelOrigin = document.querySelector("#travel-origin");
const travelMode = document.querySelector("#travel-mode");
const travelResults = document.querySelector("#travel-results");

travelForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const origin = travelOrigin.value.trim();
  if (!origin) {
    travelOrigin.setCustomValidity("Enter the customer's address or ZIP code.");
    travelOrigin.reportValidity();
    return;
  }
  const startingPoint = /^\d{5}(?:-\d{4})?$/.test(origin) ? `${origin}, USA` : origin;
  const modeLabel = travelMode.options[travelMode.selectedIndex].text;
  document.querySelector("#travel-summary").textContent = `From ${origin} · ${modeLabel}. Choose a clinic to view miles and time in Google Maps. These clinics are not ranked by distance.`;
  document.querySelector("#travel-clinics").innerHTML = Object.values(clinicLocations).map((clinic) => {
    const params = new URLSearchParams({ api: "1", origin: startingPoint, destination: clinic.address, travelmode: travelMode.value });
    return `<article class="travel-clinic"><h3>${escapeHtml(clinic.name)}</h3><p>${escapeHtml(clinic.address.replace(", USA", ""))}</p><a class="button-secondary" href="https://www.google.com/maps/dir/?${escapeHtml(params.toString())}" target="_blank" rel="noopener noreferrer" aria-label="Open directions to ${escapeHtml(clinic.name)} in Google Maps (new tab)">Open directions <span aria-hidden="true">↗</span></a></article>`;
  }).join("");
  travelResults.hidden = false;
});

travelForm.addEventListener("input", () => {
  travelOrigin.setCustomValidity("");
  travelResults.hidden = true;
});
travelForm.addEventListener("reset", () => {
  travelOrigin.setCustomValidity("");
  travelResults.hidden = true;
  document.querySelector("#travel-clinics").replaceChildren();
  document.querySelector("#travel-summary").textContent = "";
});
