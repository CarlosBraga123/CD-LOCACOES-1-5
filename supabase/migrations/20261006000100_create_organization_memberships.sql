begin;

-- Fase 3B.1: identidade organizacional para políticas RLS futuras.
-- Esta migration não cria usuários, memberships ou policies operacionais.

create table public.organization_memberships (
  organization_id text not null
    references public.organizations(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  role text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint organization_memberships_role_check
    check (role in ('admin', 'gestor', 'funcionario', 'cliente'))
);

-- A chave primária já indexa consultas iniciadas por organization_id.
create index organization_memberships_user_idx
  on public.organization_memberships (user_id);

create trigger organization_memberships_set_updated_at
before update on public.organization_memberships
for each row execute function public.set_updated_at();

alter table public.organization_memberships enable row level security;

-- Defesa adicional: a tabela permanece fechada até uma migration futura
-- conceder privilégios e criar policies explícitas para o piloto.
revoke all on table public.organization_memberships from public, anon, authenticated;

create or replace function public.is_active_organization_member(target_organization_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.active
  );
$$;

create or replace function public.has_active_organization_role(
  target_organization_id text,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.active
      and membership.role = any(allowed_roles)
  );
$$;

-- Funções SECURITY DEFINER evitam recursão quando forem usadas nas policies
-- da própria membership. Ainda não são expostas aos papéis do frontend.
revoke all on function public.is_active_organization_member(text)
  from public, anon, authenticated;
revoke all on function public.has_active_organization_role(text, text[])
  from public, anon, authenticated;

comment on table public.organization_memberships is
  'Associação entre auth.users e organizações; roles são específicas por organização.';
comment on function public.is_active_organization_member(text) is
  'Helper fechado para policies futuras; identifica o usuário exclusivamente por auth.uid().';
comment on function public.has_active_organization_role(text, text[]) is
  'Helper fechado para policies futuras; valida membership ativa e role por auth.uid().';

commit;
