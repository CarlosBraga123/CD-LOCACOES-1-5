import { DEV_ORGANIZATION, DEV_PROJECT_REF } from "../auth/authSession";
import { obterRegraOperacao } from "../utils/regrasOperacao";

const campos = {
  constructor_id: "construtoraId", constructor_name: "construtora", construction_site_id: "obraId", construction_site_name: "obra",
  equipment_type: "equipamento", service_type: "servico", size: "tamanho", previous_size: "tamanhoAnterior", new_size: "tamanhoNovo",
  anchoring: "ancoragem", previous_anchoring: "ancoragemAnterior", quantity: "quantidade", balancinho_type: "tipoBalancinho", mini_crane_type: "tipoMiniGrua",
  uses_counterweight: "usaContrapeso", used_counterweight_before: "usaContrapesoAnterior", counterweight_change: "alteracaoContrapeso", counterweight_quantity: "quantidadeContrapeso",
  patrimony_number: "numeroPatrimonio", patrimony_numbers: "numerosPatrimonio", scheduled_date: "dataAgendamento", release_date: "dataLiberacao",
  responsible_team: "equipeResponsavel", field_os_number: "numeroOsCampo", app_os_number: "numeroOS", status: "status", started: "iniciado",
  notes: "observacoes", charges_service: "cobraServico", starts_rental: "iniciaLocacao", ends_rental: "encerraLocacao",
  pending_patrimony_link: "pendenteVinculoPatrimonio", patrimony_link_status: "statusVinculoPatrimonio", provisional_patrimony_exit: "saidaPatrimonialProvisoria",
  unit_service_value: "valorUnitarioServico", counterweight_service_addition: "adicionalServicoContrapeso", total_service_value: "valorTotalServico",
  monthly_rental_value: "valorMensalLocacao", counterweight_monthly_addition: "adicionalMensalContrapeso", total_monthly_rental_value: "valorTotalMensalLocacao", frozen_values: "valoresCongelados", source: "source",
};
const camposItem = {
  physical_equipment_id: "idEquipamento", item_origin_id: "idItemOrigem", unit_id: "idUnidade", origin_activity_id: "atividadeOrigemId",
  patrimony_number: "numeroPatrimonio", patrimony_link_status: "statusVinculoPatrimonio", equipment_type: "equipamento", balancinho_type: "tipoBalancinho", mini_crane_type: "tipoMiniGrua",
  size: "tamanho", previous_size: "tamanhoAnterior", new_size: "tamanhoNovo", anchoring: "ancoragem", previous_anchoring: "ancoragemAnterior",
  uses_counterweight: "usaContrapeso", used_counterweight_before: "usaContrapesoAnterior", counterweight_change: "alteracaoContrapeso",
};
export const COLUNAS_ATIVIDADE = ["organization_id", "id", "updated_at", ...Object.keys(campos)].join(",");
export const COLUNAS_ITEM = ["organization_id", "id", "activity_id", "position", ...Object.keys(camposItem)].join(",");
const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };
const texto = (value) => String(value ?? "").trim();
const mapear = (row, map) => Object.fromEntries(Object.entries(map).filter(([sql]) => row[sql] !== null && row[sql] !== undefined).map(([sql, app]) => [app, row[sql]]));
export function normalizarUuidCadastro(value) {
  if (typeof value !== "string" || !/^(?:\{[a-f0-9-]+\}|[a-f0-9-]+)$/i.test(value.trim())) fail("ID_INVALIDO", "UUID inválido.");
  const representation = value.trim().replace(/[{}]/g, "");
  if (!/^(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[a-f0-9]{32})$/i.test(representation)) fail("ID_INVALIDO", "UUID inválido.");
  const hex = representation.replace(/-/g, "").toLowerCase();
  if (!/^[a-f0-9]{12}4[a-f0-9]{3}[89ab][a-f0-9]{15}$/.test(hex)) fail("ID_INVALIDO", "Use UUID v4 válido.");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const dataValida = (value) => { try { return !value.startsWith("0000") && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value; } catch { return false; } };

export function mapearAtividadesRemotas(rows, items) {
  const ids = new Set();
  for (const row of rows) {
    if (row.organization_id !== DEV_ORGANIZATION || ids.has(row.id)) fail("INTEGRIDADE", "Atividade divergente ou duplicada na leitura remota.");
    ids.add(row.id);
  }
  const itemsIds = new Set();
  for (const item of items) {
    if (item.organization_id !== DEV_ORGANIZATION || !ids.has(item.activity_id) || itemsIds.has(item.id)) fail("INTEGRIDADE", "Item órfão, duplicado ou de outra organização.");
    itemsIds.add(item.id);
  }
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.activity_id)) groups.set(item.activity_id, []);
    groups.get(item.activity_id).push(item);
  }
  return rows.map((row) => {
    const result = { id: row.id, ...mapear(row, campos), updatedAt: row.updated_at };
    const linked = groups.get(row.id);
    if (linked?.length) result.itensEquipamentos = [...linked].sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity) || a.id.localeCompare(b.id)).map((item) => ({ idItem: item.id, ...mapear(item, camposItem) }));
    return result;
  });
}

