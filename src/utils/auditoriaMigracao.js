import { CURRENT_SCHEMA_VERSION } from "./contratoDados";

const lista = (valor) => (Array.isArray(valor) ? valor : []);
const texto = (valor) => String(valor ?? "").trim();
const numeroPatrimonio = (valor) => texto(valor).replace(/\s+/g, "");
const quantidadeAtividade = (atividade) =>
  Math.max(1, Number(atividade?.quantidade) || 1);

const criarColetor = () => {
  const problemas = [];
  const adicionar = (nivel, codigo, mensagem, dados = {}) =>
    problemas.push({ nivel, codigo, mensagem, ...dados });
  return { problemas, adicionar };
};

const auditarIds = ({ colecao, campo, rotulo, adicionar }) => {
  const porId = new Map();
  colecao.forEach((registro, indice) => {
    const id = texto(registro?.[campo]);
    if (!id) {
      adicionar("ERRO", `${rotulo.toUpperCase()}_SEM_ID`, `${rotulo} sem ${campo}.`, {
        colecao: rotulo,
        indice,
      });
      return;
    }
    porId.set(id, [...(porId.get(id) || []), indice]);
  });
  porId.forEach((indices, id) => {
    if (indices.length > 1) {
      adicionar("ERRO", `${rotulo.toUpperCase()}_ID_DUPLICADO`, `${rotulo} com ${campo} duplicado: ${id}.`, {
        colecao: rotulo,
        id,
        indices,
      });
    }
  });
};

const identidadesDasAtividades = (atividades, adicionar) => {
  const identidades = new Set();
  const idsItens = new Map();
  atividades.forEach((atividade, indiceAtividade) => {
    const itens = lista(atividade?.itensEquipamentos);
    if (itens.length === 0) {
      const idAtividade = texto(atividade?.id) || "sem-id";
      for (let indice = 0; indice < quantidadeAtividade(atividade); indice += 1) {
        identidades.add(`legado:${idAtividade}:${indice}`);
      }
      return;
    }
    itens.forEach((item, indiceItem) => {
      const idItem = texto(item?.idItem);
      if (!idItem) {
        adicionar(
          "AVISO",
          "ITEM_EQUIPAMENTO_SEM_ID",
          "Item individualizado sem idItem; pode ser compatibilidade de uma atividade antiga.",
          { atividadeId: atividade?.id ?? null, indiceAtividade, indiceItem }
        );
      } else {
        identidades.add(idItem);
        idsItens.set(idItem, [...(idsItens.get(idItem) || []), { indiceAtividade, indiceItem }]);
      }
      [item?.idItemOrigem, item?.idUnidade].map(texto).filter(Boolean)
        .forEach((id) => identidades.add(id));
    });
  });
  idsItens.forEach((ocorrencias, id) => {
    if (ocorrencias.length > 1) {
      adicionar("ERRO", "ID_ITEM_DUPLICADO", `idItem duplicado: ${id}.`, {
        colecao: "atividades.itensEquipamentos",
        id,
        ocorrencias,
      });
    }
  });
  return identidades;
};

const auditarFinanceiro = (atividades, adicionar) => {
  const campos = [
    "servicoUnitario",
    "adicionalContrapesoServico",
    "totalServico",
    "locacaoMensalUnitario",
    "adicionalContrapesoLocacao",
    "totalLocacaoMensal",
    "quantidade",
  ];
  atividades.forEach((atividade) => {
    if (!atividade?.dataLiberacao) return;
    const congelados = atividade.valoresCongelados;
    if (congelados === undefined || congelados === null) {
      adicionar(
        "AVISO",
        "ATIVIDADE_LIBERADA_SEM_VALORES_CONGELADOS",
        "Atividade liberada sem valoresCongelados; o sistema atual pode usar fallback legado.",
        { atividadeId: atividade.id ?? null }
      );
      return;
    }
    if (typeof congelados !== "object" || Array.isArray(congelados)) {
      adicionar("ERRO", "VALORES_CONGELADOS_MALFORMADOS", "valoresCongelados não é um objeto.", {
        atividadeId: atividade.id ?? null,
      });
      return;
    }
    campos.forEach((campo) => {
      if (congelados[campo] === undefined) {
        adicionar("AVISO", "CAMPO_CONGELADO_AUSENTE", `Campo histórico ausente em valoresCongelados: ${campo}.`, {
          atividadeId: atividade.id ?? null,
          campo,
        });
      } else if (!Number.isFinite(Number(congelados[campo]))) {
        adicionar("ERRO", "VALOR_CONGELADO_INVALIDO", `Valor numérico inválido em valoresCongelados.${campo}.`, {
          atividadeId: atividade.id ?? null,
          campo,
          valor: congelados[campo],
        });
      }
    });
  });
};

