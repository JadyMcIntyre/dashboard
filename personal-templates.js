function createPersonalTemplateEditors(client) {
  const columns = "id, kind, title, body, shared_with_staff";
  const editors = Array.from(document.querySelectorAll("[data-personal-templates]"), (panel) => {
    const kind = panel.dataset.personalTemplates;
    const copyPanel = document.querySelector("[data-personal-copy-list=" + kind + "]");
    const copyList = copyPanel.querySelector("ul");
    const form = panel.querySelector("form");
    const fields = form.querySelector("fieldset");
    const list = panel.querySelector("ul");
    const status = panel.querySelector("[role=status]");
    const refreshButton = panel.querySelector("[data-refresh-templates]");
    const newButton = panel.querySelector("[data-new-template]");
    let userId;
    let revision = 0;
    let editingId;
    let rows = [];

    function resetForm() {
      editingId = undefined;
      form.reset();
      form.querySelector("[type=submit]").textContent = "Add template";
    }

    function render() {
      list.replaceChildren();
      copyList.replaceChildren();
      copyPanel.hidden = rows.length === 0;
      for (const row of rows) {
        const item = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = row.title;
        item.append(title);
        for (const [label, action] of Object.entries({
          Copy: async () => {
            const owner = userId;
            const body = resolveContactReferences(row.body.replaceAll("{{staffName}}", () => staffDisplayName));
            const template = { subtitle: row.title, body };
            const needsDetails = body.includes("<>") || isAppointmentConfirmationTemplate(template);
            const value = needsDetails ? await buildMessageForCopy(template) : normalizeTemplateForCopy(body);
            if (!value || owner !== userId) return;
            await copyText(value);
            if (owner === userId) showToast("Template copied.");
          },
          [row.shared_with_staff ? "Stop sharing" : "Share"]: async () => {
            if (!row.shared_with_staff && !window.confirm("Share this template with Renue staff? Check that it contains no patient information.")) return;
            await save(client.from("personal_templates").update({ shared_with_staff: !row.shared_with_staff })
              .eq("id", row.id).eq("user_id", userId), undefined, row.shared_with_staff ? "Sharing stopped." : "Template shared.");
          },
          Edit: () => {
            form.hidden = false;
            editingId = row.id;
            form.elements.title.value = row.title;
            form.elements.body.value = row.body;
            form.querySelector("[type=submit]").textContent = "Save changes";
            form.elements.title.focus();
          },
          Delete: async () => {
            if (!window.confirm("Delete this personal template?")) return;
            await save(client.from("personal_templates").delete().eq("id", row.id).eq("user_id", userId), row.id);
          }
        })) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "button-secondary";
          button.textContent = label;
          button.addEventListener("click", async () => {
            if (!userId || fields.disabled) return;
            try { await action(); } catch { showToast("Copy failed. Please try again."); }
          });
          item.append(button);
          if (label === "Copy") {
            const copyItem = document.createElement("li");
            const copyTitle = title.cloneNode(true);
            const copyButton = button.cloneNode(true);
            copyButton.addEventListener("click", () => button.click());
            copyItem.append(copyTitle, copyButton);
            copyList.append(copyItem);
          }
        }
        list.append(item);
      }
    }

    async function refresh() {
      if (!userId || fields.disabled) return;
      const request = revision;
      fields.disabled = true;
      refreshButton.disabled = true;
      status.textContent = "Loading your templates…";
      try {
        const { data, error } = await client.from("personal_templates")
          .select(columns).eq("user_id", userId).eq("kind", kind).is("default_message_key", null).order("title");
        if (request !== revision) return;
        if (error) throw error;
        rows = data;
        render();
        status.textContent = rows.length ? "" : "You have no personal templates yet.";
      } catch {
        if (request === revision) status.textContent = "Could not load your templates. Try Refresh.";
      } finally {
        if (request === revision) {
          fields.disabled = false;
          refreshButton.disabled = false;
        }
      }
    }

    async function save(query, deletedId, successMessage) {
      const request = revision;
      fields.disabled = true;
      refreshButton.disabled = true;
      status.textContent = deletedId ? "Deleting template…" : "Saving template…";
      try {
        const { data, error } = await query.select(columns).single();
        if (request !== revision) return;
        if (error || !data) throw error;
        rows = rows.filter((row) => row.id !== data.id);
        if (!deletedId) rows.push(data);
        rows.sort((left, right) => left.title.localeCompare(right.title));
        render();
        if (!successMessage && (!deletedId || editingId === deletedId)) resetForm();
        status.textContent = successMessage || (deletedId ? "Template deleted." : "Template saved.");
      } catch {
        if (request === revision) status.textContent = deletedId ? "Could not delete the template." : "Could not save the template. Your draft is still here.";
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
      if (form.hidden) resetForm();
      form.hidden = false;
      form.elements.title.focus();
    });
    document.addEventListener("personal-library-updated", refresh);
    form.addEventListener("reset", () => {
      form.hidden = true;
      editingId = undefined;
      form.querySelector("[type=submit]").textContent = "Add template";
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!userId || fields.disabled) return;
      const title = form.elements.title.value.trim();
      const body = form.elements.body.value.trim();
      if (!title || !body) {
        status.textContent = "Enter a title and template text.";
        return;
      }
      const table = client.from("personal_templates");
      await save(editingId
        ? table.update({ title, body }).eq("id", editingId).eq("user_id", userId)
        : table.insert({ user_id: userId, kind, title, body }));
    });

    return (owner) => {
      ++revision;
      userId = owner;
      rows = [];
      resetForm();
      render();
      fields.disabled = !owner;
      refreshButton.disabled = !owner;
      status.textContent = "";
      if (owner) void refresh();
    };
  });
  return (owner) => editors.forEach((setOwner) => setOwner(owner));
}

