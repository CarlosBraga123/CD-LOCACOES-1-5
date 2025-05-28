import { useEffect, useState } from "react";

export default function Dashboard() {
  const [tarefasPendentes, setTarefasPendentes] = useState([]);
  const [usuario, setUsuario] = useState("Usuário");
  const [recentes, setRecentes] = useState([]);
  const [agendados, setAgendados] = useState([]);
  const [cards, setCards] = useState([]);

  useEffect(() => {
    const usuarioSalvo = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (usuarioSalvo?.nome) {
      setUsuario(usuarioSalvo.nome);
    }

    const tarefasTodas = JSON.parse(localStorage.getItem("tarefas") || "[]");
    const pendentes = tarefasTodas.filter((t) => !t.concluida);
    setTarefasPendentes(pendentes);

    const todas = JSON.parse(localStorage.getItem("atividades") || "[]");

    const hoje = new Date();
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(hoje.getDate() - 7);

    const atividadesRecentes = todas
      .filter((a) => a.dataLiberacao)
      .map((a) => ({ ...a, dataObj: new Date(a.dataLiberacao) }))
      .filter((a) => a.dataObj >= seteDiasAtras && a.dataObj <= hoje)
      .sort((a, b) => b.dataObj - a.dataObj);

    const atividadesAgendadas = todas
      .filter((a) => a.dataAgendamento && !a.dataLiberacao)
      .map((a) => ({ ...a, dataObj: new Date(a.dataAgendamento) }))
      .sort((a, b) => a.dataObj - b.dataObj);

    setRecentes(atividadesRecentes);
    setAgendados(atividadesAgendadas);

    const contarAtivos = (equipamento) => {
      const instalacoes = todas.filter(
        (a) =>
          a.equipamento === equipamento &&
          a.servico === "Instalação" &&
          a.dataLiberacao
      ).length;

      const remocoes = todas.filter(
        (a) =>
          a.equipamento === equipamento &&
          a.servico === "Remoção" &&
          a.dataLiberacao
      ).length;

      return instalacoes - remocoes;
    };

    const ativosBalancinho = contarAtivos("Balancinho");
    const ativosMiniGrua = contarAtivos("Mini Grua");

    const mesAtual = new Date().toISOString().slice(0, 7);
    const servicosDoMes = todas.filter(
      (a) => a.dataLiberacao?.slice(0, 7) === mesAtual && a.servico !== "Manutenção"
    ).length;

    setCards([
      { titulo: "Serviços nos últimos 7 dias", valor: atividadesRecentes.length, cor: "bg-blue-100" },
      { titulo: "Serviços Agendados", valor: atividadesAgendadas.length, cor: "bg-yellow-100" },
      { titulo: "Serviços do Mês", valor: servicosDoMes, cor: "bg-green-100" },
      { titulo: "Balancinhos Ativos", valor: ativosBalancinho, cor: "bg-purple-100" },
      { titulo: "Mini Gruas Ativas", valor: ativosMiniGrua, cor: "bg-purple-200" },
    ]);
  }, []);

  const concluir = (id) => {
    const todas = JSON.parse(localStorage.getItem("tarefas") || "[]");
    const atualizadas = todas.map((t) =>
      t.id === id
        ? {
            ...t,
            concluida: true,
            concluidaEm: new Date().toISOString(),
            concluidaPor: usuario
          }
        : t
    );
    localStorage.setItem("tarefas", JSON.stringify(atualizadas));
    setTarefasPendentes(atualizadas.filter((t) => !t.concluida));
  };

  const formatarData = (data) => {
    if (!data) return "—";
    const [y, m, d] = data.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold mb-4">🏠 Painel CD Locações</h2>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className={`${card.cor} p-4 rounded shadow-sm`}>
            <div className="text-sm text-gray-600">{card.titulo}</div>
            <div className="text-2xl font-bold">{card.valor}</div>
          </div>
        ))}
      </div>

      {/* Próximos Agendamentos */}
      <section>
        <h3 className="text-lg font-semibold mb-2">📌 Próximos Serviços Agendados</h3>
        {agendados.length === 0 ? (
          <p className="text-gray-500">Nenhum serviço agendado.</p>
        ) : (
          <ul className="space-y-2">
            {agendados.map((a) => (
              <li key={a.id} className="border rounded p-3 bg-white shadow-sm">
                <strong>{a.servico} - {a.equipamento}</strong>
                {a.equipamento === "Balancinho" && a.tamanho ? ` [${a.tamanho}m]` : ""}<br />
                {a.construtora} / {a.obra} <br />
                Agendado: {formatarData(a.dataAgendamento)}{" "}
                {a.iniciado && <span className="text-orange-600 font-semibold">(Em Andamento)</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tarefas Pendentes */}
      <section>
        <h2 className="text-lg font-semibold mb-2">📝 Tarefas Pendentes</h2>
        <div className="space-y-2">
          {tarefasPendentes.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma tarefa pendente.</p>
          ) : (
            tarefasPendentes.map((tarefa) => (
              <div
                key={tarefa.id}
                className="border p-3 rounded-md shadow-sm bg-white flex justify-between items-start"
              >
                <div>
                  <p className="font-medium">{tarefa.texto}</p>
                  <p className="text-xs text-gray-500">
                    Criada em: {new Date(tarefa.criadaEm).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => concluir(tarefa.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm h-fit"
                >
                  Concluir
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Atividades Recentes */}
      <section>
        <h3 className="text-lg font-semibold mb-2">🕓 Atividades Recentes (últimos 7 dias)</h3>
        {recentes.length === 0 ? (
          <p className="text-gray-500">Nenhuma atividade recente registrada.</p>
        ) : (
          <ul className="space-y-2">
            {recentes.map((a) => (
              <li key={a.id} className="border rounded p-3 bg-white shadow-sm">
                <strong>{a.servico} - {a.equipamento}</strong>
                {a.equipamento === "Balancinho" && a.tamanho ? ` [${a.tamanho}m]` : ""}<br />
                {a.construtora} / {a.obra} <br />
                Liberado: {formatarData(a.dataLiberacao)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
