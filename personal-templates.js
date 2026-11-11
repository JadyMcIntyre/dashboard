const templateColumns = "id, kind, title, body, clinic_id, tag, default_message_key, removed_from_library, shared_with_staff, company_template";

const retiredStarterKeys = new Set(["chelsea-ivk-sale",
  ...Object.keys(clinicLocations).map((id) => "clinic-callback-" + id)
]);

function renderTemplateContactPreview(element, body) {
  element.dataset.templatePreview = body;
  element.textContent = messagePreviewText(body);
}

function refreshTemplatePreviews() {
  for (const preview of document.querySelectorAll("[data-template-preview]")) {
    renderTemplateContactPreview(preview, preview.dataset.templatePreview);
  }
}

document.addEventListener("workspace-clinic-change", refreshTemplatePreviews);
document.addEventListener("workspace-data-ready", refreshTemplatePreviews);

function starterTemplates() {
  return [
    ...messageTemplates.map((item) => ({
      kind: "message", title: item.subtitle, body: item.body,
      clinic_id: item.locationId || null,
      tag: item.category || (item.locationId ? "Clinic callback" : isAppointmentConfirmationTemplate(item) ? "Appointments" : "Follow-up"),
      default_message_key: item.key, note: item.note
    })),
    ...voicemailScripts.map((item) => ({
      kind: "voicemail", title: item.title, body: item.body.replace(/\bKaylin\b/g, "@me"),
      clinic_id: null, tag: null,
      default_message_key: "voicemail-" + item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 85)
    }))
  ];
}

function templateEditorText(body) {
  return plainMessageText(body.replaceAll("{{staffName}}", "@me"), false)
    .replaceAll("{{org:website}}", "@renuesite").replaceAll("{{org:advancecare}}", "@advancecare");
}

function templateFields({ kind, title, body, clinic_id, tag }) {
  return { kind, title, body, clinic_id, tag };
}

