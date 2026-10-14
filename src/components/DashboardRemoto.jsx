import React,{useEffect,useMemo} from 'react';
import {useLeituraDev} from '../data/LeituraDevContext';
import {prepararDashboardRemoto,motivosDashboard} from '../repositories/dashboardRemoto';
import {obterObraDaAtividade} from '../utils/obras';
import AtividadeResumoCard from './AtividadeResumoCard';

export default function DashboardRemoto(props) {
  const {snapshot,loading,error,updated,revision,atualizar,authorized,scopeKey}=useLeituraDev();
  useEffect(()=>{if(authorized&&!snapshot)atualizar();},[scopeKey]);
  const model=useMemo(()=>snapshot?prepararDashboardRemoto(snapshot):null,[snapshot]);
  return <>
    <div className="px-4">
      <p>Fonte: Supabase DEV · somente leitura · revisão {revision}{updated?` · atualizado ${updated}`:''}.</p>
      <button type="button" onClick={()=>atualizar()} disabled={loading||!authorized} className="rounded border px-3 py-2">{loading?'Carregando...':'Atualizar do Supabase'}</button>
      {!authorized&&<p role="alert">Sessão Admin/Gestor DEV autorizada necessária.</p>}
      {error&&<p role="alert">{error}</p>}
      {!model&&!error&&authorized&&<p role="status">Aguardando leitura remota. Nenhum dado local será usado.</p>}
    </div>
    {model&&authorized&&<DashboardRemotoVisual {...props} model={model}/>}
  </>;
}

// Mantém marcação/classes do Dashboard Local; diferenças só para capacidades indisponíveis.
export function DashboardRemotoVisual({model,abrirAtividade,navegar}) {
  const {cards,recentes,agendados,obras,registrosPatrimonio}=model;
  const formatarData = (data) => {
    if (!data) return "-";
    const [y, m, d] = data.split("-");
    return `${d}/${m}/${y}`;
  };

  const obterDadosObra = (atividade) => {
    const obra = obterObraDaAtividade(atividade, obras);

    return {
      construtora: obra?.construtora || atividade.construtora,
      obra: obra?.nome || atividade.obra,
    };
  };

  const abrirAtividadeSegura = (id) => {
    if (!id || !abrirAtividade) return;
    abrirAtividade(id);
  };

  const rotuloServico = {
    Instalação: "Instalacoes",
    Deslocamento: "Deslocamentos",
    Ascensão: "Ascensoes",
    Manutenção: "Manutencoes",
    Remoção: "Remocoes",
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold mb-4">Painel</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-7">
        {cards.map((card, idx) => (
          <button type="button" disabled={Boolean(card.indisponivel)} key={idx} onClick={() => card.acao === "pendencias-operacionais" && navegar?.("atividades", { destino: "atividades", acao: "filtrar-pendencias-operacionais" })} className={`${card.cor} p-4 rounded shadow-sm text-left ${card.acao ? "cursor-pointer hover:ring-2 hover:ring-amber-300" : ""}`}>
            <div className="text-sm text-gray-600">{card.titulo}</div>
            <div className="text-2xl font-bold">{card.indisponivel ? "Indisponível" : card.valor}</div>
            {["Balancinhos Ativos", "Mini Gruas Ativas"].includes(card.titulo) && <p className="mt-2 text-xs text-gray-700">Saldo operacional de entradas e saídas liberadas, conforme o Local. Não é contagem de patrimônios físicos únicos; conferência patrimonial pendente.</p>}
            {card.indisponivel && <p className="mt-2 text-xs text-gray-700">{card.indisponivel}</p>}
            {card.detalhes && (
              <div className="mt-2 space-y-1 text-xs text-gray-700">
                {Object.entries(card.detalhes)
                  .filter(([, valor]) => Number(valor || 0) !== 0)
                  .map(([chave, valor]) => (
                    <div key={chave} className="flex justify-between gap-2">
                      <span>{rotuloServico[chave] || chave}:</span>
                      <strong>{valor}</strong>
                    </div>
                  ))}
              </div>
            )}
          </button>
        ))}
      </div>

      <section className="rounded border bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Faturamento dos ultimos 6 meses</h3>
        <p role="status" className="text-gray-500">{motivosDashboard.faturamento}</p>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-2">Proximos Servicos Agendados</h3>
        {agendados === null ? <p role="status" className="text-gray-500">{model.listaIndisponivel || "Indisponível: dados de atividades incompletos."}</p> : agendados.length === 0 ? (
          <p className="text-gray-500">Nenhum servico agendado.</p>
        ) : (
          <ul className="space-y-2">
            {agendados.map((a) => {
              const dadosObra = obterDadosObra(a);

              return (
                <li
                  key={a.id}
                  onClick={() => abrirAtividadeSegura(a.id)}
                  className="border rounded p-3 bg-white shadow-sm cursor-pointer hover:bg-blue-50"
                  title="Abrir atividade"
                >
                  <strong>{a.servico} - {a.equipamento}</strong>
                  {a.equipamento === "Balancinho" && a.tamanho ? ` [${a.tamanho}m]` : ""}<br />
                  {dadosObra.construtora} / {dadosObra.obra} <br />
                  Agendado: {formatarData(a.dataAgendamento)}{" "}
                  {a.iniciado && <span className="text-orange-600 font-semibold">(Em Andamento)</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Tarefas Pendentes</h2>
        <p role="status" className="text-gray-500">{motivosDashboard.tarefas}</p>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-2">Atividades Recentes (ultimos 7 dias)</h3>
        {recentes === null || registrosPatrimonio === null ? <p role="status" className="text-gray-500">{model.listaIndisponivel || "Indisponível: dados de atividades ou vínculos patrimoniais incompletos."}</p> : recentes.length === 0 ? (
          <p className="text-gray-500">Nenhuma atividade recente registrada.</p>
        ) : (
          <ul className="space-y-2">
            {recentes.map((a) => {
              const dadosObra = obterDadosObra(a);

              return (
                <li key={a.id}>
                  <AtividadeResumoCard
                    atividade={a}
                    registrosPatrimonio={registrosPatrimonio}
                    pendenciaPatrimonialIndisponivel
                    onClick={() => abrirAtividadeSegura(a.id)}
                    className="cursor-pointer hover:border-blue-300 hover:bg-blue-50"
                    title="Abrir atividade"
                    informacoesAdicionais={
                      <p className="mt-1 text-xs text-gray-500">
                        {dadosObra.construtora} / {dadosObra.obra}
                      </p>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
