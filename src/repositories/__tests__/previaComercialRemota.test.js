import {describe,it,expect} from 'vitest';
import {tabelaComercialRemota} from '../previaComercialRemota';
import {prepararFormularioOriginalRemoto} from '../formularioAtividadeRemoto';
const row=(scope,id,value)=>({organization_id:'cd-locacoes',scope_type:scope,scope_id:id,services:{x:value},rentals:{y:value}});
const catalogo={obras:[{id:'s',constructor_id:'c'}]};
describe('prévia comercial remota somente leitura',()=>{
 it('prioriza obra, construtora e padrão sem mesclar tabelas',()=>{
  const tables=[row('DEFAULT',null,1),row('CONSTRUCTOR','c',2),row('CONSTRUCTION_SITE','s',3)];
  expect(tabelaComercialRemota({...catalogo,tabelasComerciais:tables},'s').servicos.x).toBe(3);
  expect(tabelaComercialRemota({...catalogo,tabelasComerciais:tables.slice(0,2)},'s').servicos.x).toBe(2);
  expect(tabelaComercialRemota({...catalogo,tabelasComerciais:tables.slice(0,1)},'s').servicos.x).toBe(1);
 });
 it('não usa outra organização nem escolhe tabela ambígua',()=>{
  const t=row('CONSTRUCTION_SITE','s',3);
  expect(tabelaComercialRemota({...catalogo,tabelasComerciais:[t,t]},'s')).toBeNull();
  expect(tabelaComercialRemota({...catalogo,tabelasComerciais:[{...t,organization_id:'other'}]},'s')).toBeNull();
 });
 it('ausência não inventa preços e financeiro continua rejeitado no comando',()=>{
  expect(tabelaComercialRemota(catalogo,'s')).toBeNull();
  expect(()=>prepararFormularioOriginalRemoto({servico:'Instalação',valorMensalLocacao:500},catalogo)).toThrow('financeiros');
 });
});
