import {
  normalizarNumeroPatrimonio,
  obterIdItemPatrimonio,
  obterPatrimonioAtual,
} from "./patrimoniosEquipamentos";

export const CHAVE_EQUIPAMENTOS_PATRIMONIO = "equipamentosPatrimonio";
export const SITUACOES_EQUIPAMENTO = [
  "NO_GALPAO",
  "EM_MANUTENCAO",
  "INDISPONIVEL",
  "BAIXADO",
  "SEM_LOCALIZACAO_ATUAL",
];

const gerarId = (prefixo) =>
  globalThis.crypto?.randomUUID?.() ||
  `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const obterEquipamentosPatrimonio = () => {
  try {
    const dados = JSON.parse(
      localStorage.getItem(CHAVE_EQUIPAMENTOS_PATRIMONIO) || "[]"
    );
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
};

export const salvarEquipamentosPatrimonio = (equipamentos) => {
  localStorage.setItem(
    CHAVE_EQUIPAMENTOS_PATRIMONIO,
    JSON.stringify(Array.isArray(equipamentos) ? equipamentos : [])
  );
};

export const obterIdEquipamentoDoItem = (item, equipamentos = []) => {
  if (item?.idEquipamento) return String(item.idEquipamento);
  const idItem = obterIdItemPatrimonio(item);
  return String(
    equipamentos.find(
      (equipamento) => String(equipamento.idItemOrigem || "") === idItem
    )?.idEquipamento || ""
  );
};

const copiarDadosTecnicos = (item = {}) => ({
  equipamento: item.equipamento || "",
  tipoBalancinho: item.tipoBalancinho || "",
  tipoMiniGrua: item.tipoMiniGrua || "",
});

export const migrarEquipamentosConhecidos = ({
  equipamentos = [],
  registrosPatrimonio = [],
  equipamentosAtivos = [],
  data = new Date().toISOString().slice(0, 10),
}) => {
  let alterado = false;
  const resultado = equipamentos.map((item) => ({ ...item }));
  const ativosPorIdItem = new Map(
    equipamentosAtivos.map((item) => [obterIdItemPatrimonio(item), item])
  );

  registrosPatrimonio.forEach((registro) => {
    const idItemOrigem = String(registro.idItem || "");
    if (!idItemOrigem) return;
    const existente = resultado.find(
      (item) => String(item.idItemOrigem || "") === idItemOrigem
    );
    if (existente) return;
    const ativo = ativosPorIdItem.get(idItemOrigem);
    resultado.push({
      idEquipamento: gerarId("equipamento"),
      idItemOrigem,
      numeroPatrimonioAtual: normalizarNumeroPatrimonio(
        registro.numeroPatrimonioAtual
      ),
      ...copiarDadosTecnicos(ativo),
      situacaoAdministrativa: ativo ? "LOCADO" : "SEM_LOCALIZACAO_ATUAL",
      dataCadastro: data,
      observacao: "",
      ativo: true,
      historicoAdministrativo: [
        {
          id: gerarId("historico-admin"),
          tipo: "migracao",
          data,
          situacaoAnterior: "",
          situacaoNova: ativo ? "LOCADO" : "SEM_LOCALIZACAO_ATUAL",
          motivo: "Conversão segura de equipamento já conhecido",
          observacao: "",
        },
      ],
    });
    alterado = true;
  });

  equipamentosAtivos.forEach((ativo) => {
    const idItemOrigem = obterIdItemPatrimonio(ativo);
    const patrimonio = obterPatrimonioAtual(ativo, registrosPatrimonio);
    if (!idItemOrigem || !patrimonio) return;
    const existente = resultado.find(
      (item) =>
        String(item.idItemOrigem || "") === idItemOrigem ||
        normalizarNumeroPatrimonio(item.numeroPatrimonioAtual) === patrimonio
    );
    if (existente) return;
    resultado.push({
      idEquipamento: gerarId("equipamento"),
      idItemOrigem,
      numeroPatrimonioAtual: patrimonio,
      ...copiarDadosTecnicos(ativo),
      situacaoAdministrativa: "LOCADO",
      dataCadastro: data,
      observacao: "",
      ativo: true,
      historicoAdministrativo: [
        {
          id: gerarId("historico-admin"),
          tipo: "migracao",
          data,
          situacaoAnterior: "",
          situacaoNova: "LOCADO",
          motivo: "Conversão de patrimônio legado ativo",
          observacao: "",
        },
      ],
    });
    alterado = true;
  });
  return { equipamentos: resultado, alterado };
};

export const criarEquipamentoPatrimonio = (dados) => {
  const idEquipamento = gerarId("equipamento");
  return {
  idEquipamento,
  idItemOrigem: dados.idItemOrigem || idEquipamento,
  numeroPatrimonioAtual: normalizarNumeroPatrimonio(dados.numeroPatrimonioAtual),
  ...copiarDadosTecnicos(dados),
  situacaoAdministrativa: dados.situacaoAdministrativa || "NO_GALPAO",
  dataCadastro: dados.dataCadastro || new Date().toISOString().slice(0, 10),
  observacao: String(dados.observacao || "").trim(),
  ativo: true,
  historicoAdministrativo: [
    {
      id: gerarId("historico-admin"),
      tipo: "cadastro",
      data: dados.dataCadastro || new Date().toISOString().slice(0, 10),
      situacaoAnterior: "",
      situacaoNova: dados.situacaoAdministrativa || "NO_GALPAO",
      motivo: "Cadastro mestre",
      observacao: String(dados.observacao || "").trim(),
    },
  ],
  };
};

export const alterarEquipamentoPatrimonio = ({
  equipamentos,
  idEquipamento,
  alteracoes,
  data,
  motivo,
  observacao,
  tipo = "alteracao_administrativa",
}) =>
  equipamentos.map((equipamento) => {
    if (String(equipamento.idEquipamento) !== String(idEquipamento)) {
      return equipamento;
    }
    const situacaoAnterior = equipamento.situacaoAdministrativa;
    const situacaoNova =
      alteracoes.situacaoAdministrativa || situacaoAnterior;
    return {
      ...equipamento,
      ...alteracoes,
      numeroPatrimonioAtual:
        alteracoes.numeroPatrimonioAtual !== undefined
          ? normalizarNumeroPatrimonio(alteracoes.numeroPatrimonioAtual)
          : equipamento.numeroPatrimonioAtual,
      historicoAdministrativo: [
        ...(equipamento.historicoAdministrativo || []),
        {
          id: gerarId("historico-admin"),
          tipo,
          data: data || new Date().toISOString().slice(0, 10),
          situacaoAnterior,
          situacaoNova,
          motivo: String(motivo || "").trim(),
          observacao: String(observacao || "").trim(),
        },
      ],
    };
  });

export const sincronizarPatrimoniosMestres = (
  equipamentos,
  registrosPatrimonio
) =>
  equipamentos.map((equipamento) => {
    const registro = registrosPatrimonio.find(
      (item) =>
        String(item.idItem) === String(equipamento.idItemOrigem || "")
    );
    return registro?.numeroPatrimonioAtual
      ? {
          ...equipamento,
          numeroPatrimonioAtual: normalizarNumeroPatrimonio(
            registro.numeroPatrimonioAtual
          ),
        }
      : equipamento;
  });

export const reconciliarSituacoesEquipamentos = ({
  equipamentos,
  equipamentosAtivos,
  data,
  obraOrigemId = "",
}) => {
  const idsAtivos = new Set(
    equipamentosAtivos.flatMap((item) => [
      String(item.idEquipamento || ""),
      obterIdItemPatrimonio(item),
    ]).filter(Boolean)
  );
  let alterado = false;
  const atualizados = equipamentos.map((equipamento) => {
    const estaAtivo =
      idsAtivos.has(String(equipamento.idEquipamento)) ||
      idsAtivos.has(String(equipamento.idItemOrigem || ""));
    if (estaAtivo && equipamento.situacaoAdministrativa !== "LOCADO") {
      alterado = true;
      return alterarEquipamentoPatrimonio({
        equipamentos: [equipamento],
        idEquipamento: equipamento.idEquipamento,
        alteracoes: { situacaoAdministrativa: "LOCADO" },
        data,
        motivo: "Equipamento vinculado a uma locação ativa",
        tipo: "ida_locacao",
      })[0];
    }
    if (
      !estaAtivo &&
      equipamento.situacaoAdministrativa === "LOCADO"
    ) {
      alterado = true;
      const atualizado = alterarEquipamentoPatrimonio({
        equipamentos: [equipamento],
        idEquipamento: equipamento.idEquipamento,
        alteracoes: { situacaoAdministrativa: "NO_GALPAO" },
        data,
        motivo: "Retorno após encerramento da locação",
        tipo: "retorno_galpao",
      })[0];
      const historico = atualizado.historicoAdministrativo;
      historico[historico.length - 1].obraId = obraOrigemId;
      return atualizado;
    }
    return equipamento;
  });
  return { equipamentos: atualizados, alterado };
};

export const obterEquipamentosDisponiveis = (equipamentos, tipo) =>
  equipamentos.filter(
    (item) =>
      item.ativo !== false &&
      item.situacaoAdministrativa === "NO_GALPAO" &&
      (!tipo || item.equipamento === tipo)
  );
