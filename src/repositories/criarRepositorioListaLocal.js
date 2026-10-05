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
