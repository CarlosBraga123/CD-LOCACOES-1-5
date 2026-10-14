import { prepararCadastroAgendado, gerarUuidCadastro } from "./atividadeSupabaseRepository";

// Uma tentativa conserva ID e comando após falha. Não usa armazenamento local nem retry automático.
export function criarTentativaCadastro(repository, uuid = gerarUuidCadastro) {
  let command = null, busy = false;
  return {
    get bloqueada() { return command !== null; },
    async salvar(form, catalogo) {
      if (busy) throw new Error("Cadastro já está em andamento.");
      busy = true;
      try {
        if (!command) command = prepararCadastroAgendado(form, catalogo, uuid());
        const result = await repository.cadastrarIndividual(command);
        command = null;
        return result;
      } finally { busy = false; }
    },
  };
}
