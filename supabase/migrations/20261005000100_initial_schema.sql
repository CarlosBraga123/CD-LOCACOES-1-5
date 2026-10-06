begin;

-- Fase 2: estrutura inicial. Esta migration não contém dados operacionais.
-- IDs originados no aplicativo permanecem TEXT e são isolados por organization_id.

create table public.organizations (
  id text primary key,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_settings (
  organization_id text primary key references public.organizations(id) on delete cascade,
  company_name text,
  company_logo text,
  balancinho_parts jsonb not null default '{}'::jsonb,
  anchoring_parts jsonb not null default '{}'::jsonb,
  legacy_service_values jsonb not null default '{}'::jsonb,
  legacy_default_values jsonb not null default '{}'::jsonb,
  source text,
  schema_version integer,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.constructors (
  organization_id text not null references public.organizations(id) on delete cascade,
  id text not null,
  name text,
  legal_name text,
  trade_name text,
  tax_id text,
  state_registration text,
  municipal_registration text,
  active boolean,
  responsible_name text,
  responsible_role text,
  phone text,
  whatsapp text,
  email text,
  financial_email text,
  postal_code text,
  street text,
  street_number text,
  address_complement text,
  neighborhood text,
  city text,
  state text,
  payment_terms text,
  commercial_responsible text,
  internal_notes text,
  source text,
  schema_version integer,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table public.construction_sites (
  organization_id text not null references public.organizations(id) on delete cascade,
  id text not null,
  constructor_id text,
  constructor_name text,
  name text,
  tax_id text,
  cno text,
  internal_code text,
  status text,
  postal_code text,
  street text,
  street_number text,
  address_complement text,
  neighborhood text,
  city text,
  state text,
  reference_point text,
  engineer text,
  legacy_address text,
  notes text,
  responsible_name text,
  responsible_role text,
  phone text,
  whatsapp text,
  email text,
  delivery_hours text,
  access_instructions text,
  separate_delivery_address boolean,
  delivery_address text,
  source text,
  schema_version integer,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table public.site_contacts (
  organization_id text not null,
  construction_site_id text not null,
  id text not null,
  contact_type text,
  name text,
  role text,
  crea text,
  phone text,
  whatsapp text,
  email text,
  is_primary boolean,
  active boolean,
  position integer,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, construction_site_id, id),
  foreign key (organization_id, construction_site_id)
    references public.construction_sites(organization_id, id) on delete cascade
);

create table public.commercial_tables (
  organization_id text not null references public.organizations(id) on delete cascade,
  id text not null,
  scope_type text not null,
  scope_id text,
  origin text,
  version integer,
  base_version integer,
  constructor_id text,
  services jsonb not null default '{}'::jsonb,
  rentals jsonb not null default '{}'::jsonb,
  source_updated_at text,
  source text,
  schema_version integer,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table public.physical_equipment (
  organization_id text not null references public.organizations(id) on delete cascade,
  id text not null,
  item_origin_id text,
  current_patrimony_number text,
  equipment_type text,
  balancinho_type text,
  mini_crane_type text,
  administrative_status text,
  registration_date text,
  notes text,
  active boolean,
  source text,
  schema_version integer,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table public.activities (
  organization_id text not null references public.organizations(id) on delete cascade,
  id text not null,
  constructor_id text,
  constructor_name text,
  construction_site_id text,
  construction_site_name text,
  equipment_type text,
  service_type text,
  size text,
  previous_size text,
  new_size text,
  anchoring text,
  previous_anchoring text,
  quantity numeric,
  balancinho_type text,
  mini_crane_type text,
  uses_counterweight boolean,
  used_counterweight_before boolean,
  counterweight_change text,
  counterweight_quantity numeric,
  patrimony_number text,
  patrimony_numbers jsonb not null default '[]'::jsonb,
  scheduled_date text,
  release_date text,
  responsible_team text,
  field_os_number text,
  app_os_number text,
  status text,
  started boolean,
  notes text,
  charges_service boolean,
  starts_rental boolean,
  ends_rental boolean,
  pending_patrimony_link boolean,
  patrimony_link_status text,
  provisional_patrimony_exit boolean,
  unit_service_value numeric,
  counterweight_service_addition numeric,
  total_service_value numeric,
  monthly_rental_value numeric,
  counterweight_monthly_addition numeric,
  total_monthly_rental_value numeric,
  frozen_values jsonb,
  source text,
  schema_version integer,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table public.activity_equipment_items (
  organization_id text not null,
  id text not null,
  activity_id text not null,
  position integer,
  physical_equipment_id text,
  item_origin_id text,
  unit_id text,
  origin_activity_id text,
  patrimony_number text,
  patrimony_link_status text,
  equipment_type text,
  balancinho_type text,
  mini_crane_type text,
  size text,
  previous_size text,
  new_size text,
  anchoring text,
  previous_anchoring text,
  uses_counterweight boolean,
  used_counterweight_before boolean,
  counterweight_change text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id),
  foreign key (organization_id, activity_id)
    references public.activities(organization_id, id) on delete cascade
);

create table public.unit_patrimony_bindings (
  organization_id text not null references public.organizations(id) on delete cascade,
  id text not null,
  physical_equipment_id text,
  item_origin_id text,
  unit_id text,
  current_patrimony_number text,
  source text,
  schema_version integer,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table public.patrimony_events (
  organization_id text not null,
  binding_id text not null,
  id text not null,
  event_type text,
  event_date text,
  previous_patrimony_number text,
  new_patrimony_number text,
  construction_site_id text,
  reason text,
  notes text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (organization_id, binding_id, id),
  foreign key (organization_id, binding_id)
    references public.unit_patrimony_bindings(organization_id, id) on delete cascade
);

create table public.equipment_config_adjustments (
  organization_id text not null references public.organizations(id) on delete cascade,
  id text not null,
  item_id text,
  physical_equipment_id text,
  unit_id text,
  construction_site_id text,
  adjustment_date text,
  size text,
  anchoring text,
  uses_counterweight boolean,
  notes text,
  origin text,
  source_created_at text,
  source text,
  schema_version integer,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table public.equipment_substitutions (
  organization_id text not null references public.organizations(id) on delete cascade,
  id text not null,
  event_date text,
  substitution_type text,
  source_equipment_id text,
  destination_equipment_id text,
  source_unit_id text,
  destination_unit_id text,
  source_site_id text,
  destination_site_id text,
  reason text,
  notes text,
  source text,
  schema_version integer,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table public.equipment_admin_events (
  organization_id text not null,
  physical_equipment_id text not null,
  id text not null,
  event_type text,
  event_date text,
  previous_status text,
  new_status text,
  reason text,
  notes text,
  related_patrimony_number text,
  previous_site_id text,
  new_site_id text,
  substitution_id text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (organization_id, physical_equipment_id, id),
  foreign key (organization_id, physical_equipment_id)
    references public.physical_equipment(organization_id, id) on delete cascade
);

create table public.counterweight_inventory (
  organization_id text primary key references public.organizations(id) on delete cascade,
  total_quantity integer not null default 0,
  source text,
  schema_version integer,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_quantity >= 0)
);

create table public.counterweight_events (
  organization_id text not null references public.counterweight_inventory(organization_id) on delete cascade,
  id text not null,
  event_date text,
  previous_quantity integer,
  new_quantity integer,
  reason text,
  notes text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table public.tasks (
  organization_id text not null references public.organizations(id) on delete cascade,
  id text not null,
  description text,
  completed boolean,
  source_created_at text,
  completed_at text,
  completed_by text,
  source text,
  schema_version integer,
  raw_payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id)
);

create table public.import_batches (
  organization_id text not null references public.organizations(id) on delete cascade,
  id text not null,
  backup_sha256 text not null,
  backup_schema_version integer,
  source_app text,
  source_exported_at text,
  status text not null,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  identical_count integer not null default 0,
  rejected_count integer not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, id),
  check (inserted_count >= 0),
  check (updated_count >= 0),
  check (identical_count >= 0),
  check (rejected_count >= 0)
);

create table public.import_records (
  organization_id text not null,
  id text not null,
  import_batch_id text not null,
  source_collection text not null,
  source_index integer,
  original_id text,
  entity_type text,
  target_table text,
  target_id text,
  status text not null,
  payload_sha256 text,
  warnings jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  raw_payload jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (organization_id, id),
  foreign key (organization_id, import_batch_id)
    references public.import_batches(organization_id, id) on delete cascade
);

create index construction_sites_constructor_idx on public.construction_sites (organization_id, constructor_id);
create index site_contacts_site_idx on public.site_contacts (organization_id, construction_site_id);
create index commercial_tables_scope_idx on public.commercial_tables (organization_id, scope_type, scope_id);
create index activities_site_release_idx on public.activities (organization_id, construction_site_id, release_date);
create index activities_constructor_idx on public.activities (organization_id, constructor_id);
create index activities_service_idx on public.activities (organization_id, service_type);
create index activity_equipment_items_activity_idx on public.activity_equipment_items (organization_id, activity_id, position);
create index activity_equipment_items_equipment_idx on public.activity_equipment_items (organization_id, physical_equipment_id);
create index activity_equipment_items_origin_idx on public.activity_equipment_items (organization_id, item_origin_id);
create index physical_equipment_patrimony_idx on public.physical_equipment (organization_id, current_patrimony_number);
create index physical_equipment_origin_idx on public.physical_equipment (organization_id, item_origin_id);
create index unit_patrimony_bindings_patrimony_idx on public.unit_patrimony_bindings (organization_id, current_patrimony_number);
create index unit_patrimony_bindings_equipment_idx on public.unit_patrimony_bindings (organization_id, physical_equipment_id);
create index patrimony_events_date_idx on public.patrimony_events (organization_id, event_date);
create index equipment_adjustments_identity_idx on public.equipment_config_adjustments (organization_id, item_id, unit_id, physical_equipment_id);
create index equipment_substitutions_source_idx on public.equipment_substitutions (organization_id, source_equipment_id);
create index equipment_substitutions_destination_idx on public.equipment_substitutions (organization_id, destination_equipment_id);
create index equipment_admin_events_date_idx on public.equipment_admin_events (organization_id, physical_equipment_id, event_date);
create index counterweight_events_date_idx on public.counterweight_events (organization_id, event_date);
create index tasks_completed_idx on public.tasks (organization_id, completed);
create index import_batches_sha256_idx on public.import_batches (organization_id, backup_sha256);
create index import_records_batch_idx on public.import_records (organization_id, import_batch_id);
create index import_records_original_idx on public.import_records (organization_id, source_collection, original_id);
create index import_records_source_index_idx on public.import_records (organization_id, import_batch_id, source_collection, source_index);
create index import_records_target_idx on public.import_records (organization_id, target_table, target_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger organization_settings_set_updated_at before update on public.organization_settings for each row execute function public.set_updated_at();
create trigger constructors_set_updated_at before update on public.constructors for each row execute function public.set_updated_at();
create trigger construction_sites_set_updated_at before update on public.construction_sites for each row execute function public.set_updated_at();
create trigger site_contacts_set_updated_at before update on public.site_contacts for each row execute function public.set_updated_at();
create trigger commercial_tables_set_updated_at before update on public.commercial_tables for each row execute function public.set_updated_at();
create trigger physical_equipment_set_updated_at before update on public.physical_equipment for each row execute function public.set_updated_at();
create trigger activities_set_updated_at before update on public.activities for each row execute function public.set_updated_at();
create trigger activity_equipment_items_set_updated_at before update on public.activity_equipment_items for each row execute function public.set_updated_at();
create trigger unit_patrimony_bindings_set_updated_at before update on public.unit_patrimony_bindings for each row execute function public.set_updated_at();
create trigger counterweight_inventory_set_updated_at before update on public.counterweight_inventory for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger import_batches_set_updated_at before update on public.import_batches for each row execute function public.set_updated_at();

-- RLS sem políticas: anon/authenticated permanecem sem acesso nesta fase.
alter table public.organizations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.constructors enable row level security;
alter table public.construction_sites enable row level security;
alter table public.site_contacts enable row level security;
alter table public.commercial_tables enable row level security;
alter table public.activities enable row level security;
alter table public.activity_equipment_items enable row level security;
alter table public.physical_equipment enable row level security;
alter table public.unit_patrimony_bindings enable row level security;
alter table public.patrimony_events enable row level security;
alter table public.equipment_config_adjustments enable row level security;
alter table public.equipment_substitutions enable row level security;
alter table public.equipment_admin_events enable row level security;
alter table public.counterweight_inventory enable row level security;
alter table public.counterweight_events enable row level security;
alter table public.tasks enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_records enable row level security;

comment on column public.physical_equipment.item_origin_id is 'Identificador opaco legado/operacional; não é FK obrigatória.';
comment on column public.activity_equipment_items.item_origin_id is 'Identificador opaco; pode usar legado:* ou patrimonio:*.';
comment on column public.unit_patrimony_bindings.id is 'idItem histórico; o vínculo pode existir sem atividade.';
comment on column public.activities.frozen_values is 'Cópia integral de valoresCongelados; a precedência financeira permanece na aplicação.';
comment on table public.import_batches is 'Metadados para importação futura; nenhum importador é criado nesta migration.';

commit;
