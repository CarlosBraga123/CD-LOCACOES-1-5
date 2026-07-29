import { useMemo, useState } from "react";
import { obterUnidadesEquipamentosAtivos } from "../utils/equipamentosAtivos";
import {
  obterEquipamentosPatrimonio,
  reconciliarSituacoesEquipamentos,
  salvarEquipamentosPatrimonio,
} from "../utils/equipamentosPatrimonio";
import {
  equipamentoCompativelComAtividade,
  vincularPatrimonioPendente,
} from "../utils/pendenciasOperacionais";

const descricao = (item) =>
  item.equipamento === "Balancinho"
    ? `Balancinho ${item.tipoBalancinho === "Manual" ? "Manual" : "Elétrico"}`
    : `Mini Grua ${item.tipoMiniGrua || ""}`;

export default function VincularPatrimonioModal({
  atividade,
  atividades,
  obras,
  onClose,
  onVinculado,
}) {
  const [unidadeId, setUnidadeId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const obra = obras.find(
    (item) =>
      String(item.id || "") === String(atividade.obraId || "") ||
      (!atividade.obraId &&
        item.nome === atividade.obra &&
        item.construtora === atividade.construtora)
  );
  const unidades = useMemo(
    () =>
      obra
        ? obterUnidadesEquipamentosAtivos(
            obra,
            atividades,
            undefined,
            obterEquipamentosPatrimonio()
          ).filter(
            (item) =>
              equipamentoCompativelComAtividade(item, atividade) &&
              item.idEquipamento &&
              item.numeroPatrimonio
          )
        : [],
    [atividade, atividades, obra]
  );

  const confirmar = () => {
    if (salvando) return;
    const atividadesAtuais = JSON.parse(
      localStorage.getItem("atividades") || "[]"
    );
    const unidadeAtual = obra
      ? obterUnidadesEquipamentosAtivos(obra, atividadesAtuais).find(
          (item) =>
            item.idUnidade === unidadeId &&
            equipamentoCompativelComAtividade(item, atividade)
        )
      : null;
    const mestre = obterEquipamentosPatrimonio().find(
      (item) =>
        String(item.idEquipamento) ===
        String(unidadeAtual?.idEquipamento || "")
    );
    if (
      !unidadeAtual ||
      !mestre ||
      mestre.ativo === false ||
      ["BAIXADO", "EM_MANUTENCAO", "INDISPONIVEL"].includes(
        mestre.situacaoAdministrativa
      )
    ) {
      alert("O equipamento não está mais disponível para este vínculo.");
      return;
    }
    setSalvando(true);
    try {
      const usuario = JSON.parse(
        localStorage.getItem("usuarioLogado") || "null"
      )?.nome;
      const atualizadas = vincularPatrimonioPendente({
        atividades: atividadesAtuais,
        atividadeId: atividade.id,
        unidade: unidadeAtual,
        usuario,
      });
      localStorage.setItem("atividades", JSON.stringify(atualizadas));
      const ativosAtualizados = obras.flatMap((obraAtual) =>
        obterUnidadesEquipamentosAtivos(obraAtual, atualizadas)
      );
      const reconciliacao = reconciliarSituacoesEquipamentos({
        equipamentos: obterEquipamentosPatrimonio(),
        equipamentosAtivos: ativosAtualizados,
        data:
          atividade.dataLiberacao ||
          atividade.dataAgendamento ||
          new Date().toISOString().slice(0, 10),
        obraOrigemId: atividade.obraId || "",
      });
      if (reconciliacao.alterado) {
        salvarEquipamentosPatrimonio(reconciliacao.equipamentos);
      }
      onVinculado(atualizadas, reconciliacao.equipamentos);
    } catch (erro) {
      alert(erro.message || "Não foi possível concluir o vínculo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-xl sm:rounded-2xl">
        <div className="flex justify-between gap-3">
          <div><h3 className="font-bold">Vincular patrimônio</h3><p className="text-sm text-gray-500">{atividade.construtora} • {atividade.obra}</p></div>
          <button type="button" onClick={onClose} className="rounded border px-3 py-1">Fechar</button>
        </div>
        <div className="mt-4 space-y-2">
          {unidades.length === 0 ? <p className="rounded border bg-gray-50 p-3 text-sm">Nenhum equipamento compatível ativo nesta obra.</p> : unidades.map((item) => (
            <label key={item.idUnidade} className={`block rounded border p-3 ${unidadeId === item.idUnidade ? "border-blue-500 bg-blue-50" : ""}`}>
              <input type="radio" name="unidadeVinculo" checked={unidadeId === item.idUnidade} onChange={() => setUnidadeId(item.idUnidade)} /> <strong className="font-mono">{item.numeroPatrimonio}</strong> • {descricao(item)}
              <span className="block text-xs text-gray-600">{item.tamanho ? `${item.tamanho} metros` : "Tamanho não informado"}{item.ancoragem ? ` • ${item.ancoragem}` : ""}{item.usaContrapeso ? " • Com contrapeso" : ""}</span>
            </label>
          ))}
        </div>
        <button type="button" disabled={!unidadeId || salvando} onClick={confirmar} className="mt-4 w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{salvando ? "Vinculando..." : "Confirmar vínculo"}</button>
      </div>
    </div>
  );
}
