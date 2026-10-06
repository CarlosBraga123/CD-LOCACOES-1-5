import crypto from "node:crypto";

export const ORGANIZATION_ID = "cd-locacoes";
export const ORGANIZATION_NAME = "CD Locações";
export const SOURCE = "backup-localstorage-fase-2b";

const array = (value) => (Array.isArray(value) ? value : []);
const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const text = (value) => value === undefined || value === null ? null : String(value);
const number = (value) => value === "" || value === undefined || value === null
  ? null
  : Number.isFinite(Number(value)) ? Number(value) : null;
const bool = (value) => typeof value === "boolean" ? value : value === undefined || value === null ? null : Boolean(value);
const clone = (value) => value === undefined ? null : JSON.parse(JSON.stringify(value));

export const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
};

export const stableStringify = (value, space = 2) => JSON.stringify(stableValue(value), null, space);
export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const deterministicId = (...parts) => sha256(parts.map((part) => text(part) ?? "").join("\u001f")).slice(0, 32);
const nestedOriginId = (parentId, localIndex, childId) => [
  `parent=${encodeURIComponent(text(parentId) ?? "")}`,
  `index=${localIndex}`,
  `child=${encodeURIComponent(text(childId) ?? "")}`,
].join(";");
const sourceMeta = (raw) => ({ source: SOURCE, schema_version: 1, raw_payload: clone(raw), imported_at: null });

export const persistedValuesDiffer = (existing, incoming, fields) => fields.some((field) => {
  const left = existing?.[field] ?? null;
  const right = incoming?.[field] ?? null;
  return stableStringify(left, 0) !== stableStringify(right, 0);
});

const mapCommercialTable = ({ id, scopeType, scopeId, constructorId, raw }) => ({
  organization_id: ORGANIZATION_ID,
  id,
  scope_type: scopeType,
  scope_id: text(scopeId),
  origin: text(raw?.origem),
  version: number(raw?.versao),
  base_version: number(raw?.versaoBase),
  constructor_id: text(constructorId),
  services: clone(raw?.servicos ?? {}),
  rentals: clone(raw?.locacoes ?? {}),
  source_updated_at: text(raw?.atualizadoEm),
  ...sourceMeta(raw),
});