function createExistingMessageEditor(client) {
  let revision = 0;
  const picker = document.querySelector("#company-message-picker");
  const editor = document.querySelector("#company-message-editor");
  const search = document.querySelector("#company-message-search");
  let selectedKey;
  let currentOwner = null;

  function renderSelected() {
    editor.replaceChildren();
    const selected = messageTemplates.find(({ key }) => key === selectedKey);
    if (!currentOwner || !selected) {
      editor.textContent = currentOwner ? "Choose a message to preview." : "Loading company messages…";
      return;
    }
    const template = messageWithPersonalEdit(selected);
    const heading = document.createElement("h4");
    heading.textContent = template.subtitle;
    const preview = document.createElement("p");
    preview.className = "message-body plain-message";
    preview.textContent = resolveContactReferences(plainMessageText(template.body));
    const actions = document.createElement("div");
    actions.className = "card-actions";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button-secondary";
    button.textContent = "Edit message";
    button.addEventListener("click", () => openEditor(editor, template, currentOwner, revision));
    actions.append(button);
    editor.append(heading, preview, actions);
  }

  function renderPicker() {
    picker.replaceChildren();
    if (!currentOwner) return;
    const query = search.value.trim().toLowerCase();
    const visible = messageTemplates.filter(({ subtitle }) => subtitle.toLowerCase().includes(query));
    if (!visible.some(({ key }) => key === selectedKey)) selectedKey = visible[0]?.key;
    for (const { key, subtitle } of visible) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "script-choice";
      button.textContent = subtitle;
      button.setAttribute("aria-pressed", String(key === selectedKey));
      button.addEventListener("click", () => {
        if (selectedKey === key) return;
        selectedKey = key;
        for (const choice of picker.children) choice.setAttribute("aria-pressed", String(choice === button));
        renderSelected();
      });
      picker.append(button);
    }
    if (!visible.length) picker.textContent = "No matching messages.";
    renderSelected();
  }

  search.addEventListener("input", renderPicker);

  function openEditor(card, template, owner, currentRevision) {
    card.querySelector(".message-body").hidden = true;
    card.querySelector(".card-actions").hidden = true;
    const form = document.createElement("form");
    form.className = "existing-message-form";
    form.method = "post";
    form.innerHTML = `
      <fieldset>
        <label for="existing-message-text">Message text</label>
        <div class="message-mention-editor">
          <div class="message-mention-mirror" aria-hidden="true"></div>
          <textarea id="existing-message-text" name="body" rows="8" maxlength="20000" aria-describedby="existing-message-mention-help" aria-autocomplete="list" aria-controls="message-mention-options" required></textarea>
          <div class="message-mention-menu" hidden>
            <p>Suggestions</p>
            <div id="message-mention-options" role="listbox" aria-label="Message suggestions"></div>
          </div>
        </div>
        <p id="existing-message-mention-help">Type @ for patient details, clinic numbers, or the website.</p>
        <div class="card-actions">
          <button class="button" type="submit">Save my edit</button>
          <button class="button-secondary" type="button" data-cancel-edit>Cancel</button>
        </div>
        <p role="status"></p>
      </fieldset>`;
    const input = form.elements.body;
    const fields = form.querySelector("fieldset");
    const status = form.querySelector("[role=status]");
    input.value = plainMessageText(template.body).replaceAll("{{org:website}}", "@renuesite").replaceAll("{{org:advancecare}}", "@advancecare");
    card.append(form);
    input.focus();
    input.setSelectionRange(0, 0);

    const menu = form.querySelector(".message-mention-menu");
    const options = form.querySelector("[role=listbox]");
    const mirror = form.querySelector(".message-mention-mirror");
    const suggestions = [
      { label: "Patient name", keyword: "patient", value: "@patient", detail: "Fill in when copying" },
      { label: "Appointment date & time", keyword: "appointment", value: "@appointment", detail: "Fill in when copying" },
      { label: "Renue website", keyword: "renuesite", value: "@renuesite", detail: organizationContacts.website_url },
      ...Object.entries(clinicLocations).map(([id, clinic]) => ({
        label: clinic.name,
        keyword: id + " number",
        value: "@" + id + "-number",
        detail: clinic.phone
      }))
    ];
    let mentionStart = 0;
    let matches = [];
    let activeSuggestion = 0;

    function syncHighlight() {
      const pattern = /(?<![\w@.+-])@(patient|appointment|renuesite|advancecare|(?:NY|NJ|FL|CHELSEA)-number)(?![\w@-])/gi;
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
        row.id = "message-mention-option-" + index;
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
      matches = match ? suggestions.filter(({ keyword, label }) =>
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

    function showPreview() {
      renderMessages();
      renderSelected();
      editor.querySelector("button")?.focus();
    }

    form.querySelector("[data-cancel-edit]").addEventListener("click", showPreview);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (currentRevision !== revision || fields.disabled) return;
      const body = input.value.trim();
      if (!body || body.length > 20000) {
        status.textContent = "Enter a message of up to 20,000 characters.";
        return;
      }

      fields.disabled = true;
      status.textContent = "Saving your edit…";
      try {
        const { data, error } = await client.from("personal_templates").upsert({
          user_id: owner,
          default_message_key: template.key,
          kind: "message",
          title: template.subtitle,
          body
        }, { onConflict: "user_id,default_message_key" }).select("body").single();
        if (currentRevision !== revision) return;
        if (error || !data) throw error;
        messageOverrides.set(template.key, data.body);
        if (form.isConnected) showPreview();
        else renderMessages();
        showToast("Your message edit was saved.");
      } catch {
        if (currentRevision === revision) status.textContent = "Could not save your edit. Try again.";
      } finally {
        fields.disabled = false;
      }
    });
  }

  return async (owner) => {
    const currentRevision = ++revision;
    currentOwner = null;
    search.disabled = true;
    search.value = "";
    selectedKey = undefined;
    picker.replaceChildren();
    editor.replaceChildren();
    messageOverrides.clear();
    renderMessages();
    if (!owner) return;

    try {
      const { data, error } = await client.from("personal_templates")
        .select("default_message_key, body").eq("user_id", owner).not("default_message_key", "is", null);
      if (currentRevision !== revision) return;
      if (error) throw error;
      messageOverrides = new Map(data.map((row) => [row.default_message_key, row.body]));
      currentOwner = owner;
      search.disabled = false;
      renderPicker();
      renderMessages();
    } catch {
      if (currentRevision === revision) showToast("Your message edits could not load. Reload the page to retry.");
    }
  };
}

