import { useEffect, useState } from "react";
import { normalizarTexto } from "../utils/obras";
import { ordenarObrasPorEquipamentosAtivos } from "../utils/ordenacao";
import {
  calcularTotalAtivosPorEquipamento,
  contarServicosObra,
  formatarDataDetalhesObra,
  formatarEquipamentoDetalhesObra,
  obterResumoBalancinhosAtivos,
  obterResumoMiniGruasAtivas,
  obterServicosExecutadosObra,
} from "../utils/detalhesObra";

export default function DetalhesObra({
  abrirAtividade,
  contextoNavegacao,
  limparContextoNavegacao,
}) {
  const [obras, setObras] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [obraSelecionada, setObraSelecionada] = useState(null);
  const [dadosCarregados, setDadosCarregados] = useState(false);

  useEffect(() => {
    const obrasSalvas = JSON.parse(localStorage.getItem("obras") || "[]");
    setObras(obrasSalvas);

    const atividadesSalvas = JSON.parse(localStorage.getItem("atividades") || "[]");
    setAtividades(atividadesSalvas);
    setDadosCarregados(true);
  }, []);

  useEffect(() => {
    if (
      !dadosCarregados ||
      contextoNavegacao?.origem !== "construtoras-obras" ||
      contextoNavegacao?.destino !== "detalhesobra" ||
      contextoNavegacao?.acao !== "abrir-detalhes-obra"
    ) {
      return;
    }

    const obraId = contextoNavegacao.obraId;
    let obra = null;

    if (obraId) {
      obra = obras.find((item) => String(item.id) === String(obraId)) || null;
    } else if (contextoNavegacao.obraNome) {
      obra =
        obras.find(
          (item) =>
            normalizarTexto(item.nome) === normalizarTexto(contextoNavegacao.obraNome) &&
            (!contextoNavegacao.construtoraNome ||
              normalizarTexto(item.construtora) ===
                normalizarTexto(contextoNavegacao.construtoraNome))
        ) || null;
    }

    if (obra) setObraSelecionada(obra);
    limparContextoNavegacao?.();
  }, [contextoNavegacao, dadosCarregados, limparContextoNavegacao, obras]);

  const calcularAtivosBalancinho = (obra) =>
    obterResumoBalancinhosAtivos(obra, atividades);

  const calcularAtivosMiniGrua = (obra) =>
    obterResumoMiniGruasAtivas(obra, atividades);

  const calcularAtivos = (obra, equipamento) =>
    calcularTotalAtivosPorEquipamento(obra, equipamento, atividades);

  const contarServicos = (obra, equipamento, servico) =>
    contarServicosObra(obra, equipamento, servico, atividades);

  const selecionarObra = (obra) => {
    setObraSelecionada(obra);
  };

  const servicosExecutados = (obra) =>
    obterServicosExecutadosObra(obra, atividades);

  const formatarEquipamento = formatarEquipamentoDetalhesObra;
  const formatarData = formatarDataDetalhesObra;

  const obrasOrdenadas = ordenarObrasPorEquipamentosAtivos(
    obras,
    (obra) => calcularAtivos(obra, "Balancinho") + calcularAtivos(obra, "Mini Grua")
  );

  const resumoBalancinhosSelecionados = obraSelecionada
    ? calcularAtivosBalancinho(obraSelecionada)
    : [];
  const resumoMiniGruasSelecionadas = obraSelecionada
    ? calcularAtivosMiniGrua(obraSelecionada)
    : [];

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">📌 Detalhes da Obra</h2>

      {!obraSelecionada ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {obrasOrdenadas.map((obra) => (
            <div
              key={obra.id}
              className="p-4 border rounded shadow cursor-pointer bg-white"
              onClick={() => selecionarObra(obra)}
            >
              <p className="text-sm text-gray-500">{obra.construtora}</p>
              <p className="text-lg font-semibold">{obra.nome}</p>
              <p className="text-sm">Balancinhos ativos: {calcularAtivos(obra, "Balancinho")}</p>
              {calcularAtivosBalancinho(obra).map((item) => (
                <p key={item.grupo} className="text-sm">
                  {item.grupo}: {item.total}
                </p>
              ))}
              {calcularAtivos(obra, "Mini Grua") > 0 && (
                <>
                  <p className="text-sm">Mini Gruas ativas: {calcularAtivos(obra, "Mini Grua")}</p>
                  {calcularAtivosMiniGrua(obra).map((item) => (
                    <p key={item.grupo} className="text-sm">
                      {item.grupo}: {item.total}
                    </p>
                  ))}
                </>
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
            <div>
              <p><strong>Balancinhos ativos:</strong> {calcularAtivos(obraSelecionada, "Balancinho")}</p>
              {resumoBalancinhosSelecionados.map((item) => (
                <p key={item.grupo} className="text-sm">
                  {item.grupo}: {item.total}
                </p>
              ))}
            </div>
            <div>
              <p><strong>Mini Gruas ativas:</strong> {calcularAtivos(obraSelecionada, "Mini Grua")}</p>
              {resumoMiniGruasSelecionadas.map((item) => (
                <p key={item.grupo} className="text-sm">
                  {item.grupo}: {item.total}
                </p>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-md font-semibold mt-2">📊 Quantidade de Serviços</h3>
            <p className="text-sm mt-1">
              <strong>Balancinho:</strong><br />
              • Instalação: {contarServicos(obraSelecionada, "Balancinho", "Instalação")}<br />
              • Deslocamento: {contarServicos(obraSelecionada, "Balancinho", "Deslocamento")}<br />
              • Manutenção: {contarServicos(obraSelecionada, "Balancinho", "Manutenção")}<br />
              • Remoção: {contarServicos(obraSelecionada, "Balancinho", "Remoção")}<br />
              <br />
              <strong>Movimentações de locação:</strong><br />
              • Somente aluguel / entrega: {contarServicos(obraSelecionada, "Balancinho", "Somente aluguel / entrega")}<br />
              • Recolhimento / devolução: {contarServicos(obraSelecionada, "Balancinho", "Recolhimento / devolução")}
            </p>
            <p className="text-sm mt-2">
              <strong>Mini Grua:</strong><br />
              • Instalação: {contarServicos(obraSelecionada, "Mini Grua", "Instalação")}<br />
              • Ascensão: {contarServicos(obraSelecionada, "Mini Grua", "Ascensão")}<br />
              • Remoção: {contarServicos(obraSelecionada, "Mini Grua", "Remoção")}<br />
              <br />
              <strong>Movimentações de locação:</strong><br />
              • Somente aluguel / entrega: {contarServicos(obraSelecionada, "Mini Grua", "Somente aluguel / entrega")}<br />
              • Recolhimento / devolução: {contarServicos(obraSelecionada, "Mini Grua", "Recolhimento / devolução")}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mt-4">🛠️ Serviços Executados</h3>
            <ul className="mt-2 space-y-2">
              {servicosExecutados(obraSelecionada).map((s) => (
                <li
                  key={s.id}
                  className="border p-2 rounded bg-gray-50 cursor-pointer hover:bg-blue-50"
                  onClick={() => abrirAtividade?.(s.id)}
                >
                  <strong>{s.servico}</strong> - {formatarEquipamento(s)}
                  {s.usaContrapeso && (
                    <span className="ml-2 inline-block rounded bg-yellow-200 px-2 py-1 text-xs font-bold text-yellow-900">
                      CONTRAPESO
                    </span>
                  )}
                  {s.tamanho && s.equipamento === "Balancinho" ? ` [${s.tamanho}m]` : ""} | Quantidade: {s.quantidade || 1}<br />
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