const columns = {
  organizations: ["id", "name", "active"],
  organization_settings: ["organization_id", "company_name", "company_logo", "balancinho_parts", "anchoring_parts", "legacy_service_values", "legacy_default_values", "source", "schema_version", "raw_payload", "imported_at"],
  constructors: ["organization_id", "id", "name", "legal_name", "trade_name", "tax_id", "state_registration", "municipal_registration", "active", "responsible_name", "responsible_role", "phone", "whatsapp", "email", "financial_email", "postal_code", "street", "street_number", "address_complement", "neighborhood", "city", "state", "payment_terms", "commercial_responsible", "internal_notes", "source", "schema_version", "raw_payload", "imported_at"],
  construction_sites: ["organization_id", "id", "constructor_id", "constructor_name", "name", "tax_id", "cno", "internal_code", "status", "postal_code", "street", "street_number", "address_complement", "neighborhood", "city", "state", "reference_point", "engineer", "legacy_address", "notes", "responsible_name", "responsible_role", "phone", "whatsapp", "email", "delivery_hours", "access_instructions", "separate_delivery_address", "delivery_address", "source", "schema_version", "raw_payload", "imported_at"],
  site_contacts: ["organization_id", "construction_site_id", "id", "contact_type", "name", "role", "crea", "phone", "whatsapp", "email", "is_primary", "active", "position", "raw_payload"],
  commercial_tables: ["organization_id", "id", "scope_type", "scope_id", "origin", "version", "base_version", "constructor_id", "services", "rentals", "source_updated_at", "source", "schema_version", "raw_payload", "imported_at"],
  physical_equipment: ["organization_id", "id", "item_origin_id", "current_patrimony_number", "equipment_type", "balancinho_type", "mini_crane_type", "administrative_status", "registration_date", "notes", "active", "source", "schema_version", "raw_payload", "imported_at"],
  activities: ["organization_id", "id", "constructor_id", "constructor_name", "construction_site_id", "construction_site_name", "equipment_type", "service_type", "size", "previous_size", "new_size", "anchoring", "previous_anchoring", "quantity", "balancinho_type", "mini_crane_type", "uses_counterweight", "used_counterweight_before", "counterweight_change", "counterweight_quantity", "patrimony_number", "patrimony_numbers", "scheduled_date", "release_date", "responsible_team", "field_os_number", "app_os_number", "status", "started", "notes", "charges_service", "starts_rental", "ends_rental", "pending_patrimony_link", "patrimony_link_status", "provisional_patrimony_exit", "unit_service_value", "counterweight_service_addition", "total_service_value", "monthly_rental_value", "counterweight_monthly_addition", "total_monthly_rental_value", "frozen_values", "source", "schema_version", "raw_payload", "imported_at"],
  activity_equipment_items: ["organization_id", "id", "activity_id", "position", "physical_equipment_id", "item_origin_id", "unit_id", "origin_activity_id", "patrimony_number", "patrimony_link_status", "equipment_type", "balancinho_type", "mini_crane_type", "size", "previous_size", "new_size", "anchoring", "previous_anchoring", "uses_counterweight", "used_counterweight_before", "counterweight_change", "raw_payload"],
  unit_patrimony_bindings: ["organization_id", "id", "physical_equipment_id", "item_origin_id", "unit_id", "current_patrimony_number", "source", "schema_version", "raw_payload", "imported_at"],
  patrimony_events: ["organization_id", "binding_id", "id", "event_type", "event_date", "previous_patrimony_number", "new_patrimony_number", "construction_site_id", "reason", "notes", "raw_payload"],
  equipment_config_adjustments: ["organization_id", "id", "item_id", "physical_equipment_id", "unit_id", "construction_site_id", "adjustment_date", "size", "anchoring", "uses_counterweight", "notes", "origin", "source_created_at", "source", "schema_version", "raw_payload", "imported_at"],
  equipment_substitutions: ["organization_id", "id", "event_date", "substitution_type", "source_equipment_id", "destination_equipment_id", "source_unit_id", "destination_unit_id", "source_site_id", "destination_site_id", "reason", "notes", "source", "schema_version", "raw_payload", "imported_at"],
  equipment_admin_events: ["organization_id", "physical_equipment_id", "id", "event_type", "event_date", "previous_status", "new_status", "reason", "notes", "related_patrimony_number", "previous_site_id", "new_site_id", "substitution_id", "raw_payload"],
  counterweight_inventory: ["organization_id", "total_quantity", "source", "schema_version", "raw_payload", "imported_at"],
  counterweight_events: ["organization_id", "id", "event_date", "previous_quantity", "new_quantity", "reason", "notes", "raw_payload"],
  tasks: ["organization_id", "id", "description", "completed", "source_created_at", "completed_at", "completed_by", "source", "schema_version", "raw_payload", "imported_at"],
  import_batches: ["organization_id", "id", "backup_sha256", "backup_schema_version", "source_app", "source_exported_at", "status", "inserted_count", "updated_count", "identical_count", "rejected_count", "warnings", "conflicts", "errors", "started_at", "finished_at"],
  import_records: ["organization_id", "id", "import_batch_id", "source_collection", "source_index", "original_id", "entity_type", "target_table", "target_id", "status", "payload_sha256", "warnings", "conflicts", "errors", "raw_payload", "processed_at"],
};

const jsonColumns = new Set(["balancinho_parts", "anchoring_parts", "legacy_service_values", "legacy_default_values", "services", "rentals", "patrimony_numbers", "frozen_values", "warnings", "conflicts", "errors", "raw_payload"]);
const numericColumns = new Set(["schema_version", "version", "base_version", "position", "quantity", "counterweight_quantity", "unit_service_value", "counterweight_service_addition", "total_service_value", "monthly_rental_value", "counterweight_monthly_addition", "total_monthly_rental_value", "total_quantity", "previous_quantity", "new_quantity", "backup_schema_version", "inserted_count", "updated_count", "identical_count", "rejected_count", "source_index"]);
const booleanColumns = new Set(["active", "is_primary", "separate_delivery_address", "uses_counterweight", "used_counterweight_before", "started", "charges_service", "starts_rental", "ends_rental", "pending_patrimony_link", "provisional_patrimony_exit", "completed"]);

const sqlValue = (column, value) => {
  if (value === null || value === undefined) return "null";
  if (jsonColumns.has(column)) return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  if (numericColumns.has(column)) return Number.isFinite(Number(value)) ? String(Number(value)) : "null";
  if (booleanColumns.has(column)) return value ? "true" : "false";
  return `'${String(value).replaceAll("'", "''")}'`;
};

