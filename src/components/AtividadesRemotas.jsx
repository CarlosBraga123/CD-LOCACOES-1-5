import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../supabase";
import { criarAtividadeSupabaseRepository } from "../repositories/atividadeRepository";
import AtividadeResumoCard from "./AtividadeResumoCard";
import CadastroAtividadeRemota from "./CadastroAtividadeRemota";
import { criarTransporteCadastroRpc } from "../repositories/atividadeSupabaseRepository";

// Consulta do módulo existente; nenhum cadastro paralelo ou cópia para localStorage.
export default function AtividadesRemotas({ contextoNavegacao }) {
  const auth = useAuth();
  const context = useRef(auth);
  context.current = auth;
  const repository = useMemo(() => criarAtividadeSupabaseRepository(supabase, { contextoAtual: () => context.current, transporteCadastro: criarTransporteCadastroRpc(supabase) }), []);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("");
  const [busca, setBusca] = useState("");
  const [obraId, setObraId] = useState("");
  const [limit, setLimit] = useState(50);
  const request = useRef(0);
  const abort = useRef(null);
  async function atualizar({preservarSnapshot=false}={}) {
    const id = ++request.current;
    abort.current?.abort();
    abort.current = new AbortController();
    setLoading(true); setError("");
    try {
      const result = await repository.listarAtualizado({ signal: abort.current.signal });
      if (id !== request.current) return;
      setSnapshot(result); setUpdated(new Date().toLocaleTimeString("pt-BR")); setLimit(50);
      return true;
    } catch {
      if (id !== request.current) return;
      if (!preservarSnapshot) {setSnapshot(null); setUpdated("");}
      setError("Não foi possível carregar as atividades do Supabase DEV. Verifique sessão, acesso e conexão. Os dados locais não foram alterados.");
      return false;
    } finally { if (id === request.current) setLoading(false); }
  }
  useEffect(() => {
    atualizar();
    return () => { request.current += 1; abort.current?.abort(); };
  }, [repository, auth.session?.user?.id]);
  useEffect(() => {
    setBusca(contextoNavegacao?.atividadeId ? String(contextoNavegacao.atividadeId) : "");
  }, [contextoNavegacao?.atividadeId]);
  const filtered = (snapshot?.atividades || []).filter((a) => (!obraId || a.obraId === obraId) && (!busca || [a.id, a.obra, a.construtora, a.servico, a.numeroOS, ...(a.numerosPatrimonio || [])].some((v) => String(v || "").toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")))));
  return <section className="p-4 sm:p-6">
    <h2 className="text-xl font-semibold">Atividades — Supabase DEV</h2>
    <p className="my-3 rounded border border-cyan-300 bg-cyan-50 p-3">Fonte: banco de Desenvolvimento. Leitura remota com atualização manual. Sem importação, sincronização ou fallback local.</p>
    <p className="my-3 rounded border border-amber-300 bg-amber-50 p-3">Cadastro exclusivamente agendado para Admin/Gestor. Edição, exclusão, liberação e faturamento remotos permanecem bloqueados.</p>
    <button type="button" onClick={atualizar} disabled={loading} className="mb-3 rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">{loading ? "Carregando..." : "Atualizar do Supabase"}</button>
    {error && <p role="alert" className="my-3 text-red-700">{error}</p>}
    {snapshot && auth.status==="authorized" && auth.membership?.active===true && ["admin","gestor"].includes(auth.membership?.role) && <CadastroAtividadeRemota key={auth.session?.user?.id} repository={repository} catalogo={snapshot} onSaved={async id=>{
      setBusca(id);setObraId("");
      if (!await atualizar({preservarSnapshot:true})) throw new Error("Lista indisponível");
    }}/>}
    {snapshot && <>
      <p role="status">{snapshot.atividades.length} atividades carregadas · Atualização: {updated}</p>
      <div className="my-3 flex flex-wrap gap-3">
        <label>Busca<input className="ml-2 rounded border p-2" value={busca} onChange={(e) => { setBusca(e.target.value); setLimit(50); }} /></label>
        <label>Obra<select className="ml-2 rounded border p-2" value={obraId} onChange={(e) => { setObraId(e.target.value); setLimit(50); }}><option value="">Todas</option>{snapshot.obras.map((site) => <option key={site.id} value={site.id}>{site.name || site.id}</option>)}</select></label>
      </div>
      <p>{filtered.length} atividades no filtro.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {filtered.slice(0, limit).map((activity) => <AtividadeResumoCard key={activity.id} atividade={activity} disabled registrosPatrimonio={[]} contextoPatrimonial={{ atividades: snapshot.atividades, obras: [], registrosPatrimonio: [], equipamentosMestres: [] }} informacoesAdicionais={<p className="text-xs">{activity.construtora} · {activity.obra} · ID: {activity.id}</p>} />)}
      </div>
      {filtered.length > limit && <button className="mt-3 rounded border p-2" onClick={() => setLimit((value) => value + 50)}>Mostrar mais</button>}
    </>}
  </section>;
}
