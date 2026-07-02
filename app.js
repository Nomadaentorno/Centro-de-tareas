const STORAGE_KEY = "weekly-task-system-v6-supertask-save-clean";
const LEGACY_KEYS = [];
const SESSION_KEY = "weekly-task-session-v4-supertask-save-clean";
const CLEANUP_KEYS = [
  "weekly-task-system",
  "weekly-task-system-v1",
  "weekly-task-system-v2",
  "weekly-task-system-v3",
  "weekly-task-system-v4-clean",
  "weekly-task-system-v5-fresh-start",
  "weekly-task-session",
  "weekly-task-session-v1",
  "weekly-task-session-v2-clean",
  "weekly-task-session-v3-fresh-start",
];
const DAY_NAMES = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];
const PRIORITY_LABELS = {
  high: "Prioritaria",
  medium: "Semi prioritaria",
  normal: "Normal",
};
const TYPE_LABELS = {
  task: "Tarea",
  supertask: "Supertarea",
};
const REPOSITORY_STATUS = {
  completed: "Lista",
  deleted: "Eliminada",
  reopened: "Reabierta",
};
const PRIORITY_WEIGHT = {
  high: 3,
  medium: 2,
  normal: 1,
};
const MAX_PER_DAY = 6;
const STALE_DAYS = 7;
const COMPLETE_ANIMATION_MS = 430;
const RESET_CONFIRM_MS = 3500;
const UNDO_LIMIT = 10;

CLEANUP_KEYS.forEach((key) => localStorage.removeItem(key));

const state = normalizeState(loadState());
attachCalendarAccessors(state);
const undoStack = [];
let lastSavedSnapshot = serializeState();
let restoringUndo = false;
let templateEditCalendarId = "";
let templateEditReturnToHub = false;
let resetConfirmTimer = null;
let activeDraggedTask = null;

const elements = {
  accessShell: document.querySelector("#accessShell"),
  calendarHubShell: document.querySelector("#calendarHubShell"),
  appShell: document.querySelector("#appShell"),
  totalTasks: document.querySelector("#totalTasks"),
  supertaskStats: document.querySelector("#supertaskStats"),
  sessionStats: document.querySelector("#sessionStats"),
  teamCount: document.querySelector("#teamCount"),
  taskForm: document.querySelector("#taskForm"),
  taskTitle: document.querySelector("#taskTitle"),
  taskDetail: document.querySelector("#taskDetail"),
  taskAssignee: document.querySelector("#taskAssignee"),
  taskAssigneeWrap: document.querySelector("#taskAssigneeWrap"),
  taskCreatedAt: document.querySelector("#taskCreatedAt"),
  subtaskGroup: document.querySelector("#subtaskGroup"),
  subtaskRows: document.querySelector("#subtaskRows"),
  addSubtaskRow: document.querySelector("#addSubtaskRow"),
  saveTemplate: document.querySelector("#saveTemplate"),
  personForm: document.querySelector("#personForm"),
  personName: document.querySelector("#personName"),
  personPassword: document.querySelector("#personPassword"),
  personRole: document.querySelector("#personRole"),
  peopleList: document.querySelector("#peopleList"),
  monthForm: document.querySelector("#monthForm"),
  monthName: document.querySelector("#monthName"),
  calendarAdminList: document.querySelector("#calendarAdminList"),
  calendarCount: document.querySelector("#calendarCount"),
  hubMonthForm: document.querySelector("#hubMonthForm"),
  hubMonthName: document.querySelector("#hubMonthName"),
  hubCalendarAdminList: document.querySelector("#hubCalendarAdminList"),
  hubCalendarCount: document.querySelector("#hubCalendarCount"),
  hubSavedSupertaskCount: document.querySelector("#hubSavedSupertaskCount"),
  hubSavedSupertaskList: document.querySelector("#hubSavedSupertaskList"),
  hubSessionStats: document.querySelector("#hubSessionStats"),
  accessRequestsPanel: document.querySelector("#accessRequestsPanel"),
  accessRequestCount: document.querySelector("#accessRequestCount"),
  accessRequestList: document.querySelector("#accessRequestList"),
  boardView: document.querySelector("#boardView"),
  queueView: document.querySelector("#queueView"),
  savedView: document.querySelector("#savedView"),
  repositoryView: document.querySelector("#repositoryView"),
  tabs: document.querySelectorAll(".tab"),
  seedButton: document.querySelector("#seedButton"),
  resetButton: document.querySelector("#resetButton"),
  logoutButton: document.querySelector("#logoutButton"),
  hubLogoutButton: document.querySelector("#hubLogoutButton"),
  backToHubButton: document.querySelector("#backToHubButton"),
  changePasswordButton: document.querySelector("#changePasswordButton"),
  template: document.querySelector("#taskCardTemplate"),
  editDialog: document.querySelector("#editDialog"),
  editForm: document.querySelector("#editForm"),
  editTaskId: document.querySelector("#editTaskId"),
  editTitle: document.querySelector("#editTitle"),
  editDetail: document.querySelector("#editDetail"),
  editSubtaskWrap: document.querySelector("#editSubtaskWrap"),
  editSubtaskRows: document.querySelector("#editSubtaskRows"),
  editAddSubtaskRow: document.querySelector("#editAddSubtaskRow"),
  editAssignee: document.querySelector("#editAssignee"),
  editAssigneeWrap: document.querySelector("#editAssigneeWrap"),
  editPriority: document.querySelector("#editPriority"),
  cancelEdit: document.querySelector("#cancelEdit"),
  templateDialog: document.querySelector("#templateDialog"),
  templateForm: document.querySelector("#templateForm"),
  templateDialogTitle: document.querySelector("#templateDialogTitle"),
  templateId: document.querySelector("#templateId"),
  templateTypeChooser: document.querySelector("#templateTypeChooser"),
  templateTitle: document.querySelector("#templateTitle"),
  templateDetail: document.querySelector("#templateDetail"),
  templateSubtaskWrap: document.querySelector("#templateSubtaskWrap"),
  templateSubtaskRows: document.querySelector("#templateSubtaskRows"),
  templateAddSubtaskRow: document.querySelector("#templateAddSubtaskRow"),
  templatePriority: document.querySelector("#templatePriority"),
  cancelTemplateEdit: document.querySelector("#cancelTemplateEdit"),
  repositoryEditDialog: document.querySelector("#repositoryEditDialog"),
  repositoryEditForm: document.querySelector("#repositoryEditForm"),
  repositoryEditId: document.querySelector("#repositoryEditId"),
  repositoryEditTitle: document.querySelector("#repositoryEditTitle"),
  repositoryEditDetail: document.querySelector("#repositoryEditDetail"),
  repositoryEditAssignee: document.querySelector("#repositoryEditAssignee"),
  repositoryEditPriority: document.querySelector("#repositoryEditPriority"),
  repositoryEditDay: document.querySelector("#repositoryEditDay"),
  cancelRepositoryEdit: document.querySelector("#cancelRepositoryEdit"),
  reopenRepositoryTask: document.querySelector("#reopenRepositoryTask"),
  supertaskManagerDialog: document.querySelector("#supertaskManagerDialog"),
  supertaskManagerForm: document.querySelector("#supertaskManagerForm"),
  supertaskManagerId: document.querySelector("#supertaskManagerId"),
  supertaskManagerTitle: document.querySelector("#supertaskManagerTitle"),
  supertaskManagerName: document.querySelector("#supertaskManagerName"),
  supertaskManagerDetail: document.querySelector("#supertaskManagerDetail"),
  supertaskManagerPriority: document.querySelector("#supertaskManagerPriority"),
  supertaskManagerRows: document.querySelector("#supertaskManagerRows"),
  supertaskAddInternal: document.querySelector("#supertaskAddInternal"),
  cancelSupertaskManager: document.querySelector("#cancelSupertaskManager"),
  hubDetailDialog: document.querySelector("#hubDetailDialog"),
  hubDetailForm: document.querySelector("#hubDetailForm"),
  hubDetailEyebrow: document.querySelector("#hubDetailEyebrow"),
  hubDetailTitle: document.querySelector("#hubDetailTitle"),
  hubDetailContent: document.querySelector("#hubDetailContent"),
  closeHubDetail: document.querySelector("#closeHubDetail"),
};

document.body.appendChild(elements.templateDialog);

elements.taskCreatedAt.value = toDateInput(new Date());
bindEvents();
renderSubtaskRows(elements.subtaskRows, []);
renderAccessGate();

function bindEvents() {
  elements.taskForm.addEventListener("change", (event) => {
    if (event.target.name === "taskType") updateTaskTypeFields();
  });

  elements.addSubtaskRow.addEventListener("click", () => {
    elements.subtaskRows.appendChild(createSubtaskEditorRow());
  });

  elements.editAddSubtaskRow.addEventListener("click", () => {
    elements.editSubtaskRows.appendChild(createSubtaskEditorRow());
  });

  elements.templateAddSubtaskRow.addEventListener("click", () => {
    elements.templateSubtaskRows.appendChild(createSubtaskEditorRow());
  });

  elements.supertaskAddInternal.addEventListener("click", () => {
    elements.supertaskManagerRows.appendChild(createSubtaskEditorRow());
  });

  elements.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = getTaskPayloadFromForm();
    if (!payload.title) return;

    const createdTask = addTaskSet(payload);
    if (elements.saveTemplate.checked) {
      saveTemplateFromPayload({ ...payload, sourceTaskId: createdTask?.id || "" });
    }
    resetTaskForm();
    saveAndRender();
  });

  elements.personForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = elements.personName.value.trim();
    const password = elements.personPassword.value.trim();
    const role = elements.personRole.value;
    if (!name || !isCoordinator()) return;
    if (role === "coordinator" && !password) return;

    state.accounts.push({
      id: createId(),
      name,
      password,
      role,
      status: password ? "active" : "new",
    });
    elements.personForm.reset();
    saveState();
    renderCalendarHub();
  });

  elements.monthForm.addEventListener("submit", (event) => {
    event.preventDefault();
    createMonthFromInput(elements.monthName, true);
  });

  elements.hubMonthForm.addEventListener("submit", (event) => {
    event.preventDefault();
    createMonthFromInput(elements.hubMonthName, false);
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
      event.preventDefault();
      undoLastChange();
    }
  });

  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  });

  elements.seedButton.addEventListener("click", () => {
    if (!isCoordinator()) return;
    const currentUser = getCurrentUser();
    const sample = normalizeState(getSeedState());
    state.accounts = currentUser ? [currentUser, ...sample.accounts.filter((account) => account.id !== currentUser.id)] : sample.accounts;
    state.months = sample.months;
    state.calendars = sample.calendars;
    state.activeCalendarId = sample.activeCalendarId;
    renderSubtaskRows(elements.subtaskRows, []);
    saveAndRender();
  });

  elements.resetButton.addEventListener("click", () => {
    if (!isCoordinator()) return;
    if (!elements.resetButton.classList.contains("confirming")) {
      elements.resetButton.classList.add("confirming");
      elements.resetButton.textContent = "Estas seguro?";
      window.clearTimeout(resetConfirmTimer);
      resetConfirmTimer = window.setTimeout(() => resetResetButton(), RESET_CONFIRM_MS);
      return;
    }
    resetResetButton();
    const calendar = getActiveCalendar();
    calendar.tasks = [];
    calendar.savedTasks = [];
    calendar.repository = [];
    calendar.extraSlots = {};
    saveAndRender();
  });

  elements.logoutButton.addEventListener("click", () => {
    logout();
  });

  elements.hubLogoutButton.addEventListener("click", () => {
    logout();
  });

  elements.backToHubButton.addEventListener("click", () => {
    if (isCoordinator()) showCalendarHub();
  });

  elements.changePasswordButton.addEventListener("click", () => {
    changeCurrentPassword();
  });

  elements.cancelEdit.addEventListener("click", () => elements.editDialog.close());
  elements.cancelTemplateEdit.addEventListener("click", () => {
    elements.templateDialog.close();
    templateEditCalendarId = "";
    templateEditReturnToHub = false;
    setTemplateTypeControlVisible(false);
  });
  elements.cancelRepositoryEdit.addEventListener("click", () => elements.repositoryEditDialog.close());
  elements.cancelSupertaskManager.addEventListener("click", () => elements.supertaskManagerDialog.close());
  elements.closeHubDetail.addEventListener("click", () => elements.hubDetailDialog.close());

  elements.editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const task = state.tasks.find((item) => item.id === elements.editTaskId.value);
    if (!task) return;

    if (!isCoordinator() && task.assigneeId !== getCurrentUser()?.id) return;

    if (isCoordinator()) {
      task.title = elements.editTitle.value.trim();
      task.assigneeId = task.type === "supertask" ? "" : elements.editAssignee.value;
      task.priority = elements.editPriority.value;
    }
    task.detail = elements.editDetail.value.trim();
    if (isCoordinator() && task.type === "supertask") {
      task.subtasks = collectSubtaskRows(elements.editSubtaskRows);
      syncGeneratedSubtasks(task);
    }
    elements.editDialog.close();
    saveAndRender();
  });

  elements.templateForm.addEventListener("change", (event) => {
    if (event.target.name === "templateType") updateTemplateTypeFields();
  });

  elements.templateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const templateCalendar = getTemplateEditCalendar();
    const template = templateCalendar?.savedTasks.find((item) => item.id === elements.templateId.value);
    if (!template) return;

    const templateType = getTemplateKind(template);
    const previousTitle = template.title;
    template.type = templateType;
    template.title = getTemplateTitle(elements.templateTitle.value, templateType);
    template.detail = elements.templateDetail.value.trim();
    template.priority = elements.templatePriority.value;
    template.subtasks = templateType === "supertask" ? collectSubtaskRows(elements.templateSubtaskRows) : [];
    template.updatedAt = new Date().toISOString();
    if (templateEditReturnToHub && templateType === "supertask") {
      applySavedSupertaskToCurrentCalendar(template, previousTitle);
    }
    elements.templateDialog.close();
    saveState();
    showSaveAnimation("Cambios guardados");
    if (templateEditReturnToHub) {
      renderCalendarHub();
    } else {
      render();
    }
    templateEditCalendarId = "";
    templateEditReturnToHub = false;
    setTemplateTypeControlVisible(false);
  });

  elements.repositoryEditForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveRepositoryEdit(false);
  });

  elements.reopenRepositoryTask.addEventListener("click", () => {
    saveRepositoryEdit(true);
  });

  elements.supertaskManagerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveSupertaskManager();
  });
}

