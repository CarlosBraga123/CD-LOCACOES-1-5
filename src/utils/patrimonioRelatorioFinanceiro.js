import { enriquecerDetalhamentoPatrimonial } from "./detalhamentoPatrimonioLocacao";

const texto = (valor) => String(valor ?? "").trim();

const identidadesItem = (item) =>
  [item?.idItem, item?.idItemOrigem, item?.idUnidade, item?.idEquipamento]
    .map(texto)
    .filter(Boolean);

const obterRegistroUnico = (identidades, registros) => {
  const encontrados = registros.filter((registro) =>
    identidades.includes(texto(registro?.idItem))
  );
  return encontrados.length === 1 ? encontrados[0] : null;
};

const obterMestreUnico = (identidades, mestres) => {
  const encontrados = mestres.filter((mestre) => {
    const identidadesMestre = [mestre?.idEquipamento, mestre?.idItemOrigem]
      .map(texto)
      .filter(Boolean);
    return identidades.some((identidade) => identidadesMestre.includes(identidade));
  });
  return encontrados.length === 1 ? encontrados[0] : null;
};

const resolverPatrimonioItem = ({ item, registrosPatrimonio, equipamentosMestres }) => {
  const explicito = texto(item?.numeroPatrimonio || item?.numeroPatrimonioAtual);
  if (explicito) return explicito;

  const identidades = identidadesItem(item);
  if (!identidades.length) return "";

  const registro = obterRegistroUnico(identidades, registrosPatrimonio);
  const administrativo = texto(registro?.numeroPatrimonioAtual);
  if (administrativo) return administrativo;

  const mestre = obterMestreUnico(identidades, equipamentosMestres);
  const patrimonioMestre = texto(mestre?.numeroPatrimonioAtual);
  if (patrimonioMestre) return patrimonioMestre;

  const identidadeOrigemMestre = texto(mestre?.idItemOrigem);
  if (!identidadeOrigemMestre) return "";
  const registroOrigem = obterRegistroUnico(
    [identidadeOrigemMestre],
    registrosPatrimonio
  );
  return texto(registroOrigem?.numeroPatrimonioAtual);
};

export const obterItensPatrimoniaisServico = ({
  atividade,
  registrosPatrimonio = [],
  equipamentosMestres = [],
}) => {
  const itensAtividade = Array.isArray(atividade?.itensEquipamentos)
    ? atividade.itensEquipamentos
    : [];
  const quantidade = itensAtividade.length || Math.max(1, Number(atividade?.quantidade) || 1);
  const numeros = Array.isArray(atividade?.numerosPatrimonio)
    ? atividade.numerosPatrimonio
    : [];

  return Array.from({ length: quantidade }, (_, indice) => {
    const item = itensAtividade[indice] || {};
    const itemCompleto = {
      ...atividade,
      ...item,
      numeroPatrimonio:
        texto(item.numeroPatrimonio) ||
        texto(numeros[indice]) ||
        (indice === 0 ? texto(atividade?.numeroPatrimonio) : ""),
    };

    return {
      ...itemCompleto,
      numeroPatrimonio: resolverPatrimonioItem({
        item: itemCompleto,
        registrosPatrimonio: Array.isArray(registrosPatrimonio)
          ? registrosPatrimonio
          : [],
        equipamentosMestres: Array.isArray(equipamentosMestres)
          ? equipamentosMestres
          : [],
      }),
    };
  });
};

export const enriquecerPeriodosPatrimoniaisFinanceiros = ({
  periodos,
  atividades,
  registrosPatrimonio = [],
}) => {
  const atividadesPorId = new Map(
    (Array.isArray(atividades) ? atividades : []).map((atividade) => [
      String(atividade.id),
      atividade,
    ])
  );

  return (Array.isArray(periodos) ? periodos : []).flatMap((periodo) =>
    enriquecerDetalhamentoPatrimonial({
      periodo: {
        ...periodo,
        identidadeCanonica: periodo.idPeriodo || periodo.idUnidade || "periodo-financeiro",
        quantidadeDetalhe: periodo.quantidade,
        dataEntradaOriginal: periodo.dataEntrada,
        dataSaidaEfetiva: periodo.dataSaida,
      },
      atividadesPorId,
      registrosPatrimonio,
    })
  );
};

export const removerSufixoPatrimonialEquipamento = (equipamento) =>
  texto(equipamento)
    .replace(/\s+—\s+Patrimônio\s+[^—]+$/i, "")
    .replace(/\s+—\s+Sem patrimônio$/i, "");