function createPersonalTemplateEditors(client) {

  const editors = Array.from(document.querySelectorAll("[data-personal-templates]"), (panel) => {
    const kind = panel.dataset.personalTemplates;
    const form = panel.querySelector("form");
    const fields = form.querySelector("fieldset");
    const list = panel.querySelector("ul");
    const status = panel.querySelector(":scope > [role=status]");
    const editorStatus = form.querySelector("[data-editor-status]");
    const dialog = panel.querySelector("dialog");
    const selectButton = panel.querySelector("[data-select-templates]");
    const selectionBar = panel.querySelector(".template-selection");
    const selectAll = panel.querySelector("[data-select-all]");
    const deleteSelected = panel.querySelector("[data-delete-selected]");
    const selected = new Set();
    const rowKey = (row) => row.default_message_key || row.id;
    const refreshButton = panel.querySelector("[data-refresh-templates]");
    const newButton = panel.querySelector("[data-new-template]");
    let userId;
    let revision = 0;
    let editingRow;
    let canPublish = false;
    attachTemplateMentions(form);
    let rows = [];

    function resetForm() {
      editingRow = undefined;
      form.reset();
      form.querySelector("[type=submit]").textContent = "Add template";
    }

    function updateSelection() {
      const boxes = Array.from(list.querySelectorAll('input[type="checkbox"]'));
      selectAll.checked = boxes.length > 0 && selected.size === boxes.length;
      selectAll.indeterminate = selected.size > 0 && !selectAll.checked;
      selectAll.disabled = !boxes.length;
      deleteSelected.disabled = !selected.size;
      deleteSelected.textContent = selected.size ? `Delete selected (${selected.size})` : "Delete selected";
    }

    function setSelectionMode(active) {
      selectionBar.hidden = !active;
      selectButton.textContent = active ? "Done" : "Select";
      selectButton.setAttribute("aria-pressed", String(active));
      selected.clear();
      render();
    }

    function render() {
      list.replaceChildren();

      const available = rows.filter((row) => !row.removed_from_library);
      setActiveTemplates(kind, available);
      const availableKeys = new Set(available.map(rowKey));
      for (const key of selected) if (!availableKeys.has(key)) selected.delete(key);
      const tagOptions = document.querySelector("#template-tags");
      for (const { tag } of available) {
        if (tag && !Array.from(tagOptions.options).some((option) => option.value === tag)) tagOptions.append(new Option(tag, tag));
      }
      for (const row of available) {
        const item = document.createElement("li");
        const preview = document.createElement("details");
        preview.className = "template-row-preview";
        const summary = document.createElement("summary");
        const title = document.createElement("strong");
        title.textContent = row.title;
        const details = document.createElement("small");
        details.textContent = [row.clinic_id ? clinicLocations[row.clinic_id]?.name : "All clinics", row.tag].filter(Boolean).join(" · ");
        title.append(details);
        summary.append(title);
        const body = document.createElement("p");
        body.className = "plain-message";
        renderTemplateContactPreview(body, row.body);
        preview.append(summary, body);
        if (!selectionBar.hidden) {
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.setAttribute("aria-label", "Select " + row.title);
          checkbox.checked = selected.has(rowKey(row));
          checkbox.addEventListener("change", () => {
            if (checkbox.checked) selected.add(rowKey(row));
            else selected.delete(rowKey(row));
            updateSelection();
          });
          item.append(checkbox);
        }
        item.append(preview);
        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "button-secondary template-actions-trigger";
        trigger.textContent = "…";
        trigger.setAttribute("aria-label", "Actions for " + row.title);
        const actions = document.createElement("div");
        actions.className = "template-row-actions";
        actions.popover = "auto";
        trigger.popoverTargetElement = actions;
        actions.addEventListener("beforetoggle", (event) => {
          if (event.newState !== "open") return;
          const rect = trigger.getBoundingClientRect();
          actions.style.right = Math.max(8, window.innerWidth - rect.right) + "px";
          const above = window.innerHeight - rect.bottom < 245 && rect.top > 245;
          actions.style.top = above ? "auto" : rect.bottom + 4 + "px";
          actions.style.bottom = above ? window.innerHeight - rect.top + 4 + "px" : "auto";
        });
        for (const [label, action] of Object.entries({
          ...(kind === "message" ? {
            Copy: async () => {
              const owner = userId;
              const template = messageForPersonalisation({ subtitle: row.title, body: row.body });
              if (!template) return;
              const needsDetails = template.body.includes("<>") || isAppointmentConfirmationTemplate(template);
              const value = needsDetails ? await buildMessageForCopy(template) : template.body;
              if (!value || owner !== userId) return;
              await copyText(value);
              if (owner === userId) showToast("Template copied.");
            },
          } : {}),
          [row.shared_with_staff ? "Stop sharing" : "Share"]: async () => {
            if (!row.shared_with_staff && !window.confirm("Share this template with Renue staff? Check that it contains no patient information.")) return;
            await writeRow(row, { shared_with_staff: !row.shared_with_staff, company_template: false },
              row.shared_with_staff ? "Sharing stopped." : "Template shared.");
          },
          ...(canPublish && !row.company_template ? {
            "Publish to Community": async () => {
              if (!window.confirm("Publish this as a company template? Check that it contains no patient information.")) return;
              await writeRow(row, { shared_with_staff: true, company_template: true }, "Company template published.");
            }
          } : {}),
          Edit: () => {
            editingRow = row;
            form.elements.title.value = row.title;
            form.elements.body.value = templateEditorText(row.body);
            form.elements.clinic_id.value = row.clinic_id || "";
            form.elements.tag.value = row.tag || "";
            form.elements.body.dispatchEvent(new Event("template-body-changed"));
            form.querySelector("[type=submit]").textContent = "Save changes";
            dialog.querySelector("h4").textContent = "Edit template";
            editorStatus.textContent = "";
            dialog.showModal();
            form.elements.title.focus();
          },
          Delete: async () => {
            if (!window.confirm("Delete this personal template?")) return;
            await removeRow(row);
          }
        })) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = label;
          button.addEventListener("click", async () => {
            if (!userId || fields.disabled) return;
            actions.hidePopover();
            try { await action(); } catch { showToast("Copy failed. Please try again."); }
          });
          actions.append(button);
        }
        if (selectionBar.hidden) item.append(trigger, actions);
        list.append(item);
      }
      updateSelection();
    }

    async function refresh() {
      if (!userId || fields.disabled) return;
      const request = revision;
      fields.disabled = true;
      refreshButton.disabled = true;
      status.textContent = "Loading your templates…";
      try {
        const { data, error } = await client.from("personal_templates")
          .select(templateColumns).eq("user_id", userId).eq("kind", kind).order("title");
        if (request !== revision) return;
        if (error) throw error;
        const starters = starterTemplates().filter((row) => row.kind === kind);
        const overrides = new Map(data.filter((row) => row.default_message_key).map((row) => [row.default_message_key, row]));
        rows = starters.map((row) => ({ ...row, ...overrides.get(row.default_message_key) }));
        const starterKeys = new Set(starters.map((row) => row.default_message_key));
        rows.push(...data.filter((row) => !starterKeys.has(row.default_message_key) && !retiredStarterKeys.has(row.default_message_key)));
        render();
        status.textContent = rows.some((row) => !row.removed_from_library) ? "" : "You have no templates. Add one here or browse Community.";
      } catch {
        if (request === revision) status.textContent = "Could not load your templates. Try Refresh.";
      } finally {
        if (request === revision) {
          fields.disabled = false;
          refreshButton.disabled = false;
        }
      }
    }

    function writeRow(row, changes, message) {
      const table = client.from("personal_templates");
      const query = row?.id
        ? table.update(changes).eq("id", row.id).eq("user_id", userId)
        : table.insert({ ...templateFields(row || { kind }), ...changes, user_id: userId,
            default_message_key: row?.default_message_key || null });
      return save(query, row, false, message);
    }

    function removeRow(row) {
      if (row.default_message_key) {
        return writeRow(row, { removed_from_library: true, shared_with_staff: false, company_template: false }, "Template removed.");
      }
      return save(client.from("personal_templates").delete().eq("id", row.id).eq("user_id", userId), row, true, "Template deleted.");
    }

    async function save(query, previous, deleted, message) {
      const request = revision;
      fields.disabled = true;
      refreshButton.disabled = true;
      status.textContent = "Saving…";
      try {
        const { data, error } = await query.select(templateColumns).single();
        if (request !== revision) return;
        if (error || !data) throw error;
        const index = rows.indexOf(previous);
        if (deleted) rows.splice(index, 1);
        else if (index >= 0) rows[index] = { ...previous, ...data };
        else rows.push(data);
        render();
        if (message === "Template saved." || (editingRow && editingRow === previous)) resetForm();
        status.textContent = message;
        return true;
      } catch {
        if (request === revision) {
          status.textContent = "Could not save the change. Try again.";
          if (dialog.open) editorStatus.textContent = status.textContent;
        }
        return false;
      } finally {
        if (request === revision) {
          fields.disabled = false;
          refreshButton.disabled = false;
        }
      }
    }

    refreshButton.addEventListener("click", refresh);
    newButton.addEventListener("click", () => {
      if (!userId || fields.disabled) return;
      resetForm();
      dialog.querySelector("h4").textContent = "New template";
      editorStatus.textContent = "";
      dialog.showModal();
      form.elements.title.focus();
    });
    selectButton.addEventListener("click", () => setSelectionMode(selectionBar.hidden));
    selectAll.addEventListener("change", () => {
      selected.clear();
      if (selectAll.checked) {
        for (const row of rows) if (!row.removed_from_library) selected.add(rowKey(row));
      }
      for (const checkbox of list.querySelectorAll('input[type="checkbox"]')) checkbox.checked = selectAll.checked;
      updateSelection();
    });
    deleteSelected.addEventListener("click", async () => {
      if (!userId || fields.disabled || !selected.size) return;
      const targets = rows.filter((row) => selected.has(rowKey(row)));
      if (!window.confirm(`Delete ${targets.length} selected templates from your library?`)) return;
      const request = revision;
      let removed = 0;
      for (const row of targets) {
        if (request !== revision) return;
        if (await removeRow(row)) removed++;
      }
      if (request !== revision) return;
      if (removed === targets.length) setSelectionMode(false);
      status.textContent = removed === targets.length
        ? `${removed} templates removed.`
        : `${removed} templates removed. ${targets.length - removed} could not be removed. Try again.`;
    });
    document.addEventListener("personal-library-updated", refresh);
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      if (!fields.disabled) resetForm();
    });
    form.addEventListener("reset", () => {
      dialog.close();
      editingRow = undefined;
      editorStatus.textContent = "";
      form.querySelector("[type=submit]").textContent = "Add template";
      form.elements.body.dispatchEvent(new Event("template-body-changed"));
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!userId || fields.disabled) return;
      const title = form.elements.title.value.trim();
      const body = form.elements.body.value.trim();
      if (!title || !body) {
        editorStatus.textContent = "Enter a title and template text.";
        return;
      }
      await writeRow(editingRow, { kind, title, body,
        clinic_id: form.elements.clinic_id.value || null,
        tag: form.elements.tag.value.trim() || null
      }, "Template saved.");
    });

    return (owner, role) => {
      ++revision;
      userId = owner;
      canPublish = role === "manager" || role === "owner";
      form.elements.clinic_id.replaceChildren(new Option("All clinics", ""),
        ...Object.entries(clinicLocations).map(([id, clinic]) => new Option(clinic.name, id)));
      rows = [];
      resetForm();
      setSelectionMode(false);
      fields.disabled = !owner;
      refreshButton.disabled = !owner;
      status.textContent = "";
      if (owner) void refresh();
    };
  });
  const tagOptions = document.querySelector("#template-tags");
  const standardTags = Array.from(tagOptions.options, (option) => option.value);
  return (owner, role) => {
    tagOptions.replaceChildren(...standardTags.map((tag) => new Option(tag, tag)));
    editors.forEach((setOwner) => setOwner(owner, role));
  };
}