function renderAccessGate() {
  const sessionId = localStorage.getItem(SESSION_KEY);
  const user = state.accounts.find((account) => account.id === sessionId);

  if (user) {
    elements.accessShell.classList.add("hidden");
    if (isCoordinator(user)) {
      showCalendarHub();
    } else {
      elements.calendarHubShell.classList.add("hidden");
      elements.appShell.classList.remove("hidden");
      state.activeCalendarId = getCurrentCalendar().id;
      saveAndRender();
    }
    return;
  }

  elements.appShell.classList.add("hidden");
  elements.calendarHubShell.classList.add("hidden");
  elements.accessShell.classList.remove("hidden");
  const hasCoordinator = state.accounts.some((account) => account.role === "coordinator");
  elements.accessShell.replaceChildren(hasCoordinator ? createLoginCard() : createCoordinatorSetupCard());
}

function showCalendarHub() {
  elements.accessShell.classList.add("hidden");
  elements.appShell.classList.add("hidden");
  elements.calendarHubShell.classList.remove("hidden");
  renderCalendarHub();
}

function enterCalendar(calendarId) {
  if (!isCoordinator()) return;
  state.activeCalendarId = calendarId;
  saveState();
  elements.calendarHubShell.classList.add("hidden");
  elements.appShell.classList.remove("hidden");
  render();
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  state.activeCalendarId = getCurrentCalendar().id;
  renderAccessGate();
}

function createCoordinatorSetupCard() {
  const card = document.createElement("div");
  card.className = "access-card";
  card.innerHTML = `
    <div>
      <p class="eyebrow">Primer acceso</p>
      <h1>Crear coordinador</h1>
    </div>
    <form id="setupCoordinatorForm">
      <input id="setupName" type="text" required maxlength="45" placeholder="Nombre del coordinador" />
      <input id="setupPassword" type="password" required maxlength="45" placeholder="Clave" />
      <button class="primary-button" type="submit">Crear cuenta</button>
    </form>
  `;
  card.querySelector("#setupCoordinatorForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = card.querySelector("#setupName").value.trim();
    const password = card.querySelector("#setupPassword").value.trim();
    if (!name || !password) return;
    const account = { id: createId(), name, password, role: "coordinator" };
    state.accounts.push(account);
    ensureCalendarStructure();
    localStorage.setItem(SESSION_KEY, account.id);
    saveState();
    renderAccessGate();
  });
  return card;
}

function createLoginCard() {
  const card = document.createElement("div");
  card.className = "access-card";
  card.innerHTML = `
    <div>
      <p class="eyebrow">Acceso</p>
      <h1>Iniciar sesion</h1>
    </div>
    <form id="loginForm">
      <select id="loginAccount"></select>
      <input id="loginPassword" type="password" required maxlength="45" placeholder="Clave" />
      <button class="primary-button" type="submit">Entrar</button>
    </form>
    <p class="task-detail" id="loginError"></p>
  `;
  const select = card.querySelector("#loginAccount");
  select.innerHTML = state.accounts
    .map((account) => `<option value="${account.id}">${escapeHtml(account.name)} - ${account.role === "coordinator" ? "Coordinador" : "Colaborador"}</option>`)
    .join("");
  select.addEventListener("change", () => {
    const account = state.accounts.find((item) => item.id === select.value);
    if (account && account.role === "collaborator" && !account.password) {
      renderPasswordSetupCard(account.id);
    }
  });
  const selectedAccount = state.accounts.find((item) => item.id === select.value);
  if (selectedAccount && selectedAccount.role === "collaborator" && !selectedAccount.password) {
    window.setTimeout(() => renderPasswordSetupCard(selectedAccount.id), 0);
  }
  card.querySelector("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const account = state.accounts.find((item) => item.id === select.value);
    const password = card.querySelector("#loginPassword").value;
    if (account && account.role === "collaborator" && !account.password) {
      renderPasswordSetupCard(account.id);
      return;
    }
    if (account && account.role === "collaborator" && account.status === "pending") {
      card.querySelector("#loginError").textContent = "Tu solicitud de acceso esta pendiente.";
      return;
    }
    if (account && account.role === "collaborator" && account.status === "rejected") {
      card.querySelector("#loginError").textContent = "Tu solicitud fue rechazada. Solicita acceso al coordinador.";
      return;
    }
    if (!account || account.password !== password) {
      card.querySelector("#loginError").textContent = "Clave incorrecta.";
      return;
    }
    localStorage.setItem(SESSION_KEY, account.id);
    state.activeCalendarId = isCoordinator(account) ? state.activeCalendarId || getCurrentCalendar().id : getCurrentCalendar().id;
    saveState();
    renderAccessGate();
  });
  return card;
}

function renderPasswordSetupCard(accountId) {
  const account = state.accounts.find((item) => item.id === accountId);
  if (!account) return;
  const card = document.createElement("div");
  card.className = "access-card";
  card.innerHTML = `
    <div>
      <p class="eyebrow">Primer ingreso</p>
      <h1>${escapeHtml(account.name)}</h1>
    </div>
    <form id="passwordSetupForm">
      <input id="newAccessPassword" type="password" required maxlength="45" placeholder="Crea tu clave" />
      <button class="primary-button" type="submit">Solicitar acceso</button>
      <button class="ghost-button" id="backToLogin" type="button">Volver</button>
    </form>
    <p class="task-detail">Tu solicitud aparecera en la seccion de meses y calendarios del coordinador.</p>
  `;
  card.querySelector("#backToLogin").addEventListener("click", renderAccessGate);
  card.querySelector("#passwordSetupForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const password = card.querySelector("#newAccessPassword").value.trim();
    if (!password) return;
    account.password = password;
    account.status = "pending";
    saveState();
    renderAccessGate();
  });
  elements.accessShell.replaceChildren(card);
}

function getCurrentUser() {
  return state.accounts.find((account) => account.id === localStorage.getItem(SESSION_KEY)) || null;
}

function isCoordinator(user = getCurrentUser()) {
  return Boolean(user && user.role === "coordinator");
}

function attachCalendarAccessors(target) {
  Object.defineProperties(target, {
    people: {
      get() {
        return this.accounts.filter((account) => account.role === "collaborator");
      },
      set(value) {
        const coordinators = this.accounts.filter((account) => account.role === "coordinator");
        this.accounts = [...coordinators, ...(Array.isArray(value) ? value : [])];
      },
      configurable: true,
    },
    tasks: {
      get() {
        return getActiveCalendar().tasks;
      },
      set(value) {
        getActiveCalendar().tasks = Array.isArray(value) ? value : [];
      },
      configurable: true,
    },
    savedTasks: {
      get() {
        return getActiveCalendar().savedTasks;
      },
      set(value) {
        getActiveCalendar().savedTasks = Array.isArray(value) ? value : [];
      },
      configurable: true,
    },
    repository: {
      get() {
        return getActiveCalendar().repository;
      },
      set(value) {
        getActiveCalendar().repository = Array.isArray(value) ? value : [];
      },
      configurable: true,
    },
    extraSlots: {
      get() {
        return getActiveCalendar().extraSlots;
      },
      set(value) {
        getActiveCalendar().extraSlots = value || {};
      },
      configurable: true,
    },
  });
}

function getActiveCalendar() {
  ensureCalendarStructure();
  const user = getCurrentUser();
  const calendarId = user && user.role === "collaborator" ? getCurrentCalendar().id : state.activeCalendarId;
  return state.calendars.find((calendar) => calendar.id === calendarId) || getCurrentCalendar();
}

function getCurrentCalendar() {
  ensureCalendarStructure();
  return state.calendars.find((calendar) => calendar.isCurrent) || state.calendars[0];
}

function ensureCalendarStructure() {
  if (!state.months.length) {
    state.months.push({ id: createId(), name: "Mes actual", order: 0 });
  }
  if (!state.calendars.length) {
    state.calendars.push(createCalendar({ name: "Calendario actual", monthId: state.months[0].id, order: 0, isCurrent: true }));
  }
  if (!state.calendars.some((calendar) => calendar.isCurrent)) {
    state.calendars[0].isCurrent = true;
  }
  if (!state.activeCalendarId || !state.calendars.some((calendar) => calendar.id === state.activeCalendarId)) {
    state.activeCalendarId = getCurrentCalendar().id;
  }
}

function createCalendar(data = {}) {
  return {
    id: data.id || createId(),
    name: data.name || "Calendario",
    monthId: data.monthId || state.months[0]?.id || createId(),
    order: Number.isInteger(data.order) ? data.order : 0,
    isCurrent: Boolean(data.isCurrent),
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    savedTasks: Array.isArray(data.savedTasks) ? data.savedTasks : [],
    repository: Array.isArray(data.repository) ? data.repository : [],
    extraSlots: data.extraSlots || {},
  };
}

function getTaskPayloadFromForm() {
  const formData = new FormData(elements.taskForm);
  const type = String(formData.get("taskType") || "task");
  return {
    title: String(formData.get("title") || "").trim(),
    detail: String(formData.get("detail") || "").trim(),
    assigneeId: type === "supertask" ? "" : getTaskAssigneeFromRole(formData),
    priority: String(formData.get("priority") || "normal"),
    createdAt: elements.taskCreatedAt.value || toDateInput(new Date()),
    type,
    preferredDayIndex: parsePreferredDay(formData.get("preferredDay")),
    subtasks: type === "supertask" ? collectSubtaskRows(elements.subtaskRows) : [],
  };
}

function addTaskSet(payload) {
  const parentId = createId();
  const baseTask = createTask({
    ...payload,
    id: parentId,
    parentId: "",
    generatedBy: "",
  });
  state.tasks.push(baseTask);

  if (payload.type !== "supertask") return baseTask;

  payload.subtasks.forEach((subtask, index) => {
    state.tasks.push(
      createTask({
        id: createId(),
        title: subtask.title,
        detail: subtask.detail || `Parte de supertarea: ${payload.title}`,
        assigneeId: subtask.assigneeId || "",
        priority: subtask.priority || payload.priority,
        createdAt: payload.createdAt,
        preferredDayIndex: Number.isInteger(subtask.preferredDayIndex)
          ? subtask.preferredDayIndex
          : payload.preferredDayIndex,
        type: "task",
        subtasks: [],
        parentId,
        generatedBy: parentId,
        order: index + 1,
      })
    );
  });
  return baseTask;
}

function createTask(data) {
  return {
    id: data.id || createId(),
    title: data.title || "Sin nombre",
    detail: data.detail || "",
    assigneeId: data.type === "supertask" ? "" : data.assigneeId || "",
    priority: data.priority || "normal",
    createdAt: data.createdAt || toDateInput(new Date()),
    completed: Boolean(data.completed),
    completedAt: data.completedAt || "",
    completedDayIndex: Number.isInteger(data.completedDayIndex) ? data.completedDayIndex : null,
    preferredDayIndex: Number.isInteger(data.preferredDayIndex) ? data.preferredDayIndex : null,
    type: data.type || "task",
    subtasks: normalizeSubtasks(data.subtasks || []),
    parentId: data.parentId || "",
    generatedBy: data.generatedBy || "",
    order: data.order || 0,
  };
}

function saveTemplateFromPayload(payload) {
  const template = createSavedTemplate(payload);
  getTemplateTargetCalendar(template.type).savedTasks.push(template);
  showSaveAnimation(template.type === "supertask" ? "Supertarea guardada" : "Tarea guardada");
}

