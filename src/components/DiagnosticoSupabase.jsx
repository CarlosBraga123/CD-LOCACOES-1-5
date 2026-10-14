import { useEffect, useState } from "react"
import { supabase, supabaseConfigurado } from "../supabase"
import { useAuth } from "../auth/AuthContext"
import {
  contarRegistros,
  TABELAS_DIAGNOSTICO,
  testarRelatorioLocacaoCliente,
  testarRelatorioServicosCliente,
} from "../utils/diagnosticoSupabase"

const NAO_TESTADO = "Não testado"

function statusVisual(valor) {
  if (valor === "OK" || valor === "Bloqueado como esperado" || valor === "SEM_REGISTROS") {
    return "text-emerald-700"
  }
  if (valor === "Erro" || valor === "ERRO" || valor === "NEGADO") return "text-red-700"
  return "text-gray-500"
}

function LinhaStatus({ nome, valor, detalhe }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-100 py-2 last:border-0">
      <span className="font-medium text-gray-700">{nome}</span>
      <span className={`text-sm font-semibold ${statusVisual(valor)}`}>
        {valor}{detalhe ? ` — ${detalhe}` : ""}
      </span>
    </div>
  )
}

function ResultadoRelatorioCliente({ resultado }) {
  if (!resultado) return <p className="mt-3 text-sm text-gray-500">Ainda não testado.</p>

  const colunasNaoVerificaveis = resultado.quantidade === 0 && resultado.colunas.length === 0
  return (
    <div className="mt-4 space-y-2 rounded border border-gray-200 bg-gray-50 p-3 text-sm">
      <p className={`font-semibold ${statusVisual(resultado.status)}`}>
        {resultado.status}: {resultado.mensagem}
      </p>
      <p><strong>Registros retornados:</strong> {resultado.quantidade}</p>
      <div>
        <strong>Obras retornadas:</strong>
        {resultado.obrasRetornadas.length > 0 ? (
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {resultado.obrasRetornadas.map((obra) => (
              <li key={obra.id}>{obra.nome} — {obra.id}</li>
            ))}
          </ul>
        ) : (
          <span> nenhuma obra</span>
        )}
      </div>
      {resultado.validacaoSaldos && (
        <div>
          {resultado.validacaoSaldos.status === "SEM_REGISTROS" ? (
            <p className="text-gray-600">
              <strong>Validação dos saldos:</strong> sem linhas para validar.
            </p>
          ) : (
            <p className={resultado.validacaoSaldos.status === "OK" ? "font-medium text-emerald-700" : "font-semibold text-red-700"}>
              Validação dos saldos: {resultado.validacaoSaldos.status} — {resultado.validacaoSaldos.consistentes}/{resultado.validacaoSaldos.total} linhas consistentes
            </p>
          )}
          {resultado.validacaoSaldos.inconsistentes.length > 0 && (
            <ul className="mt-2 space-y-2">
              {resultado.validacaoSaldos.inconsistentes.map((linha, indice) => (
                <li key={`${linha.period_id || "periodo-sem-id"}-${indice}`} className="rounded border border-red-300 bg-red-50 p-2 text-xs text-red-900">
                  <div><strong>period_id:</strong> {linha.period_id ?? "não informado"}</div>
                  <div><strong>Obra:</strong> {linha.construction_site_name ?? "não informada"}</div>
                  {linha.patrimony_number && <div><strong>Patrimônio:</strong> {linha.patrimony_number}</div>}
                  <div><strong>Saldo inicial:</strong> {String(linha.opening_quantity)}</div>
                  <div><strong>Entradas:</strong> {String(linha.entries_in_month)}</div>
                  <div><strong>Saídas:</strong> {String(linha.exits_in_month)}</div>
                  <div><strong>Saldo final:</strong> {String(linha.closing_quantity)}</div>
                  <div><strong>Saldo calculado esperado:</strong> {linha.saldoEsperado ?? "não calculável"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div>
        <strong>Colunas retornadas:</strong>{" "}
        {resultado.colunas.length ? resultado.colunas.join(", ") : "nenhuma coluna observável"}
        {colunasNaoVerificaveis && (
          <p className="mt-1 text-xs text-gray-500">
            Um retorno vazio não contém linhas para inspeção dos nomes das colunas.
          </p>
        )}
      </div>
      {resultado.colunasProibidas.length > 0 ? (
        <p className="rounded border border-red-300 bg-red-50 p-2 font-semibold text-red-800">
          ALERTA: coluna(s) proibida(s): {resultado.colunasProibidas.join(", ")}
        </p>
      ) : resultado.colunas.length > 0 ? (
        <p className="font-medium text-emerald-700">Nenhuma coluna proibida detectada.</p>
      ) : null}
      {resultado.colunasProibidas.length === 0 && resultado.amostras.length > 0 && (
        <div>
          <strong>Amostra segura — máximo de 3 linhas:</strong>
          <p className="text-xs text-gray-600">Somente datas, quantidades, flags e saldos. Campos livres e identificadores omitidos.</p>
          <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-3 text-xs text-slate-100">
            {JSON.stringify(resultado.amostras, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}


export default function DiagnosticoSupabase() {
  const hoje = new Date()
  const inicioMesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`
  const dataAtual = hoje.toISOString().slice(0, 10)
  const { session, membership } = useAuth()
  const inicializando = false, erroAuth = "", statusMembership = membership ? "OK" : "Erro"
  const [leituras, setLeituras] = useState(() => Object.fromEntries(
    TABELAS_DIAGNOSTICO.map((tabela) => [tabela, { status: NAO_TESTADO, count: null }]),
  ))
  const [filtroServicos, setFiltroServicos] = useState({
    dataInicial: inicioMesAtual,
    dataFinal: dataAtual,
    obraId: "",
  })
  const [filtroLocacao, setFiltroLocacao] = useState({
    ano: String(hoje.getFullYear()),
    mes: String(hoje.getMonth() + 1),
    obraId: "",
  })
  const [resultadoServicos, setResultadoServicos] = useState(null)
  const [resultadoLocacao, setResultadoLocacao] = useState(null)
  const [testandoServicos, setTestandoServicos] = useState(false)
  const [testandoLocacao, setTestandoLocacao] = useState(false)

  useEffect(() => {
    let ativo = true
    if (!session || !membership || !supabase) return undefined
    // Clientes utilizam apenas RPCs; não inspecionam tabelas operacionais.
    if (membership.role === "cliente") return undefined
    Promise.all(TABELAS_DIAGNOSTICO.map(async (tabela) => {
      try {
        const count = await contarRegistros(supabase, tabela)
        if (ativo) setLeituras((anterior) => ({ ...anterior, [tabela]: { status: "OK", count } }))
      } catch {
        if (ativo) setLeituras((anterior) => ({ ...anterior, [tabela]: { status: "Erro", count: null } }))
      }
    }))
    return () => { ativo = false }
  }, [session, membership])

  const testarRelatorioServicos = async () => {
    if (!supabase || !membership?.organization_id) return
    setTestandoServicos(true)
    const resultado = await testarRelatorioServicosCliente(supabase, session, {
      organizationId: membership.organization_id,
      ...filtroServicos,
    })
    setResultadoServicos(resultado)
    setTestandoServicos(false)
  }

  const testarRelatorioLocacao = async () => {
    if (!supabase || !membership?.organization_id) return
    setTestandoLocacao(true)
    const resultado = await testarRelatorioLocacaoCliente(supabase, session, {
      organizationId: membership.organization_id,
      ...filtroLocacao,
    })
    setResultadoLocacao(resultado)
    setTestandoLocacao(false)
  }

  const autenticado = Boolean(session)

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
        <h1 className="text-xl font-bold text-amber-950">DIAGNÓSTICO SUPABASE</h1>
        <p className="mt-1 text-sm text-amber-900">
          Consultas remotas de leitura com a sessão validada do aplicativo. Não sincroniza os dados operacionais locais.
        </p>
      </div>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Estado do diagnóstico</h2>
        <LinhaStatus nome="Supabase configurado?" valor={supabaseConfigurado ? "OK" : "Erro"} />
        <LinhaStatus nome="Sessão Auth?" valor={autenticado ? "OK" : inicializando ? NAO_TESTADO : "Erro"} detalhe={autenticado ? "Autenticado" : "Não autenticado"} />
        <LinhaStatus nome="Membership encontrada?" valor={statusMembership} detalhe={membership ? "Encontrada" : statusMembership === "Erro" ? "Não encontrada ou recusada" : ""} />
        <LinhaStatus nome="Membership ativa?" valor={membership ? membership.active ? "OK" : "Erro" : NAO_TESTADO} detalhe={membership ? membership.active ? "Ativa" : "Inativa" : ""} />
        {TABELAS_DIAGNOSTICO.map((tabela) => (
          <LinhaStatus
            key={tabela}
            nome={`Leitura ${tabela}?`}
            valor={leituras[tabela].status}
            detalhe={leituras[tabela].count === null ? "" : `${leituras[tabela].count} registro(s)`}
          />
        ))}
        <LinhaStatus nome="Modo do diagnóstico" valor="Somente leitura" />
      </section>

      {!supabaseConfigurado ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          A configuração pública do Supabase não está disponível neste ambiente.
        </div>
      ) : !autenticado ? (<p>Sessão indisponível.</p>) : (
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-emerald-700">Status: Autenticado</h2>
                <p className="mt-1 text-sm text-gray-600">{session.user?.email || "E-mail não informado pela sessão"}</p>
              </div>
            </div>
            {erroAuth && <p className="mt-3 text-sm text-red-700">{erroAuth}</p>}
            <div className="mt-4 border-t pt-4 text-sm">
              <h3 className="mb-2 font-semibold">Membership</h3>
              {membership ? (
                <dl className="grid gap-1 sm:grid-cols-[160px_1fr]">
                  <dt className="text-gray-500">organization_id</dt><dd>{membership.organization_id}</dd>
                  <dt className="text-gray-500">role</dt><dd>{membership.role}</dd>
                  <dt className="text-gray-500">active</dt><dd>{String(membership.active)}</dd>
                </dl>
              ) : (
                <p className="text-red-700">Nenhuma membership foi retornada para esta sessão.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-cyan-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-cyan-900">TESTE DOS RELATÓRIOS DO CLIENTE</h2>
            <p className="mt-1 text-sm text-gray-600">
              Usa exclusivamente a sessão Supabase Auth atualmente autenticada.
            </p>

            {membership?.role !== "cliente" ? (
              <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                Este teste requer uma membership ativa com role cliente.
              </p>
            ) : (
              <div className="mt-5 space-y-6">
                <div className="rounded border border-gray-200 p-4">
                  <h3 className="font-semibold">Relatório de Serviços</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="text-sm font-medium text-gray-700">
                      Data inicial
                      <input type="date" value={filtroServicos.dataInicial} onChange={(event) => setFiltroServicos((atual) => ({ ...atual, dataInicial: event.target.value }))} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
                    </label>
                    <label className="text-sm font-medium text-gray-700">
                      Data final
                      <input type="date" value={filtroServicos.dataFinal} onChange={(event) => setFiltroServicos((atual) => ({ ...atual, dataFinal: event.target.value }))} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
                    </label>
                    <label className="text-sm font-medium text-gray-700">
                      ID da obra — opcional
                      <input value={filtroServicos.obraId} onChange={(event) => setFiltroServicos((atual) => ({ ...atual, obraId: event.target.value }))} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
                    </label>
                  </div>
                  <button onClick={testarRelatorioServicos} disabled={testandoServicos || !filtroServicos.dataInicial || !filtroServicos.dataFinal} className="mt-3 rounded bg-cyan-700 px-4 py-2 text-white disabled:opacity-50">
                    {testandoServicos ? "Testando..." : "Testar relatório de serviços"}
                  </button>
                  <ResultadoRelatorioCliente resultado={resultadoServicos} />
                </div>

                <div className="rounded border border-gray-200 p-4">
                  <h3 className="font-semibold">Relatório de Locação</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="text-sm font-medium text-gray-700">
                      Ano
                      <input type="number" min="2000" max="9999" value={filtroLocacao.ano} onChange={(event) => setFiltroLocacao((atual) => ({ ...atual, ano: event.target.value }))} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
                    </label>
                    <label className="text-sm font-medium text-gray-700">
                      Mês
                      <input type="number" min="1" max="12" value={filtroLocacao.mes} onChange={(event) => setFiltroLocacao((atual) => ({ ...atual, mes: event.target.value }))} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
                    </label>
                    <label className="text-sm font-medium text-gray-700">
                      ID da obra — opcional
                      <input value={filtroLocacao.obraId} onChange={(event) => setFiltroLocacao((atual) => ({ ...atual, obraId: event.target.value }))} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
                    </label>
                  </div>
                  <button onClick={testarRelatorioLocacao} disabled={testandoLocacao || !filtroLocacao.ano || !filtroLocacao.mes} className="mt-3 rounded bg-cyan-700 px-4 py-2 text-white disabled:opacity-50">
                    {testandoLocacao ? "Testando..." : "Testar relatório de locação"}
                  </button>
                  <ResultadoRelatorioCliente resultado={resultadoLocacao} />
                </div>
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  )
}