function attachTemplateMentions(form) {
  const input = form.elements.body;
    const menu = form.querySelector(".message-mention-menu");
    const options = form.querySelector("[role=listbox]");
    const mirror = form.querySelector(".message-mention-mirror");
    function getSuggestions() {
      return [
      { label: "My name", keyword: "me", value: "@me", detail: "Uses the signed-in staff name" },
      { label: "Patient name", keyword: "patient", value: "@patient", detail: "Fill in when copying" },
      { label: "Appointment date & time", keyword: "appointment", value: "@appointment", detail: "Fill in when copying" },
      { label: "Renue website", keyword: "renuesite", value: "@renuesite", detail: organizationContacts?.website_url || "" },
      { label: "Clinic number", keyword: "clinic number", value: "@clinic number",
        detail: selectedClinicPhone() || "Uses the clinic selected at the top" }
    ];
    }
    let mentionStart = 0;
    let matches = [];
    let activeSuggestion = 0;

    function syncHighlight() {
      const pattern = /(?<![\w@.+-])@(me|patient|appointment|renuesite|advancecare|clinic[ -]number|(?:NY|NJ|FL|CHELSEA)-number)(?![\w@-])/gi;
      const fragments = document.createDocumentFragment();
      let offset = 0;
      for (const match of input.value.matchAll(pattern)) {
        fragments.append(input.value.slice(offset, match.index));
        const token = document.createElement("mark");
        token.textContent = match[0];
        fragments.append(token);
        offset = match.index + match[0].length;
      }
      fragments.append(input.value.slice(offset) + "\n");
      mirror.replaceChildren(fragments);
      mirror.scrollTop = input.scrollTop;
    }

    function renderSuggestions() {
      menu.hidden = matches.length === 0;
      options.replaceChildren();
      input.removeAttribute("aria-activedescendant");
      matches.forEach((suggestion, index) => {
        const row = document.createElement("div");
        row.id = input.id + "-option-" + index;
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", String(index === activeSuggestion));
        const label = document.createElement("strong");
        const detail = document.createElement("span");
        label.textContent = suggestion.label;
        detail.textContent = suggestion.detail;
        row.append(label, detail);
        row.addEventListener("pointerdown", (event) => event.preventDefault());
        row.addEventListener("click", () => insertSuggestion(suggestion));
        options.append(row);
        if (index === activeSuggestion) input.setAttribute("aria-activedescendant", row.id);
      });
      const active = options.children[activeSuggestion];
      if (active && active.offsetTop + active.offsetHeight > options.scrollTop + options.clientHeight) {
        options.scrollTop = active.offsetTop + active.offsetHeight - options.clientHeight;
      } else if (active && active.offsetTop < options.scrollTop) {
        options.scrollTop = active.offsetTop;
      }
    }

    function updateSuggestions() {
      syncHighlight();
      const beforeCaret = input.value.slice(0, input.selectionStart);
      const match = input.selectionStart === input.selectionEnd
        ? beforeCaret.match(/(?:^|[^\w@.+-])@([a-z]*(?: [a-z]*)?)$/i)
        : null;
      const query = match?.[1].toLowerCase();
      mentionStart = match ? beforeCaret.length - match[1].length - 1 : 0;
      matches = match ? getSuggestions().filter(({ keyword, label }) =>
        [keyword, label, ...(keyword === "renuesite" ? ["site", "web", "website"] : [])]
          .some((term) => term.toLowerCase().split(/\s+/).some((word) => word.startsWith(query)) || term.toLowerCase().startsWith(query))
      ).slice(0, 7) : [];
      activeSuggestion = 0;
      renderSuggestions();
    }

    function dismissSuggestions() {
      matches = [];
      renderSuggestions();
    }

    function insertSuggestion(suggestion) {
      input.setRangeText(suggestion.value, mentionStart, input.selectionEnd, "end");
      syncHighlight();
      dismissSuggestions();
      input.focus();
    }

    input.addEventListener("focus", syncHighlight);
    input.addEventListener("template-body-changed", syncHighlight);
    syncHighlight();
    input.addEventListener("input", updateSuggestions);
    input.addEventListener("click", updateSuggestions);
    input.addEventListener("scroll", () => { mirror.scrollTop = input.scrollTop; });
    input.addEventListener("blur", dismissSuggestions);
    input.addEventListener("keyup", (event) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) updateSuggestions();
    });
    input.addEventListener("keydown", (event) => {
      if (!matches.length || event.isComposing) return;
      if (event.key === "Escape") {
        event.preventDefault();
        dismissSuggestions();
      } else if (event.key === "Enter") {
        event.preventDefault();
        insertSuggestion(matches[activeSuggestion]);
      } else if (["ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        activeSuggestion = (activeSuggestion + step + matches.length) % matches.length;
        renderSuggestions();
      }
    });

}

