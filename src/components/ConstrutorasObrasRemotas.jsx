import React, {useEffect, useMemo} from 'react';
import {useLeituraDev} from '../data/LeituraDevContext';
import {adaptarCadastrosRemotos} from '../repositories/cadastrosRemotos';
import {ConstrutorasObrasLocal} from './ConstrutorasObras';

// Somente fonte/autorização: a apresentação é a mesma do Local.
export default function ConstrutorasObrasRemotas() {
  const leitura = useLeituraDev();
  return <Conteudo key={leitura.scopeKey || 'sem-sessao'} leitura={leitura}/>;
}
export function Conteudo({leitura, estadoInicial}) {
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
      <p>Fonte: Supabase DEV — somente leitura. Criar, editar, excluir e ações operacionais indisponíveis. Saldos são operacionais, não certificam ocupação física individual.</p>
      <button type="button" disabled={loading} className="rounded border px-4 py-2" onClick={() => atualizar()}>Atualizar Supabase DEV</button>
    </div>
    {loading ? <p role="status" className="p-4">Carregando cadastros…</p> : error ? <p role="alert" className="p-4">{error}</p> : result?.erro ? <p role="alert" className="p-4">{result.erro}</p> : result && <>
      {result.dados.avisos.map(a => <p role="alert" className="p-4" key={a}>{a}</p>)}
      <ConstrutorasObrasLocal dadosRemotos={result.dados} estadoInicial={estadoInicial}/>
    </>}
  </>;
}
