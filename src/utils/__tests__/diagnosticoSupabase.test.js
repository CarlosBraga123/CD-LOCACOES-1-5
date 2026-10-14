import { describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import * as diagnostico from "../diagnosticoSupabase"
import {
  buscarMembershipPropria,
  contarRegistros,
  criarAmostrasDiagnostico,
  projetarLinhaDiagnostico,
  detectarColunasProibidas,
  obterObrasRetornadas,
  testarRelatorioLocacaoCliente,
  testarRelatorioServicosCliente,
  validarSaldosLocacao,
} from "../diagnosticoSupabase"

describe("diagnosticoSupabase", () => {
  it("projeta somente datas, números e flags permitidos, sem contexto pessoal", () => {
    const linha = {
      entry_date: "2030-01-01", exit_date: null, quantity: "2", full_month: false,
      period_id: "id-privado", patrimony_number: "patrimonio-privado",
      construction_site_name: "nome-privado", equipment_type: "texto-livre",
      campo_novo: { segredo: "segredo-ficticio" },
    }
    expect(projetarLinhaDiagnostico(linha)).toEqual({
      quantity: 2, full_month: false, entry_date: "2030-01-01", exit_date: null,
    })
    expect(linha.campo_novo.segredo).toBe("segredo-ficticio")
  })

  it("não exibe objetos ou segredos inseridos em campos conhecidos", async () => {
    const marcador = "SEGREDO_FICTICIO_NAO_EXIBIR"
    const resultado = await testarRelatorioLocacaoCliente(
      { rpc: vi.fn().mockResolvedValue({ data: [{
        period_id: marcador, quantity: { token: marcador },
        entry_date: marcador, full_month: marcador,
        opening_quantity: [marcador], closing_quantity: marcador,
      }], error: null }) },
      { user: { id: "usuario-ficticio" } },
      { organizationId: "organizacao-ficticia", ano: 2030, mes: 1 },
    )
    expect(resultado.amostras).toEqual([])
    expect(resultado.validacaoSaldos.status).toBe("ERRO")
    expect(JSON.stringify(resultado)).not.toContain(marcador)
  })

  it("bloqueia todas as amostras quando a quarta linha contém coluna proibida", async () => {
    const linhas = [{ quantity: 1 }, { quantity: 2 }, { quantity: 3 }, {
      quantity: 4, raw_payload: { password: "segredo-ficticio" }, frozen_values: { mensal: 123 },
    }]
    const resultado = await testarRelatorioServicosCliente(
      { rpc: vi.fn().mockResolvedValue({ data: linhas, error: null }) },
      { user: { id: "usuario-ficticio" } },
      { organizationId: "organizacao-ficticia", dataInicial: "2030-01-01", dataFinal: "2030-01-31" },
    )
    expect(resultado.status).toBe("ERRO")
    expect(resultado.amostras).toEqual([])
    expect(resultado.obrasRetornadas).toEqual([])
    expect(resultado.colunasProibidas).toEqual(["raw_payload", "frozen_values"])
    expect(JSON.stringify(resultado)).not.toContain("segredo-ficticio")
  })

  it("omite mensagens externas com credenciais mantendo SQLSTATE válido", async () => {
    const resultado = await testarRelatorioServicosCliente(
      { rpc: vi.fn().mockResolvedValue({ data: null, error: {
        code: "42501", message: "permission denied password=segredo-ficticio",
      } }) },
      { user: { id: "usuario-ficticio" } },
      { organizationId: "organizacao-ficticia" },
    )
    expect(resultado).toMatchObject({ status: "NEGADO", codigo: "42501" })
    expect(JSON.stringify(resultado)).not.toContain("segredo-ficticio")
  })

  it("omite mensagens e códigos arbitrários em exceções de transporte", async () => {
    const resultado = await testarRelatorioLocacaoCliente(
      { rpc: vi.fn().mockRejectedValue({ message: "token=segredo-ficticio", code: "segredo-ficticio" }) },
      { user: { id: "usuario-ficticio" } },
      { organizationId: "organizacao-ficticia", ano: 2030, mes: 1 },
    )
    expect(resultado).toMatchObject({ status: "ERRO", codigo: "" })
    expect(JSON.stringify(resultado)).not.toContain("segredo-ficticio")
  })

  it("rejeita tipos inesperados, valores não finitos e datas com conteúdo livre", () => {
    expect(projetarLinhaDiagnostico({
      quantity: Infinity, days_rented: NaN, opening_quantity: {},
      full_month: "true", exit_date: "2030-01-01 password=segredo", campo_extra: "segredo",
    })).toEqual({})
  })

  it("mantém no máximo três amostras projetadas", () => {
    expect(criarAmostrasDiagnostico([1, 2, 3, 4].map((quantity) => ({
      quantity, campo_extra: "nao-exibir",
    })))).toEqual([{ quantity: 1 }, { quantity: 2 }, { quantity: 3 }])
  })

  it("os dois testes de relatório usam RPC sem acessar endpoints de escrita", async () => {
    const cliente = { rpc: vi.fn().mockResolvedValue({ data: [], error: null }), from: vi.fn() }
    const sessao = { user: { id: "usuario-ficticio" } }
    await testarRelatorioServicosCliente(cliente, sessao, { organizationId: "org" })
    await testarRelatorioLocacaoCliente(cliente, sessao, { organizationId: "org", ano: 2030, mes: 1 })
    expect(cliente.rpc).toHaveBeenCalledTimes(2)
    expect(cliente.from).not.toHaveBeenCalled()
  })

  it("a interface não possui import, handler ou controle do antigo teste de INSERT", () => {
    const fonte = readFileSync(new URL("../../components/DiagnosticoSupabase.jsx", import.meta.url), "utf8")
    expect(fonte).not.toMatch(/testarBloqueioEscrita|testarEscrita|Teste controlado de escrita|\.insert\(/)
    expect(fonte).toContain('valor="Somente leitura"')
  })

  it("o utilitário do diagnóstico não exporta a antiga operação de escrita", () => {
    expect(diagnostico).not.toHaveProperty("testarBloqueioEscrita")
    expect(diagnostico).not.toHaveProperty("criarPayloadTesteEscrita")
  })

  it("consulta o contexto de membership exposto para a sessão", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [{ organization_id: "organizacao-ficticia", role: "auditor", active: true }],
      error: null,
    })
    const select = vi.fn(() => ({ limit }))
    const cliente = { from: vi.fn(() => ({ select })) }

    await expect(buscarMembershipPropria(cliente)).resolves.toEqual({
      organization_id: "organizacao-ficticia",
      role: "auditor",
      active: true,
    })
    expect(cliente.from).toHaveBeenCalledWith("current_membership_context")
    expect(select).toHaveBeenCalledWith("organization_id, role, active")
    expect(limit).toHaveBeenCalledWith(1)
  })

  it("retorna null quando nenhuma membership é visível", async () => {
    const cliente = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
    }

    await expect(buscarMembershipPropria(cliente)).resolves.toBeNull()
  })

  it("obtém contagem exata sem baixar registros", async () => {
    const select = vi.fn().mockResolvedValue({ count: 7, error: null })
    const cliente = { from: vi.fn(() => ({ select })) }

    await expect(contarRegistros(cliente, "activities")).resolves.toBe(7)
    expect(select).toHaveBeenCalledWith("*", { count: "exact", head: true })
  })

  it("chama o RPC de serviços com os parâmetros corretos e distingue retorno vazio", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null })
    const cliente = { rpc }
    const sessao = { user: { id: "usuario-ficticio" } }

    const resultado = await testarRelatorioServicosCliente(cliente, sessao, {
      organizationId: "organizacao-ficticia",
      dataInicial: "2030-01-01",
      dataFinal: "2030-01-31",
      obraId: "",
    })

    expect(rpc).toHaveBeenCalledWith("get_client_service_report", {
      target_organization_id: "organizacao-ficticia",
      date_from: "2030-01-01",
      date_to: "2030-01-31",
      target_construction_site_id: null,
    })
    expect(resultado).toMatchObject({
      status: "SEM_REGISTROS",
      quantidade: 0,
      colunas: [],
      colunasProibidas: [],
      obrasRetornadas: [],
      amostras: [],
    })
  })

  it("chama o RPC de locação e preserva exatamente as colunas retornadas", async () => {
    const linhas = [{
      period_id: "periodo-ficticio",
      construction_site_id: "site-ficticio",
      construction_site_name: "Obra Fictícia",
      patrimony_number: "0000",
      quantity: 1,
    }]
    const rpc = vi.fn().mockResolvedValue({ data: linhas, error: null })

    const resultado = await testarRelatorioLocacaoCliente(
      { rpc },
      { user: { id: "usuario-ficticio" } },
      { organizationId: "organizacao-ficticia", ano: "2030", mes: "7", obraId: "site-ficticio" },
    )

    expect(rpc).toHaveBeenCalledWith("get_client_rental_report", {
      target_organization_id: "organizacao-ficticia",
      competence_year: 2030,
      competence_month: 7,
      target_construction_site_id: "site-ficticio",
    })
    expect(resultado.status).toBe("OK")
    expect(resultado.quantidade).toBe(1)
    expect(resultado.colunas).toEqual([
      "period_id",
      "construction_site_id",
      "construction_site_name",
      "patrimony_number",
      "quantity",
    ])
    expect(resultado.obrasRetornadas).toEqual([
      { id: "site-ficticio", nome: "Obra Fictícia" },
    ])
    expect(resultado.amostras).toEqual([{ quantity: 1 }])
  })

  it("lista uma obra uma única vez mesmo quando existem várias linhas dela", () => {
    expect(obterObrasRetornadas([
      { construction_site_id: "obra-ficticia-a", construction_site_name: "Obra Aurora" },
      { construction_site_id: "obra-ficticia-a", construction_site_name: "Obra Aurora" },
      { construction_site_id: "obra-ficticia-a", construction_site_name: "Obra Aurora" },
    ])).toEqual([
      { id: "obra-ficticia-a", nome: "Obra Aurora" },
    ])
  })

  it("preserva IDs e nomes e ordena todas as obras pelo nome", () => {
    expect(obterObrasRetornadas([
      { construction_site_id: "obra-ficticia-z", construction_site_name: "Obra Zênite" },
      { construction_site_id: "obra-ficticia-a", construction_site_name: "Obra Aurora" },
      { construction_site_id: "obra-ficticia-m", construction_site_name: "Obra Mirante" },
    ])).toEqual([
      { id: "obra-ficticia-a", nome: "Obra Aurora" },
      { id: "obra-ficticia-m", nome: "Obra Mirante" },
      { id: "obra-ficticia-z", nome: "Obra Zênite" },
    ])
  })

  it("não inventa obra quando o retorno está vazio", () => {
    expect(obterObrasRetornadas([])).toEqual([])
  })

  it("obtém as obras do resultado completo e não somente das três amostras", async () => {
    const linhas = [
      { activity_id: "atividade-1", construction_site_id: "obra-a", construction_site_name: "Obra Alfa" },
      { activity_id: "atividade-2", construction_site_id: "obra-a", construction_site_name: "Obra Alfa" },
      { activity_id: "atividade-3", construction_site_id: "obra-a", construction_site_name: "Obra Alfa" },
      { activity_id: "atividade-4", construction_site_id: "obra-b", construction_site_name: "Obra Beta" },
      { activity_id: "atividade-5", construction_site_id: "obra-g", construction_site_name: "Obra Gama" },
    ]
    const resultado = await testarRelatorioServicosCliente(
      { rpc: vi.fn().mockResolvedValue({ data: linhas, error: null }) },
      { user: { id: "usuario-ficticio" } },
      { organizationId: "organizacao-ficticia", dataInicial: "2030-01-01", dataFinal: "2030-01-31" },
    )

    expect(resultado.amostras).toEqual([])
    expect(resultado.obrasRetornadas).toEqual([
      { id: "obra-a", nome: "Obra Alfa" },
      { id: "obra-b", nome: "Obra Beta" },
      { id: "obra-g", nome: "Obra Gama" },
    ])
  })

  it("valida todas as linhas consistentes do saldo de locação", () => {
    expect(validarSaldosLocacao([
      { opening_quantity: 2, entries_in_month: 3, exits_in_month: 1, closing_quantity: 4 },
      { opening_quantity: 5, entries_in_month: 0, exits_in_month: 2, closing_quantity: 3 },
    ])).toEqual({
      status: "OK",
      total: 2,
      consistentes: 2,
      inconsistentes: [],
    })
  })

  it("identifica uma linha inconsistente com todos os campos de conferência", () => {
    const resultado = validarSaldosLocacao([{
      period_id: "periodo-inconsistente",
      construction_site_name: "Obra Fictícia",
      patrimony_number: "0000",
      opening_quantity: 4,
      entries_in_month: 2,
      exits_in_month: 1,
      closing_quantity: 9,
    }])

    expect(resultado).toEqual({
      status: "ERRO",
      total: 1,
      consistentes: 0,
      inconsistentes: [{
        period_id: "periodo-inconsistente",
        construction_site_name: "Obra Fictícia",
        patrimony_number: "0000",
        opening_quantity: 4,
        entries_in_month: 2,
        exits_in_month: 1,
        closing_quantity: 9,
        saldoEsperado: 5,
      }],
    })
  })

  it("lista somente as várias linhas inconsistentes", () => {
    const resultado = validarSaldosLocacao([
      { period_id: "periodo-ok", opening_quantity: 1, entries_in_month: 1, exits_in_month: 0, closing_quantity: 2 },
      { period_id: "periodo-erro-a", opening_quantity: 1, entries_in_month: 0, exits_in_month: 0, closing_quantity: 3 },
      { period_id: "periodo-erro-b", opening_quantity: 5, entries_in_month: 0, exits_in_month: 2, closing_quantity: 4 },
    ])

    expect(resultado.status).toBe("ERRO")
    expect(resultado.consistentes).toBe(1)
    expect(resultado.total).toBe(3)
    expect(resultado.inconsistentes.map((linha) => linha.period_id)).toEqual([
      "periodo-erro-a",
      "periodo-erro-b",
    ])
  })

  it("trata retorno vazio de forma neutra", () => {
    expect(validarSaldosLocacao([])).toEqual({
      status: "SEM_REGISTROS",
      total: 0,
      consistentes: 0,
      inconsistentes: [],
    })
  })

  it("converte valores numéricos recebidos como número ou string", () => {
    expect(validarSaldosLocacao([
      { opening_quantity: "2", entries_in_month: 3, exits_in_month: "1", closing_quantity: 4 },
      { opening_quantity: 0, entries_in_month: "2", exits_in_month: 0, closing_quantity: "2" },
    ])).toMatchObject({ status: "OK", consistentes: 2, total: 2 })
  })

  it("valida o resultado completo da Locação e não somente as três amostras", async () => {
    const linhas = [
      { period_id: "p-1", opening_quantity: 1, entries_in_month: 0, exits_in_month: 0, closing_quantity: 1 },
      { period_id: "p-2", opening_quantity: 1, entries_in_month: 1, exits_in_month: 0, closing_quantity: 2 },
      { period_id: "p-3", opening_quantity: 3, entries_in_month: 0, exits_in_month: 1, closing_quantity: 2 },
      { period_id: "p-4", opening_quantity: 4, entries_in_month: 0, exits_in_month: 0, closing_quantity: 99 },
    ]
    const resultado = await testarRelatorioLocacaoCliente(
      { rpc: vi.fn().mockResolvedValue({ data: linhas, error: null }) },
      { user: { id: "usuario-ficticio" } },
      { organizationId: "organizacao-ficticia", ano: 2030, mes: 8 },
    )

    expect(resultado.amostras).toEqual([
      { opening_quantity: 1, entries_in_month: 0, exits_in_month: 0, closing_quantity: 1 },
      { opening_quantity: 1, entries_in_month: 1, exits_in_month: 0, closing_quantity: 2 },
      { opening_quantity: 3, entries_in_month: 0, exits_in_month: 1, closing_quantity: 2 },
    ])
    expect(resultado.validacaoSaldos).toMatchObject({
      status: "ERRO",
      consistentes: 3,
      total: 4,
    })
    expect(resultado.validacaoSaldos.inconsistentes[0].period_id).toBe("linha-4")
  })

  it("detecta colunas proibidas somente pelos nomes das colunas", () => {
    expect(detectarColunasProibidas([
      "activity_id",
      "raw_payload",
      "monthly_value",
      "financial_total",
      "safe_column",
    ])).toEqual(["raw_payload", "monthly_value", "financial_total"])
    expect(detectarColunasProibidas(["notes"])).toEqual([])
  })

  it("distingue negação de permissão de erro inesperado do RPC", async () => {
    const sessao = { user: { id: "usuario-ficticio" } }
    const negado = await testarRelatorioServicosCliente(
      { rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "42501", message: "Acesso não autorizado" } }) },
      sessao,
      { organizationId: "organizacao-ficticia", dataInicial: "2030-01-01", dataFinal: "2030-01-31" },
    )
    const inesperado = await testarRelatorioLocacaoCliente(
      { rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "XX000", message: "Falha interna fictícia" } }) },
      sessao,
      { organizationId: "organizacao-ficticia", ano: 2030, mes: 1 },
    )

    expect(negado).toMatchObject({ status: "NEGADO", codigo: "42501", quantidade: 0 })
    expect(inesperado).toMatchObject({ status: "ERRO", codigo: "XX000", quantidade: 0 })
  })

  it("não chama RPC sem sessão autenticada", async () => {
    const rpc = vi.fn()
    const resultado = await testarRelatorioServicosCliente(
      { rpc },
      null,
      { organizationId: "organizacao-ficticia", dataInicial: "2030-01-01", dataFinal: "2030-01-31" },
    )

    expect(rpc).not.toHaveBeenCalled()
    expect(resultado.status).toBe("SEM_SESSAO")
  })

  it("não inclui token ou credencial no resultado do diagnóstico", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ activity_id: "atividade-ficticia" }], error: null })
    const resultado = await testarRelatorioServicosCliente(
      { rpc },
      { user: { id: "usuario-ficticio" }, access_token: "token-secreto-ficticio" },
      { organizationId: "organizacao-ficticia", dataInicial: "2030-01-01", dataFinal: "2030-01-31" },
    )

    expect(JSON.stringify(resultado)).not.toContain("token-secreto-ficticio")
    expect(resultado).not.toHaveProperty("session")
    expect(resultado).not.toHaveProperty("access_token")
  })
})
