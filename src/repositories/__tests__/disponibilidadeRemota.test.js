import {describe,it,expect,vi} from "vitest";
import * as ajustesLocais from "../../utils/ajustesConfiguracaoEquipamentos";
import * as patrimonioLocal from "../../utils/patrimoniosEquipamentos";
import * as equipamentosLocais from "../../utils/equipamentosPatrimonio";
import {obterAtivosRemotos,equipamentoRemotoOcupado,validarDisponibilidadeFormulario} from "../disponibilidadeRemota";
const equipment=numero=>({id:"e"+numero,organization_id:"cd-locacoes",item_origin_id:"orig"+numero,current_patrimony_number:numero,equipment_type:"Balancinho",balancinho_type:"Eletrico",active:true,administrative_status:"NO_GALPAO"});
const event=(id,obra,numero,servico,date,items=false)=>({id,obraId:obra,equipamento:"Balancinho",tipoBalancinho:"Eletrico",servico,dataLiberacao:date,quantidade:1,numerosPatrimonio:[numero],tamanho:"3",...(items?{itensEquipamentos:[{idItem:"item"+numero,idEquipamento:"e"+numero,numeroPatrimonio:numero,tamanho:"3",equipamento:"Balancinho",tipoBalancinho:"Eletrico"}]}:{})});
function catalogo(){return {construtoras:[{id:"c",name:"Fictícia"}],obras:[{id:"A",name:"A",constructor_id:"c"},{id:"B",name:"B",constructor_id:"c"}],equipamentos:[equipment("0140"),equipment("0141")],vinculos:[],ajustes:[],substituicoes:[],atividades:[
 event("1","A","0140","Instalação","2026-08-01",true),event("2","A","0141","Instalação","2026-08-01",true),
 event("3","A","0140","Manutenção","2026-08-04",true),event("4","A","0140","Deslocamento","2026-08-18",true),
 event("5","A","0140","Remoção","2026-09-29",true),event("6","A","0141","Remoção","2026-09-29",true),
 event("7","B","0140","Instalação","2026-09-30"),
 ]};}
describe("disponibilidade remota pelo histórico",()=>{
 it("não consulta getters locais de ajustes, vínculos ou mestres",()=>{
  const spies=[
   vi.spyOn(ajustesLocais,"obterAjustesConfiguracaoEquipamentos").mockImplementation(()=>{throw new Error("LOCAL PROIBIDO");}),
   vi.spyOn(patrimonioLocal,"obterRegistrosPatrimonio").mockImplementation(()=>{throw new Error("LOCAL PROIBIDO");}),
   vi.spyOn(equipamentosLocais,"obterEquipamentosPatrimonio").mockImplementation(()=>{throw new Error("LOCAL PROIBIDO");}),
  ];
  try {expect(obterAtivosRemotos(catalogo()).map(u=>u.numeroPatrimonio)).toEqual(["0140"]);spies.forEach(s=>expect(s).not.toHaveBeenCalled());} finally {spies.forEach(s=>s.mockRestore());}
 });
 it("0140 ocupado apesar de NO_GALPAO; 0141 disponível após remoção",()=>{
  const c=catalogo();expect(equipamentoRemotoOcupado(c.equipamentos[0],c)).toBe(true);expect(equipamentoRemotoOcupado(c.equipamentos[1],c)).toBe(false);
  expect(obterAtivosRemotos(c).map(u=>u.numeroPatrimonio)).toEqual(["0140"]);
 });
 it("patrimônio legado é excluído mesmo sem item individual na nova instalação",()=>{
  const c=catalogo();expect(()=>validarDisponibilidadeFormulario({itensEquipamentos:[{idEquipamento:"e0140"}]},c)).toThrow("ocupado");
  expect(()=>validarDisponibilidadeFormulario({itensEquipamentos:[{idEquipamento:"e0141"}]},c)).not.toThrow();
 });
 it("recolhimento encerra ocupação, agendamento não inicia e deslocamento não duplica",()=>{
  const c=catalogo();c.atividades.push(event("8","B","0140","Deslocamento","2026-10-01"),{...event("9","B","0140","Somente recolhimento","2026-10-02"),encerraLocacao:true});
  c.atividades.push({...event("10","A","0141","Instalação",""),dataAgendamento:"2026-10-14",iniciaLocacao:false});
  expect(obterAtivosRemotos(c)).toEqual([]);
 });
 it("identidades administrativas de legado são aplicadas sem dados locais",()=>{
  const c=catalogo();c.atividades=[{...event("orig","B","","Instalação","2026-09-30"),itensEquipamentos:[{idItem:"legado",tamanho:"3",equipamento:"Balancinho",tipoBalancinho:"Eletrico"}]}];
  c.vinculos=[{id:"legado",current_patrimony_number:"0140"}];
  expect(equipamentoRemotoOcupado(c.equipamentos[0],c)).toBe(true);
 });
 it("histórico incompleto bloqueia; não assume ausência de ocupação",()=>{
  const c=catalogo();delete c.substituicoes;expect(()=>obterAtivosRemotos(c)).toThrow("incompleto");
 });
});
