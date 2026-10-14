// Projeção de leitura do Dashboard original; não reconcilia nem altera patrimônio.
const servicosValidos=['Instalação','Deslocamento','Manutenção','Ascensão','Remoção'];
export const motivosDashboard={
  pendencias:'Resumo patrimonial indisponível: dependências de vínculo e histórico ainda não homologadas sem getters locais.',
  faturamento:'Indisponível no Supabase DEV: faltam os contratos completos de valores congelados, fallbacks financeiros e locações do Dashboard.',
  tarefas:'Indisponível no Supabase DEV: tarefas e seus vínculos ainda não integram a leitura compartilhada. Conclusão remota bloqueada.',
};
export function calcularOperacionalDashboard(todas, agora=new Date()) {
  const hoje=new Date(agora),seteDiasAtras=new Date(agora);
  seteDiasAtras.setDate(hoje.getDate()-7);
  const recentes=todas.filter(a=>a.dataLiberacao).map(a=>({...a,dataObj:new Date(a.dataLiberacao)}))
    .filter(a=>a.dataObj>=seteDiasAtras && a.dataObj<=hoje).sort((a,b)=>b.dataObj-a.dataObj);
  const agendados=todas.filter(a=>a.dataAgendamento && !a.dataLiberacao)
    .map(a=>({...a,dataObj:new Date(a.dataAgendamento)})).sort((a,b)=>a.dataObj-b.dataObj);
  const quantidade=a=>Number(a.quantidade)||1;
  const inicia=a=>a.iniciaLocacao===true || (a.iniciaLocacao===undefined && a.servico==='Instalação');
  const encerra=a=>a.encerraLocacao===true || (a.encerraLocacao===undefined && a.servico==='Remoção');
  const cobra=a=>a.cobraServico===false?false:a.cobraServico===true?true:servicosValidos.includes(a.servico);
  const ativos=(equipamento,tipo)=>todas.filter(a=>a.equipamento===equipamento && a.dataLiberacao).reduce((acc,a)=>{
    const movimento=inicia(a)?quantidade(a):encerra(a)?-quantidade(a):0;
    acc.total+=movimento;if(movimento!==0)acc.porTipo[tipo(a)]=(acc.porTipo[tipo(a)]||0)+movimento;return acc;
  },{total:0,porTipo:{}});
  const balancinhos=ativos('Balancinho',a=>a.tipoBalancinho==='Eletrico'?'Eletricos':a.tipoBalancinho==='Manual'?'Manuais':'Sem tipo');
  const gruas=ativos('Mini Grua',a=>a.tipoMiniGrua==='500kg'?'500 kg':a.tipoMiniGrua==='1T'?'1 T':'Sem tipo');
  // O Local usa mês UTC atual e data de liberação OU agendamento, inclusive para contagem.
  const mesAtual=new Date(agora).toISOString().slice(0,7);
  const mes=todas.filter(a=>(a.dataLiberacao||a.dataAgendamento||'').slice(0,7)===mesAtual);
  const agrupar=rows=>rows.reduce((acc,a)=>{acc[a.servico]=(acc[a.servico]||0)+quantidade(a);return acc;},{});
  const servicos=agrupar(mes.filter(a=>a.servico!=='Manutenção' && cobra(a)));
  const outras=agrupar(mes.filter(a=>['Manutenção','Somente aluguel','Somente recolhimento'].includes(a.servico)));
  const somar=rows=>Object.values(rows).reduce((total,n)=>total+Number(n||0),0);
  return {recentes,agendados,cards:[
    {titulo:'Pendências Operacionais',valor:null,cor:'bg-amber-100',indisponivel:motivosDashboard.pendencias},
    {titulo:'Servicos nos ultimos 7 dias',valor:recentes.length,cor:'bg-blue-100'},
    {titulo:'Servicos Agendados',valor:agendados.length,cor:'bg-yellow-100'},
    {titulo:'Servicos do Mes',valor:somar(servicos),cor:'bg-green-100',detalhes:servicos},
    {titulo:'Outras Atividades',valor:somar(outras),cor:'bg-cyan-100',detalhes:outras},
    {titulo:'Balancinhos Ativos',valor:balancinhos.total,cor:'bg-purple-100',detalhes:balancinhos.porTipo},
    {titulo:'Mini Gruas Ativas',valor:gruas.total,cor:'bg-purple-200',detalhes:gruas.porTipo},
  ]};
}
export function prepararDashboardRemoto(snapshot,agora=new Date()) {
  const todas=snapshot?.atividades;
  const dataValida=v=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
    const date=new Date(`${v}T00:00:00Z`);return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===v;
  };
  // Campos ausentes não viram indicadores zerados. Quantidade tem fallback 1 no Local.
  const incompletos=!Array.isArray(todas)||todas.some(a=>!a||!a.id||!a.equipamento||!a.servico||(!a.dataLiberacao&&!a.dataAgendamento)||
    (a.dataLiberacao&&!dataValida(a.dataLiberacao))||(a.dataAgendamento&&!dataValida(a.dataAgendamento)));
  const result=calcularOperacionalDashboard(incompletos?[]:todas,agora);
  if(incompletos){
    result.cards=result.cards.map(c=>({...c,valor:null,detalhes:undefined,indisponivel:'Indisponível: atividades incompletas ou datas inválidas na leitura remota.'}));
    result.recentes=null;result.agendados=null;
  }
  const catalogoCompleto=Array.isArray(snapshot?.obras)&&Array.isArray(snapshot?.construtoras)&&Array.isArray(todas)&&todas.every(a=>{
    const obra=snapshot.obras.find(o=>o.id===a.obraId);
    const construtora=obra&&snapshot.construtoras.find(c=>c.id===obra.constructor_id);
    return Boolean((obra?.name||a.obra)&&(construtora?.name||a.construtora));
  });
  result.obras=catalogoCompleto?snapshot.obras.map(o=>({...o,nome:o.name,construtora:snapshot.construtoras.find(c=>c.id===o.constructor_id)?.name})):[];
  result.listaIndisponivel=catalogoCompleto?'':'Indisponível: identificação remota de obra/construtora incompleta.';
  if(!catalogoCompleto){result.recentes=null;result.agendados=null;}
  result.registrosPatrimonio=Array.isArray(snapshot?.vinculos)?snapshot.vinculos.map(v=>({idItem:v.id,numeroPatrimonioAtual:v.current_patrimony_number})):null;
  return result;
}
