const obterStorage = () => globalThis.localStorage;

export const localStorageAdapter = {
  lerJson(chave, valorPadrao) {
    try {
      const valorArmazenado = obterStorage()?.getItem(chave);

      if (valorArmazenado === null || valorArmazenado === undefined) {
        return valorPadrao;
      }

      return JSON.parse(valorArmazenado) ?? valorPadrao;
    } catch {
      return valorPadrao;
    }
  },

  escreverJson(chave, valor) {
    obterStorage()?.setItem(chave, JSON.stringify(valor));
  },

  remover(chave) {
    obterStorage()?.removeItem(chave);
  },
};