// Contrato limitado ao primeiro teste: cadastro agendado, sem liberar ou reservar equipamento.
// Validação no navegador é antecipação de erros; o servidor deve repetir todos os guards.
export function gerarUuidCadastro(crypto = globalThis.crypto) {
  if (crypto?.randomUUID) return crypto.randomUUID();
  if (!crypto?.getRandomValues) fail("FORMATO", "Este navegador não permite gerar um identificador seguro.");
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join("-");
}
export function prepararCadastroAgendado(form, catalogo, id = gerarUuidCadastro()) {
  id = normalizarUuidCadastro(id);
  if (form.id && normalizarUuidCadastro(form.id) !== id) fail("CONFLITO", "Não é permitido substituir uma atividade existente.");
  const unique = (list, key) => {
    const found = list.filter((row) => texto(row.id) === texto(key) && row.organization_id === DEV_ORGANIZATION);
    if (found.length !== 1) fail("VINCULO", "Referência ausente, órfã ou ambígua.");
    return found[0];
  };
  const site = unique(catalogo.obras, form.obraId);
  const constructor = unique(catalogo.construtoras, site.constructor_id);
  if (form.construtoraId && texto(form.construtoraId) !== constructor.id) fail("VINCULO", "Construtora explícita divergente da obra.");
  if (form.construtora && (texto(form.construtora) !== texto(constructor.name) || (!form.construtoraId && catalogo.construtoras.filter((row) => texto(row.name) === texto(form.construtora)).length !== 1))) fail("VINCULO", "Nome explícito de construtora divergente ou ambíguo. Selecione pelo ID remoto.");
  if (form.dataLiberacao || form.iniciado === true) fail("ESCOPO", "O primeiro teste não pode liberar ou iniciar serviço.");
  if (form.valoresCongelados || Object.values(campos).filter((field) => field.startsWith("valor") || field.startsWith("adicional")).some((field) => form[field] !== undefined && form[field] !== null && form[field] !== "" && Number(form[field]) !== 0)) fail("ESCOPO", "Valores financeiros ficam fora do primeiro teste agendado.");
  if (["cobraServico", "iniciaLocacao", "encerraLocacao", "iniciado"].some((field) => form[field] !== undefined && typeof form[field] !== "boolean") || !Number.isInteger(Number(form.quantidadeContrapeso || 0)) || Number(form.quantidadeContrapeso || 0) < 0) fail("FORMATO", "Flags e quantidade de contrapeso inválidas.");
  if (!dataValida(texto(form.dataAgendamento))) fail("DATA", "Informe uma data de agendamento válida.");
  const regra = obterRegraOperacao(form.equipamento, form.servico);
  if (!regra) fail("SERVICO", "Operação não reconhecida pelo aplicativo.");
  if (!Array.isArray(form.itensEquipamentos) || !form.itensEquipamentos.length || Number(form.quantidade) !== form.itensEquipamentos.length) fail("ITENS", "A quantidade deve corresponder aos equipamentos individualizados.");
  const used = new Set();
  const items = form.itensEquipamentos.map((item, position) => {
    const equipment = unique(catalogo.equipamentos, item.idEquipamento);
    if (used.has(equipment.id)) fail("DUPLICIDADE", "O mesmo equipamento foi selecionado mais de uma vez.");
    used.add(equipment.id);
    if (equipment.active !== true || ["EM_MANUTENCAO", "INDISPONIVEL", "BAIXADO", "SEM_LOCALIZACAO_ATUAL"].includes(equipment.administrative_status) || equipment.equipment_type !== form.equipamento || (form.equipamento === "Balancinho" && equipment.balancinho_type !== form.tipoBalancinho) || (form.equipamento === "Mini Grua" && equipment.mini_crane_type !== form.tipoMiniGrua)) fail("VINCULO", "Equipamento inativo, indisponível ou incompatível com a atividade.");
    if (!texto(equipment.current_patrimony_number) || texto(item.numeroPatrimonio) !== texto(equipment.current_patrimony_number)) fail("PATRIMONIO", "Patrimônio não corresponde ao equipamento físico.");
    return { id: `${id}:${position}`, position, physical_equipment_id: equipment.id, item_origin_id: equipment.item_origin_id ?? null, unit_id: equipment.id,
      patrimony_number: equipment.current_patrimony_number, equipment_type: equipment.equipment_type, balancinho_type: equipment.balancinho_type ?? null, mini_crane_type: equipment.mini_crane_type ?? null,
      size: texto(item.tamanho || form.tamanho) || null, anchoring: texto(item.ancoragem || form.ancoragem) || null, uses_counterweight: item.usaContrapeso === true };
  });
  // Não gera preços a partir de tabelas locais. A etapa financeira fica fora deste teste.
  const activity = { id, organization_id: DEV_ORGANIZATION, constructor_id: constructor.id, construction_site_id: site.id,
    equipment_type: form.equipamento, service_type: form.servico, quantity: items.length, scheduled_date: form.dataAgendamento, release_date: null, started: false,
    responsible_team: texto(form.equipeResponsavel) || null, field_os_number: texto(form.numeroOsCampo) || null, notes: texto(form.observacoes) || null,
    balancinho_type: form.tipoBalancinho || null, mini_crane_type: form.tipoMiniGrua || null,
    charges_service: form.cobraServico ?? regra.cobraServico, starts_rental: form.iniciaLocacao ?? regra.iniciaLocacao, ends_rental: form.encerraLocacao ?? regra.encerraLocacao,
    uses_counterweight: items.some((item) => item.uses_counterweight), counterweight_quantity: Number(form.quantidadeContrapeso || 0), counterweight_change: form.alteracaoContrapeso || "nenhuma",
    source: "app-dev-agendamento-v1" };
  return { activity, items };
}

