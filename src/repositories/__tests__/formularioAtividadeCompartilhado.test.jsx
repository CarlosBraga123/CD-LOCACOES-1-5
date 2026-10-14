import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,it,expect} from "vitest";
import {FormularioAtividadesExistente} from "../../components/Atividades";
import {catalogoParaFormulario,prepararFormularioOriginalRemoto} from "../formularioAtividadeRemoto";
const catalogo={construtoras:[{id:"c",name:"Construtora fictícia",organization_id:"cd-locacoes"}],obras:[{id:"s",name:"Obra fictícia",constructor_id:"c",organization_id:"cd-locacoes"}],equipamentos:[{id:"e",current_patrimony_number:"001",active:true,administrative_status:"NO_GALPAO",equipment_type:"Balancinho",balancinho_type:"Eletrico",organization_id:"cd-locacoes"}]};
const form={construtora:"Construtora fictícia",obraId:"s",equipamento:"Balancinho",tipoBalancinho:"Eletrico",servico:"Instalação",quantidade:1,numerosPatrimonio:["001"],tamanho:"3",ancoragem:"Afastador",dataAgendamento:"2026-10-14"};
describe("formulário original compartilhado",()=>{
 it("HTML inicial igual nos dois modos, exceto bloqueios remotos explícitos",()=>{
  const local=renderToStaticMarkup(<FormularioAtividadesExistente/>);
  const remoto=renderToStaticMarkup(<FormularioAtividadesExistente remote={{repository:{},catalogo,onSaved:()=>{}}}/>);
  const extract=html=>{const start=html.indexOf('<h2 class="text-xl font-semibold mb-4">Nova Atividade');const end=html.indexOf('Salvar</button></div>',start)+'Salvar</button></div>'.length;return html.slice(start,end).replaceAll(' disabled=""','');};
  expect(extract(remoto)).toBe(extract(local));
 });
 it("adapta nomes e IDs sem inventar estado disponível",()=>{
  const result=catalogoParaFormulario({...catalogo,equipamentos:[{...catalogo.equipamentos[0],administrative_status:null}]});
  expect(result.obras[0]).toMatchObject({construtoraId:"c",construtora:"Construtora fictícia"});
  expect(result.equipamentos[0].situacaoAdministrativa).toBe(null);
 });
 it("resolve patrimônio legado somente quando inequívoco",()=>{
  const result=prepararFormularioOriginalRemoto(form,catalogo);
  expect(result.itensEquipamentos[0]).toMatchObject({idEquipamento:"e",numeroPatrimonio:"001",tamanho:"3",ancoragem:"Afastador"});
  expect(form.itensEquipamentos).toBeUndefined();
  expect(()=>prepararFormularioOriginalRemoto(form,{...catalogo,equipamentos:[...catalogo.equipamentos,{...catalogo.equipamentos[0],id:"outro"}]})).toThrow("ambíguo");
 });
 it.each(["Manutenção","Deslocamento","Remoção","Somente recolhimento","Ascensão"])("sinaliza contrato de origem incompatível para %s",servico=>{
  expect(()=>prepararFormularioOriginalRemoto({...form,servico},catalogo)).toThrow("bloqueado");
 });
 it("não descarta financeiro, liberação, patrimônio pendente ou configuração histórica divergente",()=>{
  expect(()=>prepararFormularioOriginalRemoto({...form,valorMensalLocacao:123},catalogo)).toThrow("financeiros");
  expect(()=>prepararFormularioOriginalRemoto({...form,dataLiberacao:"2026-10-14"},catalogo)).toThrow("liberação");
  expect(()=>prepararFormularioOriginalRemoto({...form,pendenteVinculoPatrimonio:true},catalogo)).toThrow("pendente");
  expect(()=>prepararFormularioOriginalRemoto({...form,itensEquipamentos:[{numeroPatrimonio:"001",tamanho:"3",tamanhoAnterior:"2"}]},catalogo)).toThrow("anteriores");
 });
});
