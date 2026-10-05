import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localStorageAdapter } from "../localStorageAdapter";
import { construtoraRepository } from "../construtoraRepository";
import { obraRepository } from "../obraRepository";
import { tarefaRepository } from "../tarefaRepository";

const criarLocalStorage = () => {
  const dados = new Map();

  return {
    getItem: vi.fn((chave) => (dados.has(chave) ? dados.get(chave) : null)),
    setItem: vi.fn((chave, valor) => dados.set(chave, String(valor))),
    removeItem: vi.fn((chave) => dados.delete(chave)),
    clear: vi.fn(() => dados.clear()),
  };
};

describe("localStorageAdapter", () => {
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

  it("devolve o padrão sem gravar quando a chave não existe", () => {
    const padrao = [];

    expect(localStorageAdapter.lerJson("ausente", padrao)).toBe(padrao);
    expect(globalThis.localStorage.setItem).not.toHaveBeenCalled();
  });

  it("preserva integralmente estruturas, ids, legados, patrimônios e ordem", () => {
    const registros = [
      {
        id: 7,
        identidadeLegada: "legado:item-7",
        identidadePatrimonial: "patrimonio:0010",
        numerosPatrimonio: ["0010", "0009"],
      },
      { id: "f0d23ab0-52ff-4fd6-a560-994458773013", nome: "Segundo" },
    ];
    globalThis.localStorage.setItem("dados", JSON.stringify(registros));

    expect(localStorageAdapter.lerJson("dados", [])).toEqual(registros);
  });

  it("devolve o padrão para JSON inválido sem apagar ou sobrescrever o original", () => {
    globalThis.localStorage.setItem("invalido", "{conteudo legado");
    globalThis.localStorage.setItem.mockClear();

    expect(localStorageAdapter.lerJson("invalido", [])).toEqual([]);
    expect(globalThis.localStorage.getItem("invalido")).toBe("{conteudo legado");
    expect(globalThis.localStorage.setItem).not.toHaveBeenCalled();
    expect(globalThis.localStorage.removeItem).not.toHaveBeenCalled();
  });

  it("grava JSON sem transformar o valor recebido", () => {
    const valor = [{ id: "001", concluida: false }];

    localStorageAdapter.escreverJson("lista", valor);

    expect(globalThis.localStorage.getItem("lista")).toBe(JSON.stringify(valor));
  });

  it("remove somente a chave solicitada", () => {
    globalThis.localStorage.setItem("manter", "1");
    globalThis.localStorage.setItem("remover", "2");

    localStorageAdapter.remover("remover");

    expect(globalThis.localStorage.getItem("manter")).toBe("1");
    expect(globalThis.localStorage.getItem("remover")).toBeNull();
  });

  describe.each([
    ["construtoras", construtoraRepository],
    ["obras", obraRepository],
    ["tarefas", tarefaRepository],
  ])("repositório %s", (chave, repository) => {
    it("lê dados gravados diretamente no formato anterior", () => {
      const registros = [{ id: 1 }, { id: "002" }];
      globalThis.localStorage.setItem(chave, JSON.stringify(registros));

      expect(repository.listar()).toEqual(registros);
    });

    it("grava dados que continuam legíveis diretamente", () => {
      const registros = [{ id: "0010", extra: { preservado: true } }];

      repository.salvarTodos(registros);

      expect(JSON.parse(globalThis.localStorage.getItem(chave))).toEqual(registros);
    });

    it("busca e remove ids numéricos ou textuais sem alterar os demais registros", () => {
      repository.salvarTodos([
        { id: 10, nome: "Remover" },
        { id: "011", nome: "Manter" },
      ]);

      expect(repository.obterPorId("10")?.nome).toBe("Remover");
      expect(repository.removerPorId(10)).toEqual([{ id: "011", nome: "Manter" }]);
    });

    it("sempre relê o localStorage, sem cache interno", () => {
      repository.salvarTodos([{ id: 1 }]);
      expect(repository.listar()).toEqual([{ id: 1 }]);

      globalThis.localStorage.setItem(chave, JSON.stringify([{ id: 2 }]));

      expect(repository.listar()).toEqual([{ id: 2 }]);
    });
  });
});
