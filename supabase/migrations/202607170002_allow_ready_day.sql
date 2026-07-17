create or replace function public.protect_collaborator_task_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_workspace_coordinator(old.workspace_id) then return new; end if;
  if old.assignee_id is distinct from auth.uid() then raise exception 'Task not assigned to user'; end if;
  if new.status <> 'ready' then raise exception 'Collaborators can only mark tasks ready'; end if;
  if (new.workspace_id, new.calendar_id, new.parent_task_id, new.title, new.detail, new.assignee_id,
      new.priority, new.kind, new.preferred_day_index, new.sort_order, new.closed_at, new.metadata)
     is distinct from
     (old.workspace_id, old.calendar_id, old.parent_task_id, old.title, old.detail, old.assignee_id,
      old.priority, old.kind, old.preferred_day_index, old.sort_order, old.closed_at, old.metadata)
  then raise exception 'Collaborators cannot edit task structure'; end if;
  new.ready_at = coalesce(new.ready_at, now());
  return new;
end;
$$;