export const createSql = (data) => {
  const lines = [
    "-- Artefato offline da Fase 2B. Revise antes de executar manualmente.",
    "-- Não contém credenciais e não conecta ao Supabase.",
    "begin;",
    "",
  ];
  for (const [table, rows] of Object.entries(data.tables)) {
    if (!rows.length) continue;
    const cols = columns[table];
    if (!cols) throw new Error(`Tabela sem definição SQL: ${table}`);
    lines.push(`-- ${table}: ${rows.length} registro(s)`);
    for (const row of rows) {
      const values = cols.map((column) => sqlValue(column, row[column]));
      const updates = cols.filter((column) => !["organization_id", "id", "construction_site_id", "binding_id", "physical_equipment_id"].includes(column));
      const conflict = table === "organizations" ? "(id)"
        : table === "organization_settings" || table === "counterweight_inventory" ? "(organization_id)"
        : table === "site_contacts" ? "(organization_id, construction_site_id, id)"
        : table === "patrimony_events" ? "(organization_id, binding_id, id)"
        : table === "equipment_admin_events" ? "(organization_id, physical_equipment_id, id)"
        : `(organization_id, id)`;
      const persisted = updates.map((column) => `${table}.${column}`).join(", ");
      const incoming = updates.map((column) => `excluded.${column}`).join(", ");
      lines.push(`insert into public.${table} (${cols.join(", ")}) values (${values.join(", ")}) on conflict ${conflict} do update set ${updates.map((column) => `${column} = excluded.${column}`).join(", ")} where (${persisted}) is distinct from (${incoming});`);
    }
    lines.push("");
  }
  lines.push("commit;", "");
  return lines.join("\n");
};

