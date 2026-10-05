import { describe, expect, it } from "vitest";
import {
  enriquecerPeriodosPatrimoniaisFinanceiros,
  obterItensPatrimoniaisServico,
  removerSufixoPatrimonialEquipamento,
} from "../patrimonioRelatorioFinanceiro";

const registro = (idItem, patrimonio, obraId = "obra-1") => ({
  idItem,
  numeroPatrimonioAtual: patrimonio,
  historico: [
    {
      id: `cadastro-${idItem}`,
      tipo: "cadastro_inicial",
      numeroNovo: patrimonio,
      data: "2026-01-01",
      obraId,
    },
  ],
});

const periodo = (sobrescritas = {}) => ({
  idPeriodo: "periodo-1",
  atividadeInicioId: "atividade-1",
  equipamento: "Balancinho Elétrico — 6 m — Sem patrimônio",
  quantidade: 1,
  valorMensal: 300,
  valorProporcional: 150,
  dataInicio: "2026-08-01",
  dataFim: "2026-08-31",
  ...sobrescritas,
});

describe("patrimônio dos serviços no Relatório Financeiro", () => {
  it("resolve serviço moderno por itensEquipamentos preservando zero à esquerda", () => {
    const [item] = obterItensPatrimoniaisServico({
      atividade: {
        id: "atividade-1",
        quantidade: 1,
        itensEquipamentos: [{ idItem: "item-1", numeroPatrimonio: "0140" }],
      },
    });
    expect(item.numeroPatrimonio).toBe("0140");
  });

  it("preserva múltiplos patrimônios na mesma atividade", () => {
    const itens = obterItensPatrimoniaisServico({
      atividade: {
        id: "atividade-1",
        quantidade: 2,
        itensEquipamentos: [
          { idItem: "item-1", numeroPatrimonio: "0140" },
          { idItem: "item-2", numeroPatrimonio: "0141" },
        ],
      },
    });
    expect(itens.map((item) => item.numeroPatrimonio)).toEqual(["0140", "0141"]);
  });

  it("resolve atividade legada por numerosPatrimonio", () => {
    const [item] = obterItensPatrimoniaisServico({
      atividade: { id: "atividade-1", quantidade: 1, numerosPatrimonio: ["0099"] },
    });
    expect(item.numeroPatrimonio).toBe("0099");
  });

  it("resolve vínculo patrimonial posterior pelo idItem", () => {
    const [item] = obterItensPatrimoniaisServico({
      atividade: {
        id: "atividade-1",
        itensEquipamentos: [{ idItem: "item-1", numeroPatrimonio: "" }],
      },
      registrosPatrimonio: [registro("item-1", "0140")],
    });
    expect(item.numeroPatrimonio).toBe("0140");
  });

  it("resolve mestre pelo idEquipamento sem converter o patrimônio em número", () => {
    const [item] = obterItensPatrimoniaisServico({
      atividade: {
        id: "atividade-1",
        itensEquipamentos: [{ idEquipamento: "equipamento-1" }],
      },
      equipamentosMestres: [
        { idEquipamento: "equipamento-1", numeroPatrimonioAtual: "0010" },
      ],
    });
    expect(item.numeroPatrimonio).toBe("0010");
  });

  it("não associa patrimônio de outro equipamento apenas pela mesma obra", () => {
    const [item] = obterItensPatrimoniaisServico({
      atividade: {
        id: "atividade-1",
        obraId: "obra-1",
        itensEquipamentos: [{ idItem: "item-sem-vinculo" }],
      },
      registrosPatrimonio: [registro("outro-item", "0140")],
    });
    expect(item.numeroPatrimonio).toBe("");
  });
});

describe("patrimônio das locações no Relatório Financeiro", () => {
  it("mantém patrimônio já presente na unidade moderna", () => {
    const [detalhe] = enriquecerPeriodosPatrimoniaisFinanceiros({
      periodos: [periodo({ numeroPatrimonio: "0140" })],
      atividades: [],
    });
    expect(detalhe.patrimonioDetalhe).toBe("0140");
  });

  it("resolve identidade patrimonio:* quando o vínculo histórico é seguro", () => {
    const atividade = { id: "atividade-1", obraId: "obra-1", quantidade: 1 };
    const [detalhe] = enriquecerPeriodosPatrimoniaisFinanceiros({
      periodos: [periodo({ idUnidade: "patrimonio:Balancinho:0140:atividade-1" })],
      atividades: [atividade],
      registrosPatrimonio: [
        registro("patrimonio:Balancinho:0140:atividade-1", "0140"),
      ],
    });
    expect(detalhe.patrimonioDetalhe).toBe("0140");
  });

  it("resolve identidade legado:* e preserva exatamente os totais financeiros", () => {
    const atividade = { id: "atividade-1", obraId: "obra-1", quantidade: 1 };
    const original = periodo({ idItemOrigem: "legado:atividade-1:0" });
    const detalhes = enriquecerPeriodosPatrimoniaisFinanceiros({
      periodos: [original],
      atividades: [atividade],
      registrosPatrimonio: [registro("legado:atividade-1:0", "0140")],
    });
    expect(detalhes[0].patrimonioDetalhe).toBe("0140");
    expect(detalhes.reduce((total, item) => total + item.valorMensal, 0)).toBe(300);
    expect(detalhes.reduce((total, item) => total + item.valorProporcional, 0)).toBe(150);
  });

  it("mantém vazio quando não existe identificação segura e remove só a legenda antiga", () => {
    const [detalhe] = enriquecerPeriodosPatrimoniaisFinanceiros({
      periodos: [periodo()],
      atividades: [{ id: "atividade-1", quantidade: 1 }],
    });
    expect(detalhe.patrimonioDetalhe).toBe("");
    expect(removerSufixoPatrimonialEquipamento(detalhe.equipamento)).toBe(
      "Balancinho Elétrico — 6 m"
    );
  });
});