function createSavedTemplate(data) {
  const subtasks = normalizeSubtasks(data.subtasks || []);
  const type = data.type === "supertask" || subtasks.length ? "supertask" : "task";
  return {
    id: createId(),
    title: getTemplateTitle(data.title, type),
    detail: data.detail || "",
    priority: data.priority || "normal",
    type,
    sourceTaskId: data.sourceTaskId || (type === "supertask" ? data.id || "" : ""),
    subtasks: type === "supertask" ? subtasks : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getTemplateTargetCalendar(type) {
  return type === "supertask" ? getCurrentCalendar() : getActiveCalendar();
}

function getTemplateTitle(title, type) {
  const cleanTitle = String(title || "").trim();
  if (cleanTitle) return cleanTitle;
  return type === "supertask" ? "Supertarea guardada" : "Tarea guardada";
}

function getTemplateKind(template) {
  return template?.type === "supertask" || normalizeSubtasks(template?.subtasks || []).length
    ? "supertask"
    : "task";
}

function isSupertaskTemplate(template) {
  return getTemplateKind(template) === "supertask";
}

function normalizeSavedTemplatesInCalendar(calendar) {
  if (!calendar || !Array.isArray(calendar.savedTasks)) return;
  let changed = false;
  calendar.savedTasks = calendar.savedTasks.map((template) => {
    const type = getTemplateKind(template);
    const subtasks = type === "supertask" ? normalizeSubtasks(template.subtasks || []) : [];
    const normalized = {
      ...template,
      title: getTemplateTitle(template.title, type),
      type,
      subtasks,
    };
    if (
      normalized.type !== template.type ||
      normalized.title !== template.title ||
      normalized.subtasks.length !== normalizeSubtasks(template.subtasks || []).length
    ) {
      changed = true;
    }
    return normalized;
  });
  if (changed) saveState();
}

function resetTaskForm() {
  elements.taskForm.reset();
  elements.taskCreatedAt.value = toDateInput(new Date());
  elements.taskForm.querySelector('input[name="priority"][value="high"]').checked = true;
  elements.taskForm.querySelector('input[name="taskType"][value="task"]').checked = true;
  elements.taskForm.querySelector('input[name="preferredDay"][value="auto"]').checked = true;
  renderSubtaskRows(elements.subtaskRows, []);
  updateTaskTypeFields();
}

function updateTaskTypeFields() {
  if (!isCoordinator()) {
    elements.taskForm.querySelector('input[name="taskType"][value="task"]').checked = true;
  }
  const type = elements.taskForm.querySelector('input[name="taskType"]:checked').value;
  elements.subtaskGroup.classList.toggle("hidden", type !== "supertask");
  elements.taskAssigneeWrap.classList.toggle("hidden", type === "supertask" || !isCoordinator());
  if (type === "supertask" && !elements.subtaskRows.children.length) {
    renderSubtaskRows(elements.subtaskRows, []);
  }
}

function updateTemplateTypeFields() {
  const type = elements.templateForm.querySelector('input[name="templateType"]:checked').value;
  elements.templateSubtaskWrap.classList.toggle("hidden", type !== "supertask");
  if (type === "supertask" && !elements.templateSubtaskRows.children.length) {
    renderSubtaskRows(elements.templateSubtaskRows, []);
  }
}

function setView(view) {
  elements.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  elements.boardView.classList.toggle("hidden", view !== "board");
  elements.queueView.classList.toggle("hidden", view !== "queue");
  elements.savedView.classList.toggle("hidden", view !== "saved");
  elements.repositoryView.classList.toggle("hidden", view !== "repository");
}

function render() {
  renderSelects();
  renderPeople();
  renderBoard();
  renderQueue();
  renderSaved();
  renderRepository();
  renderCalendarAdmin();
  updateTaskTypeFields();
  updateRoleAccess();

  const activeTasks = state.tasks.filter((task) => !task.completed && task.type !== "supertask");
  elements.totalTasks.textContent = `${activeTasks.length} ${activeTasks.length === 1 ? "pendiente" : "pendientes"}`;
  renderSupertaskStats();
  elements.teamCount.textContent = String(state.people.length);
}

function updateRoleAccess() {
  const user = getCurrentUser();
  const coordinator = isCoordinator(user);
  document.querySelectorAll(".coordinator-only").forEach((node) => {
    node.classList.toggle("hidden", !coordinator);
  });
  document.querySelector("#calendarAdminSection").classList.add("hidden");
  document.querySelector("#queueTab").classList.toggle("hidden", !coordinator);
  document.querySelector("#savedTab").classList.toggle("hidden", !coordinator);
  document.querySelector("#repositoryTab").classList.toggle("hidden", !coordinator);
  elements.seedButton.classList.toggle("hidden", !coordinator);
  elements.resetButton.classList.toggle("hidden", !coordinator);
  elements.changePasswordButton.classList.toggle("hidden", coordinator || !user);
  elements.taskForm.querySelector(".segmented").classList.toggle("hidden", !coordinator);
  if (!coordinator) {
    elements.taskForm.querySelector('input[name="taskType"][value="task"]').checked = true;
    setView("board");
  }
  const calendar = getActiveCalendar();
  elements.sessionStats.textContent = user
    ? `${user.name} - ${coordinator ? "Coordinador" : "Colaborador"} - ${calendar.name}`
    : "Sin sesion";
}

function renderCalendarAdmin() {
  elements.calendarAdminList.replaceChildren();
  elements.calendarCount.textContent = String(state.calendars.length);
}

function renderCalendarHub() {
  elements.hubCalendarAdminList.replaceChildren();
  elements.hubSavedSupertaskList.replaceChildren();
  if (!isCoordinator()) return;

  renderAccessRequests();
  renderPeople();
  renderHubSavedSupertasks();
  elements.hubCalendarCount.textContent = `${state.calendars.length} calendarios`;
  const user = getCurrentUser();
  elements.hubSessionStats.textContent = user ? `${user.name} - Coordinador` : "Coordinador";
  const months = state.months.slice().sort((a, b) => a.order - b.order);
  months.forEach((month) => {
    const card = document.createElement("section");
    card.className = "month-card";

    const header = document.createElement("div");
    header.className = "month-card-header";
    const input = document.createElement("input");
    input.className = "month-title-input";
    input.value = month.name;
    input.maxLength = 45;
    input.addEventListener("change", () => {
      month.name = input.value.trim() || month.name;
      saveState();
      renderCalendarHub();
    });
    const addCalendar = actionButton("Calendario +", () => addCalendarToMonth(month.id));
    const upMonth = actionButton("Subir", () => moveMonth(month.id, -1));
    const downMonth = actionButton("Bajar", () => moveMonth(month.id, 1));
    const removeMonth = actionButton("Eliminar mes", () => deleteMonth(month.id), "remove-template");
    const color = document.createElement("input");
    color.type = "color";
    color.className = "month-color-input";
    color.value = month.color || getPastelColor(month.order);
    color.title = "Color del mes";
    color.addEventListener("change", () => {
      month.color = color.value;
      saveState();
      renderCalendarHub();
    });
    const monthStats = document.createElement("span");
    monthStats.className = "counter";
    monthStats.textContent = getMonthProgressText(month.id);
    header.append(input, color, monthStats, addCalendar, upMonth, downMonth, removeMonth);
    card.style.borderColor = month.color || getPastelColor(month.order);
    card.style.background = `${month.color || getPastelColor(month.order)}33`;
    card.appendChild(header);

    state.calendars
      .filter((calendar) => calendar.monthId === month.id)
      .sort((a, b) => a.order - b.order)
      .forEach((calendar) => card.appendChild(createCalendarRow(calendar)));

    elements.hubCalendarAdminList.appendChild(card);
  });
}

function renderAccessRequests() {
  const requests = state.accounts.filter((account) => account.role === "collaborator" && account.status === "pending");
  elements.accessRequestsPanel.classList.toggle("hidden", !requests.length);
  elements.accessRequestCount.textContent = String(requests.length);
  elements.accessRequestList.replaceChildren();
  requests.forEach((account) => {
    const row = document.createElement("div");
    row.className = "person-row";
    const name = document.createElement("strong");
    name.textContent = account.name;
    const accept = actionButton("Aceptar", () => {
      account.status = "active";
      saveState();
      renderCalendarHub();
    });
    const reject = actionButton("Rechazar", () => {
      account.status = "rejected";
      saveState();
      renderCalendarHub();
    }, "remove-template");
    row.append(name, accept, reject);
    elements.accessRequestList.appendChild(row);
  });
}

function renderHubSavedSupertasks() {
  const currentCalendar = getCurrentCalendar();
  normalizeSavedTemplatesInCalendar(currentCalendar);
  const supertasks = currentCalendar.savedTasks.filter(isSupertaskTemplate);
  elements.hubSavedSupertaskCount.textContent = `${supertasks.length} guardadas`;
  elements.hubSavedSupertaskList.replaceChildren();

  if (!supertasks.length) {
    elements.hubSavedSupertaskList.appendChild(emptyState("No hay supertareas guardadas en el calendario actual."));
    return;
  }

  supertasks
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .forEach((template) => {
      elements.hubSavedSupertaskList.appendChild(createHubSavedSupertaskCard(template, currentCalendar.id));
    });
}

function createHubSavedSupertaskCard(template, calendarId) {
  const card = document.createElement("article");
  card.className = "library-card hub-saved-supertask-card";

  const title = document.createElement("strong");
  title.className = "task-title";
  title.textContent = getTemplateTitle(template.title, template.type);

  const detail = document.createElement("p");
  detail.className = "task-detail";
  detail.textContent = template.detail || "Sin detalle";

  const preview = document.createElement("div");
  preview.className = "subtask-preview";
  renderSubtaskPreview(preview, template);

  const meta = document.createElement("div");
  meta.className = "task-meta";
  addPill(meta, PRIORITY_LABELS[template.priority], template.priority);
  addPill(meta, "Supertarea", "super");
  addPill(meta, `${normalizeSubtasks(template.subtasks).length} internas`, "super");
  addPill(meta, `Actualizada ${formatDate(template.updatedAt || template.createdAt)}`);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const edit = actionButton("Editar", () => openTemplateEditor(template.id, calendarId, true));
  const copy = actionButton("Copiar", () => duplicateTemplate(template.id, calendarId, true));
  const remove = actionButton("Eliminar", () => removeHubSavedSupertask(template.id, calendarId), "remove-template");
  actions.append(edit, copy, remove);

  card.append(title, detail, preview, meta, actions);
  return card;
}

function removeHubSavedSupertask(templateId, calendarId) {
  const calendar = state.calendars.find((item) => item.id === calendarId);
  if (!calendar) return;
  const template = calendar.savedTasks.find((item) => item.id === templateId);
  if (!template) return;
  if (!confirm(`Deseas eliminar la supertarea guardada "${getTemplateTitle(template.title, "supertask")}"?`)) return;
  calendar.savedTasks = calendar.savedTasks.filter((item) => item.id !== templateId);
  saveState();
  renderCalendarHub();
}

function createCalendarRow(calendar) {
  const row = document.createElement("div");
  row.className = "calendar-row";
  row.draggable = true;
  row.dataset.calendarId = calendar.id;
  row.addEventListener("dragstart", (event) => {
    if (event.target instanceof Element && event.target.closest("button, input, select, textarea")) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", calendar.id);
  });
  row.addEventListener("dragover", (event) => event.preventDefault());
  row.addEventListener("drop", (event) => {
    event.preventDefault();
    reorderCalendarByDrop(event.dataTransfer.getData("text/plain"), calendar.id);
  });
  const title = document.createElement("input");
  title.className = "calendar-name-input";
  title.value = calendar.name;
  title.maxLength = 50;
  title.addEventListener("change", () => {
    calendar.name = title.value.trim() || calendar.name;
    saveState();
    renderCalendarHub();
  });
  const progress = document.createElement("span");
  progress.className = "counter";
  progress.textContent = `${calendar.isCurrent ? "Actual - " : ""}${getCalendarProgressText(calendar)}`;

  const select = actionButton("Entrar", () => {
    enterCalendar(calendar.id);
  });
  const current = actionButton("Actual", () => setCurrentCalendar(calendar.id));
  const summary = actionButton("Resumen", () => downloadCalendarSummaryExcel(calendar.id));
  const remove = actionButton("Eliminar", () => deleteCalendar(calendar.id), "remove-template");
  row.append(title, progress, select, current, summary, remove);
  return row;
}

function getCalendarProgress(calendar) {
  const tasks = calendar.tasks.filter((task) => task.type !== "supertask");
  const completed = tasks.filter((task) => task.completed).length;
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  return { total: tasks.length, completed, percent };
}

function getCalendarProgressText(calendar) {
  const progress = getCalendarProgress(calendar);
  return `${progress.completed}/${progress.total} - ${progress.percent}%`;
}

function getMonthProgressText(monthId) {
  const calendars = state.calendars.filter((calendar) => calendar.monthId === monthId);
  const totals = calendars.reduce(
    (acc, calendar) => {
      const progress = getCalendarProgress(calendar);
      acc.completed += progress.completed;
      acc.total += progress.total;
      return acc;
    },
    { completed: 0, total: 0 }
  );
  const percent = totals.total ? Math.round((totals.completed / totals.total) * 100) : 0;
  return `${totals.completed}/${totals.total} tareas - ${percent}%`;
}

function openCalendarSummary(calendarId) {
  const calendar = state.calendars.find((item) => item.id === calendarId);
  if (!calendar) return;
  const content = document.createElement("div");
  content.className = "summary-content";
  const stats = getCalendarProgress(calendar);
  const completedTasks = calendar.tasks.filter((task) => task.completed && task.type !== "supertask");
  const priorityStats = ["high", "medium", "normal"].map((priority) => {
    const total = calendar.tasks.filter((task) => task.type !== "supertask" && task.priority === priority).length;
    const completed = completedTasks.filter((task) => task.priority === priority).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { priority, total, completed, percent };
  });

  const headline = document.createElement("div");
  headline.className = "summary-grid";
  headline.innerHTML = `
    <div class="summary-box"><strong>${stats.completed}/${stats.total}</strong><span>tareas realizadas</span></div>
    <div class="summary-box"><strong>${stats.percent}%</strong><span>avance general</span></div>
  `;
  content.appendChild(headline);

  const priorityList = document.createElement("div");
  priorityList.className = "summary-grid";
  priorityStats.forEach((item) => {
    const box = document.createElement("div");
    box.className = "summary-box";
    box.innerHTML = `<strong>${item.completed}/${item.total}</strong><span>${PRIORITY_LABELS[item.priority]} - ${item.percent}%</span>`;
    priorityList.appendChild(box);
  });
  content.appendChild(priorityList);

  const download = actionButton("Descargar Excel", () => downloadCalendarSummaryExcel(calendar.id));
  content.appendChild(download);

  const list = document.createElement("div");
  list.className = "repository-list";
  if (!completedTasks.length) {
    list.appendChild(emptyState("No hay tareas completadas en este calendario."));
  } else {
    completedTasks.forEach((task) => list.appendChild(createReadOnlyTaskCard(task, calendar)));
  }
  content.appendChild(list);
  openHubDetail("Resumen", calendar.name, content);
}

function createReadOnlyTaskCard(task, calendar) {
  const card = document.createElement("article");
  card.className = `repository-card ${task.priority}`;
  const title = document.createElement("strong");
  title.className = "task-title";
  title.textContent = task.title;
  const detail = document.createElement("p");
  detail.className = "task-detail";
  detail.textContent = task.detail;
  const data = document.createElement("dl");
  addDefinition(data, "Responsable", getAccountName(task.assigneeId));
  addDefinition(data, "Prioridad", PRIORITY_LABELS[task.priority]);
  addDefinition(data, "Dia", Number.isInteger(task.completedDayIndex) ? DAY_NAMES[task.completedDayIndex] : "-");
  addDefinition(data, "Completada", formatDate(task.completedAt));
  if (task.parentId) addDefinition(data, "Supertarea", getCalendarTaskTitle(task.parentId, calendar));
  card.append(title, detail, data);
  return card;
}

function downloadCalendarSummaryExcel(calendarId) {
  const calendar = state.calendars.find((item) => item.id === calendarId);
  if (!calendar) return;
  try {
    const summary = getCalendarSummaryRows(calendar);
    const htmlRows = summary
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell ?? "")}</td>`).join("")}</tr>`)
      .join("");
    const workbook = [
      "<!doctype html>",
      "<html>",
      "<head>",
      '<meta charset="utf-8">',
      "<style>",
      "table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px}",
      "td{border:1px solid #999;padding:6px;vertical-align:top}",
      ".section td{background:#e8eef8;font-weight:bold}",
      ".head td{background:#f3f4f6;font-weight:bold}",
      "</style>",
      "</head>",
      "<body>",
      "<table>",
      htmlRows,
      "</table>",
      "</body>",
      "</html>",
    ].join("");
    const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${sanitizeFileName(calendar.name)}_resumen.xls`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 0);
  } catch (error) {
    console.error(error);
    alert("No se pudo descargar el resumen. Intenta nuevamente.");
  }
}

function getCalendarSummaryRows(calendar) {
  const tasks = calendar.tasks.filter((task) => task.type !== "supertask");
  const completedTasks = tasks.filter((task) => task.completed);
  const pendingTasks = tasks.filter((task) => !task.completed);
  const completed = completedTasks.length;
  const total = tasks.length;
  const pending = pendingTasks.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const rows = [
    ["Resumen de calendario"],
    ["Calendario", calendar.name],
    ["Fecha de descarga", formatDate(new Date().toISOString())],
    ["Tareas totales", total],
    ["Tareas realizadas", completed],
    ["Tareas no completadas", pending],
    ["Porcentaje general", `${percent}%`],
    [],
    ["Resumen por urgencia"],
    ["Urgencia", "Total", "Realizadas", "No completadas", "Porcentaje"],
  ];

  ["high", "medium", "normal"].forEach((priority) => {
    const priorityTasks = tasks.filter((task) => task.priority === priority);
    const priorityCompleted = priorityTasks.filter((task) => task.completed).length;
    const priorityPending = priorityTasks.length - priorityCompleted;
    const priorityPercent = priorityTasks.length ? Math.round((priorityCompleted / priorityTasks.length) * 100) : 0;
    rows.push([
      PRIORITY_LABELS[priority],
      priorityTasks.length,
      priorityCompleted,
      priorityPending,
      `${priorityPercent}%`,
    ]);
  });

  rows.push(
    [],
    ["Espacios extra habilitados"],
    ["Colaborador", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Total"]
  );

  state.people.forEach((person) => {
    const slots = DAY_NAMES.map((_, dayIndex) => getCalendarExtraSlots(calendar, person.id, dayIndex));
    rows.push([person.name, ...slots, slots.reduce((sum, value) => sum + value, 0)]);
  });

  rows.push(
    [],
    ["Tareas completadas"],
    ["Tarea", "Responsable", "Urgencia", "Dia", "Completada", "Supertarea", "Detalle"]
  );

  completedTasks.forEach((task) => {
    rows.push(getSummaryTaskRow(task, calendar, true));
  });

  rows.push(
    [],
    ["Tareas no completadas"],
    ["Tarea", "Responsable", "Urgencia", "Dia asignado", "Ingreso", "Supertarea", "Detalle"]
  );

  pendingTasks.forEach((task) => {
    rows.push(getSummaryTaskRow(task, calendar, false));
  });

  return rows;
}

function getSummaryTaskRow(task, calendar, completed) {
  const dayIndex = completed ? task.completedDayIndex : task.preferredDayIndex;
  return [
    task.title,
    getAccountName(task.assigneeId),
    PRIORITY_LABELS[task.priority],
    Number.isInteger(dayIndex) ? DAY_NAMES[dayIndex] : "",
    completed ? formatDate(task.completedAt) : formatDate(task.createdAt),
    task.parentId ? getCalendarTaskTitle(task.parentId, calendar) : "",
    task.detail,
  ];
}

function getCalendarExtraSlots(calendar, personId, dayIndex) {
  return Number(calendar.extraSlots?.[personId]?.[dayIndex] || 0);
}

function sanitizeFileName(value) {
  return String(value || "calendario")
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "calendario";
}

function openCalendarSaved(calendarId) {
  const calendar = state.calendars.find((item) => item.id === calendarId);
  if (!calendar) return;
  state.activeCalendarId = calendar.id;
  const content = document.createElement("div");
  content.className = "repository-list";
  if (!calendar.savedTasks.length) {
    content.appendChild(emptyState("No hay tareas o supertareas guardadas en este calendario."));
  } else {
    calendar.savedTasks.forEach((template) => {
      const card = createTemplateCard(template);
      content.appendChild(card);
    });
  }
  openHubDetail("Guardadas", calendar.name, content);
}

function openCalendarRepository(calendarId) {
  const calendar = state.calendars.find((item) => item.id === calendarId);
  if (!calendar) return;
  state.activeCalendarId = calendar.id;
  const content = document.createElement("div");
  content.className = "repository-list";
  if (!calendar.repository.length) {
    content.appendChild(emptyState("El repositorio esta vacio."));
  } else {
    calendar.repository
      .slice()
      .sort((a, b) => new Date(b.repositoryAt || b.completedAt || b.deletedAt) - new Date(a.repositoryAt || a.completedAt || a.deletedAt))
      .forEach((item) => content.appendChild(createRepositoryCard(item)));
  }
  openHubDetail("Repositorio", calendar.name, content);
}

function openHubDetail(eyebrow, title, content) {
  elements.hubDetailEyebrow.textContent = eyebrow;
  elements.hubDetailTitle.textContent = title;
  elements.hubDetailContent.replaceChildren(content);
  elements.hubDetailDialog.showModal();
}

function getAccountName(accountId) {
  return state.accounts.find((account) => account.id === accountId)?.name || "Sin asignar";
}

function getCalendarTaskTitle(taskId, calendar) {
  return calendar.tasks.find((task) => task.id === taskId)?.title || "Supertarea";
}

function addCalendarToMonth(monthId) {
  const calendarsInMonth = state.calendars.filter((calendar) => calendar.monthId === monthId);
  if (calendarsInMonth.length >= 4) {
    alert("Cada mes puede integrar un maximo de 4 calendarios.");
    return;
  }
  state.calendars.push(createCalendar({
    name: `Calendario ${calendarsInMonth.length + 1}`,
    monthId,
    order: calendarsInMonth.length,
  }));
  saveState();
  renderCalendarHub();
}

function setCurrentCalendar(calendarId) {
  state.calendars.forEach((calendar) => {
    calendar.isCurrent = calendar.id === calendarId;
  });
  state.activeCalendarId = calendarId;
  saveState();
  renderCalendarHub();
}

function moveCalendar(calendarId, direction) {
  const calendar = state.calendars.find((item) => item.id === calendarId);
  if (!calendar) return;
  const siblings = state.calendars
    .filter((item) => item.monthId === calendar.monthId)
    .sort((a, b) => a.order - b.order);
  const index = siblings.findIndex((item) => item.id === calendarId);
  const swap = siblings[index + direction];
  if (!swap) return;
  const oldOrder = calendar.order;
  calendar.order = swap.order;
  swap.order = oldOrder;
  saveState();
  renderCalendarHub();
}

function reorderCalendarByDrop(sourceId, targetId) {
  if (!sourceId || sourceId === targetId) return;
  const source = state.calendars.find((calendar) => calendar.id === sourceId);
  const target = state.calendars.find((calendar) => calendar.id === targetId);
  if (!source || !target || source.monthId !== target.monthId) return;
  const siblings = state.calendars
    .filter((calendar) => calendar.monthId === source.monthId)
    .sort((a, b) => a.order - b.order);
  const withoutSource = siblings.filter((calendar) => calendar.id !== sourceId);
  const targetIndex = withoutSource.findIndex((calendar) => calendar.id === targetId);
  withoutSource.splice(targetIndex, 0, source);
  withoutSource.forEach((calendar, index) => {
    calendar.order = index;
  });
  saveState();
  renderCalendarHub();
}

function deleteCalendar(calendarId) {
  const calendar = state.calendars.find((item) => item.id === calendarId);
  if (!calendar) return;
  if (state.calendars.length <= 1) {
    alert("Debe existir al menos un calendario.");
    return;
  }
  if (!confirm(`Deseas eliminar el calendario "${calendar.name}"?`)) return;
  const monthId = calendar.monthId;
  state.calendars = state.calendars.filter((item) => item.id !== calendarId);
  const fallbackCalendar = state.calendars.find((item) => item.monthId === monthId) || state.calendars[0];
  if (calendar.isCurrent || !state.calendars.some((item) => item.isCurrent)) {
    state.calendars.forEach((item) => {
      item.isCurrent = item.id === fallbackCalendar.id;
    });
  }
  if (state.activeCalendarId === calendarId || !state.calendars.some((item) => item.id === state.activeCalendarId)) {
    state.activeCalendarId = fallbackCalendar.id;
  }
  state.calendars
    .filter((item) => item.monthId === monthId)
    .sort((a, b) => a.order - b.order)
    .forEach((item, index) => {
      item.order = index;
    });
  saveState();
  renderCalendarHub();
}

function deleteMonth(monthId) {
  const month = state.months.find((item) => item.id === monthId);
  if (!month) return;
  if (state.months.length <= 1) {
    alert("Debe existir al menos un mes.");
    return;
  }
  const calendarsToDelete = state.calendars.filter((calendar) => calendar.monthId === monthId);
  const calendarCount = calendarsToDelete.length;
  const suffix = calendarCount
    ? ` Tambien se eliminaran ${calendarCount} calendario${calendarCount === 1 ? "" : "s"} y sus tareas.`
    : "";
  if (!confirm(`Deseas eliminar el mes "${month.name}"?${suffix}`)) return;

  const deletedCalendarIds = new Set(calendarsToDelete.map((calendar) => calendar.id));
  state.months = state.months.filter((item) => item.id !== monthId);
  state.months
    .sort((a, b) => a.order - b.order)
    .forEach((item, index) => {
      item.order = index;
    });
  state.calendars = state.calendars.filter((calendar) => !deletedCalendarIds.has(calendar.id));

  const fallbackCalendar = state.calendars.find((calendar) => calendar.isCurrent) || state.calendars[0];
  if (fallbackCalendar && (deletedCalendarIds.has(state.activeCalendarId) || !state.calendars.some((calendar) => calendar.id === state.activeCalendarId))) {
    state.activeCalendarId = fallbackCalendar.id;
  }
  if (fallbackCalendar && !state.calendars.some((calendar) => calendar.isCurrent)) {
    fallbackCalendar.isCurrent = true;
  }

  saveState();
  renderCalendarHub();
}

function getPastelColor(index = 0) {
  const colors = ["#dbeafe", "#dcfce7", "#fef3c7", "#fce7f3", "#ede9fe", "#cffafe", "#ffedd5", "#e0f2fe"];
  return colors[Math.abs(index) % colors.length];
}

function moveMonth(monthId, direction) {
  const months = state.months.slice().sort((a, b) => a.order - b.order);
  const index = months.findIndex((month) => month.id === monthId);
  const swap = months[index + direction];
  const month = months[index];
  if (!month || !swap) return;
  const oldOrder = month.order;
  month.order = swap.order;
  swap.order = oldOrder;
  saveState();
  renderCalendarHub();
}

function createMonthFromInput(input, renderAppAfter = false) {
  if (!isCoordinator()) return;
  const name = input.value.trim() || `Mes ${state.months.length + 1}`;
  const month = { id: createId(), name, order: state.months.length, color: getPastelColor(state.months.length) };
  state.months.push(month);
  state.calendars.push(createCalendar({ name: "Calendario 1", monthId: month.id, order: 0 }));
  input.value = "";
  saveState();
  if (renderAppAfter) {
    saveAndRender();
  } else {
    renderCalendarHub();
  }
}

function renderSupertaskStats() {
  if (!isCoordinator()) {
    elements.supertaskStats.classList.add("hidden");
    elements.supertaskStats.replaceChildren();
    return;
  }
  const supertasks = state.tasks.filter((task) => task.type === "supertask");
  const activeSummaries = supertasks
    .map((supertask) => {
      const children = state.tasks.filter((task) => task.parentId === supertask.id);
      const completed = children.filter((task) => task.completed).length;
      const percent = children.length ? Math.round((completed / children.length) * 100) : 0;
      return {
        id: supertask.id,
        title: supertask.title,
        total: children.length,
        completed,
        percent,
        active: children.length > 0 && completed < children.length,
      };
    })
    .filter((summary) => summary.active);

  elements.supertaskStats.classList.toggle("hidden", !activeSummaries.length);
  elements.supertaskStats.replaceChildren();
  activeSummaries.forEach((summary) => {
    const button = document.createElement("button");
    button.className = "supertask-stat-button";
    button.type = "button";
    button.textContent = `${summary.title} ${summary.completed}/${summary.total} tareas realizadas - ${summary.percent}%`;
    button.addEventListener("click", () => openSupertaskManager(summary.id));
    elements.supertaskStats.appendChild(button);
  });
}

function renderSelects() {
  const options = [
    `<option value="">Sin asignar</option>`,
    ...state.people.map((person) => `<option value="${person.id}">${escapeHtml(person.name)}</option>`),
  ].join("");

  elements.taskAssignee.innerHTML = options;
  elements.editAssignee.innerHTML = options;

  document.querySelectorAll(".subtask-assignee").forEach((select) => {
    const selected = select.value;
    select.innerHTML = options;
    select.value = selected;
  });
}

function getTaskAssigneeFromRole(formData) {
  const user = getCurrentUser();
  if (user && user.role === "collaborator") return user.id;
  return String(formData.get("assignee") || "");
}

function getAccessStatusText(account) {
  if (account.status === "pending") return "pendiente";
  if (account.status === "rejected") return "rechazado";
  if (!account.password) return "sin clave";
  return "activo";
}

function setPersonPassword(personId) {
  if (!isCoordinator()) return;
  const person = state.accounts.find((account) => account.id === personId);
  if (!person) return;
  const password = prompt(`Nueva clave para ${person.name}`);
  if (!password) return;
  person.password = password.trim();
  if (!person.password) return;
  person.status = "active";
  saveState();
  if (elements.calendarHubShell.classList.contains("hidden")) {
    saveAndRender();
  } else {
    renderCalendarHub();
  }
}

function changeCurrentPassword() {
  const user = getCurrentUser();
  if (!user || user.role !== "collaborator") return;
  const currentPassword = prompt("Ingresa tu clave actual");
  if (currentPassword === null) return;
  if (user.password && currentPassword !== user.password) {
    alert("La clave actual no coincide.");
    return;
  }
  const newPassword = prompt("Ingresa tu nueva clave");
  if (!newPassword || !newPassword.trim()) return;
  user.password = newPassword.trim();
  user.status = "active";
  saveState();
  alert("Clave actualizada.");
}

function resetResetButton() {
  window.clearTimeout(resetConfirmTimer);
  resetConfirmTimer = null;
  elements.resetButton.classList.remove("confirming");
  elements.resetButton.textContent = "Limpiar";
}

function renderPeople() {
  elements.peopleList.replaceChildren();
  elements.teamCount.textContent = String(state.people.length);

  if (!state.accounts.length) {
    elements.peopleList.appendChild(emptyState("Agrega perfiles para administrar el acceso."));
    return;
  }

  for (const person of state.accounts) {
    const row = document.createElement("div");
    row.className = "person-row";

    const name = document.createElement("strong");
    name.textContent = person.name;

    const count = document.createElement("span");
    count.className = "counter";
    if (person.role === "coordinator") {
      count.textContent = `Coordinador - ${getAccessStatusText(person)}`;
    } else {
      const active = state.tasks.filter((task) => task.assigneeId === person.id && !task.completed).length;
      const done = state.tasks.filter((task) => task.assigneeId === person.id && task.completed).length;
      count.textContent = `${active} pendientes / ${done} listas - ${getAccessStatusText(person)}`;
    }

    const password = document.createElement("button");
    password.className = "small-button";
    password.type = "button";
    password.textContent = "Clave";
    password.addEventListener("click", () => setPersonPassword(person.id));

    const remove = document.createElement("button");
    remove.className = "small-button remove-person";
    remove.type = "button";
    remove.textContent = "Eliminar";
    remove.addEventListener("click", () => removePerson(person.id));

    row.append(name, count, password, remove);
    elements.peopleList.appendChild(row);
  }
}

function renderBoard() {
  elements.boardView.replaceChildren();

  if (!state.people.length) {
    elements.boardView.appendChild(emptyState("Aun no hay colaboradores."));
    return;
  }

  const schedule = buildSchedule();

  const peopleToRender = isCoordinator()
    ? state.people
    : state.people.filter((person) => person.id === getCurrentUser()?.id);

  for (const person of peopleToRender) {
    const section = document.createElement("section");
    section.className = "person-board";

    const header = document.createElement("div");
    header.className = "person-board-header";
    const titleWrap = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = person.name;
    const stats = getPersonStats(person.id);
    const subtitle = document.createElement("p");
    subtitle.className = "person-progress";
    subtitle.textContent = `${stats.percent}% listas - ${stats.completed} completadas - ${stats.pending} no completadas`;
    titleWrap.append(title, subtitle);

    const capacity = document.createElement("span");
    capacity.className = "counter";
    const scheduledCount = schedule.byPerson[person.id].days.flat().length;
    capacity.textContent = `${scheduledCount}/30 espacios activos`;
    header.append(titleWrap, capacity);

    const grid = document.createElement("div");
    grid.className = "week-grid";

    DAY_NAMES.forEach((dayName, dayIndex) => {
      const column = document.createElement("section");
      column.className = "day-column";
      column.dataset.personId = person.id;
      column.dataset.dayIndex = String(dayIndex);
      column.addEventListener("dragover", (event) => {
        if (canAcceptDraggedTask(event, person.id)) {
          event.preventDefault();
          column.classList.add("drag-over");
        }
      });
      column.addEventListener("dragleave", (event) => {
        if (!column.contains(event.relatedTarget)) column.classList.remove("drag-over");
      });
      column.addEventListener("drop", (event) => {
        event.preventDefault();
        column.classList.remove("drag-over");
        moveDraggedTaskToDay(event, person.id, dayIndex);
      });

      const pending = schedule.byPerson[person.id].days[dayIndex];
      const completed = schedule.byPerson[person.id].completedDays[dayIndex];
      const extras = getExtraSlots(person.id, dayIndex);
      const capacity = getDayCapacity(person.id, dayIndex);
      const dayHeader = document.createElement("div");
      dayHeader.className = "day-header";
      dayHeader.innerHTML = `<span>${dayName}</span><span>${pending.length + completed.length}/${capacity} - ${completed.length} listas</span>`;

      const list = document.createElement("div");
      list.className = "day-list";

      if (!pending.length && !completed.length) {
        list.appendChild(emptyState("Sin tareas"));
      } else {
        appendDayGroup(list, "Pendientes", pending, "scheduled", dayIndex);
        appendDayGroup(list, "Listas", completed, "completed", dayIndex);
      }

      const extraButton = document.createElement("button");
      extraButton.className = "small-button extra-slot-button";
      extraButton.type = "button";
      extraButton.textContent = `Tarea extra (${extras}/6)`;
      extraButton.title = "Clic izquierdo suma. Clic derecho resta.";
      extraButton.addEventListener("click", () => addExtraSlot(person.id, dayIndex));
      extraButton.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        removeExtraSlot(person.id, dayIndex);
      });

      column.append(dayHeader, list, extraButton);
      grid.appendChild(column);
    });

    section.append(header, grid);
    elements.boardView.appendChild(section);
  }
}

function appendDayGroup(list, title, tasks, location, dayIndex = null) {
  if (!tasks.length) return;
  const group = document.createElement("div");
  group.className = `day-group ${location}`;
  const label = document.createElement("span");
  label.className = "day-group-title";
  label.textContent = title;
  group.appendChild(label);
  tasks.forEach((task) => group.appendChild(createTaskCard(task, location, dayIndex)));
  list.appendChild(group);
}

function getDraggedTaskData(event) {
  if (activeDraggedTask) return activeDraggedTask;
  try {
    const raw = event.dataTransfer.getData("application/json");
    if (raw) return JSON.parse(raw);
  } catch {
    return null;
  }
  const taskId = event.dataTransfer.getData("text/plain");
  return taskId ? { taskId } : null;
}

function canAcceptDraggedTask(event, personId) {
  const data = getDraggedTaskData(event);
  return Boolean(data?.taskId && data.assigneeId === personId);
}

function moveDraggedTaskToDay(event, personId, dayIndex) {
  const data = getDraggedTaskData(event);
  if (!data?.taskId || data.assigneeId !== personId) return;
  moveTaskToDay(data.taskId, personId, dayIndex);
}

function moveTaskToDay(taskId, personId, dayIndex) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || task.completed || task.assigneeId !== personId || task.type === "supertask") return;

  const previousDay = task.preferredDayIndex;
  if (previousDay === dayIndex) return;
  if (!hasRoomForMovedTask(personId, dayIndex, task.id)) {
    alert("Ese dia no tiene espacios disponibles. Agrega una tarea extra o libera un espacio.");
    return;
  }

  task.preferredDayIndex = dayIndex;
  updateParentSubtaskFromTask(task);
  saveAndRender();
}

function hasRoomForMovedTask(personId, dayIndex, movingTaskId) {
  const schedule = buildSchedule();
  const personSchedule = schedule.byPerson[personId];
  if (!personSchedule) return false;
  const usedPending = personSchedule.days[dayIndex].filter((task) => task.id !== movingTaskId).length;
  const usedCompleted = personSchedule.completedDays[dayIndex].length;
  return usedPending + usedCompleted < getDayCapacity(personId, dayIndex);
}

function updateParentSubtaskFromTask(task) {
  const parentId = task.parentId || task.generatedBy;
  if (!parentId) return;
  const parentTask = state.tasks.find((item) => item.id === parentId && item.type === "supertask");
  if (!parentTask) return;
  const children = state.tasks
    .filter((item) => item.parentId === parentTask.id)
    .sort((a, b) => a.order - b.order);
  parentTask.subtasks = children.map((child, index) => ({
    title: child.title,
    detail: child.detail,
    assigneeId: child.assigneeId,
    preferredDayIndex: child.preferredDayIndex,
    priority: child.priority,
    order: child.order || index + 1,
  }));
  syncSavedTemplatesFromSupertask(getActiveCalendar(), parentTask, parentTask.title);
}

function renderQueue() {
  elements.queueView.replaceChildren();
  const schedule = buildSchedule();

  const unassigned = state.tasks
    .filter((task) => !task.completed && !task.assigneeId && task.type !== "supertask")
    .sort(sortTasks);

  const overflow = schedule.overflow.sort(sortTasks);

  elements.queueView.append(
    createQueueColumn("Sin asignar", unassigned, "No hay tareas sin responsable."),
    createQueueColumn("En espera por capacidad", overflow, "No hay tareas fuera de la semana.")
  );
}

function renderSaved() {
  elements.savedView.replaceChildren();
  normalizeSavedTemplatesInCalendar(getActiveCalendar());
  const tasks = state.savedTasks.filter((item) => !isSupertaskTemplate(item));
  const supertasks = state.savedTasks.filter(isSupertaskTemplate);

  elements.savedView.append(
    createLibraryColumn("Tareas guardadas", tasks, "No hay tareas guardadas."),
    createLibraryColumn("Supertareas guardadas", supertasks, "No hay supertareas guardadas.")
  );
}

function renderRepository() {
  elements.repositoryView.replaceChildren();
  const column = document.createElement("section");
  column.className = "repository-item";
  const heading = document.createElement("h2");
  heading.textContent = `Repositorio (${state.repository.length})`;
  const list = document.createElement("div");
  list.className = "repository-list";

  if (!state.repository.length) {
    list.appendChild(emptyState("Las tareas listas o eliminadas apareceran aqui."));
  } else {
    state.repository
      .slice()
      .sort((a, b) => new Date(b.repositoryAt || b.completedAt || b.deletedAt) - new Date(a.repositoryAt || a.completedAt || a.deletedAt))
      .forEach((item) => list.appendChild(createRepositoryCard(item)));
  }

  column.append(heading, list);
  elements.repositoryView.appendChild(column);
}

function createQueueColumn(title, tasks, emptyMessage) {
  const column = document.createElement("section");
  column.className = "queue-column";
  const heading = document.createElement("h2");
  heading.textContent = `${title} (${tasks.length})`;
  const list = document.createElement("div");
  list.className = "queue-list";

  if (tasks.length) {
    tasks.forEach((task) => list.appendChild(createTaskCard(task, "queue")));
  } else {
    list.appendChild(emptyState(emptyMessage));
  }

  column.append(heading, list);
  return column;
}

function createLibraryColumn(title, templates, emptyMessage) {
  const column = document.createElement("section");
  column.className = "library-column";
  const heading = document.createElement("h2");
  heading.textContent = `${title} (${templates.length})`;
  const list = document.createElement("div");
  list.className = "library-list";

  if (!templates.length) {
    list.appendChild(emptyState(emptyMessage));
  } else {
    templates.forEach((template) => list.appendChild(createTemplateCard(template)));
  }

  column.append(heading, list);
  return column;
}

function createTaskCard(task, location, dayIndex = null) {
  const node = elements.template.content.firstElementChild.cloneNode(true);
  node.classList.add(task.priority);
  node.classList.toggle("supertask", task.type === "supertask");
  node.classList.toggle("done", task.completed);
  node.dataset.taskId = task.id;
  node.dataset.assigneeId = task.assigneeId || "";
  if (location === "queue" && isStale(task)) {
    node.classList.add("stale");
  }

  if (location === "scheduled" && !task.completed && task.assigneeId) {
    node.draggable = true;
    node.classList.add("draggable-task");
    node.addEventListener("dragstart", (event) => {
      if (event.target instanceof Element && event.target.closest("button, input, select, textarea")) {
        event.preventDefault();
        return;
      }
      activeDraggedTask = { taskId: task.id, assigneeId: task.assigneeId };
      node.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/json", JSON.stringify({
        taskId: task.id,
        assigneeId: task.assigneeId,
      }));
      event.dataTransfer.setData("text/plain", task.id);
    });
    node.addEventListener("dragend", () => {
      activeDraggedTask = null;
      node.classList.remove("dragging");
      document.querySelectorAll(".day-column.drag-over").forEach((column) => column.classList.remove("drag-over"));
    });
  }

  node.querySelector(".task-title").textContent = task.title;
  node.querySelector(".task-detail").textContent = task.detail;
  renderSubtaskPreview(node.querySelector(".subtask-preview"), task);

  const meta = node.querySelector(".task-meta");
  addPill(meta, PRIORITY_LABELS[task.priority], task.priority);
  addPill(meta, task.assigneeId ? getPersonName(task.assigneeId) : "Sin asignar");
  addPill(meta, task.completed ? `Lista ${formatDate(task.completedAt)}` : `${daysWaiting(task)} dias`, task.completed ? "done" : location === "queue" && isStale(task) ? "stale" : "");
  addPill(meta, TYPE_LABELS[task.type], task.type === "supertask" ? "super" : "");
  if (Number.isInteger(task.preferredDayIndex)) addPill(meta, DAY_NAMES[task.preferredDayIndex]);
  if (task.parentId) addPill(meta, `De: ${getParentTitle(task.parentId)}`, "super");

  const completeButton = node.querySelector(".complete-action");
  const editButton = node.querySelector(".edit-action");
  const removeButton = node.querySelector(".remove-action");

  if (task.completed) {
    completeButton.remove();
    editButton.remove();
    removeButton.remove();
  } else {
    if (!isCoordinator() && task.assigneeId !== getCurrentUser()?.id) {
      completeButton.remove();
      editButton.remove();
      removeButton.remove();
    } else {
      completeButton.addEventListener("click", () => completeTask(task.id, node, dayIndex));
      editButton.addEventListener("click", () => openEditor(task.id));
      if (isCoordinator()) {
        removeButton.addEventListener("click", () => removeTask(task.id));
      } else {
        removeButton.remove();
      }
    }
  }

  const saveButton = node.querySelector(".save-action");
  if (isCoordinator()) {
    saveButton.addEventListener("click", () => {
      saveTemplateFromTask(task);
      saveAndRender();
    });
  } else {
    saveButton.remove();
  }

  return node;
}

function createTemplateCard(template) {
  const card = document.createElement("article");
  card.className = "library-card";
  const templateType = getTemplateKind(template);
  const title = document.createElement("strong");
  title.className = "task-title";
  title.textContent = getTemplateTitle(template.title, templateType);

  const detail = document.createElement("p");
  detail.className = "task-detail";
  detail.textContent = template.detail;

  const preview = document.createElement("div");
  preview.className = "subtask-preview";
  renderSubtaskPreview(preview, template);

  const meta = document.createElement("div");
  meta.className = "task-meta";
  addPill(meta, PRIORITY_LABELS[template.priority], template.priority);
  addPill(meta, TYPE_LABELS[templateType], templateType === "supertask" ? "super" : "");
  addPill(meta, `Editada ${formatDate(template.updatedAt || template.createdAt)}`);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const use = actionButton("Usar", () => useTemplate(template.id));
  const copy = actionButton("Copiar", () => duplicateTemplate(template.id));
  const edit = actionButton("Editar", () => openTemplateEditor(template.id));
  const remove = actionButton("Eliminar", () => removeTemplate(template.id), "remove-template");
  actions.append(use, copy, edit, remove);

  card.append(title, detail, preview, meta, actions);
  return card;
}

function createRepositoryCard(item) {
  const card = document.createElement("article");
  card.className = "repository-card";
  const title = document.createElement("strong");
  title.className = "task-title";
  title.textContent = item.title;

  const detail = document.createElement("p");
  detail.className = "task-detail";
  detail.textContent = item.detail;

  const preview = document.createElement("div");
  preview.className = "subtask-preview";
  renderSubtaskPreview(preview, item);

  const data = document.createElement("dl");
  addDefinition(data, "Estado", REPOSITORY_STATUS[item.repositoryStatus] || "Archivada");
  addDefinition(data, "Tipo", TYPE_LABELS[item.type]);
  addDefinition(data, "Prioridad", PRIORITY_LABELS[item.priority]);
  addDefinition(data, "Responsable", item.assigneeName || "Sin asignar");
  addDefinition(data, "Ingreso", formatDate(item.createdAt));
  if (item.completedAt) addDefinition(data, "Completada", formatDate(item.completedAt));
  if (item.deletedAt) addDefinition(data, "Eliminada", formatDate(item.deletedAt));
  if (item.repositoryEditedAt) addDefinition(data, "Editada", formatDate(item.repositoryEditedAt));
  if (item.reopenedAt) addDefinition(data, "Reabierta", formatDate(item.reopenedAt));
  addDefinition(data, "Repositorio", formatDate(item.repositoryAt));
  if (item.parentTitle) addDefinition(data, "Supertarea", item.parentTitle);

  card.append(title, detail, preview, data);

  if (isCoordinator() && item.repositoryStatus === "completed") {
    const actions = document.createElement("div");
    actions.className = "task-actions";
    const edit = actionButton("Editar", () => openRepositoryEditor(item.repositoryEntryId));
    const reopen = actionButton("Reabrir", () => reopenRepositoryTask(item.repositoryEntryId));
    actions.append(edit, reopen);
    card.appendChild(actions);
  }

  return card;
}

function openRepositoryEditor(repositoryEntryId) {
  if (!isCoordinator()) return;
  const item = findRepositoryItem(repositoryEntryId);
  if (!item || item.repositoryStatus !== "completed") return;

  elements.repositoryEditId.value = item.repositoryEntryId;
  elements.repositoryEditTitle.value = item.title;
  elements.repositoryEditDetail.value = item.detail;
  elements.repositoryEditAssignee.innerHTML = getAssigneeOptionsHtml();
  elements.repositoryEditAssignee.value = item.assigneeId || "";
  elements.repositoryEditPriority.value = item.priority || "normal";
  const dayIndex = Number.isInteger(item.completedDayIndex) ? item.completedDayIndex : item.preferredDayIndex;
  elements.repositoryEditDay.value = Number.isInteger(dayIndex) ? String(dayIndex) : "auto";
  elements.repositoryEditDialog.showModal();
}

function saveRepositoryEdit(reopenAfterSave = false) {
  if (!isCoordinator()) return;
  const item = findRepositoryItem(elements.repositoryEditId.value);
  if (!item || item.repositoryStatus !== "completed") return;

  item.title = elements.repositoryEditTitle.value.trim() || item.title;
  item.detail = elements.repositoryEditDetail.value.trim();
  item.assigneeId = elements.repositoryEditAssignee.value;
  item.assigneeName = getAccountName(item.assigneeId);
  item.priority = elements.repositoryEditPriority.value;
  item.preferredDayIndex = parsePreferredDay(elements.repositoryEditDay.value);
  item.completedDayIndex = item.preferredDayIndex;
  item.repositoryEditedAt = new Date().toISOString();

  if (reopenAfterSave) {
    reopenRepositoryTask(item.repositoryEntryId);
    return;
  }

  elements.repositoryEditDialog.close();
  saveAndRender();
}

function reopenRepositoryTask(repositoryEntryId) {
  if (!isCoordinator()) return;
  const item = findRepositoryItem(repositoryEntryId);
  if (!item || item.repositoryStatus !== "completed") return;

  const dayIndex = Number.isInteger(item.completedDayIndex) ? item.completedDayIndex : item.preferredDayIndex;
  const originalTaskId = item.originalTaskId || item.id;
  let task = state.tasks.find((candidate) => candidate.id === originalTaskId);

  if (task) {
    task.title = item.title;
    task.detail = item.detail;
    task.assigneeId = item.assigneeId || "";
    task.priority = item.priority || "normal";
    task.preferredDayIndex = Number.isInteger(dayIndex) ? dayIndex : null;
    task.completed = false;
    task.completedAt = "";
    task.completedDayIndex = null;
  } else {
    task = createTask({
      ...item,
      id: originalTaskId || createId(),
      completed: false,
      completedAt: "",
      completedDayIndex: null,
      preferredDayIndex: Number.isInteger(dayIndex) ? dayIndex : null,
      createdAt: item.createdAt || toDateInput(new Date()),
    });
    state.tasks.push(task);
  }

  item.repositoryStatus = "reopened";
  item.reopenedAt = new Date().toISOString();
  item.reopenedTaskId = task.id;
  elements.repositoryEditDialog.close();
  if (elements.hubDetailDialog.open) elements.hubDetailDialog.close();
  saveAndRender();
  setView("board");
}

function findRepositoryItem(repositoryEntryId) {
  return state.repository.find((item) => item.repositoryEntryId === repositoryEntryId);
}

function getAssigneeOptionsHtml() {
  return [
    `<option value="">Sin asignar</option>`,
    ...state.people.map((person) => `<option value="${person.id}">${escapeHtml(person.name)}</option>`),
  ].join("");
}

function buildSchedule() {
  const byPerson = Object.fromEntries(
    state.people.map((person) => [
      person.id,
      {
        days: DAY_NAMES.map(() => []),
        completedDays: DAY_NAMES.map(() => []),
      },
    ])
  );
  const overflow = [];

  for (const person of state.people) {
    state.tasks
      .filter((task) => task.completed && task.assigneeId === person.id && task.type !== "supertask")
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
      .forEach((task) => {
        const dayIndex = Number.isInteger(task.completedDayIndex)
          ? task.completedDayIndex
          : getWeekdayIndex(task.completedAt);
        byPerson[person.id].completedDays[dayIndex].push(task);
      });

    const activeTasks = state.tasks
      .filter((task) => !task.completed && task.assigneeId === person.id && task.type !== "supertask")
      .sort(sortTasks);

    activeTasks.forEach((task) => {
      const dayIndex = findPlacementDay(byPerson[person.id], person.id, task);
      if (dayIndex === -1) {
        overflow.push(task);
      } else {
        byPerson[person.id].days[dayIndex].push(task);
      }
    });
  }

  return { byPerson, overflow };
}

function getPersonStats(personId) {
  const tasks = state.tasks.filter((task) => task.assigneeId === personId && task.type !== "supertask");
  const completed = tasks.filter((task) => task.completed).length;
  const pending = tasks.length - completed;
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  return { total: tasks.length, completed, pending, percent };
}

function findPlacementDay(personSchedule, personId, task) {
  if (Number.isInteger(task.preferredDayIndex)) {
    const used = personSchedule.days[task.preferredDayIndex].length +
      personSchedule.completedDays[task.preferredDayIndex].length;
    return used < getDayCapacity(personId, task.preferredDayIndex) ? task.preferredDayIndex : -1;
  }

  return findNextOpenDay(personSchedule, personId);
}

function findNextOpenDay(personSchedule, personId) {
  for (let dayIndex = 0; dayIndex < DAY_NAMES.length; dayIndex += 1) {
    const used = personSchedule.days[dayIndex].length + personSchedule.completedDays[dayIndex].length;
    if (used < getDayCapacity(personId, dayIndex)) return dayIndex;
  }
  return -1;
}

function getDayCapacity(personId, dayIndex) {
  return MAX_PER_DAY + getExtraSlots(personId, dayIndex);
}

function getExtraSlots(personId, dayIndex) {
  return Number(state.extraSlots?.[personId]?.[dayIndex] || 0);
}

function addExtraSlot(personId, dayIndex) {
  if (!state.extraSlots[personId]) state.extraSlots[personId] = [0, 0, 0, 0, 0];
  state.extraSlots[personId][dayIndex] = Math.min(6, getExtraSlots(personId, dayIndex) + 1);
  saveAndRender();
}

function removeExtraSlot(personId, dayIndex) {
  if (!state.extraSlots[personId]) state.extraSlots[personId] = [0, 0, 0, 0, 0];
  state.extraSlots[personId][dayIndex] = Math.max(0, getExtraSlots(personId, dayIndex) - 1);
  saveAndRender();
}

function sortTasks(a, b) {
  const priorityDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  if (priorityDiff !== 0) return priorityDiff;
  const parentDiff = Number(Boolean(a.parentId)) - Number(Boolean(b.parentId));
  if (parentDiff !== 0) return parentDiff;
  return new Date(a.createdAt) - new Date(b.createdAt);
}

function openEditor(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || task.completed) return;
  if (!isCoordinator() && task.assigneeId !== getCurrentUser()?.id) return;
  if (isCoordinator() && (task.type === "supertask" || task.parentId || task.generatedBy)) {
    openSupertaskManager(task.type === "supertask" ? task.id : task.parentId || task.generatedBy);
    return;
  }

  elements.editTaskId.value = task.id;
  elements.editTitle.value = task.title;
  elements.editDetail.value = task.detail;
  elements.editAssignee.value = task.assigneeId;
  elements.editPriority.value = task.priority;
  renderSubtaskRows(elements.editSubtaskRows, task.subtasks || []);
  elements.editSubtaskWrap.classList.toggle("hidden", task.type !== "supertask");
  elements.editAssigneeWrap.classList.toggle("hidden", task.type === "supertask");
  elements.editTitle.disabled = !isCoordinator();
  elements.editAssignee.disabled = !isCoordinator();
  elements.editPriority.disabled = !isCoordinator();
  elements.editSubtaskWrap.classList.toggle("hidden", !isCoordinator() || task.type !== "supertask");
  elements.editDialog.showModal();
}

function openTemplateEditor(templateId, calendarId = getActiveCalendar().id, returnToHub = false) {
  const calendar = state.calendars.find((item) => item.id === calendarId) || getActiveCalendar();
  const template = calendar.savedTasks.find((item) => item.id === templateId);
  if (!template) return;
  if (elements.hubDetailDialog.open) elements.hubDetailDialog.close();

  const templateType = getTemplateKind(template);
  template.type = templateType;
  template.subtasks = templateType === "supertask" ? normalizeSubtasks(template.subtasks || []) : [];
  templateEditCalendarId = calendar.id;
  templateEditReturnToHub = returnToHub;
  elements.templateDialogTitle.textContent = templateType === "supertask"
    ? "Editar supertarea guardada"
    : "Editar tarea guardada";
  elements.templateId.value = template.id;
  elements.templateTitle.value = getTemplateTitle(template.title, templateType);
  elements.templateDetail.value = template.detail;
  elements.templatePriority.value = template.priority;
  renderSubtaskRows(elements.templateSubtaskRows, template.subtasks || []);
  elements.templateForm.querySelector(`input[name="templateType"][value="${templateType}"]`).checked = true;
  setTemplateTypeControlVisible(false);
  updateTemplateTypeFields();
  elements.templateDialog.showModal();
}

function setTemplateTypeControlVisible(visible) {
  elements.templateTypeChooser.classList.toggle("hidden", !visible);
}

function getTemplateEditCalendar() {
  return state.calendars.find((calendar) => calendar.id === templateEditCalendarId) || getActiveCalendar();
}

function applySavedSupertaskToCurrentCalendar(template, previousTitle = "") {
  const calendar = getCurrentCalendar();
  const supertask = findLinkedSupertask(calendar, template, previousTitle);
  if (!supertask) return;

  const editedRows = normalizeSubtasks(template.subtasks || []);
  const previousChildren = calendar.tasks
    .filter((task) => task.parentId === supertask.id)
    .sort((a, b) => a.order - b.order);
  const keptIds = new Set();

  supertask.title = template.title;
  supertask.detail = template.detail;
  supertask.priority = template.priority;
  supertask.subtasks = editedRows.map(stripRuntimeSubtaskFields);

  editedRows.forEach((row, index) => {
    const existing = previousChildren[index];
    if (existing) {
      existing.title = row.title;
      existing.detail = row.detail || `Parte de supertarea: ${supertask.title}`;
      existing.assigneeId = row.assigneeId || "";
      existing.priority = row.priority || supertask.priority;
      existing.preferredDayIndex = row.preferredDayIndex;
      existing.order = index + 1;
      keptIds.add(existing.id);
      return;
    }

    const created = createTask({
      title: row.title,
      detail: row.detail || `Parte de supertarea: ${supertask.title}`,
      assigneeId: row.assigneeId || "",
      priority: row.priority || supertask.priority,
      createdAt: supertask.createdAt,
      preferredDayIndex: row.preferredDayIndex,
      type: "task",
      parentId: supertask.id,
      generatedBy: supertask.id,
      order: index + 1,
    });
    calendar.tasks.push(created);
    keptIds.add(created.id);
  });

  calendar.tasks = calendar.tasks.filter((task) => task.parentId !== supertask.id || keptIds.has(task.id));
  template.sourceTaskId = supertask.id;
  syncSavedTemplatesFromSupertask(calendar, supertask, previousTitle);
}

function findLinkedSupertask(calendar, template, previousTitle = "") {
  if (!calendar || !template) return null;
  if (template.sourceTaskId) {
    const linked = calendar.tasks.find((task) => task.id === template.sourceTaskId && task.type === "supertask");
    if (linked) return linked;
  }
  const lookupTitle = previousTitle || template.title;
  return calendar.tasks.find((task) =>
    task.type === "supertask" &&
    normalizeText(task.title) === normalizeText(lookupTitle)
  ) || null;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function syncSavedTemplatesFromSupertask(calendar, supertask, previousTitle = "") {
  if (!calendar || !supertask) return;
  const rows = getSupertaskRowsFromCalendar(calendar, supertask);
  const previousKey = normalizeText(previousTitle);
  const currentKey = normalizeText(supertask.title);
  const calendarsToSync = state.calendars.filter((item) => item.id === calendar.id || item.savedTasks.some((template) =>
    isSupertaskTemplate(template) &&
    (
      template.sourceTaskId === supertask.id ||
      (!template.sourceTaskId && [previousKey, currentKey].includes(normalizeText(template.title)))
    )
  ));

  calendarsToSync.forEach((targetCalendar) => {
    targetCalendar.savedTasks = targetCalendar.savedTasks.map((template) => {
      if (!isSupertaskTemplate(template)) return template;
      const templateKey = normalizeText(template.title);
      const linkedById = template.sourceTaskId && template.sourceTaskId === supertask.id;
      const linkedByTitle = !template.sourceTaskId && (templateKey === previousKey || templateKey === currentKey);
      if (!linkedById && !linkedByTitle) return template;

      return {
        ...template,
        title: supertask.title,
        detail: supertask.detail,
        priority: supertask.priority,
        type: "supertask",
        sourceTaskId: supertask.id,
        subtasks: rows,
        updatedAt: new Date().toISOString(),
      };
    });
  });
}

function getSupertaskRowsFromCalendar(calendar, supertask) {
  const children = calendar.tasks
    .filter((task) => task.parentId === supertask.id)
    .sort((a, b) => a.order - b.order);
  if (children.length) {
    return children.map((task, index) => ({
      title: task.title,
      detail: task.detail,
      assigneeId: task.assigneeId,
      preferredDayIndex: task.preferredDayIndex,
      priority: task.priority,
      order: task.order || index + 1,
    }));
  }
  return normalizeSubtasks(supertask.subtasks || []);
}

function openSupertaskManager(supertaskId) {
  const supertask = state.tasks.find((task) => task.id === supertaskId && task.type === "supertask");
  if (!supertask) return;

  const children = state.tasks
    .filter((task) => task.parentId === supertask.id)
    .sort((a, b) => a.order - b.order);

  elements.supertaskManagerId.value = supertask.id;
  elements.supertaskManagerName.value = supertask.title;
  elements.supertaskManagerDetail.value = supertask.detail || "";
  elements.supertaskManagerPriority.value = supertask.priority || "normal";
  elements.supertaskManagerTitle.textContent = supertask.title;
  renderSubtaskRows(elements.supertaskManagerRows, children);
  elements.supertaskManagerDialog.showModal();
}

function saveSupertaskManager() {
  const supertask = state.tasks.find((task) => task.id === elements.supertaskManagerId.value);
  if (!supertask) return;

  const previousTitle = supertask.title;
  const previousChildren = state.tasks
    .filter((task) => task.parentId === supertask.id)
    .sort((a, b) => a.order - b.order);
  const editedRows = collectSubtaskRows(elements.supertaskManagerRows);
  const keptIds = new Set(editedRows.map((row) => row.id).filter(Boolean));

  supertask.title = elements.supertaskManagerName.value.trim() || supertask.title;
  supertask.detail = elements.supertaskManagerDetail.value.trim();
  supertask.priority = elements.supertaskManagerPriority.value;
  supertask.subtasks = editedRows.map(stripRuntimeSubtaskFields);

  editedRows.forEach((row, index) => {
    const existing = row.id ? state.tasks.find((task) => task.id === row.id) : previousChildren[index];
    if (existing) {
      existing.title = row.title;
      existing.detail = row.detail || `Parte de supertarea: ${supertask.title}`;
      existing.assigneeId = row.assigneeId || "";
      existing.priority = row.priority || supertask.priority;
      existing.preferredDayIndex = row.preferredDayIndex;
      existing.order = index + 1;
      if (existing.completed && Number.isInteger(row.preferredDayIndex)) {
        existing.completedDayIndex = row.preferredDayIndex;
      }
      keptIds.add(existing.id);
    } else {
      const created = createTask({
        title: row.title,
        detail: row.detail || `Parte de supertarea: ${supertask.title}`,
        assigneeId: row.assigneeId || "",
        priority: row.priority || supertask.priority,
        createdAt: supertask.createdAt,
        preferredDayIndex: row.preferredDayIndex,
        type: "task",
        parentId: supertask.id,
        generatedBy: supertask.id,
        order: index + 1,
      });
      state.tasks.push(created);
      keptIds.add(created.id);
    }
  });

  previousChildren
    .filter((task) => !keptIds.has(task.id))
    .forEach((task) => {
      addToRepository(task, "deleted", new Date().toISOString());
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
    });

  syncSavedTemplatesFromSupertask(getActiveCalendar(), supertask, previousTitle);
  elements.supertaskManagerDialog.close();
  saveAndRender();
}

function useTemplate(templateId) {
  const template = state.savedTasks.find((item) => item.id === templateId);
  if (!template) return;

  addTaskSet({
    title: template.title,
    detail: template.detail,
    assigneeId: template.type === "supertask" ? "" : elements.taskAssignee.value || "",
    priority: template.priority,
    createdAt: elements.taskCreatedAt.value || toDateInput(new Date()),
    preferredDayIndex: getSelectedPreferredDay(),
    type: template.type,
    subtasks: normalizeSubtasks(template.subtasks || []),
  });
  saveAndRender();
}

function duplicateTemplate(templateId, calendarId = getActiveCalendar().id, returnToHub = false) {
  const calendar = state.calendars.find((item) => item.id === calendarId) || getActiveCalendar();
  const template = calendar.savedTasks.find((item) => item.id === templateId);
  if (!template) return;
  const type = template.type === "supertask" ? "supertask" : "task";
  calendar.savedTasks.push({
    ...template,
    id: createId(),
    title: `${getTemplateTitle(template.title, type)} (copia)`,
    type,
    sourceTaskId: "",
    subtasks: type === "supertask" ? normalizeSubtasks(template.subtasks || []) : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  saveState();
  showSaveAnimation(type === "supertask" ? "Supertarea copiada" : "Tarea copiada");
  if (returnToHub) {
    renderCalendarHub();
  } else {
    render();
  }
}

function completeTask(taskId, cardNode, dayIndex = null) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || task.completed) return;

  if (cardNode) {
    cardNode.classList.add("completing");
    cardNode.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
  }

  window.setTimeout(() => {
    markTaskCompleted(taskId, dayIndex);
    saveAndRender();
  }, COMPLETE_ANIMATION_MS);
}

function markTaskCompleted(taskId, dayIndex = null) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task || task.completed) return;

  const now = new Date().toISOString();
  task.completed = true;
  task.completedAt = now;
  task.completedDayIndex = Number.isInteger(dayIndex) ? dayIndex : getWeekdayIndex(now);
  addToRepository(task, "completed", now);
}

function removeTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  const now = new Date().toISOString();
  if (task.type === "supertask") {
    const related = state.tasks.filter((item) => item.id === taskId || item.parentId === taskId);
    const generatedCount = related.length - 1;
    const suffix = generatedCount ? ` Tambien se eliminaran ${generatedCount} tareas internas activas.` : "";
    if (!confirm(`Deseas eliminar esta supertarea?${suffix}`)) return;
    related.forEach((item) => addToRepository(item, "deleted", now));
    state.tasks = state.tasks.filter((item) => item.id !== taskId && item.parentId !== taskId);
  } else {
    addToRepository(task, "deleted", now);
    state.tasks = state.tasks.filter((item) => item.id !== taskId);
  }
  saveAndRender();
}

function addToRepository(task, status, date) {
  const snapshot = {
    ...task,
    repositoryEntryId: createId(),
    originalTaskId: task.originalTaskId || task.id,
    subtasks: normalizeSubtasks(task.subtasks || []),
    repositoryStatus: status,
    completed: status === "completed" || task.completed,
    completedAt: status === "completed" ? date : task.completedAt || "",
    deletedAt: status === "deleted" ? date : "",
    repositoryAt: date,
    assigneeName: getPersonName(task.assigneeId),
    parentTitle: task.parentId ? getParentTitle(task.parentId) : "",
  };
  state.repository.push(snapshot);
}

function removePerson(personId) {
  const person = state.accounts.find((item) => item.id === personId);
  if (!person) return;
  if (person.id === getCurrentUser()?.id) {
    alert("No puedes eliminar tu propia cuenta activa.");
    return;
  }
  if (person.role === "coordinator" && state.accounts.filter((account) => account.role === "coordinator").length <= 1) {
    alert("Debe existir al menos un coordinador.");
    return;
  }
  if (!confirm(`Deseas eliminar el perfil de ${person.name}? Sus tareas quedaran sin asignar.`)) return;

  state.accounts = state.accounts.filter((item) => item.id !== personId);
  delete state.extraSlots[personId];
  state.tasks = state.tasks.map((task) =>
    task.assigneeId === personId ? { ...task, assigneeId: "" } : task
  );
  state.savedTasks = state.savedTasks.map((template) => ({
    ...template,
    subtasks: normalizeSubtasks(template.subtasks).map((subtask) =>
      subtask.assigneeId === personId ? { ...subtask, assigneeId: "" } : subtask
    ),
  }));
  saveAndRender();
}

function removeTemplate(templateId) {
  if (!confirm("Deseas eliminar esta tarea guardada?")) return;
  state.savedTasks = state.savedTasks.filter((template) => template.id !== templateId);
  saveAndRender();
}

function saveTemplateFromTask(task) {
  const templateSource = getTemplateSourceFromTask(task);
  const template = createSavedTemplate(templateSource);
  getTemplateTargetCalendar(template.type).savedTasks.push(template);
  showSaveAnimation(template.type === "supertask" ? "Supertarea guardada" : "Tarea guardada");
}

function getTemplateSourceFromTask(task) {
  const parentId = task.type === "supertask" ? task.id : task.parentId || task.generatedBy || "";
  const parentTask = parentId
    ? state.tasks.find((item) => item.id === parentId && item.type === "supertask")
    : null;

  if (!parentTask) return task;

  const generatedSubtasks = state.tasks
    .filter((item) => item.parentId === parentTask.id && item.type !== "supertask")
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({
      title: item.title,
      detail: item.detail,
      assigneeId: item.assigneeId,
      preferredDayIndex: item.preferredDayIndex,
      priority: item.priority,
      order: item.order || index + 1,
    }));

  return {
    ...parentTask,
    type: "supertask",
    sourceTaskId: parentTask.id,
    subtasks: generatedSubtasks.length
      ? generatedSubtasks
      : normalizeSubtasks(parentTask.subtasks || []),
  };
}

function syncGeneratedSubtasks(parentTask) {
  const generated = state.tasks
    .filter((task) => task.parentId === parentTask.id)
    .sort((a, b) => a.order - b.order);

  parentTask.subtasks.forEach((subtask, index) => {
    const existing = generated[index];
    if (existing) {
      existing.title = subtask.title;
      existing.detail = subtask.detail || `Parte de supertarea: ${parentTask.title}`;
      existing.assigneeId = subtask.assigneeId || "";
      existing.priority = subtask.priority || parentTask.priority;
      existing.preferredDayIndex = Number.isInteger(subtask.preferredDayIndex)
        ? subtask.preferredDayIndex
        : parentTask.preferredDayIndex;
      existing.order = index + 1;
    } else {
      state.tasks.push(
        createTask({
          title: subtask.title,
          detail: subtask.detail || `Parte de supertarea: ${parentTask.title}`,
          assigneeId: subtask.assigneeId || "",
          priority: subtask.priority || parentTask.priority,
          createdAt: parentTask.createdAt,
          preferredDayIndex: Number.isInteger(subtask.preferredDayIndex)
            ? subtask.preferredDayIndex
            : parentTask.preferredDayIndex,
          type: "task",
          parentId: parentTask.id,
          generatedBy: parentTask.id,
          order: index + 1,
        })
      );
    }
  });

  generated.slice(parentTask.subtasks.length).forEach((task) => {
    addToRepository(task, "deleted", new Date().toISOString());
    state.tasks = state.tasks.filter((item) => item.id !== task.id);
  });
}

function createSubtaskEditorRow(subtask = {}) {
  const row = document.createElement("div");
  row.className = "subtask-editor-row";
  if (subtask.id) row.dataset.taskId = subtask.id;

  const title = document.createElement("input");
  title.className = "subtask-title-input";
  title.type = "text";
  title.maxLength = 90;
  title.placeholder = "Tarea interna";
  title.value = subtask.title || "";

  const assignee = document.createElement("select");
  assignee.className = "subtask-assignee";
  assignee.innerHTML = [
    `<option value="">Sin asignar</option>`,
    ...state.people.map((person) => `<option value="${person.id}">${escapeHtml(person.name)}</option>`),
  ].join("");
  assignee.value = subtask.assigneeId || "";

  const day = document.createElement("select");
  day.className = "subtask-day";
  day.innerHTML = [
    `<option value="auto">Dia auto</option>`,
    ...DAY_NAMES.map((dayName, index) => `<option value="${index}">${dayName}</option>`),
  ].join("");
  day.value = Number.isInteger(subtask.preferredDayIndex) ? String(subtask.preferredDayIndex) : "auto";

  const priority = document.createElement("select");
  priority.className = "subtask-priority";
  priority.innerHTML = `
    <option value="high">Roja</option>
    <option value="medium">Naranja</option>
    <option value="normal">Verde</option>
  `;
  priority.value = subtask.priority || "normal";

  const detail = document.createElement("textarea");
  detail.className = "subtask-detail-input";
  detail.rows = 2;
  detail.maxLength = 220;
  detail.placeholder = "Detalle de esta interna";
  detail.value = subtask.detail || "";

  const remove = document.createElement("button");
  remove.className = "small-button remove-subtask";
  remove.type = "button";
  remove.textContent = "Quitar";
  remove.addEventListener("click", () => row.remove());

  row.append(title, assignee, day, priority, remove, detail);
  return row;
}

function renderSubtaskRows(container, subtasks) {
  container.replaceChildren();
  const rows = normalizeSubtasks(subtasks);
  const source = rows.length ? rows : [{}];
  source.forEach((subtask) => container.appendChild(createSubtaskEditorRow(subtask)));
}

function collectSubtaskRows(container) {
  return Array.from(container.querySelectorAll(".subtask-editor-row"))
    .map((row, index) => ({
      title: row.querySelector(".subtask-title-input").value.trim(),
      id: row.dataset.taskId || "",
      assigneeId: row.querySelector(".subtask-assignee").value,
      preferredDayIndex: parsePreferredDay(row.querySelector(".subtask-day").value),
      priority: row.querySelector(".subtask-priority").value,
      detail: row.querySelector(".subtask-detail-input").value.trim(),
      order: index + 1,
    }))
    .filter((subtask) => subtask.title);
}

function stripRuntimeSubtaskFields(subtask) {
  return {
    title: subtask.title,
    detail: subtask.detail,
    assigneeId: subtask.assigneeId,
    preferredDayIndex: subtask.preferredDayIndex,
    priority: subtask.priority,
    order: subtask.order,
  };
}

function getSelectedPreferredDay() {
  const selected = elements.taskForm.querySelector('input[name="preferredDay"]:checked');
  return parsePreferredDay(selected?.value || "auto");
}

function parsePreferredDay(value) {
  if (value === "auto" || value === null || typeof value === "undefined") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < DAY_NAMES.length ? parsed : null;
}

function normalizeSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .map((subtask, index) => {
      if (typeof subtask === "string") {
        return {
          title: subtask,
          detail: "",
          assigneeId: "",
          preferredDayIndex: null,
          priority: "normal",
          order: index + 1,
        };
      }
      return {
        title: subtask.title || "",
        detail: subtask.detail || "",
        assigneeId: subtask.assigneeId || "",
        preferredDayIndex: Number.isInteger(subtask.preferredDayIndex) ? subtask.preferredDayIndex : null,
        priority: subtask.priority || "normal",
        order: subtask.order || index + 1,
      };
    })
    .filter((subtask) => subtask.title);
}

function getPersonName(personId) {
  return state.people.find((person) => person.id === personId)?.name || "Sin asignar";
}

function getParentTitle(parentId) {
  return state.tasks.find((task) => task.id === parentId)?.title ||
    state.repository.find((task) => task.id === parentId)?.title ||
    "Supertarea";
}

function daysWaiting(task) {
  const created = new Date(`${task.createdAt}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today - created;
  return Math.max(0, Math.floor(diff / 86400000));
}

