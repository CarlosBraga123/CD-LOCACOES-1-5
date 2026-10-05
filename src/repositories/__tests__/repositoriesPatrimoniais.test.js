import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { equipamentoPatrimonioRepository } from "../equipamentoPatrimonioRepository";
import { vinculoPatrimonioRepository } from "../vinculoPatrimonioRepository";
import { ajusteConfiguracaoEquipamentoRepository } from "../ajusteConfiguracaoEquipamentoRepository";
import { substituicaoEquipamentoRepository } from "../substituicaoEquipamentoRepository";
import { controleKitContrapesoRepository } from "../controleKitContrapesoRepository";

const criarLocalStorage = () => {
  const dados = new Map();
  return {
    getItem: vi.fn((chave) => (dados.has(chave) ? dados.get(chave) : null)),
    setItem: vi.fn((chave, valor) => dados.set(chave, String(valor))),
    removeItem: vi.fn((chave) => dados.delete(chave)),
  };
};

const casosLista = [
  {
    chave: "equipamentosPatrimonio",
    repository: equipamentoPatrimonioRepository,
    registros: [
      {
        idEquipamento: "f0d23ab0-52ff-4fd6-a560-994458773013",
        idItemOrigem: "f0d23ab0-52ff-4fd6-a560-994458773013",
        numeroPatrimonioAtual: "0010",
        situacaoAdministrativa: "NO_GALPAO",
        ativo: true,
        historicoAdministrativo: [
          { id: 1723456789012, tipo: "cadastro", origem: "cadastro_inicial" },
        ],
        campoDesconhecido: { preservado: true },
      },
      {
        idEquipamento: "patrimonio:0011",
        idItemOrigem: "legado:atividade-1:0",
        numeroPatrimonioAtual: "0011",
        situacaoAdministrativa: "LOCADO",
      },
    ],
  },
  {
    chave: "patrimonioEquipamentos",
    repository: vinculoPatrimonioRepository,
    registros: [
      {
        idItem: "legado:atividade-1:0",
        idEquipamento: "patrimonio:0010",
        idUnidade: "unidade-1",
        numeroPatrimonioAtual: "0010",
        historico: [
          {
            id: "f0d23ab0-52ff-4fd6-a560-994458773013",
            tipo: "cadastro_inicial",
            numeroAnterior: "0009",
            numeroNovo: "0010",
          },
        ],
      },
    ],
  },
  {
    chave: "ajustesConfiguracaoEquipamentos",
    repository: ajusteConfiguracaoEquipamentoRepository,
    registros: [
      {
        id: 1723456789012,
        idItem: "legado:atividade-1:0",
        idEquipamento: "patrimonio:0010",
        idUnidade: "unidade-1",
        tamanho: "6",
        ancoragem: "Simples",
        usaContrapeso: true,
        origem: "CONFERENCIA_CADASTRAL",
      },
    ],
  },
  {
    chave: "substituicoesEquipamentos",
    repository: substituicaoEquipamentoRepository,
    registros: [
      {
        id: "f0d23ab0-52ff-4fd6-a560-994458773013",
        equipamentoOrigemId: "patrimonio:0010",
        equipamentoDestinoId: "patrimonio:0011",
        unidadeOrigemId: "legado:atividade-1:0",
        motivo: "Substituição física",
      },
    ],
  },
];

describe("repositories patrimoniais", () => {
  const localStorageOriginal = globalThis.localStorage;

  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: criarLocalStorage(),
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: localStorageOriginal,
    });
  });

  describe.each(casosLista)("$chave", ({ chave, repository, registros }) => {
    it("retorna lista vazia quando a chave não existe", () => {
      expect(repository.listar()).toEqual([]);
    });

    it("lê integralmente dados antigos e preserva a ordem", () => {
      globalThis.localStorage.setItem(chave, JSON.stringify(registros));

      expect(repository.listar()).toEqual(registros);
    });

    it("grava em formato integralmente compatível com a leitura direta antiga", () => {
      repository.salvarTodos(registros);

      expect(JSON.parse(globalThis.localStorage.getItem(chave))).toEqual(registros);
    });

    it("não mantém cache entre leituras", () => {
      repository.salvarTodos(registros);
      globalThis.localStorage.setItem(chave, JSON.stringify([{ id: "novo" }]));

      expect(repository.listar()).toEqual([{ id: "novo" }]);
    });

    it("restaura exatamente conteúdo anterior ou ausência da chave", () => {
      const snapshotAusente = repository.criarSnapshot();
      repository.salvarTodos(registros);
      repository.restaurarSnapshot(snapshotAusente);
      expect(globalThis.localStorage.getItem(chave)).toBeNull();

      globalThis.localStorage.setItem(chave, "{conteudo-original");
      const snapshotBruto = repository.criarSnapshot();
      repository.salvarTodos(registros);
      repository.restaurarSnapshot(snapshotBruto);
      expect(globalThis.localStorage.getItem(chave)).toBe("{conteudo-original");
    });
  });

  describe("controleKitContrapesoRepository", () => {
    const controle = {
      quantidadeTotal: 32,
      historico: [
        {
          id: "kit-f0d23ab0",
          data: "2026-10-05",
          quantidadeAnterior: 30,
          quantidadeNova: 32,
          motivo: "Conferência física",
          observacao: "campo preservado",
        },
      ],
      campoDesconhecido: { preservado: true },
    };

    it("retorna o padrão recebido quando a chave não existe", () => {
      const padrao = { quantidadeTotal: 0, historico: [] };
      expect(controleKitContrapesoRepository.obter(padrao)).toBe(padrao);
    });

    it("preserva integralmente a estrutura antiga na leitura e na escrita", () => {
      globalThis.localStorage.setItem("controleKitContrapeso", JSON.stringify(controle));
      expect(controleKitContrapesoRepository.obter()).toEqual(controle);

      controleKitContrapesoRepository.salvar(controle);
      expect(
        JSON.parse(globalThis.localStorage.getItem("controleKitContrapeso"))
      ).toEqual(controle);
    });

    it("não mantém cache e restaura snapshot bruto", () => {
      controleKitContrapesoRepository.salvar(controle);
      const snapshot = controleKitContrapesoRepository.criarSnapshot();
      globalThis.localStorage.setItem(
        "controleKitContrapeso",
        JSON.stringify({ quantidadeTotal: 1, historico: [] })
      );
      expect(controleKitContrapesoRepository.obter().quantidadeTotal).toBe(1);

      controleKitContrapesoRepository.restaurarSnapshot(snapshot);
      expect(controleKitContrapesoRepository.obter()).toEqual(controle);
    });
  });
});