export const auditarDadosParaMigracao = (dados = {}, agora = new Date().toISOString()) => {
  const atividades = lista(dados.atividades);
  const construtoras = lista(dados.construtoras);
  const obras = lista(dados.obras);
  const equipamentos = lista(dados.equipamentosPatrimonio);
  const registros = lista(dados.patrimonioEquipamentos);
  const substituicoes = lista(dados.substituicoesEquipamentos);
  const ajustes = lista(dados.ajustesConfiguracaoEquipamentos);
  const tarefas = lista(dados.tarefas);
  const usuarios = lista(dados.usuarios);
  const controleKits = dados.controleKitContrapeso || {};
  const { problemas, adicionar } = criarColetor();

  auditarIds({ colecao: atividades, campo: "id", rotulo: "atividade", adicionar });
  auditarIds({ colecao: construtoras, campo: "id", rotulo: "construtora", adicionar });
  auditarIds({ colecao: obras, campo: "id", rotulo: "obra", adicionar });
  auditarIds({ colecao: equipamentos, campo: "idEquipamento", rotulo: "equipamento_mestre", adicionar });

  const identidades = identidadesDasAtividades(atividades, adicionar);
  const idsConstrutoras = new Set(construtoras.map((item) => texto(item?.id)).filter(Boolean));
  const idsObras = new Set(obras.map((item) => texto(item?.id)).filter(Boolean));
  const idsEquipamentos = new Set(equipamentos.map((item) => texto(item?.idEquipamento)).filter(Boolean));

  obras.forEach((obra) => {
    if (obra?.construtoraId && !idsConstrutoras.has(texto(obra.construtoraId))) {
      adicionar("ERRO", "OBRA_CONSTRUTORA_ORFA", "obra.construtoraId não corresponde a uma construtora existente.", {
        obraId: obra.id ?? null,
        construtoraId: obra.construtoraId,
      });
    } else if (!obra?.construtoraId && obra?.construtora) {
      adicionar("INFORMAÇÃO", "OBRA_RELACAO_LEGADA_POR_NOME", "Obra relacionada à construtora pelo nome (compatibilidade legada).", {
        obraId: obra.id ?? null,
      });
    }
  });
  atividades.forEach((atividade) => {
    if (atividade?.obraId && !idsObras.has(texto(atividade.obraId))) {
      adicionar("ERRO", "ATIVIDADE_OBRA_ORFA", "atividade.obraId não corresponde a uma obra existente.", {
        atividadeId: atividade.id ?? null,
        obraId: atividade.obraId,
      });
    } else if (!atividade?.obraId && (atividade?.obra || atividade?.construtora)) {
      adicionar("INFORMAÇÃO", "ATIVIDADE_RELACAO_LEGADA_POR_NOME", "Atividade relacionada à obra por nomes (compatibilidade legada).", {
        atividadeId: atividade.id ?? null,
      });
    }
  });

  registros.forEach((registro, indice) => {
    const idItem = texto(registro?.idItem);
    if (!idItem) {
      adicionar("ERRO", "REGISTRO_PATRIMONIO_SEM_ID_ITEM", "Registro patrimonial sem idItem.", { indice });
    } else if (!identidades.has(idItem)) {
      adicionar("AVISO", "VINCULO_PATRIMONIAL_SEM_UNIDADE", "Vínculo administrativo sem unidade reconhecível no conjunto atual.", { idItem });
    }
    lista(registro?.historico).forEach((evento, indiceEvento) => {
      if (!evento?.id || !evento?.tipo || !evento?.data) {
        adicionar("AVISO", "HISTORICO_PATRIMONIAL_INCOMPLETO", "Evento patrimonial histórico incompleto.", {
          idItem: idItem || null,
          indiceEvento,
        });
      }
    });
  });

  const patrimoniosMestres = new Map();
  const situacoesConhecidas = new Set([
    "NO_GALPAO", "LOCADO", "EM_MANUTENCAO", "INDISPONIVEL", "BAIXADO", "SEM_LOCALIZACAO_ATUAL",
  ]);
  equipamentos.forEach((equipamento) => {
    const patrimonio = numeroPatrimonio(equipamento?.numeroPatrimonioAtual);
    if (!patrimonio) {
      adicionar("AVISO", "MESTRE_SEM_PATRIMONIO_ATUAL", "Equipamento mestre sem número patrimonial atual.", {
        idEquipamento: equipamento?.idEquipamento ?? null,
      });
    } else if (equipamento?.ativo !== false) {
      patrimoniosMestres.set(patrimonio, [...(patrimoniosMestres.get(patrimonio) || []), equipamento.idEquipamento]);
    }
    if (!situacoesConhecidas.has(texto(equipamento?.situacaoAdministrativa))) {
      adicionar("AVISO", "SITUACAO_ADMINISTRATIVA_DESCONHECIDA", "Situação administrativa desconhecida no equipamento mestre.", {
        idEquipamento: equipamento?.idEquipamento ?? null,
        situacao: equipamento?.situacaoAdministrativa ?? null,
      });
    }
    const origem = texto(equipamento?.idItemOrigem);
    if (
      origem &&
      equipamento?.situacaoAdministrativa === "LOCADO" &&
      !identidades.has(origem)
    ) {
      adicionar("AVISO", "MESTRE_ORIGEM_NAO_RECONHECIDA", "idItemOrigem do mestre não é reconhecível no conjunto atual.", {
        idEquipamento: equipamento?.idEquipamento ?? null,
        idItemOrigem: origem,
      });
    }
  });
  patrimoniosMestres.forEach((ids, patrimonio) => {
    if (ids.length > 1) {
      adicionar("ERRO", "PATRIMONIO_DUPLICADO_EM_MESTRES_ATIVOS", `Patrimônio ${patrimonio} aparece em mais de um mestre ativo.`, {
        patrimonio,
        idsEquipamentos: ids,
      });
    }
  });

  const vinculosAtuais = new Map();
  registros.forEach((registro) => {
    const patrimonio = numeroPatrimonio(registro?.numeroPatrimonioAtual);
    if (!patrimonio) return;
    vinculosAtuais.set(patrimonio, [...(vinculosAtuais.get(patrimonio) || []), registro.idItem]);
  });
  vinculosAtuais.forEach((ids, patrimonio) => {
    if (new Set(ids.map(texto)).size > 1) {
      adicionar("ERRO", "PATRIMONIO_VINCULADO_A_UNIDADES_INCOMPATIVEIS", `Patrimônio ${patrimonio} possui mais de um vínculo administrativo atual.`, {
        patrimonio,
        idsItens: ids,
      });
    }
  });

  ajustes.forEach((ajuste, indice) => {
    const ids = [ajuste?.idItem, ajuste?.idUnidade, ajuste?.idEquipamento].map(texto).filter(Boolean);
    if (!ids.some((id) => identidades.has(id) || idsEquipamentos.has(id))) {
      adicionar("AVISO", "AJUSTE_SEM_UNIDADE_RECONHECIDA", "Ajuste de configuração sem unidade/equipamento reconhecível.", { indice, ajusteId: ajuste?.id ?? null });
    }
    if (ajuste?.obraId && !idsObras.has(texto(ajuste.obraId))) {
      adicionar("AVISO", "AJUSTE_OBRA_NAO_RECONHECIDA", "Ajuste aponta para obra inexistente no conjunto atual.", { ajusteId: ajuste?.id ?? null, obraId: ajuste.obraId });
    }
  });
  substituicoes.forEach((substituicao) => {
    ["equipamentoOrigemId", "equipamentoDestinoId"].forEach((campo) => {
      if (substituicao?.[campo] && !idsEquipamentos.has(texto(substituicao[campo]))) {
        adicionar("ERRO", "SUBSTITUICAO_EQUIPAMENTO_ORFA", `Substituição referencia ${campo} inexistente.`, {
          substituicaoId: substituicao?.id ?? null,
          campo,
          valor: substituicao[campo],
        });
      }
    });
    ["unidadeOrigemId", "unidadeDestinoId"].forEach((campo) => {
      if (substituicao?.[campo] && !identidades.has(texto(substituicao[campo]))) {
        adicionar("AVISO", "SUBSTITUICAO_UNIDADE_NAO_RECONHECIDA", `Substituição referencia ${campo} não reconhecida atualmente.`, {
          substituicaoId: substituicao?.id ?? null,
          campo,
          valor: substituicao[campo],
        });
      }
    });
  });

  const legadas = atividades.filter((atividade) => lista(atividade?.itensEquipamentos).length === 0);
  if (legadas.length) adicionar("INFORMAÇÃO", "ATIVIDADES_SEM_ITENS", `${legadas.length} atividade(s) sem itensEquipamentos, compatíveis com formato legado.`, { quantidade: legadas.length });
  const identidadesLegadas = [...identidades].filter((id) => id.startsWith("legado:"));
  if (identidadesLegadas.length) adicionar("INFORMAÇÃO", "IDENTIDADES_LEGADAS_VALIDAS", `${identidadesLegadas.length} identidade(s) legada(s) reconstruível(is).`, { quantidade: identidadesLegadas.length });
  if (atividades.some((item) => item?.numeroPatrimonio !== undefined)) adicionar("INFORMAÇÃO", "NUMERO_PATRIMONIO_SINGULAR", "Há atividades usando numeroPatrimonio singular (compatibilidade legada).");
  if (atividades.some((item) => Array.isArray(item?.numerosPatrimonio))) adicionar("INFORMAÇÃO", "NUMEROS_PATRIMONIO_LEGADO", "Há atividades usando numerosPatrimonio.");
  if (atividades.some((item) => item?.numeroOsCampo !== undefined && item?.numeroOSCampo !== undefined)) adicionar("AVISO", "CAMPOS_OS_DUPLOS", "Há atividade contendo numeroOsCampo e numeroOSCampo simultaneamente.");
  if (dados.valoresServicos && Object.keys(dados.valoresServicos).length) adicionar("INFORMAÇÃO", "VALORES_SERVICOS_LEGADO", "A coleção valoresServicos será preservada como fallback legado.");
  if (dados.valoresPadrao && Object.keys(dados.valoresPadrao).length) adicionar("INFORMAÇÃO", "VALORES_PADRAO_LEGADO", "A coleção valoresPadrao será preservada como fallback legado.");

  auditarFinanceiro(atividades, adicionar);

  const totais = {
    erros: problemas.filter((item) => item.nivel === "ERRO").length,
    avisos: problemas.filter((item) => item.nivel === "AVISO").length,
    informacoes: problemas.filter((item) => item.nivel === "INFORMAÇÃO").length,
  };
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    generatedAt: agora,
    somenteLeitura: true,
    contagens: {
      atividades: atividades.length,
      construtoras: construtoras.length,
      obras: obras.length,
      equipamentosPatrimonio: equipamentos.length,
      patrimonioEquipamentos: registros.length,
      substituicoesEquipamentos: substituicoes.length,
      ajustesConfiguracaoEquipamentos: ajustes.length,
      tarefas: tarefas.length,
      usuarios: usuarios.length,
      kitsContrapeso: Math.max(0, Number(controleKits.quantidadeTotal) || 0),
      eventosKitContrapeso: lista(controleKits.historico).length,
      tabelasComerciaisPadrao: dados.tabelaComercialPadrao ? 1 : 0,
    },
    totais,
    problemas,
  };
};

export const formatarRelatorioAuditoriaTexto = (relatorio) => {
  const linhas = [
    "AUDITORIA PARA MIGRAÇÃO",
    `Gerado em: ${relatorio.generatedAt}`,
    "",
    ...Object.entries(relatorio.contagens).map(([chave, valor]) => `${chave}: ${valor}`),
    "",
    `Erros: ${relatorio.totais.erros}`,
    `Avisos: ${relatorio.totais.avisos}`,
    `Informações: ${relatorio.totais.informacoes}`,
    "",
    ...relatorio.problemas.map((item) => `[${item.nivel}] ${item.codigo}: ${item.mensagem}`),
  ];
  return linhas.join("\n");
};
