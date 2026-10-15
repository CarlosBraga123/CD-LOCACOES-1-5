// Recuperação somente leitura: não executa criação nem reenvio automático.
import {DEV_ORGANIZATION, DEV_PROJECT_REF} from '../auth/authSession';
import {CAMPOS_CONSTRUTORA} from './cadastrosRemotos';
import {prepararComandoConstrutora} from './preparacaoConstrutoraRemota';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuid4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const keys = ['version','project_ref','organization_id','user_id','id','created_at','fingerprint'];
const canonical = value => JSON.stringify(value, Object.keys(value).sort());
const serializedCommand = c => JSON.stringify({...c, constructor:JSON.parse(canonical(c.constructor))},
  ['version','organization_id','id','constructor',...Object.values(CAMPOS_CONSTRUTORA).sort()]);
const digest = async command => Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(serializedCommand(command)))), b=>b.toString(16).padStart(2,'0')).join('');
const commandFrom = command => {
  if (!command || command.organization_id!==DEV_ORGANIZATION || command.version!==1 ||
    Object.keys(command).some(k=>!['version','organization_id','id','constructor'].includes(k)) ||
    !command.constructor || Object.keys(command.constructor).some(k=>!Object.values(CAMPOS_CONSTRUTORA).includes(k))) throw Error('Comando inválido.');
  return prepararComandoConstrutora(Object.fromEntries(Object.entries(CAMPOS_CONSTRUTORA)
    .map(([local,sql])=>[local,command.constructor[sql]])), command.id);
};

export function criarRecuperacaoConstrutora({storage, obterAuth, consultarRecibo, consultarComando, now=Date.now,
  withLock=(name, task)=>{
    if(!globalThis.navigator?.locks?.request) throw Error('Armazenamento entre abas sem proteção.');
    return globalThis.navigator.locks.request(name,{mode:'exclusive'},task);
  }}) {
  let generation=0, state='bloqueada', verified=null;
  const auth = () => {
    const a=obterAuth();
    if(a?.status!=='authorized' || !uuid.test(a.session?.user?.id || '') ||
      !Number.isFinite(a.session?.expires_at) || a.session.expires_at*1000<=now() ||
      a.membership?.active!==true || a.membership.organization_id!==DEV_ORGANIZATION ||
      !['admin','gestor'].includes(a.membership.role)) throw Error('Sessão não autorizada.');
    return a;
  };
  const key = a => `cd-dev:constructor-attempt:v1:${DEV_PROJECT_REF}:${DEV_ORGANIZATION}:${a.session.user.id}`;
  const read = a => {
    const raw=storage.getItem(key(a));
    if(raw===null) return null;
    if(raw.length>2048) throw Error('Pendência inválida.');
    const r=JSON.parse(raw);
    if(!r || Object.keys(r).length!==keys.length || Object.keys(r).some(k=>!keys.includes(k)) ||
      r.version!==1 || r.project_ref!==DEV_PROJECT_REF || r.organization_id!==DEV_ORGANIZATION ||
      r.user_id!==a.session.user.id || !uuid4.test(r.id) || !/^[a-f0-9]{64}$/.test(r.fingerprint) ||
      !Number.isSafeInteger(r.created_at) || r.created_at>now() || now()-r.created_at>30*86400000) throw Error('Pendência inválida ou antiga.');
    return r;
  };
  const unchanged = (a, r, turn) => {
    const current=auth();
    if(turn!==generation || current.session!==a.session || current.membership!==a.membership ||
      JSON.stringify(read(current))!==JSON.stringify(r)) throw Error('Contexto alterado.');
  };
  const response = (r, result) => {
    if(result?.organization_id!==DEV_ORGANIZATION || result?.id!==r.id) throw Error('Resposta divergente.');
    if(result.status==='CONCLUIDA') return 'concluida';
    if(result.status==='AUSENTE') return 'nao-localizada';
    if(['CONFLITO','INTEGRIDADE_DIVERGENTE'].includes(result.status)) return 'conflito';
    throw Error('Resposta incompleta.');
  };
  return {
    obterId:()=>read(auth())?.id || null,
    obterEstado:()=>state,
    invalidarSessao(){generation++;state='bloqueada';verified=null;},
    async preservar(command) {
      const turn=++generation; state='incerta';verified=null;
      const a=auth();
      // Nunca sobrescrever outra intenção, nem apagar metadados corrompidos.
      if(storage.getItem(key(a))!==null) throw Error('Confira a tentativa pendente antes de continuar.');
      const c=commandFrom(command), fingerprint=await digest(c);
      if(turn!==generation || auth().session!==a.session || storage.getItem(key(a))!==null) throw Error('Contexto alterado.');
      const r={version:1,project_ref:DEV_PROJECT_REF,organization_id:DEV_ORGANIZATION,
        user_id:a.session.user.id,id:c.id,created_at:now(),fingerprint};
      await withLock(key(a),()=>{
        if(turn!==generation || auth().session!==a.session || storage.getItem(key(a))!==null) throw Error('Contexto alterado.');
        storage.setItem(key(a),JSON.stringify(r));
        if(JSON.stringify(read(a))!==JSON.stringify(r)) throw Error('Não foi possível preservar a tentativa.');
      });
      unchanged(a,r,turn);
      state='pendente'; return {id:r.id};
    },
    async recuperar() {
      const turn=++generation; state='conferindo';verified=null;
      try {
        const a=auth(), r=read(a);
        if(!r){state='sem-pendencia';return state;}
        const result=await consultarRecibo({p_id:r.id});
        unchanged(a,r,turn); state=response(r,result);verified={a,r};
      } catch {if(turn===generation) state='incerta';}
      return state;
    },
    // Retorna comando para decisão manual futura; nunca o envia para gravação.
    async prepararReenvio(formulario) {
      const previous=verified, permitted=state==='nao-localizada', turn=++generation;state='conferindo';verified=null;
      try {
        if(!permitted) throw Error('Confira a tentativa primeiro.');
        if(!previous) throw Error('Contexto não conferido.');
        unchanged(previous.a,previous.r,turn);
        const a=auth(), r=read(a);
        if(!r) throw Error('Tentativa ausente.');
        const c=prepararComandoConstrutora(formulario,r.id);
        if(await digest(c)!==r.fingerprint) throw Error('Conteúdo diferente da tentativa original.');
        unchanged(a,r,turn);
        const result=await consultarComando(c);
        unchanged(a,r,turn);
        state=response(r,result);verified={a,r};
        if(state==='concluida' && (result.mesma_tentativa!==true || result.commercial_table_id!==`constructor:${r.id}`)) throw Error('Confirmação incompleta.');
        if(state==='nao-localizada'){state='reenvio-manual-disponivel';return {estado:state,comando:c};}
      } catch {if(turn===generation)state='incerta';}
      return {estado:state};
    },
    async reconhecerConclusao() {
      if(state!=='concluida' || !verified) throw Error('Conclusão não confirmada.');
      const captured=verified, turn=generation;
      await withLock(key(captured.a),()=>{
        unchanged(captured.a,captured.r,turn);
        storage.removeItem(key(captured.a));generation++;state='sem-pendencia';verified=null;
      });
    },
  };
}
