// Mesma regra da listagem Local; aplicada ao snapshot completo, sem mutá-lo.
export function ordenarAtividadesRemotas(atividades) {
  const agendadas = atividades.filter(a => !a.dataLiberacao)
    .sort((a,b) => new Date(a.dataAgendamento) - new Date(b.dataAgendamento));
  const liberadas = atividades.filter(a => a.dataLiberacao)
    .sort((a,b) => new Date(b.dataLiberacao) - new Date(a.dataLiberacao));
  return [...agendadas, ...liberadas];
}
