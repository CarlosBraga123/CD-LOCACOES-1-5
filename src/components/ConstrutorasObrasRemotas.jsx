import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useLeituraDev} from '../data/LeituraDevContext';
import {adaptarCadastrosRemotos} from '../repositories/cadastrosRemotos';
import {ConstrutorasObrasLocal} from './ConstrutorasObras';
import {useAuth} from '../auth/AuthContext';
import {supabase} from '../supabase';
import {criarCadastroConstrutoraDev} from '../repositories/construtoraSupabaseRepository';

// Somente fonte/autorização: a apresentação é a mesma do Local.
export default function ConstrutorasObrasRemotas() {
  const leitura = useLeituraDev();
  const auth=useAuth(), current=useRef(auth);current.current=auth;
  const [binding,setBinding]=useState(null);
  useEffect(()=>{
    if(auth?.status!=='authorized'||auth.membership?.role!=='admin'){setBinding(null);return;}
    const storage={getItem:k=>window.localStorage.getItem(k),setItem:(k,v)=>window.localStorage.setItem(k,v),removeItem:k=>window.localStorage.removeItem(k)};
    const service=criarCadastroConstrutoraDev({client:supabase,obterAuth:()=>current.current,storage,atualizar:leitura.atualizar});
    const publish=()=>setBinding({service,session:auth.session,membership:auth.membership,state:service.getState()});
    const unsubscribe=service.subscribe(publish);publish();service.conferir();
    return()=>{unsubscribe();service.dispose();};
  },[auth?.session,auth?.membership,auth?.status,leitura.atualizar]);
  const valid=binding&&binding.session===auth?.session&&binding.membership===auth?.membership;
  const cadastro=valid?{...binding.state,permitido:binding.state.supported,
    salvar:binding.service.salvar,conferir:binding.service.conferir}:null;
  return <Conteudo key={leitura.scopeKey || 'sem-sessao'} leitura={leitura} cadastroRemoto={cadastro}/>;
}
export function Conteudo({leitura, estadoInicial, cadastroRemoto=null}) {
  const {authorized, snapshot, loading, error, atualizar, scopeKey} = leitura;
  useEffect(() => { if (authorized && !snapshot) atualizar(); }, [scopeKey]);
  const result = useMemo(() => {
    if (!authorized || !snapshot) return null;
    try { return {dados: {...adaptarCadastrosRemotos(snapshot), atividades: snapshot.atividades}}; }
    catch { return {erro: 'Leitura cadastral incompleta ou divergente. Atualize novamente; nenhum dado local foi utilizado.'}; }
  }, [authorized, snapshot]);
  if (!authorized) return <p role="alert" className="p-4">Sessão Admin/Gestor DEV autorizada necessária.</p>;
  return <>
    <div className="space-y-2 border-b p-4">
      <p>Fonte: Supabase DEV — cadastro de nova construtora via RPC. Edição, exclusão, cadastro de obras e ações operacionais indisponíveis. Saldos são operacionais, não certificam ocupação física individual.</p>
      {cadastroRemoto && <>
        {!cadastroRemoto.supported && <p role="alert">Cadastro bloqueado neste navegador: Web Locks e criptografia segura são necessários. Use um navegador compatível; não há fallback Local.</p>}
        {cadastroRemoto.message && <p role="status">{cadastroRemoto.message}</p>}
        {cadastroRemoto.id && <p>Tentativa: {cadastroRemoto.id}</p>}
        <button type="button" disabled={cadastroRemoto.busy} onClick={cadastroRemoto.conferir} className="rounded border px-4 py-2">Conferir tentativa</button>
      </>}
      <button type="button" disabled={loading || cadastroRemoto?.busy} className="rounded border px-4 py-2" onClick={() => atualizar({preservarSnapshot:true})}>Atualizar Supabase DEV</button>
    </div>
    {loading && <p role="status" className="p-4">Carregando cadastros…</p>}
    {error && <p role="alert" className="p-4">{error}</p>}
    {result?.erro && <p role="alert" className="p-4">{result.erro}</p>}
    {result && !result.erro && <div hidden={loading || Boolean(error)}>
      {result.dados.avisos.map(a => <p role="alert" className="p-4" key={a}>{a}</p>)}
      <ConstrutorasObrasLocal dadosRemotos={result.dados} estadoInicial={estadoInicial} cadastroRemoto={cadastroRemoto && {...cadastroRemoto,permitido:cadastroRemoto.permitido&&!loading&&!error}}/>
    </div>}
  </>;
}
