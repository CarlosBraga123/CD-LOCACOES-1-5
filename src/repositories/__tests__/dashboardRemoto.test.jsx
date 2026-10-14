import React from 'react';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {calcularOperacionalDashboard,prepararDashboardRemoto} from '../dashboardRemoto';
import DashboardRemoto,{DashboardRemotoVisual} from '../../components/DashboardRemoto';
import {useLeituraDev} from '../../data/LeituraDevContext';
import {obterObraDaAtividade,normalizarTexto} from '../../utils/obras';
vi.mock('../../data/LeituraDevContext',()=>({useLeituraDev:vi.fn()}));
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});

// Oracle executa o cálculo ORIGINAL, sem editar Dashboard.jsx nem ler dados do navegador.
const source=readFileSync(new URL('../../components/Dashboard.jsx',import.meta.url),'utf8').replaceAll('\r\n','\n');
const start=source.indexOf('  useEffect(() => {')+'  useEffect(() => {'.length;
const body=source.slice(start,source.indexOf('  }, []);',start));
function oracle(rows){
 const out={};const noop=()=>{};
 const env={Date,servicosValidos:['Instalação','Deslocamento','Manutenção','Ascensão','Remoção'],
  tarefaRepository:{listar:()=>[]},atividadeRepository:{listar:()=>rows},obraRepository:{listar:()=>[]},construtoraRepository:{listar:()=>[]},
  valoresServicosRepository:{obter:()=>({})},valoresPadraoRepository:{obter:()=>({})},tabelaComercialRepository:{obter:()=>({locacoes:{}})},
  obterRegistrosPatrimonio:()=>[],obterEquipamentosPatrimonio:()=>[],calcularPeriodosLocacao:()=>[],obterPendenciasOperacionais:()=>[],
  obterObraDaAtividade,normalizarTexto,setTarefasPendentes:noop,setObras:noop,setContextoPatrimonial:noop,setFaturamentoMeses:noop,
  setRecentes:v=>out.recentes=v,setAgendados:v=>out.agendados=v,setCards:v=>out.cards=v};
 new Function('env',`const {${Object.keys(env).join(',')}}=env;${body}`)(env);
 return out;
}
const rows=()=>[
 {id:'legacy-in',obraId:'s',equipamento:'Balancinho',tipoBalancinho:'Eletrico',servico:'Instalação',quantidade:2,dataLiberacao:'2026-10-10'},
 {id:'closed',obraId:'s',equipamento:'Balancinho',tipoBalancinho:'Eletrico',servico:'Remoção',quantidade:1,dataLiberacao:'2026-10-12'},
 {id:'new',obraId:'s',equipamento:'Balancinho',tipoBalancinho:'Manual',servico:'Instalação',dataAgendamento:'2026-10-15',cobraServico:false,iniciaLocacao:false},
 {id:'other',obraId:'s',equipamento:'Mini Grua',tipoMiniGrua:'1T',servico:'Somente aluguel',quantidade:1,dataLiberacao:'2026-10-13',iniciaLocacao:true},
 {id:'maintenance',obraId:'s',equipamento:'Balancinho',servico:'Manutenção',quantidade:3,dataAgendamento:'2026-10-16'},
 {id:'old',obraId:'s',equipamento:'Balancinho',servico:'Instalação',dataLiberacao:'2025-04-01',iniciaLocacao:false},
];
const snapshot=(activities=rows())=>({atividades:activities,obras:[{id:'s',name:'Obra sintética',constructor_id:'c'}],construtoras:[{id:'c',name:'Construtora sintética'}],vinculos:[]});
describe('Dashboard DEV parcial com regras originais',()=>{
 it('dois agendamentos da RPC não viram executados; somente aluguel entra em Outras Atividades',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
  const entries=['Instalação','Somente aluguel'].map((servico,i)=>({id:`rpc-${i}`,obraId:'s',equipamento:'Balancinho',tipoBalancinho:'Eletrico',servico,quantidade:1,dataAgendamento:`2026-10-${13+i}`,dataLiberacao:null,cobraServico:false,iniciaLocacao:false,encerraLocacao:false}));
  const model=calcularOperacionalDashboard(entries);
  expect(model.cards.slice(1).map(c=>c.valor)).toEqual([0,2,0,1,0,0]);
  expect(model.cards[4].detalhes).toEqual({'Somente aluguel':1});
  expect(model.cards.slice(1)).toEqual(oracle(entries).cards.slice(1));
 });
 it('documenta o limite original: agendamento com cobrança verdadeira entra em Serviços do Mês',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
  const entries=[{...rows()[2],cobraServico:true}];
  const model=calcularOperacionalDashboard(entries);
  expect(model.cards[1].valor).toBe(0);expect(model.cards[3].valor).toBe(1);
  expect(model.cards.slice(1)).toEqual(oracle(entries).cards.slice(1));
 });
 it('saldo de atividades não é contagem de patrimônios físicos únicos nem depende do status administrativo',()=>{
  const item={idEquipamento:'fisico-unico',numeroPatrimonio:'9999'};
  const entries=[1,2].map(n=>({...rows()[0],id:`entrada-${n}`,quantidade:41,itensEquipamentos:[item]}));
  expect(calcularOperacionalDashboard(entries).cards[5].valor).toBe(82);
  expect(new Set(entries.flatMap(a=>a.itensEquipamentos.map(i=>i.idEquipamento))).size).toBe(1);
  const model=prepararDashboardRemoto({...snapshot(entries),equipamentos:[{id:'fisico-unico',administrative_status:'NO_GALPAO'}]});
  expect(model.cards[5].valor).toBe(82);
 });
 it.each(['2026-10-14T12:00:00Z','2026-11-01T01:00:00Z','2028-02-29T12:00:00Z','2027-01-01T00:00:00Z'])('equivale ao cálculo Local em %s',time=>{
  vi.useFakeTimers();vi.setSystemTime(new Date(time));
  const original=oracle(rows()),remote=calcularOperacionalDashboard(rows());
  expect(remote.cards.slice(1)).toEqual(original.cards.slice(1));expect(remote.recentes).toEqual(original.recentes);expect(remote.agendados).toEqual(original.agendados);
 });
 it('preserva flags explícitas, limites temporais, quantidade zero e saldo negativo do original',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
  const entries=[...rows(),{...rows()[0],id:'zero',quantidade:0,iniciaLocacao:false},{...rows()[0],id:'out',servico:'Remoção',quantidade:20},
   {...rows()[0],id:'future',dataLiberacao:'2026-10-15'}, {...rows()[0],id:'both',iniciaLocacao:true,encerraLocacao:true}];
  expect(calcularOperacionalDashboard(entries).cards.slice(1)).toEqual(oracle(entries).cards.slice(1));
  expect(calcularOperacionalDashboard(entries).recentes.some(a=>a.id==='future')).toBe(false);
 });
 it('inclui a última página, mantém UUID e ordenação, sem mutar o snapshot',()=>{
  const entries=Array.from({length:883},(_,i)=>({...rows()[5],id:String(i)}));entries.push({...rows()[2],id:'88000000-0000-4000-8000-000000000001'});
  const before=JSON.stringify(entries);const model=prepararDashboardRemoto(snapshot(entries));
  expect(model.agendados[0].id).toBe('88000000-0000-4000-8000-000000000001');expect(model.cards[2].valor).toBe(1);expect(JSON.stringify(entries)).toBe(before);
 });
 it('diferencia fonte vazia válida de fonte incompleta',()=>{
  expect(prepararDashboardRemoto(snapshot([])).cards[1].valor).toBe(0);
  const model=prepararDashboardRemoto({});expect(model.cards.every(c=>c.valor===null&&c.indisponivel)).toBe(true);expect(model.agendados).toBeNull();
 });
 it('não inventa indicadores para datas inválidas nem nomes para catálogos ausentes',()=>{
  const invalid=prepararDashboardRemoto(snapshot([{...rows()[0],dataLiberacao:'2026-02-30'}]));expect(invalid.cards[1].valor).toBeNull();
  const incomplete=prepararDashboardRemoto({...snapshot(),obras:[]});expect(incomplete.agendados).toBeNull();expect(incomplete.listaIndisponivel).toContain('incompleta');
  expect(prepararDashboardRemoto(snapshot([{...rows()[2],dataAgendamento:null}])).cards[1].valor).toBeNull();
 });
 it('não usa getters locais, não oferece concluir tarefas e não calcula faturamento',()=>{
  const get=vi.fn(()=>{throw Error('LOCAL PROIBIDO');}),set=vi.fn();vi.stubGlobal('localStorage',{getItem:get,setItem:set});
  const model=prepararDashboardRemoto(snapshot());const html=renderToStaticMarkup(<DashboardRemotoVisual model={model}/>);
  expect(get).not.toHaveBeenCalled();expect(set).not.toHaveBeenCalled();expect(html).toContain('Indisponível');expect(html).not.toContain('Concluir');expect(html).not.toContain('R$');
  expect(html).toContain('Obra sintética');expect(html).toContain('Resumo de pendência patrimonial indisponível');
  expect(html.match(/Saldo operacional de entradas e saídas liberadas/g)).toHaveLength(2);
  expect(html.match(/Não é contagem de patrimônios físicos únicos/g)).toHaveLength(2);
 });
 it('bloqueia conteúdo sem autorização e não mostra zeros falsos durante falha',()=>{
  useLeituraDev.mockReturnValue({snapshot:snapshot(),authorized:false,atualizar:vi.fn()});
  expect(renderToStaticMarkup(<DashboardRemoto/>)).not.toContain('Servicos do Mes');
  useLeituraDev.mockReturnValue({snapshot:null,authorized:true,error:'Leitura não confirmada',atualizar:vi.fn()});
  const html=renderToStaticMarkup(<DashboardRemoto/>);expect(html).toContain('Leitura não confirmada');expect(html).not.toContain('Nenhuma atividade recente');
 });
 it('mantém navegação da lista pelo UUID e card indisponível desabilitado',()=>{
  const entries=[{...rows()[2],id:'88000000-0000-4000-8000-000000000001'}];const abrir=vi.fn();
  const tree=DashboardRemotoVisual({model:prepararDashboardRemoto(snapshot(entries)),abrirAtividade:abrir});
  const nodes=[];const walk=node=>{React.Children.forEach(node,item=>{if(React.isValidElement(item)){nodes.push(item);walk(item.props.children);}});};walk(tree);
  nodes.find(n=>n.type==='li'&&n.props.onClick).props.onClick();expect(abrir).toHaveBeenCalledWith(entries[0].id);
  expect(nodes.find(n=>n.type==='button'&&n.props.disabled)?.props.disabled).toBe(true);
 });
});
