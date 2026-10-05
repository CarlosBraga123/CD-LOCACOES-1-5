import { localStorageAdapter } from "./localStorageAdapter";

export const criarRepositorioJsonLocal = (chave) => ({
  obter(valorPadrao) {
    return localStorageAdapter.lerJson(chave, valorPadrao);
  },

  salvar(valor) {
    localStorageAdapter.escreverJson(chave, valor);
  },

  remover() {
    localStorageAdapter.remover(chave);
  },
});

export const criarRepositorioTextoLocal = (chave) => ({
  obter(valorPadrao = "") {
    const valor = localStorageAdapter.lerBruto(chave);
    return valor === null ? valorPadrao : valor;
  },

  salvar(valor) {
    localStorageAdapter.escreverBruto(chave, valor);
  },

  remover() {
    localStorageAdapter.remover(chave);
  },
});
