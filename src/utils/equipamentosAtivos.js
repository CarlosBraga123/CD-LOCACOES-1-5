import { atividadePertenceObra } from "./obras";
import {
  atividadeEncerraLocacao,
  atividadeIniciaLocacao,
  obterMovimentosLocacao,
} from "./locacaoFinanceira";
import { compararTextoPtBr } from "./ordenacao";

const ordemBalancinho = ["Balancinho Elétrico", "Balancinho Manual", "Kit Contrapeso"];
const ordemMiniGrua = ["Mini Grua 500kg", "Mini Grua 1T", "Mini Grua"];
const ordemResumo = [...ordemBalancinho, ...ordemMiniGrua];

const ordenarResumo = (itens) =>
  itens.sort((a, b) => {
    const posicaoA = ordemResumo.indexOf(a.grupo);
    const posicaoB = ordemResumo.indexOf(b.grupo);

    if (posicaoA === -1 && posicaoB === -1) return compararTextoPtBr(a.grupo, b.grupo);
    if (posicaoA === -1) return 1;
    if (posicaoB === -1) return -1;
    return posicaoA - posicaoB;
  });

export const formatarGrupoBalancinhoAtivo = (atividade) => {
  if (atividade?.usaContrapeso) return "Kit Contrapeso";
  return atividade?.tipoBalancinho === "Manual" ? "Balancinho Manual" : "Balancinho Elétrico";
};

export const formatarGrupoMiniGruaAtiva = (atividade) =>
  atividade?.tipoMiniGrua ? `Mini Grua ${atividade.tipoMiniGrua}` : "Mini Grua";

export const calcularEquipamentosAtivosDaObra = (obra, atividades = []) => {
  const totais = {};

  atividades
    .filter((atividade) => atividadePertenceObra(atividade, obra) && atividade.dataLiberacao)
    .flatMap((atividade) => obterMovimentosLocacao(atividade))
    .forEach((atividade) => {
      const quantidade = Number(atividade.quantidade) || 1;
      const iniciaLocacao = atividadeIniciaLocacao(atividade);
      const encerraLocacao = atividadeEncerraLocacao(atividade);
      let grupo = "";

      if (atividade.equipamento === "Balancinho") {
        grupo = formatarGrupoBalancinhoAtivo(atividade);
      } else if (atividade.equipamento === "Mini Grua") {
        grupo = formatarGrupoMiniGruaAtiva(atividade);
      } else {
        grupo = atividade.equipamento || "Equipamento";
      }

      if (!grupo) return;
      if (!totais[grupo]) totais[grupo] = 0;
      if (iniciaLocacao) totais[grupo] += quantidade;
      if (encerraLocacao) totais[grupo] -= quantidade;
    });

  return totais;
};

export const obterResumoEquipamentosAtivos = (obra, atividades = []) =>
  ordenarResumo(
    Object.entries(calcularEquipamentosAtivosDaObra(obra, atividades))
      .filter(([, total]) => total !== 0)
      .map(([grupo, total]) => ({ grupo, total }))
  );

export const obterTotalEquipamentosAtivos = (obra, atividades = []) =>
  obterResumoEquipamentosAtivos(obra, atividades).reduce(
    (total, item) => total + Math.max(0, Number(item.total) || 0),
    0
  );
