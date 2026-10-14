import { criarRepositorioListaLocal } from "./criarRepositorioListaLocal";

export const atividadeRepository = criarRepositorioListaLocal("atividades");
// Fonte remota explícita; consumidores locais mantêm o contrato síncrono existente.
export { criarAtividadeSupabaseRepository } from "./atividadeSupabaseRepository";
