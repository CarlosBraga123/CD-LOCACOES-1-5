import { localStorageAdapter } from "./localStorageAdapter";

const CHAVE = "controleKitContrapeso";

export const controleKitContrapesoRepository = {
  obter(valorPadrao = { quantidadeTotal: 0, historico: [] }) {
    return localStorageAdapter.lerJson(CHAVE, valorPadrao);
  },

  salvar(controle) {
    localStorageAdapter.escreverJson(CHAVE, controle);
  },

  criarSnapshot() {
    return localStorageAdapter.lerBruto(CHAVE);
  },

  restaurarSnapshot(snapshot) {
    if (snapshot === null) {
      localStorageAdapter.remover(CHAVE);
      return;
    }
    localStorageAdapter.escreverBruto(CHAVE, snapshot);
  },
};