function createTemplateCommunity(client) {
  const list = document.querySelector("#community-template-list");
  const status = document.querySelector("#community-template-status");
  const filter = document.querySelector("#community-template-kind");
  const refreshButton = document.querySelector("#community-template-refresh");
  let owner = null;
  let revision = 0;

  async function refresh() {
    const request = ++revision;
    list.replaceChildren();
    if (!owner) {
      status.textContent = "";
      return;
    }
    status.textContent = "Loading shared templates…";
    try {
      let query = client.from("personal_templates").select("id, kind, title, body, shared_by")
        .eq("shared_with_staff", true).neq("user_id", owner).order("title");
      if (filter.value !== "all") query = query.eq("kind", filter.value);
      const { data, error } = await query;
      if (request !== revision) return;
      if (error) throw error;

      for (const template of data) {
        const card = document.createElement("details");
        card.className = "script-reading community-template";
        const heading = document.createElement("summary");
        heading.textContent = template.title + " · " + template.shared_by;
        const kind = document.createElement("p");
        kind.textContent = template.kind === "message" ? "Message" : "Voicemail script";
        const preview = document.createElement("p");
        preview.className = "plain-message";
        preview.textContent = resolveContactReferences(normalizeTemplateForCopy(template.body));
        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "button-secondary";
        copy.textContent = "Copy to my templates";
        copy.addEventListener("click", async () => {
          if (request !== revision || copy.disabled) return;
          const recipient = owner;
          copy.disabled = true;
          try {
            const { error: copyError } = await client.from("personal_templates").insert({
              user_id: recipient,
              kind: template.kind,
              title: template.title,
              body: template.body
            });
            if (recipient !== owner) return;
            if (copyError) throw copyError;
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
      status.textContent = data.length ? "" : "No shared templates here yet.";
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
    owner = userId;
    ++revision;
    list.replaceChildren();
    status.textContent = "";
    if (owner && !document.querySelector('[data-template-pane="community"]').hidden) void refresh();
  };
}

