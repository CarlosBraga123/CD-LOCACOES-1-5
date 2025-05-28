import { useEffect, useState } from "react";

export default function DetalhesObra() {
  const [obras, setObras] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState(null);

  useEffect(() => {
    const obrasSalvas = JSON.parse(localStorage.getItem("obras") || "[]");
    setObras(obrasSalvas);

    const atividadesSalvas = JSON.parse(localStorage.getItem("atividades") || "[]");
    setAtividades(atividadesSalvas);
  }, []);

  const formatarData = (data) => {
    if (!data) return "";
    const [y, m, d] = data.split("-");
    return `${d}/${m}/${y}`;
  };

  const calcularAtivos = (obraNome, equipamento) => {
    const instalacoes = atividades.filter(
      (a) =>
        a.obra === obraNome &&
        a.equipamento === equipamento &&
        a.servico === "Instalação" &&
        a.dataLiberacao
    ).length;

    const remocoes = atividades.filter(
      (a) =>
        a.obra === obraNome &&
        a.equipamento === equipamento &&
        a.servico === "Remoção" &&
        a.dataLiberacao
    ).length;

    return instalacoes - remocoes;
  };

  const contarServicos = (obraNome, equipamento, servico) => {
    return atividades.filter(
      (a) =>
        a.obra === obraNome &&
        a.equipamento === equipamento &&
        a.servico === servico &&
        a.dataLiberacao
    ).length;
  };

  const selecionarObra = (obra) => {
    setObraSelecionada(obra);
  };

  const servicosExecutados = (obraNome) => {
    return atividades
      .filter((a) => a.obra === obraNome && a.dataLiberacao)
      .sort((a, b) => new Date(b.dataLiberacao) - new Date(a.dataLiberacao));
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">📌 Detalhes da Obra</h2>

      {!obraSelecionada ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {obras.map((obra) => (
            <div
              key={obra.id}
              className="p-4 border rounded shadow cursor-pointer bg-white"
              onClick={() => selecionarObra(obra)}
            >
              <p className="text-sm text-gray-500">{obra.construtora}</p>
              <p className="text-lg font-semibold">{obra.nome}</p>
              <p className="text-sm">Balancinhos ativos: {calcularAtivos(obra.nome, "Balancinho")}</p>
              {calcularAtivos(obra.nome, "Mini Grua") > 0 && (
                <p className="text-sm">Mini Gruas ativas: {calcularAtivos(obra.nome, "Mini Grua")}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setObraSelecionada(null)}
            className="text-blue-600 underline"
          >
            ← Voltar
          </button>

          <div className="space-y-2">
            <p><strong>Nome:</strong> {obraSelecionada.nome}</p>
            <p><strong>Construtora:</strong> {obraSelecionada.construtora}</p>
            {obraSelecionada.engenheiro && <p><strong>Engenheiro:</strong> {obraSelecionada.engenheiro}</p>}
            {obraSelecionada.endereco && <p><strong>Endereço:</strong> {obraSelecionada.endereco}</p>}
            {obraSelecionada.observacoes && <p><strong>Observações:</strong> {obraSelecionada.observacoes}</p>}
            <p><strong>Balancinhos ativos:</strong> {calcularAtivos(obraSelecionada.nome, "Balancinho")}</p>
            <p><strong>Mini Gruas ativas:</strong> {calcularAtivos(obraSelecionada.nome, "Mini Grua")}</p>
          </div>

          <div>
            <h3 className="text-md font-semibold mt-2">📊 Quantidade de Serviços</h3>
            <p className="text-sm mt-1">
              <strong>Balancinho:</strong><br />
              • Instalação: {contarServicos(obraSelecionada.nome, "Balancinho", "Instalação")}<br />
              • Deslocamento: {contarServicos(obraSelecionada.nome, "Balancinho", "Deslocamento")}<br />
              • Manutenção: {contarServicos(obraSelecionada.nome, "Balancinho", "Manutenção")}<br />
              • Remoção: {contarServicos(obraSelecionada.nome, "Balancinho", "Remoção")}
            </p>
            <p className="text-sm mt-2">
              <strong>Mini Grua:</strong><br />
              • Instalação: {contarServicos(obraSelecionada.nome, "Mini Grua", "Instalação")}<br />
              • Ascensão: {contarServicos(obraSelecionada.nome, "Mini Grua", "Ascensão")}<br />
              • Remoção: {contarServicos(obraSelecionada.nome, "Mini Grua", "Remoção")}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mt-4">🛠️ Serviços Executados</h3>
            <ul className="mt-2 space-y-2">
              {servicosExecutados(obraSelecionada.nome).map((s) => (
                <li key={s.id} className="border p-2 rounded bg-gray-50">
                  <strong>{s.servico}</strong> - {s.equipamento}
                  {s.tamanho && s.equipamento === "Balancinho" ? ` [${s.tamanho}m]` : ""} <br />
                  Agendado: {formatarData(s.dataAgendamento)} — Liberado: {s.dataLiberacao ? formatarData(s.dataLiberacao) : "—"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
