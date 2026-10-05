import { localStorageAdapter } from "./localStorageAdapter";

export const criarRepositorioListaLocal = (chave) => {
  const listar = () => {
    const registros = localStorageAdapter.lerJson(chave, []);
    return Array.isArray(registros) ? registros : [];
  };

  return {
    listar,

    salvarTodos(registros) {
      localStorageAdapter.escreverJson(chave, registros);
    },

    criarSnapshot() {
      return localStorageAdapter.lerBruto(chave);
    },

    restaurarSnapshot(snapshot) {
      if (snapshot === null) {
        localStorageAdapter.remover(chave);
        return;
      }
      localStorageAdapter.escreverBruto(chave, snapshot);
    },

    obterPorId(id) {
      return listar().find((registro) => String(registro?.id) === String(id));
    },

    removerPorId(id) {
      const registrosAtualizados = listar().filter(
        (registro) => String(registro?.id) !== String(id)
      );
      localStorageAdapter.escreverJson(chave, registrosAtualizados);
      return registrosAtualizados;
    },
  };
};
