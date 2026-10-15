import {DEV_ORGANIZATION, DEV_PROJECT_REF} from '../auth/authSession';
import {gerarUuidCadastro} from './atividadeSupabaseRepository';
import {prepararComandoConstrutora} from './preparacaoConstrutoraRemota';
import {criarRecuperacaoConstrutora} from './recuperacaoConstrutoraRemota';

export function criarCadastroConstrutoraDev({client,obterAuth,storage,atualizar,uuid=gerarUuidCadastro,
  withLock,timeout=15000,now=Date.now,canPersist=()=>Boolean(globalThis.navigator?.locks?.request && globalThis.crypto?.subtle)}) {
  let state={busy:false,estado:'conferindo',message:'',id:null}, generation=0, disposed=false;
  const listeners=new Set();
  const publish=next=>{if(!disposed){state={...state,...next};listeners.forEach(fn=>fn(state));}};
  const authorized=()=>{
    const a=obterAuth();
    if(a?.status!=='authorized'||a.membership?.role!=='admin'||a.membership.active!==true||
      a.membership.organization_id!==DEV_ORGANIZATION||!a.session?.user?.id||a.session.expires_at*1000<=now()||
      !Number.isFinite(a.session.expires_at)||client?.supabaseUrl!==`https://${DEV_PROJECT_REF}.supabase.co`)throw Error('Acesso Admin DEV necessário.');
    return a;
  };
  const rpc=async(name,args)=>{
    const before=authorized();
    let timer;
    try {
      const response=await Promise.race([Promise.resolve().then(()=>{if(disposed||authorized().session!==before.session)throw Error('Sessão alterada');return client.rpc(name,args);}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),timeout);})]);
      if(response?.error||!response?.data)throw Error('RPC não confirmada');
      return response.data;
    }finally{clearTimeout(timer);}
  };
  const recovery=criarRecuperacaoConstrutora({storage,obterAuth,now,withLock,
    consultarRecibo:p=>rpc('get_dev_constructor_creation_receipt',p),
    consultarComando:p_command=>rpc('get_dev_constructor_creation_status',{p_command})});
  const current=(a,g)=>{if(disposed||g!==generation||authorized().session!==a.session)throw Error('Sessão alterada');};
  const conclude=async(a,g,id)=>{
    current(a,g);
    id ||= recovery.obterId();
    // Só remover a pendência após recibo comprovado e reconhecimento protegido.
    let retained=!canPersist();
    if(!retained)try{await recovery.reconhecerConclusao();}catch{retained=true;}
    current(a,g);
    publish({estado:retained?'concluida':'sem-pendencia',id,message:retained?'Cadastro confirmado. Pendência mantida; nova gravação bloqueada até reconhecimento seguro.':'Construtora cadastrada no Supabase DEV.'});
    let refreshed=false;try{refreshed=await atualizar({preservarSnapshot:true});}catch{/* cadastro confirmado, lista pendente */}
    current(a,g);
    if(!refreshed)publish({message:'Cadastro confirmado. A lista não foi atualizada; use Atualizar Supabase DEV.'});
    return {confirmed:true,id};
  };
  return {
    getState:()=>({...state,supported:canPersist()}),
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    dispose(){disposed=true;generation++;recovery.invalidarSessao();listeners.clear();},
    async conferir(){
      if(state.busy||disposed)return;
      const g=++generation;publish({busy:true,message:'Conferindo tentativa preservada…'});
      try{
        const a=authorized(),estado=await recovery.recuperar();current(a,g);
        if(estado==='concluida'){
          await conclude(a,g,null);
        }else publish({estado,id:recovery.obterId(),message:estado==='sem-pendencia'?'':estado==='nao-localizada'?'Tentativa não localizada. Repreencha o mesmo formulário para reenviar o mesmo UUID.':'Resultado não confirmado. Não crie outra tentativa; confira novamente ou solicite auditoria.'});
      }catch{publish({estado:'incerta',message:'Não foi possível conferir a tentativa. Nenhum cadastro foi reenviado.'});}
      finally{if(g===generation)publish({busy:false});}
    },
    async salvar(formulario){
      if(state.busy||disposed)return {confirmed:false};
      const g=++generation;publish({busy:true,message:''});
      try{
        const a=authorized();if(!canPersist())throw Error('Proteção indisponível');
        let command;
        if(state.estado==='sem-pendencia'){
          command=prepararComandoConstrutora(formulario,uuid());
          await recovery.preservar(command);
        }else if(state.estado==='nao-localizada'){
          const prepared=await recovery.prepararReenvio(formulario);
          if(prepared.estado==='concluida')return await conclude(a,g,null);
          if(prepared.estado!=='reenvio-manual-disponivel')throw Error('Tentativa divergente');
          command=prepared.comando;
        }else throw Error('Confira a tentativa');
        current(a,g);publish({id:command.id});
        const result=await rpc('create_dev_constructor',{p_command:command});current(a,g);
        if(result.id!==command.id||result.organization_id!==DEV_ORGANIZATION||result.commercial_table_id!==`constructor:${command.id}`||typeof result.created!=='boolean')throw Error('Confirmação inválida');
        const status=await recovery.recuperar();current(a,g);
        if(status!=='concluida')throw Error('Recibo não confirmado');
        return await conclude(a,g,command.id);
      }catch{
        if(!disposed&&g===generation)publish({estado:'incerta',message:'Cadastro sem confirmação. Dados preenchidos preservados. Use Conferir tentativa antes de reenviar; não houve salvamento Local.'});
        return {confirmed:false};
      }finally{if(g===generation)publish({busy:false});}
    },
  };
}
