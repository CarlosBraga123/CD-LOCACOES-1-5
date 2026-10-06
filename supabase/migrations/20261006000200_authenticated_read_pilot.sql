begin;

-- Fase 3B.2: piloto autenticado somente de leitura.
-- localStorage continua sendo a fonte operacional; nenhuma escrita é liberada.

grant execute on function public.is_active_organization_member(text)
  to authenticated;

grant select on table public.organization_memberships to authenticated;

create policy organization_memberships_select_own
on public.organization_memberships
for select
to authenticated
using (user_id = (select auth.uid()));

grant select on table
  public.organization_settings,
  public.constructors,
  public.construction_sites,
  public.site_contacts,
  public.commercial_tables,
  public.physical_equipment,
  public.activities,
  public.activity_equipment_items,
  public.unit_patrimony_bindings,
  public.patrimony_events,
  public.equipment_config_adjustments,
  public.equipment_substitutions,
  public.equipment_admin_events,
  public.counterweight_inventory,
  public.counterweight_events,
  public.tasks
to authenticated;

create policy organization_settings_select_active_member
on public.organization_settings
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy constructors_select_active_member
on public.constructors
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy construction_sites_select_active_member
on public.construction_sites
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy site_contacts_select_active_member
on public.site_contacts
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy commercial_tables_select_active_member
on public.commercial_tables
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy physical_equipment_select_active_member
on public.physical_equipment
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy activities_select_active_member
on public.activities
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy activity_equipment_items_select_active_member
on public.activity_equipment_items
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy unit_patrimony_bindings_select_active_member
on public.unit_patrimony_bindings
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy patrimony_events_select_active_member
on public.patrimony_events
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy equipment_config_adjustments_select_active_member
on public.equipment_config_adjustments
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy equipment_substitutions_select_active_member
on public.equipment_substitutions
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy equipment_admin_events_select_active_member
on public.equipment_admin_events
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy counterweight_inventory_select_active_member
on public.counterweight_inventory
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy counterweight_events_select_active_member
on public.counterweight_events
for select
to authenticated
using (public.is_active_organization_member(organization_id));

create policy tasks_select_active_member
on public.tasks
for select
to authenticated
using (public.is_active_organization_member(organization_id));

commit;