export const prepareImport = (backup, backupSha256) => {
  const errors = [];
  const warnings = [];
  const infos = [];
  const tables = Object.fromEntries(Object.keys(columns).map((name) => [name, []]));
  const track = [];
  const sourceIndexes = new Map();
  const add = (level, code, message, details = {}) => ({ level, code, message, details });
  const error = (...args) => errors.push(add("ERROR", ...args));
  const warn = (...args) => warnings.push(add("WARNING", ...args));
  const info = (...args) => infos.push(add("INFO", ...args));
  const push = (table, row, sourceCollection, _localIndex, raw, entityType, originalId) => {
    const sourceIndex = sourceIndexes.get(sourceCollection) ?? 0;
    sourceIndexes.set(sourceCollection, sourceIndex + 1);
    tables[table].push(row);
    track.push({ table, row, sourceCollection, sourceIndex, raw, entityType, originalId: text(originalId) });
  };
  const requireId = (value, collection, index) => {
    const id = text(value);
    if (!id) error("MISSING_ID", `${collection}[${index}] não possui ID obrigatório.`, { collection, index });
    return id;
  };

  if (!backup || typeof backup !== "object" || Array.isArray(backup)) error("INVALID_ROOT", "O backup deve ser um objeto JSON.");
  const expectedArrays = ["atividades", "patrimonioEquipamentos", "equipamentosPatrimonio", "substituicoesEquipamentos", "ajustesConfiguracaoEquipamentos", "construtoras", "obras", "tarefas", "usuarios"];
  for (const key of expectedArrays) if (backup[key] !== undefined && !Array.isArray(backup[key])) error("INVALID_COLLECTION", `${key} deve ser uma lista.`, { collection: key });
  if (backup.schemaVersion === undefined) warn("LEGACY_BACKUP", "Backup legado sem schemaVersion/app/exportedAt; os dados serão preservados com versão de origem 0.");

  push("organizations", { id: ORGANIZATION_ID, name: ORGANIZATION_NAME, active: true }, "__organization", 0, { id: ORGANIZATION_ID, name: ORGANIZATION_NAME }, "organization", ORGANIZATION_ID);
  const settingsRaw = { empresaNome: backup.empresaNome, empresaLogo: backup.empresaLogo, pecasBalancinho: backup.pecasBalancinho, pecasAncoragem: backup.pecasAncoragem, valoresServicos: backup.valoresServicos, valoresPadrao: backup.valoresPadrao };
  push("organization_settings", {
    organization_id: ORGANIZATION_ID, company_name: text(backup.empresaNome), company_logo: text(backup.empresaLogo),
    balancinho_parts: clone(backup.pecasBalancinho ?? {}), anchoring_parts: clone(backup.pecasAncoragem ?? {}),
    legacy_service_values: clone(backup.valoresServicos ?? {}), legacy_default_values: clone(backup.valoresPadrao ?? {}), ...sourceMeta(settingsRaw),
  }, "configuracoes", 0, settingsRaw, "organization_settings", ORGANIZATION_ID);

  array(backup.construtoras).forEach((raw, index) => {
    const id = requireId(raw?.id, "construtoras", index);
    push("constructors", { organization_id: ORGANIZATION_ID, id, name: text(raw?.nome), legal_name: text(raw?.razaoSocial), trade_name: text(raw?.nomeFantasia), tax_id: text(raw?.cnpj), state_registration: text(raw?.inscricaoEstadual), municipal_registration: text(raw?.inscricaoMunicipal), active: bool(raw?.ativa), responsible_name: text(raw?.responsavel), responsible_role: text(raw?.cargoResponsavel), phone: text(raw?.telefone), whatsapp: text(raw?.whatsapp), email: text(raw?.email), financial_email: text(raw?.emailFinanceiro), postal_code: text(raw?.cep), street: text(raw?.logradouro), street_number: text(raw?.numero), address_complement: text(raw?.complemento), neighborhood: text(raw?.bairro), city: text(raw?.cidade), state: text(raw?.estado), payment_terms: text(raw?.condicaoPagamento), commercial_responsible: text(raw?.responsavelComercial), internal_notes: text(raw?.observacoesInternas), ...sourceMeta(raw) }, "construtoras", index, raw, "constructor", id);
    if (raw?.tabelaComercial) push("commercial_tables", mapCommercialTable({ id: `constructor:${id}`, scopeType: "CONSTRUCTOR", scopeId: id, constructorId: id, raw: raw.tabelaComercial }), "construtoras.tabelaComercial", index, raw.tabelaComercial, "commercial_table", `constructor:${id}`);
  });

  array(backup.obras).forEach((raw, index) => {
    const id = requireId(raw?.id, "obras", index);
    push("construction_sites", { organization_id: ORGANIZATION_ID, id, constructor_id: text(raw?.construtoraId), constructor_name: text(raw?.construtora), name: text(raw?.nome), tax_id: text(raw?.cnpj), cno: text(raw?.cno), internal_code: text(raw?.codigoInterno), status: text(raw?.situacao), postal_code: text(raw?.cep), street: text(raw?.logradouro), street_number: text(raw?.numero), address_complement: text(raw?.complemento), neighborhood: text(raw?.bairro), city: text(raw?.cidade), state: text(raw?.estado), reference_point: text(raw?.pontoReferencia), engineer: text(raw?.engenheiro), legacy_address: text(raw?.endereco), notes: text(raw?.observacoes), responsible_name: text(raw?.responsavel), responsible_role: text(raw?.cargoResponsavel), phone: text(raw?.telefone), whatsapp: text(raw?.whatsapp), email: text(raw?.email), delivery_hours: text(raw?.horarioEntrega), access_instructions: text(raw?.orientacoesAcesso), separate_delivery_address: bool(raw?.enderecoEntregaDiferente), delivery_address: text(raw?.enderecoEntrega), ...sourceMeta(raw) }, "obras", index, raw, "construction_site", id);
    array(raw?.contatos).forEach((contact, position) => {
      const contactId = text(contact?.id);
      if (!contactId) error("CONTACT_MISSING_ID", `obras[${index}].contatos[${position}] não possui ID; nenhum ID operacional foi inventado.`, { siteId: id, position });
      push("site_contacts", { organization_id: ORGANIZATION_ID, construction_site_id: id, id: contactId, contact_type: text(contact?.tipo), name: text(contact?.nome), role: text(contact?.cargo), crea: text(contact?.crea), phone: text(contact?.telefone), whatsapp: text(contact?.whatsapp), email: text(contact?.email), is_primary: bool(contact?.principal), active: bool(contact?.ativo), position, raw_payload: clone(contact) }, "obras.contatos", position, contact, "site_contact", nestedOriginId(id, position, contactId));
    });
    if (raw?.tabelaComercial) push("commercial_tables", mapCommercialTable({ id: `site:${id}`, scopeType: "CONSTRUCTION_SITE", scopeId: id, constructorId: raw.construtoraId, raw: raw.tabelaComercial }), "obras.tabelaComercial", index, raw.tabelaComercial, "commercial_table", `site:${id}`);
  });
  if (backup.tabelaComercialPadrao) push("commercial_tables", mapCommercialTable({ id: "default", scopeType: "DEFAULT", raw: backup.tabelaComercialPadrao }), "tabelaComercialPadrao", 0, backup.tabelaComercialPadrao, "commercial_table", "default");

  array(backup.equipamentosPatrimonio).forEach((raw, index) => {
    const id = requireId(raw?.idEquipamento, "equipamentosPatrimonio", index);
    push("physical_equipment", { organization_id: ORGANIZATION_ID, id, item_origin_id: text(raw?.idItemOrigem), current_patrimony_number: text(raw?.numeroPatrimonioAtual), equipment_type: text(raw?.equipamento), balancinho_type: text(raw?.tipoBalancinho), mini_crane_type: text(raw?.tipoMiniGrua), administrative_status: text(raw?.situacaoAdministrativa), registration_date: text(raw?.dataCadastro), notes: text(raw?.observacao), active: bool(raw?.ativo), ...sourceMeta(raw) }, "equipamentosPatrimonio", index, raw, "physical_equipment", id);
    array(raw?.historicoAdministrativo).forEach((event, eventIndex) => {
      const eventId = requireId(event?.id, `equipamentosPatrimonio[${index}].historicoAdministrativo`, eventIndex);
      push("equipment_admin_events", { organization_id: ORGANIZATION_ID, physical_equipment_id: id, id: eventId, event_type: text(event?.tipo), event_date: text(event?.data), previous_status: text(event?.situacaoAnterior), new_status: text(event?.situacaoNova), reason: text(event?.motivo), notes: text(event?.observacao), related_patrimony_number: text(event?.numeroPatrimonio), previous_site_id: text(event?.obraIdAnterior), new_site_id: text(event?.obraId), substitution_id: text(event?.substituicaoId), raw_payload: clone(event) }, "equipamentosPatrimonio.historicoAdministrativo", eventIndex, event, "equipment_admin_event", nestedOriginId(id, eventIndex, eventId));
    });
  });

  array(backup.atividades).forEach((raw, index) => {
    const id = requireId(raw?.id, "atividades", index);
    const fieldOs = raw?.numeroOsCampo ?? raw?.numeroOSCampo;
    if (raw?.numeroOsCampo !== undefined && raw?.numeroOSCampo !== undefined && text(raw.numeroOsCampo) !== text(raw.numeroOSCampo)) warn("FIELD_OS_CONFLICT", "Atividade possui numeroOsCampo e numeroOSCampo divergentes; numeroOsCampo teve precedência.", { activityId: id });
    push("activities", { organization_id: ORGANIZATION_ID, id, constructor_id: text(raw?.construtoraId), constructor_name: text(raw?.construtora), construction_site_id: text(raw?.obraId), construction_site_name: text(raw?.obra), equipment_type: text(raw?.equipamento), service_type: text(raw?.servico), size: text(raw?.tamanho), previous_size: text(raw?.tamanhoAnterior), new_size: text(raw?.tamanhoNovo), anchoring: text(raw?.ancoragem), previous_anchoring: text(raw?.ancoragemAnterior), quantity: number(raw?.quantidade), balancinho_type: text(raw?.tipoBalancinho), mini_crane_type: text(raw?.tipoMiniGrua), uses_counterweight: bool(raw?.usaContrapeso), used_counterweight_before: bool(raw?.usaContrapesoAnterior), counterweight_change: text(raw?.alteracaoContrapeso), counterweight_quantity: number(raw?.quantidadeContrapeso), patrimony_number: text(raw?.numeroPatrimonio), patrimony_numbers: clone(raw?.numerosPatrimonio ?? []), scheduled_date: text(raw?.dataAgendamento), release_date: text(raw?.dataLiberacao), responsible_team: text(raw?.equipeResponsavel), field_os_number: text(fieldOs), app_os_number: text(raw?.numeroOS), status: text(raw?.status), started: bool(raw?.iniciado), notes: text(raw?.observacoes), charges_service: bool(raw?.cobraServico), starts_rental: bool(raw?.iniciaLocacao), ends_rental: bool(raw?.encerraLocacao), pending_patrimony_link: bool(raw?.pendenteVinculoPatrimonio), patrimony_link_status: text(raw?.statusVinculoPatrimonio), provisional_patrimony_exit: bool(raw?.saidaPatrimonialProvisoria), unit_service_value: number(raw?.valorUnitarioServico ?? raw?.valor), counterweight_service_addition: number(raw?.adicionalServicoContrapeso), total_service_value: number(raw?.valorTotalServico), monthly_rental_value: number(raw?.valorMensalLocacao), counterweight_monthly_addition: number(raw?.adicionalMensalContrapeso), total_monthly_rental_value: number(raw?.valorTotalMensalLocacao), frozen_values: raw?.valoresCongelados === undefined ? null : clone(raw.valoresCongelados), ...sourceMeta(raw) }, "atividades", index, raw, "activity", id);
    array(raw?.itensEquipamentos).forEach((item, position) => {
      const itemId = requireId(item?.idItem, `atividades[${index}].itensEquipamentos`, position);
      push("activity_equipment_items", { organization_id: ORGANIZATION_ID, id: itemId, activity_id: id, position, physical_equipment_id: text(item?.idEquipamento), item_origin_id: text(item?.idItemOrigem), unit_id: text(item?.idUnidade), origin_activity_id: text(item?.atividadeOrigemId), patrimony_number: text(item?.numeroPatrimonio), patrimony_link_status: text(item?.statusVinculoPatrimonio), equipment_type: text(item?.equipamento), balancinho_type: text(item?.tipoBalancinho), mini_crane_type: text(item?.tipoMiniGrua), size: text(item?.tamanho), previous_size: text(item?.tamanhoAnterior), new_size: text(item?.tamanhoNovo), anchoring: text(item?.ancoragem), previous_anchoring: text(item?.ancoragemAnterior), uses_counterweight: bool(item?.usaContrapeso), used_counterweight_before: bool(item?.usaContrapesoAnterior), counterweight_change: text(item?.alteracaoContrapeso), raw_payload: clone(item) }, "atividades.itensEquipamentos", position, item, "activity_equipment_item", nestedOriginId(id, position, itemId));
    });
  });

  array(backup.patrimonioEquipamentos).forEach((raw, index) => {
    const id = requireId(raw?.idItem, "patrimonioEquipamentos", index);
    push("unit_patrimony_bindings", { organization_id: ORGANIZATION_ID, id, physical_equipment_id: text(raw?.idEquipamento), item_origin_id: text(raw?.idItemOrigem), unit_id: text(raw?.idUnidade), current_patrimony_number: text(raw?.numeroPatrimonioAtual), ...sourceMeta(raw) }, "patrimonioEquipamentos", index, raw, "unit_patrimony_binding", id);
    array(raw?.historico).forEach((event, eventIndex) => {
      const eventId = requireId(event?.id, `patrimonioEquipamentos[${index}].historico`, eventIndex);
      push("patrimony_events", { organization_id: ORGANIZATION_ID, binding_id: id, id: eventId, event_type: text(event?.tipo), event_date: text(event?.data), previous_patrimony_number: text(event?.numeroAnterior ?? event?.numeroPatrimonioAnterior), new_patrimony_number: text(event?.numeroNovo ?? event?.numeroPatrimonioNovo), construction_site_id: text(event?.obraId), reason: text(event?.motivo), notes: text(event?.observacao), raw_payload: clone(event) }, "patrimonioEquipamentos.historico", eventIndex, event, "patrimony_event", nestedOriginId(id, eventIndex, eventId));
    });
  });

  array(backup.ajustesConfiguracaoEquipamentos).forEach((raw, index) => {
    const id = requireId(raw?.id, "ajustesConfiguracaoEquipamentos", index);
    push("equipment_config_adjustments", { organization_id: ORGANIZATION_ID, id, item_id: text(raw?.idItem), physical_equipment_id: text(raw?.idEquipamento), unit_id: text(raw?.idUnidade), construction_site_id: text(raw?.obraId), adjustment_date: text(raw?.data), size: text(raw?.tamanho), anchoring: text(raw?.ancoragem), uses_counterweight: bool(raw?.usaContrapeso), notes: text(raw?.observacao), origin: text(raw?.origem), source_created_at: text(raw?.criadoEm), ...sourceMeta(raw) }, "ajustesConfiguracaoEquipamentos", index, raw, "equipment_config_adjustment", id);
  });
  array(backup.substituicoesEquipamentos).forEach((raw, index) => {
    const id = requireId(raw?.id, "substituicoesEquipamentos", index);
    push("equipment_substitutions", { organization_id: ORGANIZATION_ID, id, event_date: text(raw?.data), substitution_type: text(raw?.tipo), source_equipment_id: text(raw?.equipamentoOrigemId), destination_equipment_id: text(raw?.equipamentoDestinoId), source_unit_id: text(raw?.unidadeOrigemId), destination_unit_id: text(raw?.unidadeDestinoId), source_site_id: text(raw?.obraOrigemId), destination_site_id: text(raw?.obraDestinoId), reason: text(raw?.motivo), notes: text(raw?.observacao), ...sourceMeta(raw) }, "substituicoesEquipamentos", index, raw, "equipment_substitution", id);
  });

  const kit = object(backup.controleKitContrapeso);
  push("counterweight_inventory", { organization_id: ORGANIZATION_ID, total_quantity: number(kit.quantidadeTotal) ?? 0, ...sourceMeta(kit) }, "controleKitContrapeso", 0, kit, "counterweight_inventory", ORGANIZATION_ID);
  array(kit.historico).forEach((raw, index) => {
    const id = requireId(raw?.id, "controleKitContrapeso.historico", index);
    push("counterweight_events", { organization_id: ORGANIZATION_ID, id, event_date: text(raw?.data), previous_quantity: number(raw?.quantidadeAnterior), new_quantity: number(raw?.quantidadeNova), reason: text(raw?.motivo), notes: text(raw?.observacao), raw_payload: clone(raw) }, "controleKitContrapeso.historico", index, raw, "counterweight_event", id);
  });
  array(backup.tarefas).forEach((raw, index) => {
    const id = requireId(raw?.id, "tarefas", index);
    push("tasks", { organization_id: ORGANIZATION_ID, id, description: text(raw?.texto), completed: bool(raw?.concluida), source_created_at: text(raw?.criadaEm), completed_at: text(raw?.concluidaEm), completed_by: text(raw?.concluidaPor), ...sourceMeta(raw) }, "tarefas", index, raw, "task", id);
  });
  if (array(backup.usuarios).length) warn("USERS_NOT_MIGRATED", `${backup.usuarios.length} usuário(s) foram deliberadamente excluídos; autenticação será tratada em fase própria.`, { count: backup.usuarios.length });

  for (const [table, rows] of Object.entries(tables)) {
    const keys = new Map();
    rows.forEach((row, index) => {
      const key = table === "organizations" ? row.id
        : table === "organization_settings" || table === "counterweight_inventory" ? row.organization_id
        : table === "site_contacts" ? `${row.organization_id}|${row.construction_site_id}|${row.id}`
        : table === "patrimony_events" ? `${row.organization_id}|${row.binding_id}|${row.id}`
        : table === "equipment_admin_events" ? `${row.organization_id}|${row.physical_equipment_id}|${row.id}`
        : `${row.organization_id}|${row.id}`;
      if (!key || key.endsWith("|null")) error("NULL_TARGET_KEY", `${table}[${index}] possui chave primária ausente.`, { table, index });
      if (keys.has(key)) error("DUPLICATE_TARGET_KEY", `Chave duplicada em ${table}.`, { table, key, indexes: [keys.get(key), index] });
      else keys.set(key, index);
    });
  }
  const constructorIds = new Set(tables.constructors.map((row) => row.id));
  const siteIds = new Set(tables.construction_sites.map((row) => row.id));
  tables.construction_sites.forEach((row) => { if (row.constructor_id && !constructorIds.has(row.constructor_id)) warn("MISSING_CONSTRUCTOR_REFERENCE", "Obra referencia construtora ausente; a referência textual foi preservada e não bloqueia o schema.", { siteId: row.id, constructorId: row.constructor_id }); });
  tables.activities.forEach((row) => { if (row.construction_site_id && !siteIds.has(row.construction_site_id)) warn("MISSING_SITE_REFERENCE", "Atividade referencia obra ausente; a referência textual foi preservada e não bloqueia o schema.", { activityId: row.id, siteId: row.construction_site_id }); });
  info("LEGACY_ACTIVITIES_WITHOUT_ITEMS", "Atividades antigas sem itens foram mantidas sem inventar unidades.", { count: tables.activities.length - new Set(tables.activity_equipment_items.map((row) => row.activity_id)).size });
  info("LEADING_ZERO_PATRIMONY_PRESERVED", "Números patrimoniais permanecem TEXT; zeros à esquerda não são convertidos.");
  info("NO_FINANCIAL_RECALCULATION", "Valores financeiros foram apenas copiados para colunas de destino e raw_payload; nenhum cálculo foi executado.");

  const batchId = `initial-${backupSha256.slice(0, 20)}`;
  const blocking = errors.length > 0;
  const recordRows = track.map((item, index) => ({
    organization_id: ORGANIZATION_ID,
    id: deterministicId(batchId, item.sourceCollection, item.sourceIndex, item.table, item.row.id ?? item.row.organization_id, index),
    import_batch_id: batchId,
    source_collection: item.sourceCollection,
    source_index: item.sourceIndex,
    original_id: item.originalId,
    entity_type: item.entityType,
    target_table: item.table,
    target_id: text(item.row.id ?? item.row.organization_id),
    status: blocking ? "BLOCKED" : "PREPARED",
    payload_sha256: sha256(stableStringify(item.raw, 0)),
    warnings: [], conflicts: [], errors: [], raw_payload: clone(item.raw), processed_at: null,
  }));
  const intendedCount = Object.entries(tables).filter(([name]) => !["import_batches", "import_records"].includes(name)).reduce((sum, [, rows]) => sum + rows.length, 0);
  tables.import_batches.push({ organization_id: ORGANIZATION_ID, id: batchId, backup_sha256: backupSha256, backup_schema_version: Number.isInteger(Number(backup.schemaVersion)) ? Number(backup.schemaVersion) : 0, source_app: text(backup.app ?? "CD_LOCACOES_LEGACY"), source_exported_at: text(backup.exportedAt), status: blocking ? "BLOCKED" : "PREPARED", inserted_count: 0, updated_count: 0, identical_count: 0, rejected_count: errors.length, warnings: clone(warnings), conflicts: [], errors: clone(errors), started_at: null, finished_at: null });
  tables.import_records.push(...recordRows);

  const counts = Object.fromEntries(Object.entries(tables).map(([table, rows]) => [table, rows.length]));
  return {
    data: { format_version: 1, deterministic: true, organization: { id: ORGANIZATION_ID, name: ORGANIZATION_NAME }, backup: { sha256: backupSha256, schema_version: backup.schemaVersion ?? 0, app: backup.app ?? null, exported_at: backup.exportedAt ?? null }, batch_id: batchId, tables },
    report: { classification: blocking ? "B. NÃO APROVADO" : "A. ARTEFATO DE IMPORTAÇÃO APROVADO PARA REVISÃO", executable_sql_generated: !blocking, remote_execution_performed: false, deterministic: true, backup_sha256: backupSha256, backup_schema_version: backup.schemaVersion ?? 0, batch_id: batchId, organization_id: ORGANIZATION_ID, source_counts: Object.fromEntries(Object.keys(backup).sort().map((key) => [key, Array.isArray(backup[key]) ? backup[key].length : backup[key] && typeof backup[key] === "object" ? Object.keys(backup[key]).length : backup[key] === null ? null : typeof backup[key]])), target_counts: counts, intended_rows_before_audit_records: intendedCount, totals: { errors: errors.length, warnings: warnings.length, infos: infos.length }, errors, warnings, infos, exclusions: { usuarios: array(backup.usuarios).length }, guarantees: ["Backup de entrada tratado como somente leitura.", "Nenhuma conexão remota ou credencial utilizada.", "IDs e patrimônios preservados como texto.", "raw_payload preserva os objetos originais.", "valoresCongelados preservado integralmente em JSONB.", "Atividades antigas sem itens não receberam unidades inventadas.", "Nenhum cálculo financeiro foi executado." ] },
  };
};

