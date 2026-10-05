import { describe, expect, it } from "vitest";
import {
  BACKUP_APP,
  CURRENT_SCHEMA_VERSION,
  criarBackupVersionado,
  validarEstruturaBackup,
} from "../contratoDados";
import { auditarDadosParaMigracao, formatarRelatorioAuditoriaTexto } from "../auditoriaMigracao";

const base = (alteracoes = {}) => ({
  atividades: [],
  construtoras: [],
  obras: [],
  equipamentosPatrimonio: [],
  patrimonioEquipamentos: [],
  substituicoesEquipamentos: [],
  ajustesConfiguracaoEquipamentos: [],
  controleKitContrapeso: { quantidadeTotal: 0, historico: [] },
  tarefas: [],
  usuarios: [],
  valoresServicos: {},
  valoresPadrao: {},
  tabelaComercialPadrao: {},
  ...alteracoes,
});

const codigos = (relatorio) => relatorio.problemas.map((item) => item.codigo);

describe("contrato e auditoria para migração", () => {
  it("gera backup novo com schemaVersion, data e identificação do app", () => {
    const backup = criarBackupVersionado(
      { atividades: [{ id: "1" }] },
      "2026-10-02T12:00:00.000Z"
    );
    expect(backup).toMatchObject({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: "2026-10-02T12:00:00.000Z",
      app: BACKUP_APP,
      atividades: [{ id: "1" }],
    });
  });

  it("aceita backup legado sem schemaVersion", () => {
    expect(validarEstruturaBackup({ atividades: [] })).toEqual({
      valido: true,
      versao: 0,
      legado: true,
    });
  });

  it("não modifica os dados recebidos", () => {
    const dados = base({
      atividades: [{ id: "a", quantidade: 1, valoresCongelados: { totalServico: 10 } }],
    });
    const antes = structuredClone(dados);
    auditarDadosParaMigracao(dados, "2026-10-02T12:00:00.000Z");
    expect(dados).toEqual(antes);
  });

  it("detecta ID duplicado de atividade", () => {
    const relatorio = auditarDadosParaMigracao(base({
      atividades: [{ id: "a" }, { id: "a" }],
    }));
    expect(codigos(relatorio)).toContain("ATIVIDADE_ID_DUPLICADO");
  });

  it("detecta atividade ligada a obra inexistente", () => {
    const relatorio = auditarDadosParaMigracao(base({
      atividades: [{ id: "a", obraId: "obra-inexistente" }],
    }));
    expect(codigos(relatorio)).toContain("ATIVIDADE_OBRA_ORFA");
  });

  it("detecta obra ligada a construtora inexistente", () => {
    const relatorio = auditarDadosParaMigracao(base({
      obras: [{ id: "o", construtoraId: "construtora-inexistente" }],
    }));
    expect(codigos(relatorio)).toContain("OBRA_CONSTRUTORA_ORFA");
  });

  it("reconhece identidade legada reconstruível", () => {
    const relatorio = auditarDadosParaMigracao(base({
      atividades: [{ id: "atividade-123", quantidade: 2 }],
      patrimonioEquipamentos: [{ idItem: "legado:atividade-123:0", numeroPatrimonioAtual: "0142", historico: [] }],
    }));
    expect(codigos(relatorio)).toContain("IDENTIDADES_LEGADAS_VALIDAS");
    expect(codigos(relatorio)).not.toContain("VINCULO_PATRIMONIAL_SEM_UNIDADE");
  });

  it("detecta patrimônio atual duplicado em mestres ativos", () => {
    const relatorio = auditarDadosParaMigracao(base({
      equipamentosPatrimonio: [
        { idEquipamento: "e1", numeroPatrimonioAtual: "0142", situacaoAdministrativa: "NO_GALPAO", ativo: true },
        { idEquipamento: "e2", numeroPatrimonioAtual: "0142", situacaoAdministrativa: "LOCADO", ativo: true },
      ],
    }));
    expect(codigos(relatorio)).toContain("PATRIMONIO_DUPLICADO_EM_MESTRES_ATIVOS");
  });

  it("diferencia compatibilidade legada de erro estrutural", () => {
    const relatorio = auditarDadosParaMigracao(base({
      construtoras: [{ id: "c", nome: "Construtora" }],
      obras: [{ id: "o", construtora: "Construtora" }],
      atividades: [{ id: "a", obra: "Obra", construtora: "Construtora", quantidade: 1 }],
    }));
    expect(relatorio.problemas.filter((item) => item.nivel === "INFORMAÇÃO").length).toBeGreaterThan(0);
    expect(relatorio.totais.erros).toBe(0);
  });

  it("preserva valoresCongelados sem recalcular", () => {
    const valoresCongelados = {
      servicoUnitario: 100,
      adicionalContrapesoServico: 5,
      totalServico: 105,
      locacaoMensalUnitario: 500,
      adicionalContrapesoLocacao: 50,
      totalLocacaoMensal: 550,
      quantidade: 1,
      tabelaOrigem: "obra",
      dataCongelamento: "2026-09-01T10:00:00.000Z",
    };
    const dados = base({ atividades: [{ id: "a", dataLiberacao: "2026-09-01", valoresCongelados }] });
    auditarDadosParaMigracao(dados);
    expect(dados.atividades[0].valoresCongelados).toEqual(valoresCongelados);
  });

  it("não acessa nem grava localStorage durante a auditoria", () => {
    const anterior = globalThis.localStorage;
    let acessos = 0;
    globalThis.localStorage = {
      getItem: () => { acessos += 1; throw new Error("não deveria ler"); },
      setItem: () => { acessos += 1; throw new Error("não deveria gravar"); },
    };
    try {
      expect(() => auditarDadosParaMigracao(base())).not.toThrow();
      expect(acessos).toBe(0);
    } finally {
      if (anterior === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = anterior;
    }
  });

  it("trata coleções vazias sem produzir erro estrutural", () => {
    const relatorio = auditarDadosParaMigracao(base());
    expect(relatorio.contagens).toMatchObject({
      atividades: 0,
      construtoras: 0,
      obras: 0,
      equipamentosPatrimonio: 0,
      patrimonioEquipamentos: 0,
      kitsContrapeso: 0,
    });
    expect(relatorio.totais.erros).toBe(0);
  });

  it("detalha vínculo patrimonial sem unidade reconhecida", () => {
    const relatorio = auditarDadosParaMigracao(base({
      patrimonioEquipamentos: [{
        idItem: "item-perdido",
        numeroPatrimonioAtual: "0140",
        historico: [{ id: "h1", tipo: "VINCULO", data: "2026-09-01", obraId: "obra-1", numeroPatrimonioAnterior: "0139" }],
      }],
    }));
    const problema = relatorio.problemas.find((item) => item.codigo === "VINCULO_PATRIMONIAL_SEM_UNIDADE");
    expect(problema.detalhes).toMatchObject({
      indice: 0,
      idItem: "item-perdido",
      numeroPatrimonioAtual: "0140",
      numeroPatrimonioAnterior: "0139",
      quantidadeEventosHistorico: 1,
      obraId: "obra-1",
      ultimoEvento: { id: "h1" },
    });
  });

  it("detalha mestre com origem não reconhecida", () => {
    const relatorio = auditarDadosParaMigracao(base({
      equipamentosPatrimonio: [{
        idEquipamento: "mestre-1",
        idItemOrigem: "item-inexistente",
        numeroPatrimonioAtual: "0141",
        equipamento: "Balancinho Elétrico",
        tipoBalancinho: "Elétrico",
        situacaoAdministrativa: "LOCADO",
        ativo: true,
        dataCadastro: "2026-08-10",
      }],
    }));
    const problema = relatorio.problemas.find((item) => item.codigo === "MESTRE_ORIGEM_NAO_RECONHECIDA");
    expect(problema.detalhes).toMatchObject({
      indice: 0,
      idEquipamento: "mestre-1",
      idItemOrigem: "item-inexistente",
      numeroPatrimonioAtual: "0141",
      equipamento: "Balancinho Elétrico",
      situacaoAdministrativa: "LOCADO",
      ativo: true,
    });
  });

  it("detalha campos duplicados de OS e informa se os valores são iguais", () => {
    const relatorio = auditarDadosParaMigracao(base({
      atividades: [{
        id: "atividade-os",
        obraId: "obra-1",
        obra: "Infinity",
        dataLiberacao: "2026-09-20",
        numeroOsCampo: "0125",
        numeroOSCampo: "0126",
      }],
    }));
    const problema = relatorio.problemas.find((item) => item.codigo === "CAMPOS_OS_DUPLOS");
    expect(problema.detalhes).toEqual({
      atividadeId: "atividade-os",
      obraId: "obra-1",
      obra: "Infinity",
      data: "2026-09-20",
      numeroOsCampo: "0125",
      numeroOSCampo: "0126",
      valoresIguais: false,
    });
  });

  it("mantém detalhes estruturados no JSON e legíveis no TXT", () => {
    const relatorio = auditarDadosParaMigracao(base({
      patrimonioEquipamentos: [{
        idItem: "item-perdido",
        numeroPatrimonioAtual: "0140",
        historico: [{ id: "h1", tipo: "VINCULO", data: "2026-09-01" }],
      }],
    }));
    const json = JSON.parse(JSON.stringify(relatorio));
    const problema = json.problemas.find((item) => item.codigo === "VINCULO_PATRIMONIAL_SEM_UNIDADE");
    expect(problema.detalhes.ultimoEvento).toEqual({ id: "h1", tipo: "VINCULO", data: "2026-09-01" });

    const txt = formatarRelatorioAuditoriaTexto(relatorio);
    expect(txt).toContain("idItem: item-perdido");
    expect(txt).toContain('"id": "h1"');
    expect(txt).not.toContain("[object Object]");
  });
});
