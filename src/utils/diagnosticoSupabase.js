export const TABELAS_DIAGNOSTICO = [
  "constructors",
  "construction_sites",
  "activities",
  "physical_equipment",
]

const COLUNAS_PROIBIDAS_EXATAS = new Set([
  "size",
  "previous_size",
  "new_size",
  "anchoring",
  "previous_anchoring",
  "raw_payload",
  "frozen_values",
  "charges_service",
  "password",
  "senha",
  "access_token",
  "refresh_token",
  "authorization",
  "headers",
  "credentials",
  "secret",
  "api_key",
  "email",
  "phone",
  "tax_id",
])

const TERMOS_PROIBIDOS_EM_COLUNAS = ["valor", "value", "price", "financial"]

const CAMPOS_NUMERICOS_AMOSTRA = [
  "activity_quantity", "item_position", "counterweight_quantity", "days_rented",
  "quantity", "opening_quantity", "entries_in_month", "exits_in_month", "closing_quantity",
]
const CAMPOS_BOOLEANOS_AMOSTRA = [
  "is_counterweight", "uses_counterweight", "used_counterweight_before",
  "pending_patrimony_link", "full_month",
]
const CAMPOS_DATA_AMOSTRA = [
  "release_date", "entry_date", "exit_date", "competence_start", "competence_end",
]

const numeroDiagnosticoSeguro = (valor) => {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor
  if (typeof valor === "string" && /^-?\d+(?:\.\d+)?$/.test(valor)) {
    const numero = Number(valor)
    if (Number.isFinite(numero)) return numero
  }
  return undefined
}

// Nunca repassar a linha original: nem objetos aninhados, nomes, IDs ou patrimônio.
export function projetarLinhaDiagnostico(registro) {
  if (!registro || typeof registro !== "object" || Array.isArray(registro)) return {}
  const linha = {}
  CAMPOS_NUMERICOS_AMOSTRA.forEach((campo) => {
    const numero = numeroDiagnosticoSeguro(registro[campo])
    if (numero !== undefined) linha[campo] = numero
  })
  CAMPOS_BOOLEANOS_AMOSTRA.forEach((campo) => {
    if (typeof registro[campo] === "boolean") linha[campo] = registro[campo]
  })
  CAMPOS_DATA_AMOSTRA.forEach((campo) => {
    const valor = registro[campo]
    if (valor === null || (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor))) {
      linha[campo] = valor
    }
  })
  return linha
}

export function criarAmostrasDiagnostico(registros = []) {
  if (detectarColunasProibidas(obterColunasRetornadas(registros)).length) return []
  return registros.slice(0, 3).map(projetarLinhaDiagnostico)
    .filter((linha) => Object.keys(linha).length > 0)
}

const codigoErroSeguro = (error) =>
  typeof error?.code === "string" && /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(error.code)
    ? error.code : ""

export function obterColunasRetornadas(registros = []) {
  const colunas = new Set()
  registros.forEach((registro) => {
    if (!registro || typeof registro !== "object" || Array.isArray(registro)) return
    Object.keys(registro).forEach((coluna) => colunas.add(coluna))
  })
  return [...colunas]
}

export function detectarColunasProibidas(colunas = []) {
  return colunas.filter((coluna) => {
    const normalizada = String(coluna || "").toLowerCase()
    return COLUNAS_PROIBIDAS_EXATAS.has(normalizada)
      || TERMOS_PROIBIDOS_EM_COLUNAS.some((termo) => normalizada.includes(termo))
  })
}

export function obterObrasRetornadas(registros = []) {
  const obrasPorId = new Map()

  registros.forEach((registro) => {
    if (!registro || typeof registro !== "object" || Array.isArray(registro)) return

    const id = registro.construction_site_id
    if (id === null || id === undefined || String(id).trim() === "") return

    if (!obrasPorId.has(id)) {
      obrasPorId.set(id, {
        id,
        nome: registro.construction_site_name,
      })
    }
  })

  return [...obrasPorId.values()].sort((obraA, obraB) => {
    const comparacaoNome = String(obraA.nome ?? "").localeCompare(
      String(obraB.nome ?? ""),
      "pt-BR",
      { sensitivity: "base" },
    )
    return comparacaoNome || String(obraA.id).localeCompare(String(obraB.id), "pt-BR")
  })
}

