// Preparação offline. Não contém transporte RPC nem habilita escrita na interface.
import {prepararConstrutoraParaSalvar} from '../utils/construtoras';
import {copiarTabelaComercialPadrao} from '../utils/tabelaComercial';
import {CAMPOS_CONSTRUTORA} from './cadastrosRemotos';
import {DEV_ORGANIZATION} from '../auth/authSession';

const copiar = value => JSON.parse(JSON.stringify(value));
export function prepararComandoConstrutora(formulario, tentativaId) {
  const id=String(tentativaId || '').toLowerCase();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new Error('UUID de tentativa inválido.');
  if(!formulario || typeof formulario!=='object' || Array.isArray(formulario) || Object.keys(formulario).some(k=>!Object.hasOwn(CAMPOS_CONSTRUTORA,k))) throw new Error('Campos incompatíveis com criação de construtora.');
  const dados=prepararConstrutoraParaSalvar(formulario);
  if(!dados.nome) throw new Error('Informe o nome da construtora.');
  return {version:1,organization_id:DEV_ORGANIZATION,id,
    constructor:Object.fromEntries(Object.entries(CAMPOS_CONSTRUTORA).map(([local,sql])=>[sql,dados[local]]))};
}

// Oracle da futura cópia no servidor: usa o DEFAULT remoto ou o inicial do código,
// exatamente como o Local. Não é preço fornecido pelo cliente à futura RPC.
export function preverCopiaComercialConstrutora(tabelasRemotas, instante) {
  if(!Array.isArray(tabelasRemotas) || !instante) throw new Error('Catálogo comercial ou instante indisponível.');
  const rows=tabelasRemotas.filter(t=>t.organization_id===DEV_ORGANIZATION && t.scope_type==='DEFAULT');
  if(rows.length>1) throw new Error('Tabela padrão ambígua.');
  const row=rows[0];
  return copiarTabelaComercialPadrao(row ? {versao:row.version,servicos:copiar(row.services || {}),locacoes:copiar(row.rentals || {})} : null,instante);
}

export function criarTentativaConstrutora(formulario,id) {
  const comando=prepararComandoConstrutora(formulario,id);
  let estado='preparada',consulta=0;
  return {
    obterComando:()=>copiar(comando),
    obterEstado:()=>estado,
    marcarResultadoIncerto(){consulta++;estado='incerta';},
    async conferir(consultaSomenteLeitura) {
      const atual=++consulta;estado='conferindo';
      try {
        const r=await consultaSomenteLeitura(copiar(comando));
        if(atual!==consulta) return estado;
        if(r?.organization_id!==DEV_ORGANIZATION || r?.id!==comando.id) throw new Error('Resposta divergente');
        if(r.status==='CONCLUIDA' && r.mesma_tentativa===true && r.commercial_table_id===`constructor:${comando.id}`) estado='concluida';
        else if(r.status==='AUSENTE') estado='nao-localizada';
        else if(r.status==='CONFLITO') estado='conflito';
        else estado='incerta';
      } catch {if(atual===consulta) estado='incerta';}
      return estado;
    },
  };
}
