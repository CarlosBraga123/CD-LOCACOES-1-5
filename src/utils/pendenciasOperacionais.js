import { obterIdItemPatrimonio } from "./patrimoniosEquipamentos";

export const SERVICOS_COM_VINCULO_POSTERIOR = [
  "Deslocamento",
  "Manutenção",
  "Remoção",
  "Somente recolhimento",
];

export const permiteVinculoPatrimonioPosterior = (servico) =>
  SERVICOS_COM_VINCULO_POSTERIOR.includes(String(servico || ""));

export const atividadeTemPatrimonioPendente = (atividade) =>
  atividade?.pendenteVinculoPatrimonio === true;

export const obterPendenciasOperacionais = (atividades = []) =>
  atividades
    .filter(atividadeTemPatrimonioPendente)
    .map((atividade) => ({
      id: `patrimonio:${atividade.id}`,
      tipo: "PATRIMONIO_PENDENTE_VINCULO",
      titulo: "Patrimônio pendente de vínculo",
      atividadeId: atividade.id,
      atividade,
    }));

const gerarIdItem = () =>
  globalThis.crypto?.randomUUID?.() ||
  `item-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const equipamentoCompativelComAtividade = (unidade, atividade) => {
  if (unidade?.equipamento !== atividade?.equipamento) return false;
  if (atividade.equipamento === "Balancinho") {
    return (
      (unidade.tipoBalancinho || "Eletrico") ===
      (atividade.tipoBalancinho || "Eletrico")
    );
  }
  if (atividade.equipamento === "Mini Grua") {
    return (
      String(unidade.tipoMiniGrua || "") ===
      String(atividade.tipoMiniGrua || "")
    );
  }
  return true;
};

export const criarItemVinculadoDaPendencia = (atividade, unidade) => ({
  idItem: gerarIdItem(),
  idItemOrigem: unidade.idUnidade,
  idEquipamento: unidade.idEquipamento || "",
  atividadeOrigemId: unidade.atividadeOrigemId,
  equipamento: unidade.equipamento,
  tipoBalancinho: unidade.tipoBalancinho || "",
  tipoMiniGrua: unidade.tipoMiniGrua || "",
  numeroPatrimonio: unidade.numeroPatrimonio || "",
  tamanho: unidade.tamanho || "",
  tamanhoAnterior: unidade.tamanho || "",
  tamanhoNovo:
    atividade.servico === "Deslocamento"
      ? String(atividade.tamanhoNovo || atividade.tamanho || unidade.tamanho || "")
      : unidade.tamanho || "",
  ancoragem:
    atividade.servico === "Deslocamento"
      ? atividade.ancoragem || unidade.ancoragem || ""
      : unidade.ancoragem || "",
  ancoragemAnterior: unidade.ancoragem || "",
  alteracaoContrapeso: atividade.alteracaoContrapeso || "nenhuma",
  usaContrapesoAnterior: unidade.usaContrapeso === true,
  usaContrapeso:
    atividade.alteracaoContrapeso === "adicionar"
      ? true
      : atividade.alteracaoContrapeso === "remover"
        ? false
        : unidade.usaContrapeso === true,
});

export const vincularPatrimonioPendente = ({
  atividades,
  atividadeId,
  unidade,
  usuario = "",
  data = new Date().toISOString(),
}) => {
  const atividade = atividades.find(
    (item) => String(item.id) === String(atividadeId)
  );
  if (!atividade || !atividadeTemPatrimonioPendente(atividade)) {
    throw new Error("A pendência não está mais disponível.");
  }
  if (!equipamentoCompativelComAtividade(unidade, atividade)) {
    throw new Error("O equipamento selecionado não é compatível.");
  }
  if (
    !obterIdItemPatrimonio(unidade) ||
    !unidade.idEquipamento ||
    !unidade.numeroPatrimonio
  ) {
    throw new Error("O equipamento não possui vínculo patrimonial válido.");
  }
  const item = criarItemVinculadoDaPendencia(atividade, unidade);
  return atividades.map((registro) =>
    String(registro.id) === String(atividadeId)
      ? {
          ...registro,
          itensEquipamentos: [item],
          quantidade: 1,
          numerosPatrimonio: [item.numeroPatrimonio],
          numeroPatrimonio: item.numeroPatrimonio,
          pendenteVinculoPatrimonio: false,
          statusVinculoPatrimonio: "VINCULADO",
          dataVinculoPatrimonio: data,
          usuarioVinculoPatrimonio: usuario,
        }
      : registro
  );
};
