import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atividadeRepository } from "../atividadeRepository";

const criarLocalStorage = () => {
  const dados = new Map();

  return {
    getItem: vi.fn((chave) => (dados.has(chave) ? dados.get(chave) : null)),
    setItem: vi.fn((chave, valor) => dados.set(chave, String(valor))),
    removeItem: vi.fn((chave) => dados.delete(chave)),
  };
};

describe("atividadeRepository", () => {
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

  const atividadesCompletas = [
    {
      id: 1723456789012,
      obraId: 18,
      construtora: "Construtora A",
      obra: "Obra A",
      servico: "Deslocamento",
      equipamento: "Balancinho Elétrico",
      quantidade: 2,
      dataAgendamento: "2026-08-01",
      dataLiberacao: "2026-08-02",
      tamanho: "6",
      tamanhoAnterior: "3",
      tamanhoNovo: "6",
      ancoragem: "Simples",
      contrapeso: 2,
      equipeResponsavel: "Equipe A",
      observacoes: "Preservar integralmente",
      numeroOsCampo: "00125",
      numeroOSCampo: "00098",
      numerosPatrimonio: ["0010", "0009"],
      numeroPatrimonio: "0010",
      valoresCongelados: { servico: 250, locacao: 1250 },
      cobraServico: false,
      iniciaLocacao: false,
      encerraLocacao: false,
      campoDesconhecido: { deve: "permanecer" },
      itensEquipamentos: [
        {
          idItem: "legado:item-1",
          idEquipamento: "patrimonio:0010",
          idItemOrigem: "origem-1",
          idUnidade: "unidade-1",
          numeroPatrimonio: "0010",
        },
      ],
    },
    {
      id: "f0d23ab0-52ff-4fd6-a560-994458773013",
      servico: "Instalação",
      numeroPatrimonio: "0007",
    },
  ];

  it("retorna lista vazia quando a chave não existe", () => {
    expect(atividadeRepository.listar()).toEqual([]);
  });

  it("lê atividades antigas gravadas diretamente e preserva todos os campos e a ordem", () => {
    globalThis.localStorage.setItem("atividades", JSON.stringify(atividadesCompletas));

    expect(atividadeRepository.listar()).toEqual(atividadesCompletas);
  });

  it("salva o array completo em formato compatível com a leitura direta anterior", () => {
    atividadeRepository.salvarTodos(atividadesCompletas);

    expect(JSON.parse(globalThis.localStorage.getItem("atividades"))).toEqual(
      atividadesCompletas
    );
  });

  it("obtém por ID sem converter o ID armazenado", () => {
    atividadeRepository.salvarTodos(atividadesCompletas);

    expect(atividadeRepository.obterPorId("1723456789012")?.id).toBe(1723456789012);
    expect(
      atividadeRepository.obterPorId("f0d23ab0-52ff-4fd6-a560-994458773013")?.id
    ).toBe("f0d23ab0-52ff-4fd6-a560-994458773013");
  });

  it("remove por ID preservando integralmente e na mesma ordem os demais registros", () => {
    atividadeRepository.salvarTodos(atividadesCompletas);

    expect(atividadeRepository.removerPorId(1723456789012)).toEqual([
      atividadesCompletas[1],
    ]);
  });
});
