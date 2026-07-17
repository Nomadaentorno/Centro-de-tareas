create extension if not exists pgcrypto;

create type public.member_role as enum ('coordinator', 'collaborator');
create type public.member_status as enum ('active', 'pending', 'rejected');
create type public.task_status as enum ('active', 'ready', 'closed');
create type public.task_kind as enum ('task', 'supertask');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.months (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  color text not null default '#dbeafe',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  month_id uuid not null references public.months(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  order_index integer not null default 0,
  is_current boolean not null default false,
  extra_slots jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  parent_task_id uuid references public.tasks(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  detail text not null default '',
  assignee_id uuid references public.profiles(id) on delete set null,
  priority text not null default 'normal' check (priority in ('normal', 'medium', 'high')),
  kind public.task_kind not null default 'task',
  status public.task_status not null default 'active',
  preferred_day_index smallint check (preferred_day_index between 0 and 4),
  day_index smallint check (day_index between 0 and 4),
  sort_order integer not null default 0,
  ready_at timestamptz,
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  title text not null,
  kind public.task_kind not null default 'task',
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.completion_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_calendar_id uuid references public.calendars(id) on delete set null,
  original_task_id uuid,
  title text not null,
  assignee_id uuid references public.profiles(id) on delete set null,
  closed_by uuid references public.profiles(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  ready_at timestamptz,
  closed_at timestamptz not null default now()
);

create table public.activity_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index months_workspace_order_idx on public.months(workspace_id, order_index);
create index calendars_workspace_month_order_idx on public.calendars(workspace_id, month_id, order_index);
create index tasks_calendar_status_idx on public.tasks(calendar_id, status);
create index tasks_workspace_assignee_idx on public.tasks(workspace_id, assignee_id);
create index completion_history_workspace_closed_idx on public.completion_history(workspace_id, closed_at desc);
create index activity_log_workspace_created_idx on public.activity_log(workspace_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger workspaces_touch_updated_at before update on public.workspaces
for each row execute function public.touch_updated_at();
create trigger months_touch_updated_at before update on public.months
for each row execute function public.touch_updated_at();
create trigger calendars_touch_updated_at before update on public.calendars
for each row execute function public.touch_updated_at();
create trigger tasks_touch_updated_at before update on public.tasks
for each row execute function public.touch_updated_at();
create trigger saved_templates_touch_updated_at before update on public.saved_templates
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'Usuario'), '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_workspace_coordinator(target_workspace uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
      and role = 'coordinator'
      and status = 'active'
  );
$$;

create or replace function public.bootstrap_workspace(workspace_name text, coordinator_name text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  new_workspace_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists (select 1 from public.workspace_members where user_id = auth.uid()) then
    raise exception 'User already belongs to a workspace';
  end if;
  update public.profiles set display_name = trim(coordinator_name) where id = auth.uid();
  insert into public.workspaces (name, created_by)
  values (trim(workspace_name), auth.uid()) returning id into new_workspace_id;
  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (new_workspace_id, auth.uid(), 'coordinator', 'active');
  return new_workspace_id;
end;
$$;

create or replace function public.protect_collaborator_task_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_workspace_coordinator(old.workspace_id) then return new; end if;
  if old.assignee_id is distinct from auth.uid() then raise exception 'Task not assigned to user'; end if;
  if new.status <> 'ready' then raise exception 'Collaborators can only mark tasks ready'; end if;
  if (new.workspace_id, new.calendar_id, new.parent_task_id, new.title, new.detail, new.assignee_id,
      new.priority, new.kind, new.preferred_day_index, new.day_index, new.sort_order, new.closed_at, new.metadata)
     is distinct from
     (old.workspace_id, old.calendar_id, old.parent_task_id, old.title, old.detail, old.assignee_id,
      old.priority, old.kind, old.preferred_day_index, old.day_index, old.sort_order, old.closed_at, old.metadata)
  then raise exception 'Collaborators cannot edit task structure'; end if;
  new.ready_at = coalesce(new.ready_at, now());
  return new;
end;
$$;

create trigger protect_collaborator_task_update
before update on public.tasks
for each row execute function public.protect_collaborator_task_update();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.months enable row level security;
alter table public.calendars enable row level security;
alter table public.tasks enable row level security;
alter table public.saved_templates enable row level security;
alter table public.completion_history enable row level security;
alter table public.activity_log enable row level security;

create policy profiles_select_shared on public.profiles for select to authenticated
using (id = auth.uid() or exists (
  select 1 from public.workspace_members mine
  join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
  where mine.user_id = auth.uid() and mine.status = 'active' and theirs.user_id = profiles.id
));
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy workspaces_select_member on public.workspaces for select to authenticated
using (public.is_workspace_member(id));
create policy workspaces_update_coordinator on public.workspaces for update to authenticated
using (public.is_workspace_coordinator(id)) with check (public.is_workspace_coordinator(id));

create policy members_select_member on public.workspace_members for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy members_insert_coordinator on public.workspace_members for insert to authenticated
with check (public.is_workspace_coordinator(workspace_id));
create policy members_update_coordinator on public.workspace_members for update to authenticated
using (public.is_workspace_coordinator(workspace_id)) with check (public.is_workspace_coordinator(workspace_id));
create policy members_delete_coordinator on public.workspace_members for delete to authenticated
using (public.is_workspace_coordinator(workspace_id));

create policy months_select_member on public.months for select to authenticated using (public.is_workspace_member(workspace_id));
create policy months_all_coordinator on public.months for all to authenticated
using (public.is_workspace_coordinator(workspace_id)) with check (public.is_workspace_coordinator(workspace_id));
create policy calendars_select_member on public.calendars for select to authenticated using (public.is_workspace_member(workspace_id));
create policy calendars_all_coordinator on public.calendars for all to authenticated
using (public.is_workspace_coordinator(workspace_id)) with check (public.is_workspace_coordinator(workspace_id));
create policy tasks_select_member on public.tasks for select to authenticated using (public.is_workspace_member(workspace_id));
create policy tasks_insert_coordinator on public.tasks for insert to authenticated
with check (public.is_workspace_coordinator(workspace_id));
create policy tasks_update_coordinator_or_assignee on public.tasks for update to authenticated
using (public.is_workspace_coordinator(workspace_id) or assignee_id = auth.uid())
with check (public.is_workspace_coordinator(workspace_id) or assignee_id = auth.uid());
create policy tasks_delete_coordinator on public.tasks for delete to authenticated
using (public.is_workspace_coordinator(workspace_id));
create policy templates_select_member on public.saved_templates for select to authenticated using (public.is_workspace_member(workspace_id));
create policy templates_all_coordinator on public.saved_templates for all to authenticated
using (public.is_workspace_coordinator(workspace_id)) with check (public.is_workspace_coordinator(workspace_id));
create policy history_select_member on public.completion_history for select to authenticated using (public.is_workspace_member(workspace_id));
create policy history_all_coordinator on public.completion_history for all to authenticated
using (public.is_workspace_coordinator(workspace_id)) with check (public.is_workspace_coordinator(workspace_id));
create policy activity_select_member on public.activity_log for select to authenticated using (public.is_workspace_member(workspace_id));
create policy activity_insert_member on public.activity_log for insert to authenticated
with check (public.is_workspace_member(workspace_id) and actor_id = auth.uid());

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.months to authenticated;
grant select, insert, update, delete on public.calendars to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.saved_templates to authenticated;
grant select, insert, update, delete on public.completion_history to authenticated;
grant select, insert on public.activity_log to authenticated;
grant usage, select on sequence public.activity_log_id_seq to authenticated;
grant execute on function public.bootstrap_workspace(text, text) to authenticated;

alter publication supabase_realtime add table public.months;
alter publication supabase_realtime add table public.calendars;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.saved_templates;
alter publication supabase_realtime add table public.completion_history;
alter publication supabase_realtime add table public.activity_log;
