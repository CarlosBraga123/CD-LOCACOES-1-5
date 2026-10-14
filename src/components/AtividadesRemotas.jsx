import React,{ useEffect, useMemo, useState } from "react";
import { useLeituraDev } from "../data/LeituraDevContext";
import { useAuth } from "../auth/AuthContext";
import AtividadeResumoCard from "./AtividadeResumoCard";
import CadastroAtividadeRemota from "./CadastroAtividadeRemota";
import { ordenarAtividadesRemotas } from "../repositories/ordenacaoAtividadesRemotas";

// Consulta do módulo existente; nenhum cadastro paralelo ou cópia para localStorage.
export default function AtividadesRemotas({ contextoNavegacao }) {
  const auth = useAuth();
  const {repository,snapshot,loading,error,updated,revision,atualizar,authorized,scopeKey} = useLeituraDev();
  const [busca,setBusca]=useState("");
  const [obraId,setObraId]=useState("");
  const [limit,setLimit]=useState(50);
  useEffect(() => {if(authorized && !snapshot) atualizar();}, [scopeKey]);
  useEffect(() => {setLimit(50);},[revision]);
  useEffect(() => {
    setBusca(contextoNavegacao?.atividadeId ? String(contextoNavegacao.atividadeId) : "");
  }, [contextoNavegacao?.atividadeId]);
  const ordenadas = useMemo(() => ordenarAtividadesRemotas(snapshot?.atividades || []), [snapshot]);
  const filtered = ordenadas.filter((a) => (!obraId || a.obraId === obraId) && (!busca || [a.id, a.obra, a.construtora, a.servico, a.numeroOS, ...(a.numerosPatrimonio || [])].some((v) => String(v || "").toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")))));
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
      <p role="status">{snapshot.atividades.length} atividades carregadas · Atualização: {updated ? new Date(updated).toLocaleTimeString("pt-BR") : ""}</p>
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
