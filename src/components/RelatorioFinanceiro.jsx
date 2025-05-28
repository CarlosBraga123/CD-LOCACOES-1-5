import { useEffect, useState } from "react";

export default function RelatorioFinanceiro() {
  const [atividades, setAtividades] = useState([]);
  const [filtroConstrutora, setFiltroConstrutora] = useState("");
  const [filtroObra, setFiltroObra] = useState("");
  const [filtroMes, setFiltroMes] = useState("");

  useEffect(() => {
    const dados = JSON.parse(localStorage.getItem("atividades")) || [];
    setAtividades(dados);
  }, []);

  let valoresPadrao = {};
  try {
    valoresPadrao = JSON.parse(localStorage.getItem("valoresPadrao")) || {};
  } catch {
    console.warn("Erro ao ler valoresPadrao do localStorage");
  }

  const primeiroDiaMesAtual = new Date();
  primeiroDiaMesAtual.setDate(1);

  const filtrosAtivos = filtroConstrutora || filtroObra || filtroMes;

  const atividadesFiltradas = filtrosAtivos
    ? atividades
        .filter((item) => {
          const matchConstrutora =
            !filtroConstrutora || item.construtora === filtroConstrutora;
          const matchObra = !filtroObra || item.obra === filtroObra;

          let matchMes = true;
          if (filtroMes === "mesAtual") {
            matchMes = item.dataAgendamento >= primeiroDiaMesAtual.toISOString().slice(0, 10);
          } else if (filtroMes.startsWith("fechamento:")) {
            const mesAlvo = filtroMes.split(":")[1];
            matchMes = item.dataLiberacao?.slice(0, 7) === mesAlvo;
          } else if (filtroMes && filtroMes.length === 7) {
            matchMes = item.dataAgendamento?.slice(0, 7) === filtroMes;
          }

          return matchConstrutora && matchObra && matchMes;
        })
        .sort((a, b) => {
  const dataA = new Date(a.dataLiberacao || a.dataAgendamento);
  const dataB = new Date(b.dataLiberacao || b.dataAgendamento);
  return dataA.getTime() - dataB.getTime();
})
    : [];

  const totalPrevisto = atividadesFiltradas.reduce((acc, item) => {
    const chave = `${item.equipamento}-${item.servico}`;
    const valor = Number(valoresPadrao[chave] || 0);
    return acc + valor;
  }, 0);

  const totalLiberado = atividadesFiltradas.reduce((acc, item) => {
    const chave = `${item.equipamento}-${item.servico}`;
    const valor = Number(valoresPadrao[chave] || 0);
    return acc + (item.dataLiberacao ? valor : 0);
  }, 0);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Relatório Financeiro</h2>

      <div className="grid gap-2 mb-4">
        <select
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 shadow-sm"
        >
          <option value="">Todos os meses</option>
          <option value="mesAtual">Mês Atual</option>

          {[...new Set(atividades.map((a) => a.dataLiberacao?.slice(0, 7)))]
            .filter(Boolean)
            .sort()
            .map((mes) => (
              <option key={`fechamento:${mes}`} value={`fechamento:${mes}`}>
                Fechamento Mensal ({mes.split("-").reverse().join("/")})
              </option>
            ))}

          {[...new Set(atividades.map((a) => a.dataAgendamento?.slice(0, 7)))]
            .filter(Boolean)
            .sort()
            .map((mes) => (
              <option key={mes} value={mes}>
                {mes.split("-").reverse().join("/")}
              </option>
            ))}
        </select>

        <select
          value={filtroConstrutora}
          onChange={(e) => setFiltroConstrutora(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 shadow-sm"
        >
          <option value="">Filtrar por Construtora</option>
          {[...new Set(atividades.map((a) => a.construtora))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={filtroObra}
          onChange={(e) => setFiltroObra(e.target.value)}
          className="w-full border rounded-xl px-3 py-2 shadow-sm"
        >
          <option value="">Filtrar por Obra</option>
          {[...new Set(atividades.map((a) => a.obra))].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>

      {!filtrosAtivos && (
        <p className="text-sm text-gray-500 mt-4">🔍 Aplique um filtro para ver os resultados.</p>
      )}

      {filtrosAtivos && (
        <>
          <div className="mb-4">
            <p className="font-semibold text-gray-800">Total Previsto: R$ {totalPrevisto.toFixed(2)}</p>
            <p className="font-semibold text-green-700">Total Liberado: R$ {totalLiberado.toFixed(2)}</p>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full border rounded-xl shadow text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Construtora</th>
                  <th className="px-4 py-2">Obra</th>
                  <th className="px-4 py-2">Equipamento</th>
                  <th className="px-4 py-2">Serviço</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                {atividadesFiltradas.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-2">
                      {(item.dataLiberacao || item.dataAgendamento)?.split("-").reverse().join("/")}
                    </td>
                    <td className="px-4 py-2">{item.construtora}</td>
                    <td className="px-4 py-2">{item.obra}</td>
                    <td className="px-4 py-2">{item.equipamento}</td>
                    <td className="px-4 py-2">{item.servico}</td>
                    <td className="px-4 py-2">
                      {item.dataLiberacao
                        ? "CONCLUÍDO"
                        : item.iniciado
                        ? "EM ANDAMENTO"
                        : "AGENDADO"}
                    </td>
                    <td className="px-4 py-2">
                      {Number(valoresPadrao[`${item.equipamento}-${item.servico}`] || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
