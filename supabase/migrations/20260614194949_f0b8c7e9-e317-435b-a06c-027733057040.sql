alter table public.municipios enable row level security;

drop policy if exists "municipios_read_all" on public.municipios;
drop policy if exists "municipios_select_authenticated" on public.municipios;
create policy "municipios_select_authenticated"
on public.municipios
for select
to authenticated
using (true);

drop policy if exists "municipios_insert_service_role" on public.municipios;
create policy "municipios_insert_service_role"
on public.municipios
for insert
to service_role
with check (true);

drop policy if exists "municipios_update_service_role" on public.municipios;
create policy "municipios_update_service_role"
on public.municipios
for update
to service_role
using (true)
with check (true);

drop policy if exists "municipios_delete_service_role" on public.municipios;
create policy "municipios_delete_service_role"
on public.municipios
for delete
to service_role
using (true);