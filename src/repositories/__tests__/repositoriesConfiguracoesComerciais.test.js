import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tabelaComercialRepository } from "../tabelaComercialRepository";
import { valoresServicosRepository } from "../valoresServicosRepository";
import { valoresPadraoRepository } from "../valoresPadraoRepository";
import {
  pecasAncoragemRepository,
  pecasBalancinhoRepository,
} from "../pecasRepository";
import {
  empresaLogoRepository,
  empresaNomeRepository,
} from "../empresaRepository";

const criarLocalStorage = () => {
  const dados = new Map();

  return {
    getItem: vi.fn((chave) => (dados.has(chave) ? dados.get(chave) : null)),
    setItem: vi.fn((chave, valor) => dados.set(chave, String(valor))),
    removeItem: vi.fn((chave) => dados.delete(chave)),
  };
};

describe("repositórios de configurações e valores comerciais", () => {
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

  describe.each([
    ["tabelaComercialPadrao", tabelaComercialRepository],
    ["valoresServicos", valoresServicosRepository],
    ["valoresPadrao", valoresPadraoRepository],
    ["pecasBalancinho", pecasBalancinhoRepository],
    ["pecasAncoragem", pecasAncoragemRepository],
  ])("repositório JSON %s", (chave, repository) => {
    it("lê o formato anterior e preserva campos dinâmicos, desconhecidos e falsy", () => {
      const valor = {
        "Balancinho-Instalação": 0,
        ativo: false,
        observacao: null,
        dinamico: { "0010": "valor", futuro: [1, 0, false, null] },
      };
      globalThis.localStorage.setItem(chave, JSON.stringify(valor));

      expect(repository.obter({})).toEqual(valor);
    });

    it("grava no mesmo formato que continua legível sem o repositório", () => {
      const valor = { chaveDinamica: 0, desconhecido: { habilitado: false } };

      repository.salvar(valor);

      expect(JSON.parse(globalThis.localStorage.getItem(chave))).toEqual(valor);
    });

    it("usa o padrão para ausência, null legado e JSON inválido sem regravar", () => {
      const padrao = { padrao: true };
      expect(repository.obter(padrao)).toBe(padrao);

      globalThis.localStorage.setItem(chave, "null");
      expect(repository.obter(padrao)).toBe(padrao);

      globalThis.localStorage.setItem(chave, "{invalido");
      globalThis.localStorage.setItem.mockClear();
      expect(repository.obter(padrao)).toBe(padrao);
      expect(globalThis.localStorage.setItem).not.toHaveBeenCalled();
    });

    it("relê alterações externas e não mantém cache", () => {
      repository.salvar({ versao: 1 });
      expect(repository.obter({})).toEqual({ versao: 1 });

      globalThis.localStorage.setItem(chave, JSON.stringify({ versao: 2 }));
      expect(repository.obter({})).toEqual({ versao: 2 });
    });
  });

  describe.each([
    ["empresaNome", empresaNomeRepository, "CD Locações"],
    ["empresaLogo", empresaLogoRepository, "data:image/png;base64,AA=="],
  ])("repositório textual %s", (chave, repository, valor) => {
    it("lê e grava texto bruto sem transformar zeros à esquerda ou Data URL", () => {
      globalThis.localStorage.setItem(chave, valor);
      expect(repository.obter("fallback")).toBe(valor);

      const atualizado = `${valor} 0010`;
      repository.salvar(atualizado);
      expect(globalThis.localStorage.getItem(chave)).toBe(atualizado);
    });

    it("preserva string vazia e usa fallback somente quando a chave não existe", () => {
      globalThis.localStorage.setItem(chave, "");
      expect(repository.obter("fallback")).toBe("");

      globalThis.localStorage.removeItem(chave);
      expect(repository.obter("fallback")).toBe("fallback");
    });

    it("relê alterações externas e não mantém cache", () => {
      repository.salvar("primeiro");
      expect(repository.obter()).toBe("primeiro");

      globalThis.localStorage.setItem(chave, "segundo");
      expect(repository.obter()).toBe("segundo");
    });
  });
});
