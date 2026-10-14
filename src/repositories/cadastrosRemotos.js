// Contrato cadastral explícito: nenhuma leitura de raw_payload ou armazenamento local.
export const CAMPOS_CONSTRUTORA = {
  nome:'name',razaoSocial:'legal_name',nomeFantasia:'trade_name',cnpj:'tax_id',inscricaoEstadual:'state_registration',inscricaoMunicipal:'municipal_registration',ativa:'active',responsavel:'responsible_name',cargoResponsavel:'responsible_role',telefone:'phone',whatsapp:'whatsapp',email:'email',emailFinanceiro:'financial_email',cep:'postal_code',logradouro:'street',numero:'street_number',complemento:'address_complement',bairro:'neighborhood',cidade:'city',estado:'state',condicaoPagamento:'payment_terms',responsavelComercial:'commercial_responsible',observacoesInternas:'internal_notes',
};
export const CAMPOS_OBRA = {
  nome:'name',construtoraId:'constructor_id',cnpj:'tax_id',cno:'cno',codigoInterno:'internal_code',situacao:'status',cep:'postal_code',logradouro:'street',numero:'street_number',complemento:'address_complement',bairro:'neighborhood',cidade:'city',estado:'state',pontoReferencia:'reference_point',engenheiro:'engineer',endereco:'legacy_address',observacoes:'notes',responsavel:'responsible_name',cargoResponsavel:'responsible_role',telefone:'phone',whatsapp:'whatsapp',email:'email',horarioEntrega:'delivery_hours',orientacoesAcesso:'access_instructions',enderecoEntregaDiferente:'separate_delivery_address',enderecoEntrega:'delivery_address',
};
export const CAMPOS_CONTATO = {tipo:'contact_type',nome:'name',cargo:'role',crea:'crea',telefone:'phone',whatsapp:'whatsapp',email:'email',principal:'is_primary',ativo:'active'};
export const colunasCadastro = campos => ['organization_id','id',...new Set(Object.values(campos))].join(',');
const converter = (row,campos) => ({id:row.id,...Object.fromEntries(Object.entries(campos).map(([local,sql])=>[local,row[sql] ?? null]))});
function validar(rows) {
  const ids=new Set();
  for(const row of rows) {
    if(row.organization_id!=='cd-locacoes'||!row.id||ids.has(row.id)) throw new Error('Catálogo cadastral divergente.');
    ids.add(row.id);
  }
}
export function adaptarCadastrosRemotos(snapshot) {
  if(!snapshot || !['atividades','construtoras','obras','contatosObras','tabelasComerciais'].every(k=>Array.isArray(snapshot[k]))) throw new Error('Leitura cadastral completa indisponível.');
  validar(snapshot.construtoras);validar(snapshot.obras);validar(snapshot.tabelasComerciais);
  const avisos=[];
  const tabela=(tipo,id)=>{
    const rows=snapshot.tabelasComerciais.filter(t=>t.scope_type===tipo && t.scope_id===id);
    if(rows.length>1) {avisos.push('Tabela comercial ambígua; associação indisponível.');return null;}
    const t=rows[0];
    return t ? {id:t.id,origem:t.origin,versao:t.version,versaoBase:t.base_version,construtoraId:t.constructor_id,atualizadoEm:t.source_updated_at,servicos:t.services,locacoes:t.rentals} : null;
  };
  const construtoras=snapshot.construtoras.map(c=>({...converter(c,CAMPOS_CONSTRUTORA),tabelaComercial:tabela('CONSTRUCTOR',c.id)}));
  const contatos=new Set();
  for(const c of snapshot.contatosObras) {
    const key=JSON.stringify([c.construction_site_id,c.id]);
    if(c.organization_id!=='cd-locacoes'||!c.id||contatos.has(key)||!snapshot.obras.some(o=>o.id===c.construction_site_id)) throw new Error('Contatos com vínculos divergentes.');
    contatos.add(key);
  }
  const obras=snapshot.obras.map(o=>{
    const c=construtoras.find(c=>c.id===o.constructor_id);
    if(!c) avisos.push('Obra sem vínculo cadastral comprovado com construtora.');
    return {...converter(o,CAMPOS_OBRA),construtora:c?.nome ?? null,tabelaComercial:tabela('CONSTRUCTION_SITE',o.id),contatos:snapshot.contatosObras.filter(c=>c.construction_site_id===o.id).sort((a,b)=>(a.position??0)-(b.position??0)||String(a.id).localeCompare(String(b.id))).map(c=>converter(c,CAMPOS_CONTATO))};
  });
  return {construtoras,obras,avisos:[...new Set(avisos)]};
}
