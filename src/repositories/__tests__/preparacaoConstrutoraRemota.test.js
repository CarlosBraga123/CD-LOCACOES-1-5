import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {prepararComandoConstrutora,preverCopiaComercialConstrutora,criarTentativaConstrutora} from '../preparacaoConstrutoraRemota';
import {criarFormularioConstrutora,prepararConstrutoraParaSalvar} from '../../utils/construtoras';
import {copiarTabelaComercialPadrao} from '../../utils/tabelaComercial';
import {CAMPOS_CONSTRUTORA} from '../cadastrosRemotos';
const id='990000ab-00cd-4000-8000-000000000001',now='2026-10-14T12:00:00Z';
const command=()=>prepararComandoConstrutora({nome:' Teste sintético '},id);
const response=(status='CONCLUIDA')=>({organization_id:'cd-locacoes',id,status,mesma_tentativa:true,commercial_table_id:`constructor:${id}`});
describe('preparação offline de criação cadastral',()=>{
  it('reutiliza todos os campos, valores iniciais e normalização do Local',()=>{
    const form=criarFormularioConstrutora();for(const k of Object.keys(form))if(k!=='ativa')form[k]=` ${k} `;
    form.ativa=false;const normalized=prepararConstrutoraParaSalvar(form),c=prepararComandoConstrutora(form,id);
    for(const [k,sql] of Object.entries(CAMPOS_CONSTRUTORA))expect(c.constructor[sql]).toEqual(normalized[k]);
    expect(command().constructor.active).toBe(true);expect(c.constructor.active).toBe(false);
  });
  it('preserva duplicidade de nome/CNPJ permitida pelo Local sem confundir tentativas',()=>{expect(prepararComandoConstrutora({nome:'Mesmo nome',cnpj:'mesmo'},id).id).not.toBe(prepararComandoConstrutora({nome:'Mesmo nome',cnpj:'mesmo'},id.replace(/1$/,'2')).id);});
  it('normaliza UUID e não envia valores comerciais, datas ou IDs escolhidos no formulário',()=>{expect(prepararComandoConstrutora({nome:'Teste'},id.toUpperCase())).toEqual(prepararComandoConstrutora({nome:'Teste'},id));expect(Object.keys(command())).toEqual(['version','organization_id','id','constructor']);expect(()=>prepararComandoConstrutora({nome:'Teste',id:'outro'},id)).toThrow();expect(()=>prepararComandoConstrutora({nome:'Teste',tabelaComercial:{}},id)).toThrow();});
  it.each(['','123',id.replace('-4000-','-1000-')])('nega identificador inválido %s',uuid=>expect(()=>prepararComandoConstrutora({nome:'Teste'},uuid)).toThrow());
  it('exige somente o nome obrigatório, sem inventar validação de CNPJ',()=>{expect(()=>prepararComandoConstrutora({nome:'  '},id)).toThrow();expect(prepararComandoConstrutora({nome:'Teste',cnpj:'texto legado'},id).constructor.tax_id).toBe('texto legado');});
  it('cópia comercial é equivalente à função Local, incluindo zeros e chaves legadas',()=>{
    const saved={versao:7,servicos:{legado:0},locacoes:{'Balancinho-Eletrico':0}};
    expect(preverCopiaComercialConstrutora([{organization_id:'cd-locacoes',scope_type:'DEFAULT',version:7,services:saved.servicos,rentals:saved.locacoes}],now)).toEqual(copiarTabelaComercialPadrao(saved,now));
  });
  it('padrão inexistente usa o inicial do código, nunca o localStorage',()=>{expect(preverCopiaComercialConstrutora([],now)).toEqual(copiarTabelaComercialPadrao(null,now));});
  it('padrão ambíguo bloqueia a prévia e outra organização não fornece preços',()=>{const row={organization_id:'cd-locacoes',scope_type:'DEFAULT'};expect(()=>preverCopiaComercialConstrutora([row,row],now)).toThrow();expect(preverCopiaComercialConstrutora([{...row,organization_id:'outra',services:{injetado:99}}],now).servicos).not.toHaveProperty('injetado');});
  it('tentativa preserva UUID e conteúdo sem permitir mutação pelo chamador',()=>{const t=criarTentativaConstrutora({nome:'Teste'},id),c=t.obterComando();c.constructor.name='Mudado';t.marcarResultadoIncerto();expect(t.obterComando().constructor.name).toBe('Teste');expect(t.obterComando().id).toBe(id);});
  it('resultado incerto exige confirmação individual, sem reenvio',async()=>{const t=criarTentativaConstrutora({nome:'Teste'},id),read=vi.fn(async()=>response());t.marcarResultadoIncerto();expect(await t.conferir(read)).toBe('concluida');expect(read).toHaveBeenCalledOnce();expect(read).toHaveBeenCalledWith(t.obterComando());});
  it.each(['AUSENTE','CONFLITO'])('separa estado %s de confirmação de sucesso',async status=>{const t=criarTentativaConstrutora({nome:'Teste'},id);expect(await t.conferir(async()=>response(status))).toBe(status==='AUSENTE'?'nao-localizada':'conflito');});
  it('falha de rede, confirmação incompleta ou organização diferente não geram sucesso',async()=>{const t=criarTentativaConstrutora({nome:'Teste'},id);for(const read of [async()=>{throw Error('segredo sintético');},async()=>({...response(),mesma_tentativa:false}),async()=>({...response(),organization_id:'outra'}),async()=>({...response(),commercial_table_id:'outro'})])expect(await t.conferir(read)).toBe('incerta');});
  it('descarta confirmação antiga após nova incerteza',async()=>{const t=criarTentativaConstrutora({nome:'Teste'},id);let finish;const pending=t.conferir(()=>new Promise(resolve=>{finish=resolve;}));t.marcarResultadoIncerto();finish(response());await pending;expect(t.obterEstado()).toBe('incerta');});
  it('não conecta o módulo à interface e não oferece transporte de escrita',()=>{const source=readFileSync('src/repositories/preparacaoConstrutoraRemota.js','utf8');expect(source).not.toMatch(/\.rpc\(|\.insert\(|\.upsert\(|localStorage|salvarTodos/);const ui=readFileSync('src/components/ConstrutorasObras.jsx','utf8');expect(ui).not.toContain('preparacaoConstrutoraRemota');expect(ui).toContain('disabled={somenteLeitura}');});
});