export function criarTransporteCadastroRpc(client) {
  return async (comando) => {
    if (client?.supabaseUrl !== 'https://ldamjmjcgjmujiougcrs.supabase.co') fail("ACESSO", "Cadastro permitido somente no DEV.");
    const { data, error } = await client.rpc("create_dev_scheduled_activity", { p_command: comando });
    if (error) throw error;
    if (data?.id !== normalizarUuidCadastro(comando.activity.id) || typeof data?.created !== "boolean") fail("RESULTADO_INCERTO", "Resposta de cadastro não confirmada.");
    return data;
  };
}

export function criarAtividadeSupabaseRepository(client, { contextoAtual, transporteCadastro = null } = {}) {
  async function autorizar() {
    const context = contextoAtual?.();
    if (!client || client.supabaseUrl !== `https://${DEV_PROJECT_REF}.supabase.co` || context?.status !== "authorized" || context.membership?.organization_id !== DEV_ORGANIZATION || context.membership?.active !== true || !["admin", "gestor"].includes(context.membership?.role)) fail("ACESSO", "Sessão DEV autorizada necessária.");
    const { data, error } = await client.auth.getUser();
    if (error || data?.user?.id !== context.session?.user?.id) fail("SESSAO", "Sessão expirada ou não validada.");
    const { data: memberships, error: memberError } = await client.from("current_membership_context").select("organization_id,role,active").eq("organization_id", DEV_ORGANIZATION).limit(2);
    if (memberError || memberships?.length !== 1 || memberships[0].organization_id !== DEV_ORGANIZATION || memberships[0].active !== true || !["admin", "gestor"].includes(memberships[0].role)) fail("ACESSO", "Membership não autorizada.");
    return context;
  }
  async function listarTabela(table, columns, signal) {
    const results = [], ids = new Set();
    for (let offset = 0; ; offset += 200) {
      let query = client.from(table).select(columns).eq("organization_id", DEV_ORGANIZATION).order("id", { ascending: true }).range(offset, offset + 199);
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error || !Array.isArray(data)) fail("LEITURA", "Leitura remota indisponível. Nenhum dado local foi usado como substituto.");
      for (const row of data) {
        if (row.organization_id !== DEV_ORGANIZATION || ids.has(row.id)) fail("INTEGRIDADE", "Leitura remota divergente. Atualize novamente.");
        ids.add(row.id); results.push(row);
      }
      if (data.length < 200) return results;
      if (offset >= 100000) fail("LIMITE", "Leitura excedeu o limite seguro.");
    }
  }
  return {
    fonte: "supabase-dev",
    async listarAtualizado({ signal } = {}) {
      const context = await autorizar();
      const [rows, items, construtoras, obras, equipamentos, vinculos, ajustes, substituicoes, tabelasComerciais] = await Promise.all([
        listarTabela("activities", COLUNAS_ATIVIDADE, signal), listarTabela("activity_equipment_items", COLUNAS_ITEM, signal),
        listarTabela("constructors", "organization_id,id,name,active", signal), listarTabela("construction_sites", "organization_id,id,name,constructor_id", signal),
        listarTabela("physical_equipment", "organization_id,id,item_origin_id,current_patrimony_number,equipment_type,balancinho_type,mini_crane_type,administrative_status,active", signal),
        listarTabela("unit_patrimony_bindings", "organization_id,id,physical_equipment_id,item_origin_id,unit_id,current_patrimony_number", signal),
        listarTabela("equipment_config_adjustments", "organization_id,id,item_id,physical_equipment_id,unit_id,construction_site_id,adjustment_date,size,anchoring,uses_counterweight,source_created_at", signal),
        listarTabela("equipment_substitutions", "organization_id,id,event_date,source_equipment_id,destination_equipment_id,source_unit_id,destination_unit_id", signal),
        listarTabela("commercial_tables", "organization_id,id,scope_type,scope_id,services,rentals", signal),
      ]);
      if (contextoAtual()?.session?.user?.id !== context.session.user.id || contextoAtual()?.status !== "authorized") fail("SESSAO", "A sessão mudou durante a leitura.");
      return { atividades: mapearAtividadesRemotas(rows, items), construtoras, obras, equipamentos, vinculos, ajustes, substituicoes, tabelasComerciais };
    },
    async cadastrarIndividual(comando) {
      if (!transporteCadastro) fail("DEPENDENCIA", "Gravação bloqueada: falta autorizar e instalar a operação atômica no DEV.");
      await autorizar();
      // Transporte atômico futuro: nunca insert + insert separados, upsert ou salvarTodos.
      // Sem retry automático: timeout exige consulta por ID antes de outra tentativa.
      try { return await transporteCadastro(comando); }
      catch (error) {
        if (error?.code === "23503") fail("VINCULO", "Cadastro rejeitado: vínculo de obra ou patrimônio divergente. Atualize o catálogo e confira o equipamento selecionado; não reenvie a tentativa antiga.");
        if (error?.code === "55000") fail("INDISPONIVEL", "Cadastro rejeitado: disponibilidade patrimonial não comprovada pelo histórico. Atualize o catálogo antes de uma nova tentativa.");
        if (error?.code === "22023") fail("FORMATO", "Cadastro rejeitado: dados incompatíveis com o cadastro agendado permitido.");
        if (error?.code === "23505") fail("CONFLITO", "Identificador já utilizado com conteúdo diferente.");
        if (error?.code === "42501") fail("ACESSO", "Cadastro negado pelo servidor.");
        fail("RESULTADO_INCERTO", "Cadastro sem confirmação. Consulte o mesmo ID antes de tentar novamente.");
      }
    },
  };
}
