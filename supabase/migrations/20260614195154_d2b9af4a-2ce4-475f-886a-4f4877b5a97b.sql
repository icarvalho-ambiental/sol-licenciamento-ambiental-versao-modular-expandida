create table if not exists public.home_content (
  id smallint primary key default 1,
  video_url text,
  slides jsonb not null default '[]'::jsonb,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  constraint home_content_singleton check (id = 1)
);

grant select on public.home_content to anon, authenticated;
grant insert, update on public.home_content to authenticated;
grant all on public.home_content to service_role;

alter table public.home_content enable row level security;

drop policy if exists "home_content_select_all" on public.home_content;
create policy "home_content_select_all" on public.home_content
  for select to anon, authenticated using (true);

drop policy if exists "home_content_admin_insert" on public.home_content;
create policy "home_content_admin_insert" on public.home_content
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.is_host_admin(auth.uid()));

drop policy if exists "home_content_admin_update" on public.home_content;
create policy "home_content_admin_update" on public.home_content
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.is_host_admin(auth.uid()))
  with check (public.has_role(auth.uid(), 'admin') or public.is_host_admin(auth.uid()));

insert into public.home_content (id, video_url, slides) values (1, null, '[]'::jsonb)
on conflict (id) do nothing;