function isStale(task) {
  return daysWaiting(task) > STALE_DAYS;
}

function saveAndRender() {
  saveState();
  render();
}

function showSaveAnimation(message = "Guardado") {
  document.querySelector(".save-feedback")?.remove();
  const feedback = document.createElement("div");
  feedback.className = "save-feedback";

  const disk = document.createElement("span");
  disk.className = "save-disk";
  disk.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.textContent = message;

  feedback.append(disk, text);
  document.body.appendChild(feedback);
  window.setTimeout(() => feedback.remove(), 1400);
}

function saveState() {
  const snapshot = serializeState();
  if (!restoringUndo && snapshot !== lastSavedSnapshot) {
    undoStack.push(lastSavedSnapshot);
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  }
  localStorage.setItem(STORAGE_KEY, snapshot);
  lastSavedSnapshot = snapshot;
}

function serializeState() {
  return JSON.stringify({
    accounts: state.accounts,
    months: state.months,
    calendars: state.calendars,
    activeCalendarId: state.activeCalendarId,
  });
}

function undoLastChange() {
  const snapshot = undoStack.pop();
  if (!snapshot) return;
  try {
    const restoredState = normalizeState(JSON.parse(snapshot));
    restoringUndo = true;
    state.accounts = restoredState.accounts;
    state.months = restoredState.months;
    state.calendars = restoredState.calendars;
    state.activeCalendarId = restoredState.activeCalendarId;
    saveState();
    restoringUndo = false;
    render();
    if (!elements.calendarHubShell.classList.contains("hidden")) renderCalendarHub();
    showSaveAnimation("Cambio deshecho");
  } catch {
    restoringUndo = false;
  }
}

