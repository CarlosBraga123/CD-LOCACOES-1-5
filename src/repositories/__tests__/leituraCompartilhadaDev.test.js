import {describe,it,expect,vi} from 'vitest';
import {chaveSessaoLeitura,criarLeituraCompartilhadaDev,dadosRemotosParaAgenda} from '../leituraCompartilhadaDev';
const auth=()=>({status:'authorized',session:{user:{id:'u'}},membership:{organization_id:'cd-locacoes',role:'admin',active:true}});
const data=()=>({atividades:[{id:'uuid',obraId:'s',dataAgendamento:'2026-10-14'}],obras:[{id:'s',name:'Obra sintética',constructor_id:'c'}],construtoras:[{id:'c',name:'Construtora sintética'}]});
describe('leitura DEV compartilhada',()=>{
 it('publica uma mesma referência/revisão para consumidores após duas leituras iguais',async()=>{
  const repo={listarAtualizado:vi.fn(async()=>data()),cadastrarIndividual:vi.fn()};
  const service=criarLeituraCompartilhadaDev(repo,auth,()=> 'agora');
  const list=[],agenda=[];service.subscribe(s=>list.push(s));service.subscribe(s=>agenda.push(s));
  expect(await service.atualizar()).toBe(true);
  expect(list.at(-1)).toBe(agenda.at(-1));expect(service.getState().revision).toBe(1);
  expect(service.getState().updated).toBe('agora');expect(repo.listarAtualizado).toHaveBeenCalledTimes(2);
  expect(repo.cadastrarIndividual).not.toHaveBeenCalled();
 });
 it.each(['cliente','funcionario','desconhecido'])('não consulta com perfil %s',async role=>{
  const a=auth();a.membership.role=role;const repo={listarAtualizado:vi.fn()};
  expect(await criarLeituraCompartilhadaDev(repo,()=>a).atualizar()).toBe(false);expect(repo.listarAtualizado).not.toHaveBeenCalled();
 });
 it.each(['inactive','organization','session'])('nega contexto divergente %s',async kind=>{
  const a=auth();if(kind==='inactive')a.membership.active=false;if(kind==='organization')a.membership.organization_id='outra';if(kind==='session')a.status='signed-out';
  expect(chaveSessaoLeitura(a)).toBeNull();
 });
 it('rejeita alteração entre páginas/tabelas sem publicar mistura',async()=>{
  const changed=data();changed.atividades.push({id:'novo'});
  const repo={listarAtualizado:vi.fn().mockResolvedValueOnce(data()).mockResolvedValueOnce(changed)};
  const service=criarLeituraCompartilhadaDev(repo,auth);
  expect(await service.atualizar()).toBe(false);expect(service.getState().snapshot).toBeNull();expect(service.getState().error).toContain('Nenhum dado local');
 });
 it('falha de rede não exibe erro bruto nem dados locais',async()=>{
  const repo={listarAtualizado:vi.fn().mockRejectedValue(new Error('segredo'))};
  const service=criarLeituraCompartilhadaDev(repo,auth);expect(await service.atualizar()).toBe(false);
  expect(service.getState().snapshot).toBeNull();expect(service.getState().error).not.toContain('segredo');
 });
 it('troca de usuário descarta consulta antiga e apaga snapshot',async()=>{
  let a=auth(),resolve;const repo={listarAtualizado:vi.fn(()=>new Promise(r=>resolve=r))};
  const service=criarLeituraCompartilhadaDev(repo,()=>a);const request=service.atualizar();
  a={...auth(),session:{user:{id:'outro'}}};service.sincronizarSessao();resolve(data());
  expect(await request).toBe(false);expect(service.getState().snapshot).toBeNull();
 });
 it('logout e revogação limpam dados já publicados',async()=>{
  let a=auth();const service=criarLeituraCompartilhadaDev({listarAtualizado:async()=>data()},()=>a);
  await service.atualizar();a={...a,status:'denied'};service.sincronizarSessao();expect(service.getState().snapshot).toBeNull();expect(service.getState().revision).toBe(0);
 });
 it('atualização manual substitui a revisão inteira e pode manter snapshot antigo com erro explícito',async()=>{
  let fail=false;const service=criarLeituraCompartilhadaDev({listarAtualizado:async()=>{if(fail)throw Error('rede');return data();}},auth);
  await service.atualizar();const before=service.getState().snapshot;fail=true;
  expect(await service.atualizar({preservarSnapshot:true})).toBe(false);expect(service.getState().snapshot).toBe(before);expect(service.getState().error).not.toBe('');
  expect(await service.atualizar()).toBe(false);expect(service.getState().snapshot).toBeNull();
 });
 it('última atualização vence mesmo se pedido cancelado completar depois',async()=>{
  let resolve;let n=0;const repo={listarAtualizado:vi.fn(()=> ++n===1?new Promise(r=>resolve=r):Promise.resolve(data()))};
  const service=criarLeituraCompartilhadaDev(repo,auth);const first=service.atualizar();expect(await service.atualizar()).toBe(true);
  resolve({...data(),atividades:[]});expect(await first).toBe(false);expect(service.getState().snapshot.atividades).toHaveLength(1);
 });
 it('Agenda recebe só o snapshot remoto, sem mudar datas, status, ID ou ordem',()=>{
  const s=data();const result=dadosRemotosParaAgenda(s);
  expect(result.atividades).toBe(s.atividades);expect(result.obras[0]).toMatchObject({id:'s',nome:'Obra sintética',construtora:'Construtora sintética'});expect(result.avisos).toEqual([]);
 });
 it('não inventa dados para datas e catálogos ausentes',()=>{
  const s=data();s.atividades=[{id:'uuid',obraId:'órfã'}];const result=dadosRemotosParaAgenda(s);
  expect(result.avisos).toHaveLength(2);expect(result.atividades[0].dataAgendamento).toBeUndefined();
  expect(()=>dadosRemotosParaAgenda(null)).toThrow('incompletos');
 });
});
