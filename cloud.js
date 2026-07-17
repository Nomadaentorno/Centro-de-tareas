(function () {
  const PROJECT_URL = "https://rblyxgtofbnuqaibkcef.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_u7zWwEo0sQkzvQhncgXaWA_NG1UJMA6";

  if (!window.supabase?.createClient) {
    window.CloudStore = { available: false, error: "No se pudo cargar la conexión segura." };
    return;
  }

  const client = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  let workspaceId = "";
  let currentMembership = null;
  let realtimeChannel = null;

  const cleanPayload = (value) => JSON.parse(JSON.stringify(value));
  const dateToIso = (value) => {
    if (!value) return new Date().toISOString();
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00.000Z` : value;
  };

  function rowTaskToApp(row) {
    return {
      ...(row.metadata || {}),
      id: row.metadata?.id || row.id,
      title: row.title,
      detail: row.detail || "",
      assigneeId: row.assignee_id || "",
      priority: row.priority || "normal",
      type: row.kind || "task",
      parentId: row.parent_task_id || row.metadata?.parentId || "",
      preferredDayIndex: Number.isInteger(row.preferred_day_index) ? row.preferred_day_index : null,
      completedDayIndex: Number.isInteger(row.day_index) ? row.day_index : null,
      completed: row.status === "ready",
      completedAt: row.ready_at || row.metadata?.completedAt || "",
      order: row.sort_order || 0,
      createdAt: row.metadata?.createdAt || row.created_at,
    };
  }

  async function getSession() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) return null;
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) {
      await client.auth.signOut({ scope: "local" });
      return null;
    }
    return data.session;
  }

  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw error;
    return data.session;
  }

  async function signUpCoordinator({ name, email, password }) {
    const { data, error } = await client.auth.signUp({
      email: email.trim().toLowerCase(), password,
      options: {
        data: { display_name: name.trim() },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    if (!data.session) return { needsEmailConfirmation: true, user: data.user };
    await bootstrapWorkspace(name);
    return { session: data.session, needsEmailConfirmation: false };
  }

  async function resendSignup(email) {
    const { error } = await client.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async function bootstrapWorkspace(coordinatorName) {
    const { data: existing, error: existingError } = await client.from("workspace_members").select("workspace_id").maybeSingle();
    if (existingError) throw existingError;
    if (existing?.workspace_id) {
      workspaceId = existing.workspace_id;
      return workspaceId;
    }
    const { data, error } = await client.rpc("bootstrap_workspace", {
      workspace_name: "Organización de tareas", coordinator_name: coordinatorName.trim(),
    });
    if (error) throw error;
    workspaceId = data;
    return data;
  }

  async function signOut() {
    unsubscribe();
    workspaceId = "";
    currentMembership = null;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async function loadWorkspace() {
    const session = await getSession();
    if (!session?.user) return null;
    const { data: mine, error: mineError } = await client.from("workspace_members")
      .select("workspace_id,user_id,role,status").eq("user_id", session.user.id).maybeSingle();
    if (mineError) throw mineError;
    if (!mine) return { session, needsWorkspace: true };
    workspaceId = mine.workspace_id;
    currentMembership = mine;

    const results = await Promise.all([
      client.from("workspace_members").select("workspace_id,user_id,role,status").eq("workspace_id", workspaceId),
      client.from("profiles").select("id,display_name"),
      client.from("months").select("*").eq("workspace_id", workspaceId).order("order_index"),
      client.from("calendars").select("*").eq("workspace_id", workspaceId).order("order_index"),
      client.from("tasks").select("*").eq("workspace_id", workspaceId),
      client.from("saved_templates").select("*").eq("workspace_id", workspaceId),
      client.from("completion_history").select("*").eq("workspace_id", workspaceId).order("closed_at", { ascending: false }),
    ]);
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) throw firstError;
    const [members, profilesRows, monthRows, calendarRows, taskRows, templateRows, historyRows] = results.map((result) => result.data);
    const profiles = new Map(profilesRows.map((profile) => [profile.id, profile]));
    const accounts = members.map((member) => ({
      id: member.user_id,
      name: profiles.get(member.user_id)?.display_name || "Usuario",
      email: member.user_id === session.user.id ? session.user.email || "" : "",
      password: "",
      role: member.role,
      status: member.status,
    }));
    const months = monthRows.map((month) => ({ id: month.id, name: month.name, color: month.color, order: month.order_index }));
    const calendars = calendarRows.map((calendar) => ({
      id: calendar.id, monthId: calendar.month_id, name: calendar.name, order: calendar.order_index,
      isCurrent: calendar.is_current, extraSlots: calendar.extra_slots || {}, tasks: [], savedTasks: [], repository: [],
    }));
    const calendarMap = new Map(calendars.map((calendar) => [calendar.id, calendar]));
    taskRows.forEach((row) => {
      const calendar = calendarMap.get(row.calendar_id);
      if (!calendar) return;
      const item = rowTaskToApp(row);
      if (row.metadata?.storage === "repository") calendar.repository.push(item);
      else if (row.status !== "closed") calendar.tasks.push(item);
    });
    templateRows.forEach((row) => {
      const calendar = calendarMap.get(row.calendar_id);
      if (calendar) calendar.savedTasks.push({ ...(row.payload || {}), id: row.id, title: row.title, type: row.kind });
    });
    const completionHistory = historyRows.map((row) => ({
      ...(row.payload || {}), historyEntryId: row.id,
      originalTaskId: row.original_task_id || row.payload?.originalTaskId,
      sourceCalendarId: row.source_calendar_id || row.payload?.sourceCalendarId || "",
      title: row.title, assigneeId: row.assignee_id || row.payload?.assigneeId || "",
      readyAt: row.ready_at || row.payload?.readyAt || "", closedAt: row.closed_at,
    }));
    return { session, membership: mine, state: {
      accounts, months, calendars,
      activeCalendarId: calendars.find((calendar) => calendar.isCurrent)?.id || calendars[0]?.id || "",
      reviewQueue: [], completionHistory,
    }};
  }

  async function deleteMissing(table, ids) {
    let query = client.from(table).delete().eq("workspace_id", workspaceId);
    if (ids.length) query = query.not("id", "in", `(${ids.join(",")})`);
    const { error } = await query;
    if (error) throw error;
  }

  async function saveCoordinatorState(appState) {
    if (!workspaceId || currentMembership?.role !== "coordinator") return;
    const months = appState.months.map((month, index) => ({
      id: month.id, workspace_id: workspaceId, name: month.name, color: month.color || "#dbeafe",
      order_index: Number.isInteger(month.order) ? month.order : index,
    }));
    if (months.length) {
      const { error } = await client.from("months").upsert(months);
      if (error) throw error;
    }
    const calendars = appState.calendars.map((calendar, index) => ({
      id: calendar.id, workspace_id: workspaceId, month_id: calendar.monthId, name: calendar.name,
      order_index: Number.isInteger(calendar.order) ? calendar.order : index,
      is_current: Boolean(calendar.isCurrent), extra_slots: cleanPayload(calendar.extraSlots || {}),
    }));
    if (calendars.length) {
      const { error } = await client.from("calendars").upsert(calendars);
      if (error) throw error;
    }

    const activeRows = [];
    const repositoryRows = [];
    appState.calendars.forEach((calendar) => {
      calendar.tasks.forEach((task, index) => activeRows.push({
        id: task.id, workspace_id: workspaceId, calendar_id: calendar.id, parent_task_id: task.parentId || null,
        title: task.title, detail: task.detail || "", assignee_id: task.assigneeId || null,
        priority: task.priority || "normal", kind: task.type === "supertask" ? "supertask" : "task",
        status: task.completed ? "ready" : "active",
        preferred_day_index: Number.isInteger(task.preferredDayIndex) ? task.preferredDayIndex : null,
        day_index: Number.isInteger(task.completedDayIndex) ? task.completedDayIndex : null,
        sort_order: task.order || index, ready_at: task.completed ? dateToIso(task.completedAt) : null,
        metadata: cleanPayload({ ...task, storage: "active" }),
      }));
      calendar.repository.forEach((item, index) => repositoryRows.push({
        id: item.repositoryEntryId || item.id, workspace_id: workspaceId, calendar_id: calendar.id, parent_task_id: null,
        title: item.title, detail: item.detail || "", assignee_id: item.assigneeId || null,
        priority: item.priority || "normal", kind: item.type === "supertask" ? "supertask" : "task", status: "closed",
        preferred_day_index: Number.isInteger(item.preferredDayIndex) ? item.preferredDayIndex : null,
        day_index: Number.isInteger(item.completedDayIndex) ? item.completedDayIndex : null,
        sort_order: index, ready_at: item.completedAt ? dateToIso(item.completedAt) : null,
        closed_at: dateToIso(item.repositoryAt || item.deletedAt || item.completedAt),
        metadata: cleanPayload({ ...item, storage: "repository" }),
      }));
    });
    for (const batch of [activeRows.filter((row) => row.kind === "supertask"), activeRows.filter((row) => row.kind !== "supertask"), repositoryRows]) {
      if (!batch.length) continue;
      const { error } = await client.from("tasks").upsert(batch);
      if (error) throw error;
    }
    const templates = appState.calendars.flatMap((calendar) => calendar.savedTasks.map((template) => ({
      id: template.id, workspace_id: workspaceId, calendar_id: calendar.id, title: template.title,
      kind: template.type === "supertask" ? "supertask" : "task", payload: cleanPayload(template),
      created_by: currentMembership.user_id,
    })));
    if (templates.length) {
      const { error } = await client.from("saved_templates").upsert(templates);
      if (error) throw error;
    }
    const history = appState.completionHistory.map((item) => ({
      id: item.historyEntryId, workspace_id: workspaceId,
      source_calendar_id: appState.calendars.some((calendar) => calendar.id === item.sourceCalendarId) ? item.sourceCalendarId : null,
      original_task_id: item.originalTaskId || null, title: item.title,
      assignee_id: appState.accounts.some((account) => account.id === item.assigneeId) ? item.assigneeId : null,
      closed_by: currentMembership.user_id, payload: cleanPayload(item),
      ready_at: item.readyAt ? dateToIso(item.readyAt) : null, closed_at: dateToIso(item.closedAt),
    }));
    if (history.length) {
      const { error } = await client.from("completion_history").upsert(history);
      if (error) throw error;
    }
    await Promise.all([
      deleteMissing("completion_history", history.map((item) => item.id)),
      deleteMissing("saved_templates", templates.map((item) => item.id)),
      deleteMissing("tasks", [...activeRows, ...repositoryRows].map((item) => item.id)),
    ]);
    await deleteMissing("calendars", calendars.map((item) => item.id));
    await deleteMissing("months", months.map((item) => item.id));
  }

  async function saveCollaboratorReadyTasks(appState, userId) {
    if (!workspaceId || currentMembership?.role !== "collaborator") return;
    const ready = appState.calendars.flatMap((calendar) => calendar.tasks)
      .filter((task) => task.assigneeId === userId && task.completed);
    for (const task of ready) {
      const { error } = await client.from("tasks").update({
        status: "ready", ready_at: dateToIso(task.completedAt),
        day_index: Number.isInteger(task.completedDayIndex) ? task.completedDayIndex : null,
      }).eq("id", task.id).eq("assignee_id", userId);
      if (error) throw error;
    }
  }

  async function createMember({ displayName, email, password, role }) {
    const { data, error } = await client.functions.invoke("create-member", {
      body: { workspaceId, displayName, email, password, role },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function deleteMember(userId) {
    const { data, error } = await client.functions.invoke("create-member", {
      body: { workspaceId, action: "delete", userId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function updatePassword(password) {
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
  }

  async function verifyPassword(password) {
    const session = await getSession();
    if (!session?.user?.email) return false;
    const { error } = await client.auth.signInWithPassword({ email: session.user.email, password });
    return !error;
  }

  function subscribe(onChange) {
    unsubscribe();
    if (!workspaceId) return;
    realtimeChannel = client.channel(`workspace-${workspaceId}`);
    ["workspace_members", "months", "calendars", "tasks", "saved_templates", "completion_history"].forEach((table) => {
      realtimeChannel.on("postgres_changes", { event: "*", schema: "public", table, filter: `workspace_id=eq.${workspaceId}` }, onChange);
    });
    realtimeChannel.subscribe();
  }

  function unsubscribe() {
    if (realtimeChannel) client.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  window.CloudStore = {
    available: true, client, getSession, signIn, signUpCoordinator, resendSignup, bootstrapWorkspace, signOut,
    loadWorkspace, saveState: (state, userId) => currentMembership?.role === "coordinator"
      ? saveCoordinatorState(state) : saveCollaboratorReadyTasks(state, userId),
    createMember, deleteMember, updatePassword, verifyPassword, subscribe, unsubscribe,
    get workspaceId() { return workspaceId; },
    get membership() { return currentMembership; },
  };
})();