export function validarSaldosLocacao(registros = []) {
  const inconsistentes = []

  registros.forEach((registro) => {
    const saldoInicial = Number(registro?.opening_quantity)
    const entradas = Number(registro?.entries_in_month)
    const saidas = Number(registro?.exits_in_month)
    const saldoFinal = Number(registro?.closing_quantity)
    const valoresValidos = [saldoInicial, entradas, saidas, saldoFinal]
      .every((valor) => Number.isFinite(valor))
    const saldoEsperado = valoresValidos ? saldoInicial + entradas - saidas : null
    const consistente = valoresValidos && Math.abs(saldoEsperado - saldoFinal) < 1e-9

    if (!consistente) {
      inconsistentes.push({
        period_id: registro?.period_id,
        construction_site_name: registro?.construction_site_name,
        patrimony_number: registro?.patrimony_number,
        opening_quantity: registro?.opening_quantity,
        entries_in_month: registro?.entries_in_month,
        exits_in_month: registro?.exits_in_month,
        closing_quantity: registro?.closing_quantity,
        saldoEsperado,
      })
    }
  })

  const total = registros.length
  return {
    status: total === 0 ? "SEM_REGISTROS" : inconsistentes.length === 0 ? "OK" : "ERRO",
    total,
    consistentes: total - inconsistentes.length,
    inconsistentes,
  }
}

export function erroRepresentaNegacaoLeitura(error) {
  const codigo = String(error?.code || "")
  const mensagem = String(error?.message || "").toLowerCase()
  return codigo === "42501"
    || mensagem.includes("permission denied")
    || mensagem.includes("acesso não autorizado")
    || mensagem.includes("row-level security")
}

async function executarRpcRelatorio(cliente, sessao, nomeRpc, parametros, analisarRegistros) {
  if (!sessao?.user?.id) {
    return {
      status: "SEM_SESSAO",
      quantidade: 0,
      colunas: [],
      colunasProibidas: [],
      obrasRetornadas: [],
      amostras: [],
      mensagem: "Sessão Supabase autenticada não encontrada.",
    }
  }

  let resposta
  try {
    resposta = await cliente.rpc(nomeRpc, parametros)
  } catch (error) {
    return {
      status: "ERRO",
      quantidade: 0,
      colunas: [],
      colunasProibidas: [],
      obrasRetornadas: [],
      amostras: [],
      mensagem: "Falha inesperada ao consultar o relatório. Detalhes externos omitidos.",
      codigo: codigoErroSeguro(error),
    }
  }

  const { data, error } = resposta
  if (error) {
    return {
      status: erroRepresentaNegacaoLeitura(error) ? "NEGADO" : "ERRO",
      quantidade: 0,
      colunas: [],
      colunasProibidas: [],
      obrasRetornadas: [],
      amostras: [],
      mensagem: erroRepresentaNegacaoLeitura(error)
        ? "Leitura não autorizada para esta sessão."
        : "Falha ao consultar o relatório. Detalhes externos omitidos.",
      codigo: codigoErroSeguro(error),
    }
  }

  const registros = Array.isArray(data) ? data : []
  const colunas = obterColunasRetornadas(registros)
  const colunasProibidas = detectarColunasProibidas(colunas)
  const retornoSeguro = colunasProibidas.length === 0
  const linhasParaValidar = retornoSeguro ? registros.map((registro, indice) => ({
    ...projetarLinhaDiagnostico(registro),
    period_id: `linha-${indice + 1}`,
  })) : []
  return {
    status: !retornoSeguro ? "ERRO" : registros.length === 0 ? "SEM_REGISTROS" : "OK",
    quantidade: registros.length,
    colunas,
    colunasProibidas,
    obrasRetornadas: retornoSeguro ? obterObrasRetornadas(registros) : [],
    ...(analisarRegistros ? { validacaoSaldos: analisarRegistros(linhasParaValidar) } : {}),
    amostras: criarAmostrasDiagnostico(registros),
    mensagem: !retornoSeguro
      ? "Contrato de leitura inesperado. Amostras e dados de contexto ocultados."
      : registros.length === 0
      ? "Chamada autorizada, sem registros no escopo informado."
      : "Chamada executada com sucesso.",
  }
}

export function testarRelatorioServicosCliente(cliente, sessao, {
  organizationId,
  dataInicial,
  dataFinal,
  obraId = "",
}) {
  return executarRpcRelatorio(cliente, sessao, "get_client_service_report", {
    target_organization_id: organizationId,
    date_from: dataInicial,
    date_to: dataFinal,
    target_construction_site_id: String(obraId || "").trim() || null,
  })
}

export function testarRelatorioLocacaoCliente(cliente, sessao, {
  organizationId,
  ano,
  mes,
  obraId = "",
}) {
  return executarRpcRelatorio(cliente, sessao, "get_client_rental_report", {
    target_organization_id: organizationId,
    competence_year: Number(ano),
    competence_month: Number(mes),
    target_construction_site_id: String(obraId || "").trim() || null,
  }, validarSaldosLocacao)
}

export async function buscarMembershipPropria(cliente) {
  const { data, error } = await cliente
    .from("current_membership_context")
    .select("organization_id, role, active")
    .limit(1)

  if (error) throw error
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

export async function contarRegistros(cliente, tabela) {
  const { count, error } = await cliente
    .from(tabela)
    .select("*", { count: "exact", head: true })

  if (error) throw error
  return count ?? 0
}
