import React,{useState} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {ConstrutorasObrasLocal} from '../../components/ConstrutorasObras';
import {construtoraRepository} from '../construtoraRepository';
import {tabelaComercialRepository} from '../tabelaComercialRepository';
import {criarFormularioConstrutora} from '../../utils/construtoras';
vi.mock('react',async()=>{const actual=await vi.importActual('react');return {...actual,useState:vi.fn(actual.useState)};});
const captured=vi.hoisted(()=>({save:null}));
vi.mock('react/jsx-runtime',async()=>{const actual=await vi.importActual('react/jsx-runtime');const wrap=fn=>(type,props,...rest)=>{if(type==='button'&&String(props?.children).trim()==='Salvar')captured.save=props;return fn(type,props,...rest);};return {...actual,jsx:wrap(actual.jsx),jsxs:wrap(actual.jsxs)};});
vi.mock('react/jsx-dev-runtime',async()=>{const actual=await vi.importActual('react/jsx-dev-runtime');return {...actual,jsxDEV:(type,props,...rest)=>{if(type==='button'&&String(props?.children).trim()==='Salvar')captured.save=props;return actual.jsxDEV(type,props,...rest);}};});
afterEach(()=>vi.restoreAllMocks());
const form={...criarFormularioConstrutora(),nome:' Nova sintética ',ativa:false};
function render(remote,adapter){
 let index=0;captured.save=null;const setters=[];
 useState.mockImplementation(initial=>{const i=index++;const setter=vi.fn();setters[i]=setter;return [i===11?'nova':i===13?form:i===5?'gestao':initial,setter];});
 const html=renderToStaticMarkup(<ConstrutorasObrasLocal dadosRemotos={remote?{construtoras:[],obras:[],atividades:[]}:null} cadastroRemoto={adapter}/>);
 return {html,save:captured.save,setters};
}
describe('Salvar no formulário original, destinos separados',()=>{
 it('Local mantém salvamento/cópia comercial e nunca chama adaptador remoto',async()=>{
  const local=vi.spyOn(construtoraRepository,'salvarTodos').mockImplementation(()=>{});
  vi.spyOn(tabelaComercialRepository,'obter').mockReturnValue({versao:7,servicos:{legado:0},locacoes:{legado:false}});
  const adapter={salvar:vi.fn()},v=render(false,adapter);await v.save.onClick();
  expect(adapter.salvar).not.toHaveBeenCalled();expect(local).toHaveBeenCalledWith([expect.objectContaining({id:expect.any(Number),nome:'Nova sintética',ativa:false,tabelaComercial:expect.objectContaining({versaoBase:7,servicos:expect.objectContaining({legado:0}),locacoes:expect.objectContaining({legado:false})})})]);
 });
 it('DEV usa mesmos campos e somente callback remoto',async()=>{
  const local=vi.spyOn(construtoraRepository,'salvarTodos').mockImplementation(()=>{throw Error('local proibido');});
  const adapter={permitido:true,busy:false,estado:'sem-pendencia',salvar:vi.fn(async()=>({confirmed:true,id:'uuid-confirmado'}))};const v=render(true,adapter);
  expect(v.save.disabled).toBe(false);expect(v.html).not.toContain('<fieldset disabled=""');await v.save.onClick();
  expect(adapter.salvar).toHaveBeenCalledWith(form);expect(local).not.toHaveBeenCalled();expect(v.setters[11]).toHaveBeenCalledWith(null);
 });
 it('erro remoto não fecha nem apaga formulário e não salva Local',async()=>{
  const local=vi.spyOn(construtoraRepository,'salvarTodos').mockImplementation(()=>{throw Error('local proibido');});
  const v=render(true,{permitido:true,busy:false,estado:'sem-pendencia',salvar:vi.fn(async()=>({confirmed:false}))});await v.save.onClick();
  expect(v.setters[11]).not.toHaveBeenCalled();expect(v.setters[13]).not.toHaveBeenCalled();expect(local).not.toHaveBeenCalled();
 });
 it.each([{permitido:false,estado:'sem-pendencia'},{permitido:true,busy:true,estado:'sem-pendencia'},{permitido:true,estado:'incerta'}])('proteções desabilitam Salvar: %j',adapter=>{expect(render(true,adapter).save.disabled).toBe(true);});
});
