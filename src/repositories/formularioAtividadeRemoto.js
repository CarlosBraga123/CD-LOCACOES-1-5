// Adaptação dos dados ao formulário ORIGINAL; não cria outra interface.
export function catalogoParaFormulario(catalogo) {
 return {
  construtoras:catalogo.construtoras.map(c=>({...c,nome:c.name})),
  obras:catalogo.obras.map(o=>({...o,nome:o.name,construtoraId:o.constructor_id,construtora:catalogo.construtoras.find(c=>c.id===o.constructor_id)?.name||""})),
  equipamentos:catalogo.equipamentos.map(e=>({...e,idEquipamento:e.id,idItemOrigem:e.item_origin_id,equipamento:e.equipment_type,tipoBalancinho:e.balancinho_type,tipoMiniGrua:e.mini_crane_type,numeroPatrimonioAtual:e.current_patrimony_number,ativo:e.active,situacaoAdministrativa:e.administrative_status})),
 };
}
export function prepararFormularioOriginalRemoto(form,catalogo) {
 const reject=message=>{throw new Error(message);};
 if(!form.servico) reject("Selecione equipamento e serviço no formulário original.");
 if(form.dataLiberacao||form.iniciado) reject("DEV: somente agendamento; liberação não está habilitada.");
 if(!["Instalação","Somente aluguel"].includes(form.servico)) reject("DEV: esta RPC não preserva os campos históricos de movimentação, substituição e recolhimento do formulário original. Esse serviço está bloqueado para cadastro remoto nesta etapa.");
 if(["valorUnitarioServico","adicionalServicoContrapeso","valorTotalServico","valorMensalLocacao","adicionalMensalContrapeso","valorTotalMensalLocacao"].some(k=>form[k]!==undefined&&form[k]!==""&&Number(form[k])!==0)||form.valoresCongelados) reject("DEV: valores comerciais e financeiros não podem ser persistidos neste agendamento.");
 if(form.pendenteVinculoPatrimonio) reject("DEV: a RPC exige vínculo individual válido; patrimônio pendente não é suportado.");
 for(const field of ["tamanhoAnterior","tamanhoNovo"]) {
  if(form[field]&&String(form[field])!==String(form.tamanho||"")) reject("DEV: configurações históricas diferentes não são persistidas pela RPC.");
 }
 const site=catalogo.obras.find(o=>o.id===form.obraId);
 if(!site) reject("Selecione uma obra válida do catálogo DEV.");
 const explicit=catalogo.construtoras.find(c=>c.id===site.constructor_id);
 if(!explicit||explicit.name!==form.construtora) reject("Construtora e obra divergentes.");
 const quantity=Number(form.quantidade);
 let items=form.itensEquipamentos?.length?form.itensEquipamentos:(form.numerosPatrimonio||[]).map(numero=>({numeroPatrimonio:numero,tamanho:form.tamanho,ancoragem:form.ancoragem,usaContrapeso:form.usaContrapeso}));
 if(items.length!==quantity||!Number.isInteger(quantity)||quantity<1) reject("Quantidade e itens individuais divergentes.");
 items=items.map(item=>{
  const matches=catalogo.equipamentos.filter(e=>e.organization_id==="cd-locacoes" && (item.idEquipamento?e.id===item.idEquipamento:e.current_patrimony_number===String(item.numeroPatrimonio||"").trim()));
  if(matches.length!==1||matches[0].current_patrimony_number!==String(item.numeroPatrimonio||"").trim()) reject("Patrimônio ausente, órfão ou ambíguo. Selecione um equipamento válido.");
  for(const [before,current] of [["tamanhoAnterior","tamanho"],["tamanhoNovo","tamanho"],["ancoragemAnterior","ancoragem"]]){
   if(item[before]&&String(item[before])!==String(item[current]||"")) reject("DEV: configurações anteriores/novas diferentes não são persistidas pela RPC.");
  }
  if(item.alteracaoContrapeso&&item.alteracaoContrapeso!=="nenhuma") reject("DEV: alteração individual de kit não é suportada pela RPC.");
  return {...item,idEquipamento:matches[0].id};
 });
 return {...form,construtoraId:explicit.id,itensEquipamentos:items};
}