function createTemplateCommunity(client) {
  const list = document.querySelector("#community-template-list");
  const status = document.querySelector("#community-template-status");
  const filter = document.querySelector("#community-template-kind");
  const refreshButton = document.querySelector("#community-template-refresh");
  let owner = null;
  let revision = 0;
  let activeLibrary = null;

  async function refresh() {
    const request = ++revision;
    list.replaceChildren();
    if (!owner) {
      status.textContent = "";
      return;
    }
    status.textContent = "Loading templates…";
    try {
      let query = client.from("personal_templates").select("id, user_id, kind, title, body, clinic_id, tag, company_template, shared_by, default_message_key")
        .eq("shared_with_staff", true).neq("user_id", owner).order("title");
      if (filter.value !== "all") query = query.eq("kind", filter.value);
      const [shared, personal] = await Promise.all([
        query,
        client.from("personal_templates").select("default_message_key, removed_from_library")
          .eq("user_id", owner).not("default_message_key", "is", null)
      ]);
      if (request !== revision) return;
      if (shared.error || personal.error) throw shared.error || personal.error;
      const removedKeys = new Set(personal.data.filter((row) => row.removed_from_library).map((row) => row.default_message_key));
      const starters = starterTemplates().filter((row) => filter.value === "all" || filter.value === row.kind);
      const sharedTemplates = shared.data
        .filter((row) => !retiredStarterKeys.has(row.default_message_key))
        .map((row) => ({ ...row, default_message_key: null }));
      const libraries = new Map([["company", { name: "Company default", templates: [...starters] }]]);
      for (const template of sharedTemplates) {
        const key = template.company_template ? "company" : template.user_id;
        if (!libraries.has(key)) libraries.set(key, { name: template.shared_by || "Renue staff", templates: [] });
        libraries.get(key).templates.push(template);
      }
      if (!libraries.has(activeLibrary)) activeLibrary = null;

      const renderLibrary = (focus = false) => {
        list.replaceChildren();
        status.textContent = "";
        if (!activeLibrary) {
          const grid = document.createElement("div");
          grid.className = "community-library-grid";
          for (const [key, library] of libraries) {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "community-library-card";
            const name = document.createElement("strong");
            name.textContent = library.name;
            const count = document.createElement("small");
            count.textContent = `${library.templates.length} ${library.templates.length === 1 ? "template" : "templates"}`;
            card.append(name, count);
            card.addEventListener("click", () => {
              activeLibrary = key;
              renderLibrary(true);
            });
            grid.append(card);
          }
          list.append(grid);
          if (focus) grid.querySelector("button")?.focus();
          return;
        }

        const library = libraries.get(activeLibrary);
        const header = document.createElement("div");
        header.className = "community-library-heading";
        const back = document.createElement("button");
        back.type = "button";
        back.className = "button-secondary";
        back.textContent = "← All libraries";
        back.addEventListener("click", () => {
          const index = Array.from(libraries.keys()).indexOf(activeLibrary);
          activeLibrary = null;
          renderLibrary();
          list.querySelectorAll(".community-library-card")[index]?.focus();
        });
        const title = document.createElement("h4");
        title.textContent = library.name;
        header.append(back, title);
        list.append(header);
        if (focus) back.focus();
        if (!library.templates.length) status.textContent = "No templates of this type.";
        for (const template of library.templates) {
          const card = document.createElement("details");
          card.className = "script-reading community-template";
          const heading = document.createElement("summary");
          heading.textContent = template.title;
          const kind = document.createElement("p");
          kind.textContent = [template.kind === "message" ? "Message" : "Voicemail script", template.clinic_id ? clinicLocations[template.clinic_id]?.name : "All clinics", template.tag].filter(Boolean).join(" · ");
          const preview = document.createElement("p");
          preview.className = "plain-message";
          renderTemplateContactPreview(preview, template.body);
          const copy = document.createElement("button");
          copy.type = "button";
          copy.className = "button-secondary";
          const starterKey = template.default_message_key;
          copy.disabled = Boolean(starterKey && !removedKeys.has(starterKey));
          copy.textContent = copy.disabled ? "In my templates" : starterKey ? "Restore to my templates" : "Copy to my templates";
          copy.addEventListener("click", async () => {
            if (request !== revision || copy.disabled) return;
            const recipient = owner;
            copy.disabled = true;
            try {
              const table = client.from("personal_templates");
              const values = templateFields(template);
              const request = starterKey
                ? table.update({ ...values, removed_from_library: false })
                    .eq("user_id", recipient).eq("default_message_key", starterKey).eq("removed_from_library", true)
                : table.insert({ ...values, user_id: recipient });
              const { error: copyError } = await request.select("id").single();
              if (recipient !== owner) return;
              if (copyError) throw copyError;
              if (starterKey) removedKeys.delete(starterKey);
              copy.textContent = "Copied to my templates";
              document.dispatchEvent(new Event("personal-library-updated"));
              showToast("Template copied to your private library.");
            } catch {
              if (recipient === owner) {
                copy.disabled = false;
                showToast("Could not copy the template. Try again.");
              }
            }
          });
          card.append(heading, kind, preview, copy);
          list.append(card);
        }
      };
      renderLibrary();
    } catch {
      if (request === revision) status.textContent = "Could not load shared templates. Try Refresh.";
    }
  }

  filter.addEventListener("change", refresh);
  refreshButton.addEventListener("click", refresh);
  document.querySelectorAll("[data-template-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const selected = tab.dataset.templateTab;
      document.querySelectorAll("[data-template-tab]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button === tab));
      });
      document.querySelectorAll("[data-template-pane]").forEach((pane) => {
        pane.hidden = pane.dataset.templatePane !== selected;
      });
      if (selected === "community") void refresh();
    });
  });

  return (userId) => {
    if (owner !== userId) activeLibrary = null;
    owner = userId;
    ++revision;
    list.replaceChildren();
    status.textContent = "";
    if (owner && !document.querySelector('[data-template-pane="community"]').hidden) void refresh();
  };
}

