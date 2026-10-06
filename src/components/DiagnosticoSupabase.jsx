import { useEffect, useState } from "react"
import { supabase, supabaseConfigurado } from "../supabase"
import {
  buscarMembershipPropria,
  contarRegistros,
  TABELAS_DIAGNOSTICO,
  testarBloqueioEscrita,
} from "../utils/diagnosticoSupabase"

const NAO_TESTADO = "Não testado"

function statusVisual(valor) {
  if (valor === "OK" || valor === "Bloqueado como esperado") {
    return "text-emerald-700"
  }
  if (valor === "Erro") return "text-red-700"
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

function mensagemAuthAmigavel(error) {
  const mensagem = String(error?.message || "").toLowerCase()
  if (mensagem.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos. Confira os dados e tente novamente."
  }
  if (mensagem.includes("email not confirmed")) {
    return "O e-mail ainda não foi confirmado no Supabase Auth."
  }
  return "Não foi possível autenticar no Supabase. Tente novamente."
}

export default function DiagnosticoSupabase() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [session, setSession] = useState(null)
  const [inicializando, setInicializando] = useState(supabaseConfigurado)
  const [autenticando, setAutenticando] = useState(false)
  const [erroAuth, setErroAuth] = useState("")
  const [membership, setMembership] = useState(null)
  const [statusMembership, setStatusMembership] = useState(NAO_TESTADO)
  const [leituras, setLeituras] = useState(() => Object.fromEntries(
    TABELAS_DIAGNOSTICO.map((tabela) => [tabela, { status: NAO_TESTADO, count: null }]),
  ))
  const [statusEscrita, setStatusEscrita] = useState(NAO_TESTADO)
  const [testandoEscrita, setTestandoEscrita] = useState(false)
  const [alertaCritico, setAlertaCritico] = useState(false)
  const [mensagemEscrita, setMensagemEscrita] = useState("")

  useEffect(() => {
    if (!supabaseConfigurado || !supabase) {
      setInicializando(false)
      return undefined
    }

    let ativo = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!ativo) return
      if (error) setErroAuth("Não foi possível recuperar a sessão Supabase.")
      setSession(data?.session ?? null)
      setInicializando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, novaSession) => {
      if (ativo) setSession(novaSession)
    })

    return () => {
      ativo = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session || !supabase) {
      setMembership(null)
      setStatusMembership(NAO_TESTADO)
      setLeituras(Object.fromEntries(
        TABELAS_DIAGNOSTICO.map((tabela) => [tabela, { status: NAO_TESTADO, count: null }]),
      ))
      setStatusEscrita(NAO_TESTADO)
      setMensagemEscrita("")
      setAlertaCritico(false)
      return undefined
    }

    let ativo = true

    async function carregarDiagnostico() {
      setStatusMembership(NAO_TESTADO)
      let membershipAtual
      try {
        membershipAtual = await buscarMembershipPropria(supabase)
        if (!ativo) return
        setMembership(membershipAtual)
        setStatusMembership(membershipAtual ? "OK" : "Erro")
      } catch {
        if (!ativo) return
        setMembership(null)
        setStatusMembership("Erro")
        return
      }

      await Promise.all(TABELAS_DIAGNOSTICO.map(async (tabela) => {
        try {
          const count = await contarRegistros(supabase, tabela)
          if (!ativo) return
          setLeituras((anterior) => ({
            ...anterior,
            [tabela]: { status: "OK", count },
          }))
        } catch {
          if (!ativo) return
          setLeituras((anterior) => ({
            ...anterior,
            [tabela]: { status: "Erro", count: null },
          }))
        }
      }))
    }

    carregarDiagnostico()
    return () => { ativo = false }
  }, [session])

  const entrar = async (event) => {
    event.preventDefault()
    if (!supabase) return

    setAutenticando(true)
    setErroAuth("")
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setSenha("")
    setAutenticando(false)

    if (error) setErroAuth(mensagemAuthAmigavel(error))
  }

  const sair = async () => {
    if (!supabase) return
    setErroAuth("")
    const { error } = await supabase.auth.signOut()
    if (error) setErroAuth("Não foi possível encerrar a sessão Supabase.")
  }

  const testarEscrita = async () => {
    if (!supabase || !membership?.organization_id || alertaCritico) return

    setTestandoEscrita(true)
    setMensagemEscrita("")
    let resultado
    try {
      resultado = await testarBloqueioEscrita(
        supabase,
        membership.organization_id,
        () => `diagnostico-write-block-${crypto.randomUUID()}`,
      )
    } catch {
      setTestandoEscrita(false)
      setStatusEscrita("Erro")
      setMensagemEscrita("O teste não pôde ser concluído. Nenhum bloqueio foi confirmado.")
      return
    }
    setTestandoEscrita(false)

    if (resultado.aceito) {
      setStatusEscrita("Erro")
      setAlertaCritico(true)
      setMensagemEscrita("ALERTA CRÍTICO: a escrita foi aceita. O diagnóstico foi interrompido e nenhuma limpeza automática foi executada.")
      return
    }

    if (resultado.bloqueado) {
      setStatusEscrita("Bloqueado como esperado")
      setMensagemEscrita("A tentativa fictícia foi recusada por privilégio/RLS, conforme esperado.")
      return
    }

    setStatusEscrita("Erro")
    setMensagemEscrita("O teste não comprovou o bloqueio: ocorreu uma falha diferente de privilégio/RLS.")
  }

  const autenticado = Boolean(session)

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
        <h1 className="text-xl font-bold text-amber-950">DIAGNÓSTICO SUPABASE</h1>
        <p className="mt-1 text-sm text-amber-900">
          Área técnica temporária. Não substitui o login nem a fonte operacional atual do aplicativo.
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
        <LinhaStatus nome="Escrita bloqueada?" valor={statusEscrita} />
      </section>

      {!supabaseConfigurado ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          A configuração pública do Supabase não está disponível neste ambiente.
        </div>
      ) : !autenticado ? (
        <form onSubmit={entrar} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 font-semibold">Status: Não autenticado</h2>
          <label className="mb-3 block text-sm font-medium text-gray-700">
            E-mail
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="mb-4 block text-sm font-medium text-gray-700">
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
          {erroAuth && <p className="mb-3 text-sm text-red-700">{erroAuth}</p>}
          <button disabled={autenticando} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60">
            {autenticando ? "Entrando..." : "Entrar no Supabase"}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-emerald-700">Status: Autenticado</h2>
                <p className="mt-1 text-sm text-gray-600">{session.user?.email || "E-mail não informado pela sessão"}</p>
              </div>
              <button onClick={sair} className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">Sair do Supabase</button>
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

          <section className={`rounded-lg border p-4 shadow-sm ${alertaCritico ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"}`}>
            <h2 className="font-semibold">Teste controlado de escrita</h2>
            <p className="my-3 text-sm text-gray-600">
              Tenta inserir uma tarefa inteiramente fictícia. Não altera, atualiza ou exclui registros existentes.
            </p>
            <button
              onClick={testarEscrita}
              disabled={testandoEscrita || !membership?.organization_id || alertaCritico}
              className="rounded bg-slate-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testandoEscrita ? "Testando..." : "Testar bloqueio de escrita"}
            </button>
            {mensagemEscrita && <p className={`mt-3 text-sm font-medium ${alertaCritico ? "text-red-800" : "text-gray-700"}`}>{mensagemEscrita}</p>}
          </section>
        </div>
      )}
    </div>
  )
}
