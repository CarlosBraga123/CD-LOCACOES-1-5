begin;

-- Fase 3B.2: menor privilégio para os papéis expostos ao frontend.
-- Policies SELECT existentes permanecem inalteradas.

revoke all privileges on table
  public.organizations,
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
  public.tasks,
  public.import_batches,
  public.import_records,
  public.organization_memberships
from public, anon, authenticated;

grant select on table
  public.organization_memberships,
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

-- Entre os papéis do frontend, somente authenticated pode executar o helper
-- necessário às policies SELECT do piloto.
revoke all on function public.is_active_organization_member(text)
  from public, anon, authenticated;
grant execute on function public.is_active_organization_member(text)
  to authenticated;

-- O helper de roles não é necessário nesta fase e permanece fechado.
revoke all on function public.has_active_organization_role(text, text[])
  from public, anon, authenticated;

commit;