function loadState() {
  const stored = [STORAGE_KEY, ...LEGACY_KEYS]
    .map((key) => localStorage.getItem(key))
    .find(Boolean);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if ((Array.isArray(parsed.people) && Array.isArray(parsed.tasks)) || Array.isArray(parsed.calendars)) {
        return parsed;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  return getEmptyState();
}

function getEmptyState() {
  const month = { id: createId(), name: "Mes inicial", order: 0, color: getPastelColor(0) };
  const calendar = createCalendar({
    name: "Calendario actual",
    monthId: month.id,
    order: 0,
    isCurrent: true,
    tasks: [],
    savedTasks: [],
    repository: [],
    extraSlots: {},
  });
  return {
    accounts: [],
    months: [month],
    calendars: [calendar],
    activeCalendarId: calendar.id,
  };
}

function normalizeState(rawState) {
  const legacyPeople = Array.isArray(rawState.people) ? rawState.people : [];
  const accounts = Array.isArray(rawState.accounts)
    ? rawState.accounts.map(normalizeAccount)
    : legacyPeople.map((person) => ({
        id: person.id || createId(),
        name: person.name || "Colaborador",
        password: "1234",
        role: "collaborator",
        status: "active",
      }));
  const months = Array.isArray(rawState.months) && rawState.months.length
    ? rawState.months.map((month, index) => ({
        id: month.id || createId(),
        name: month.name || `Mes ${index + 1}`,
        order: Number.isInteger(month.order) ? month.order : index,
        color: month.color || getPastelColor(index),
      }))
    : [{ id: createId(), name: "Mes actual", order: 0, color: getPastelColor(0) }];
  const calendars = Array.isArray(rawState.calendars) && rawState.calendars.length
    ? rawState.calendars.map((calendar) => normalizeCalendar(calendar, months[0].id, accounts))
    : [
        normalizeCalendar({
          name: "Calendario actual",
          monthId: months[0].id,
          order: 0,
          isCurrent: true,
          tasks: Array.isArray(rawState.tasks) ? rawState.tasks : [],
          savedTasks: Array.isArray(rawState.savedTasks) ? rawState.savedTasks : [],
          repository: Array.isArray(rawState.repository) ? rawState.repository : [],
          extraSlots: rawState.extraSlots || {},
        }, months[0].id, accounts),
      ];
  return {
    accounts,
    months,
    calendars,
    activeCalendarId: rawState.activeCalendarId || calendars.find((calendar) => calendar.isCurrent)?.id || calendars[0].id,
  };
}

function normalizeAccount(account) {
  return {
    id: account.id || createId(),
    name: account.name || "Usuario",
    password: account.password || "",
    role: account.role || "collaborator",
    status: account.status || (account.password ? "active" : "new"),
  };
}

function normalizeCalendar(calendar, fallbackMonthId, accounts = []) {
  const people = Array.isArray(calendar.people) ? calendar.people : [];
  return createCalendar({
    ...calendar,
    monthId: calendar.monthId || fallbackMonthId,
    tasks: Array.isArray(calendar.tasks) ? calendar.tasks.map(normalizeTask) : [],
    savedTasks: Array.isArray(calendar.savedTasks) ? calendar.savedTasks.map(normalizeTemplate) : [],
    repository: Array.isArray(calendar.repository) ? calendar.repository.map(normalizeRepositoryItem) : [],
    extraSlots: normalizeExtraSlots(calendar.extraSlots || {}, accounts.length ? accounts : people),
  });
}

function normalizeTask(task) {
  return createTask({
    ...task,
    subtasks: normalizeSubtasks(task.subtasks || []),
  });
}

function normalizeTemplate(template) {
  const subtasks = normalizeSubtasks(template.subtasks || []);
  const type = template.type === "supertask" || subtasks.length ? "supertask" : "task";
  return {
    id: template.id || createId(),
    title: getTemplateTitle(template.title, type),
    detail: template.detail || "",
    priority: template.priority || "normal",
    type,
    sourceTaskId: template.sourceTaskId || "",
    subtasks: type === "supertask" ? subtasks : [],
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: template.updatedAt || template.createdAt || new Date().toISOString(),
  };
}

function normalizeRepositoryItem(item) {
  return {
    ...normalizeTask(item),
    repositoryEntryId: item.repositoryEntryId || createId(),
    originalTaskId: item.originalTaskId || item.id || createId(),
    completed: Boolean(item.completed),
    completedAt: item.completedAt || "",
    deletedAt: item.deletedAt || "",
    repositoryAt: item.repositoryAt || item.deletedAt || item.completedAt || new Date().toISOString(),
    repositoryStatus: item.repositoryStatus || (item.deletedAt ? "deleted" : "completed"),
    assigneeName: item.assigneeName || "",
    parentTitle: item.parentTitle || "",
    repositoryEditedAt: item.repositoryEditedAt || "",
    reopenedAt: item.reopenedAt || "",
    reopenedTaskId: item.reopenedTaskId || "",
  };
}

function normalizeExtraSlots(extraSlots, people) {
  const normalized = {};
  people.forEach((person) => {
    const slots = Array.isArray(extraSlots[person.id]) ? extraSlots[person.id] : [];
    normalized[person.id] = DAY_NAMES.map((_, index) => {
      const value = Number(slots[index] || 0);
      return Math.max(0, Math.min(6, value));
    });
  });
  return normalized;
}

function getSeedState() {
  const people = [
    { id: "person-ana", name: "Ana" },
    { id: "person-luis", name: "Luis" },
    { id: "person-marta", name: "Marta" },
  ];
  const today = new Date();
  const oldDate = new Date(today);
  oldDate.setDate(today.getDate() - 10);
  const recentDate = new Date(today);
  recentDate.setDate(today.getDate() - 2);

  const tasks = [
    createTask({ title: "Revisar solicitudes pendientes", detail: "Cierre de observaciones abiertas.", assigneeId: "person-ana", priority: "high", createdAt: toDateInput(today), type: "task" }),
    createTask({ title: "Actualizar plan de compras", detail: "Validar fechas con administracion.", assigneeId: "person-ana", priority: "medium", createdAt: toDateInput(recentDate), type: "task" }),
    createTask({ title: "Preparar reporte semanal", detail: "Resumen para reunion del viernes.", assigneeId: "person-luis", priority: "high", createdAt: toDateInput(today), type: "task" }),
    createTask({ title: "Ordenar respaldos", detail: "Carpetas compartidas del equipo.", assigneeId: "person-marta", priority: "normal", createdAt: toDateInput(recentDate), type: "task" }),
    createTask({ title: "Confirmar proveedores", detail: "Quedo sin responsable asignado.", assigneeId: "", priority: "medium", createdAt: toDateInput(oldDate), type: "task" }),
    createTask({ title: "Revisar acta atrasada", detail: "Mas de una semana en cola.", assigneeId: "", priority: "normal", createdAt: toDateInput(oldDate), type: "task" }),
  ];

  const supertask = createTask({
    title: "Preparar operativo semanal",
    detail: "Coordinar piezas principales y tareas derivadas.",
    assigneeId: "person-luis",
    priority: "high",
    createdAt: toDateInput(today),
    type: "supertask",
    subtasks: [
      { title: "Confirmar turnos", detail: "Validar disponibilidad", assigneeId: "person-ana", preferredDayIndex: 0, priority: "high" },
      { title: "Validar insumos", detail: "Revisar lista de materiales", assigneeId: "person-luis", preferredDayIndex: 1, priority: "medium" },
      { title: "Enviar minuta", detail: "Compartir acuerdos", assigneeId: "person-marta", preferredDayIndex: 2, priority: "normal" },
    ],
  });
  tasks.push(supertask);
  supertask.subtasks.forEach((subtask, index) => {
    tasks.push(
      createTask({
        title: subtask.title,
        detail: subtask.detail || `Parte de supertarea: ${supertask.title}`,
        assigneeId: subtask.assigneeId || "",
        priority: subtask.priority || supertask.priority,
        createdAt: supertask.createdAt,
        preferredDayIndex: Number.isInteger(subtask.preferredDayIndex) ? subtask.preferredDayIndex : null,
        type: "task",
        parentId: supertask.id,
        generatedBy: supertask.id,
        order: index + 1,
      })
    );
  });

  return {
    people,
    tasks,
    savedTasks: [
      {
        id: createId(),
        title: "Revision documental",
        detail: "Plantilla para controles repetidos.",
        priority: "medium",
        type: "task",
        subtasks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: createId(),
        title: "Cierre mensual",
        detail: "Supertarea reutilizable para cierres.",
        priority: "high",
        type: "supertask",
        subtasks: [
          { title: "Reunir respaldos", detail: "Solicitar archivos faltantes", assigneeId: "person-ana", preferredDayIndex: 0, priority: "high" },
          { title: "Contrastar pendientes", detail: "Cruzar tablero y correo", assigneeId: "person-luis", preferredDayIndex: 2, priority: "medium" },
          { title: "Enviar informe", detail: "Distribuir cierre al equipo", assigneeId: "person-marta", preferredDayIndex: 4, priority: "normal" },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    repository: [],
    extraSlots: {},
  };
}

function renderSubtaskPreview(container, item) {
  container.replaceChildren();
  const subtasks = normalizeSubtasks(item.subtasks || []);
  if (item.type !== "supertask" || !subtasks.length) return;

  const label = document.createElement("strong");
  label.textContent = "Tareas internas";
  const list = document.createElement("ul");
  subtasks.forEach((subtask) => {
    const row = document.createElement("li");
    const assignee = subtask.assigneeId ? ` - ${getPersonName(subtask.assigneeId)}` : "";
    const day = Number.isInteger(subtask.preferredDayIndex) ? ` - ${DAY_NAMES[subtask.preferredDayIndex]}` : "";
    const priority = subtask.priority ? ` - ${PRIORITY_LABELS[subtask.priority]}` : "";
    const detail = subtask.detail ? `: ${subtask.detail}` : "";
    row.textContent = `${subtask.title}${assignee}${day}${priority}${detail}`;
    list.appendChild(row);
  });
  container.append(label, list);
}

function actionButton(label, handler, extraClass = "") {
  const button = document.createElement("button");
  button.className = `small-button ${extraClass}`.trim();
  button.type = "button";
  button.textContent = label;
  button.addEventListener("pointerdown", (event) => event.stopPropagation());
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    handler(event);
  });
  return button;
}

function addPill(container, text, variant = "") {
  const pill = document.createElement("span");
  pill.className = `pill ${variant}`.trim();
  pill.textContent = text;
  container.appendChild(pill);
}

function addDefinition(container, term, value) {
  const dt = document.createElement("dt");
  dt.textContent = term;
  const dd = document.createElement("dd");
  dd.textContent = value || "-";
  container.append(dt, dd);
}

function getWeekdayIndex(value) {
  if (!value) return 4;
  const day = new Date(value).getDay();
  if (day === 0) return 4;
  if (day === 6) return 4;
  return day - 1;
}

function formatDate(value) {
  if (!value) return "-";
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function toDateInput(date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

function emptyState(message) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

function createId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
