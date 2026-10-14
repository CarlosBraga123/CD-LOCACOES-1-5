import {obterUnidadesEquipamentosAtivos} from "../utils/equipamentosAtivos";
import {montarIdentificadoresEquipamentosAtivos} from "../utils/equipamentosPatrimonio";
import {catalogoParaFormulario} from "./formularioAtividadeRemoto";
import {normalizarNumeroPatrimonio} from "../utils/patrimoniosEquipamentos";

export function obterAtivosRemotos(catalogo) {
 if(!["atividades","vinculos","ajustes","substituicoes"].every(k=>Array.isArray(catalogo[k]))) throw new Error("Histórico remoto de disponibilidade incompleto. Atualize antes de cadastrar.");
 const {obras,equipamentos}=catalogoParaFormulario(catalogo);
 const registros=catalogo.vinculos.map(v=>({idItem:v.id,numeroPatrimonioAtual:v.current_patrimony_number}));
 const ajustes=catalogo.ajustes.map(a=>({id:a.id,idItem:a.item_id,idEquipamento:a.physical_equipment_id,idUnidade:a.unit_id,obraId:a.construction_site_id,data:a.adjustment_date,tamanho:a.size,ancoragem:a.anchoring,usaContrapeso:a.uses_counterweight,criadoEm:a.source_created_at}));
 const substituicoes=catalogo.substituicoes.map(s=>({id:s.id,data:s.event_date,equipamentoOrigemId:s.source_equipment_id,equipamentoDestinoId:s.destination_equipment_id,unidadeOrigemId:s.source_unit_id,unidadeDestinoId:s.destination_unit_id}));
 // Argumentos explícitos impedem os getters locais opcionais da lógica original.
 return obras.flatMap(obra=>obterUnidadesEquipamentosAtivos(obra,catalogo.atividades,registros,equipamentos,{ajustes,substituicoes}));
}
export function equipamentoRemotoOcupado(equipment,catalogo) {
 const ids=montarIdentificadoresEquipamentosAtivos(obterAtivosRemotos(catalogo));
 return ids.idsEquipamentosAtivos.has(String(equipment.id)) || ids.idsItensAtivos.has(String(equipment.item_origin_id||"")) || ids.patrimoniosAtivos.has(normalizarNumeroPatrimonio(equipment.current_patrimony_number));
}
export function validarDisponibilidadeFormulario(formulario,catalogo) {
 const ids=montarIdentificadoresEquipamentosAtivos(obterAtivosRemotos(catalogo));
 for(const item of formulario.itensEquipamentos) {
  const equipment=catalogo.equipamentos.find(e=>e.id===item.idEquipamento);
  if(!equipment || ids.idsEquipamentosAtivos.has(String(equipment.id)) || ids.idsItensAtivos.has(String(equipment.item_origin_id||"")) || ids.patrimoniosAtivos.has(normalizarNumeroPatrimonio(equipment.current_patrimony_number))) throw new Error("Patrimônio ocupado pelo histórico remoto. Não pode ser selecionado para esta instalação.");
 }
}
