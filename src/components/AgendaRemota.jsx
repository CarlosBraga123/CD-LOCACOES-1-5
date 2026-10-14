import React,{useEffect,useMemo} from 'react';
import {useLeituraDev} from '../data/LeituraDevContext';
import {dadosRemotosParaAgenda} from '../repositories/leituraCompartilhadaDev';

// Recebe o mesmo calendário; não há uma segunda definição visual da Agenda.
export default function AgendaRemota({Calendario}) {
  const {snapshot,loading,error,updated,revision,atualizar,authorized,scopeKey}=useLeituraDev();
  useEffect(()=>{if(authorized && !snapshot) atualizar();},[scopeKey]);
  const dados=useMemo(()=>snapshot ? dadosRemotosParaAgenda(snapshot) : null,[snapshot]);
  return <>
    <div className="px-4">
      <p>Fonte: Supabase DEV · somente leitura · revisão {revision}{updated ? ` · atualizado ${updated}` : ''}.</p>
      <button type="button" onClick={()=>atualizar()} disabled={loading || !authorized} className="rounded border px-3 py-2">{loading?'Carregando...':'Atualizar do Supabase'}</button>
      {!authorized && <p role="alert">Sessão Admin/Gestor DEV autorizada necessária.</p>}
      {error && <p role="alert">{error}</p>}
      {dados?.avisos.map(aviso=><p role="alert" key={aviso}>{aviso}</p>)}
      {!dados && !error && authorized && <p role="status">Aguardando leitura remota. Nenhum dado local será usado.</p>}
    </div>
    {dados && authorized && <Calendario dados={dados}/>}
  </>;
}