export const formatReportText = (report) => {
  const lines = [
    "FASE 2B — PREPARAÇÃO OFFLINE DA IMPORTAÇÃO INICIAL",
    `Classificação: ${report.classification}`,
    `SHA-256 do backup: ${report.backup_sha256}`,
    `Lote: ${report.batch_id}`,
    `Organização: ${report.organization_id}`,
    `SQL executável gerado: ${report.executable_sql_generated ? "SIM" : "NÃO"}`,
    `Execução remota realizada: ${report.remote_execution_performed ? "SIM" : "NÃO"}`,
    "",
    "CONTAGENS DE DESTINO",
    ...Object.entries(report.target_counts).map(([key, value]) => `${key}: ${value}`),
    "",
    `Erros: ${report.totals.errors}`,
    `Avisos: ${report.totals.warnings}`,
    `Informações: ${report.totals.infos}`,
    "",
    "ERROS",
    ...(report.errors.length ? report.errors.map((item) => `[${item.code}] ${item.message} ${JSON.stringify(item.details)}`) : ["Nenhum."]),
    "",
    "AVISOS",
    ...(report.warnings.length ? report.warnings.map((item) => `[${item.code}] ${item.message} ${JSON.stringify(item.details)}`) : ["Nenhum."]),
    "",
    "INFORMAÇÕES",
    ...report.infos.map((item) => `[${item.code}] ${item.message} ${JSON.stringify(item.details)}`),
    "",
    "GARANTIAS",
    ...report.guarantees.map((item) => `- ${item}`),
    "",
  ];
  return lines.join("\n");
};
