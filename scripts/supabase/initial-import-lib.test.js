import { describe, expect, it } from "vitest";
import { createSql, persistedValuesDiffer, prepareImport, stableStringify } from "./initial-import-lib.mjs";

const sha = "a".repeat(64);
const base = () => ({
  atividades: [], patrimonioEquipamentos: [], equipamentosPatrimonio: [], substituicoesEquipamentos: [],
  ajustesConfiguracaoEquipamentos: [], construtoras: [], obras: [], tarefas: [], usuarios: [],
  controleKitContrapeso: { quantidadeTotal: 0, historico: [] }, tabelaComercialPadrao: { versao: 1, servicos: {}, locacoes: {} },
});

describe("preparador da importação inicial", () => {
  it("preserva IDs Date.now, UUID e patrimônio com zero à esquerda como texto", () => {
    const backup = base();
    backup.atividades.push({ id: 1999999999999, numeroPatrimonio: "000000", numerosPatrimonio: ["000000"], valoresCongelados: { zero: 0, falso: false, vazio: "" } });
    backup.equipamentosPatrimonio.push({ idEquipamento: "00000000-0000-4000-8000-000000000001", numeroPatrimonioAtual: "000000", idItemOrigem: "legado:1999999999999:7" });
    const { data, report } = prepareImport(backup, sha);
    expect(report.totals.errors).toBe(0);
    expect(data.tables.activities[0].id).toBe("1999999999999");
    expect(data.tables.activities[0].patrimony_number).toBe("000000");
    expect(data.tables.physical_equipment[0].id).toBe("00000000-0000-4000-8000-000000000001");
    expect(data.tables.physical_equipment[0].item_origin_id).toBe("legado:1999999999999:7");
    expect(data.tables.activities[0].frozen_values).toEqual({ zero: 0, falso: false, vazio: "" });
  });

  it("mantém atividade antiga sem itens e item moderno sem inventar identidades", () => {
    const backup = base();
    backup.atividades.push({ id: "atividade-legada-fixture", quantidade: 2 }, { id: "atividade-moderna-fixture", itensEquipamentos: [{ idItem: "patrimonio:EquipamentoTeste:000000:fixture", idEquipamento: null }] });
    const { data } = prepareImport(backup, sha);
    expect(data.tables.activity_equipment_items).toHaveLength(1);
    expect(data.tables.activity_equipment_items[0].id).toBe("patrimonio:EquipamentoTeste:000000:fixture");
    expect(data.tables.activity_equipment_items[0].physical_equipment_id).toBeNull();
  });

  it("preserva raw_payload, null, false, zero e string vazia", () => {
    const backup = base();
    backup.tarefas.push({ id: "t1", concluida: false, concluidaEm: null, texto: "", extra: 0 });
    const { data } = prepareImport(backup, sha);
    expect(data.tables.tasks[0]).toMatchObject({ completed: false, completed_at: null, description: "" });
    expect(data.tables.tasks[0].raw_payload.extra).toBe(0);
  });

  it("bloqueia chave duplicada de forma auditável", () => {
    const backup = base();
    backup.tarefas.push({ id: "duplicado" }, { id: "duplicado" });
    const { report } = prepareImport(backup, sha);
    expect(report.classification).toContain("NÃO APROVADO");
    expect(report.errors.some((item) => item.code === "DUPLICATE_TARGET_KEY")).toBe(true);
    expect(report.executable_sql_generated).toBe(false);
  });

  it("preserva referência ausente sem inventar cadastro", () => {
    const backup = base();
    backup.atividades.push({ id: "a1", obraId: "obra-ausente" });
    const { data, report } = prepareImport(backup, sha);
    expect(report.totals.errors).toBe(0);
    expect(report.warnings.some((item) => item.code === "MISSING_SITE_REFERENCE")).toBe(true);
    expect(data.tables.construction_sites).toHaveLength(0);
  });

  it("gera IDs comerciais e saída determinísticos", () => {
    const backup = base();
    backup.construtoras.push({ id: 10, tabelaComercial: { versao: 2, servicos: { Instalação: 10 }, locacoes: {} } });
    const first = prepareImport(backup, sha);
    const second = prepareImport(backup, sha);
    expect(first.data.tables.commercial_tables.map((item) => item.id)).toEqual(["constructor:10", "default"]);
    expect(stableStringify(first)).toBe(stableStringify(second));
  });

  it("não recalcula valores financeiros e gera SQL transacional idempotente", () => {
    const backup = base();
    backup.atividades.push({ id: "a1", valorTotalServico: "123.45", valoresCongelados: { campoDesconhecido: "preservado" } });
    const { data, report } = prepareImport(backup, sha);
    expect(data.tables.activities[0].total_service_value).toBe(123.45);
    expect(data.tables.activities[0].frozen_values).toEqual({ campoDesconhecido: "preservado" });
    const sql = createSql(data);
    expect(report.infos.some((item) => item.code === "NO_FINANCIAL_RECALCULATION")).toBe(true);
    expect(sql).toContain("begin;");
    expect(sql).toContain("on conflict");
    expect(sql).toContain("is distinct from");
    expect(sql).toContain("commit;");
  });

  it("diferencia itens no índice local zero por atividade e preserva raw_payload", () => {
    const backup = base();
    const first = { idItem: "item-1", numeroPatrimonio: "0001" };
    const second = { idItem: "item-2", numeroPatrimonio: "0002" };
    backup.atividades.push(
      { id: "atividade-1", itensEquipamentos: [first] },
      { id: "atividade-2", itensEquipamentos: [second] },
    );
    const { data } = prepareImport(backup, sha);
    const records = data.tables.import_records.filter((item) => item.source_collection === "atividades.itensEquipamentos");
    expect(records.map((item) => item.source_index)).toEqual([0, 1]);
    expect(records[0].original_id).toBe("parent=atividade-1;index=0;child=item-1");
    expect(records[1].original_id).toBe("parent=atividade-2;index=0;child=item-2");
    expect(records[0].original_id).not.toBe(records[1].original_id);
    expect(records[0].raw_payload).toEqual(first);
    expect(records[1].raw_payload).toEqual(second);
  });

  it("diferencia históricos administrativos no índice local zero por mestre", () => {
    const backup = base();
    backup.equipamentosPatrimonio.push(
      { idEquipamento: "mestre-1", historicoAdministrativo: [{ id: "evento-1" }] },
      { idEquipamento: "mestre-2", historicoAdministrativo: [{ id: "evento-2" }] },
    );
    const { data } = prepareImport(backup, sha);
    const records = data.tables.import_records.filter((item) => item.source_collection === "equipamentosPatrimonio.historicoAdministrativo");
    expect(records.map((item) => item.source_index)).toEqual([0, 1]);
    expect(records.map((item) => item.original_id)).toEqual([
      "parent=mestre-1;index=0;child=evento-1",
      "parent=mestre-2;index=0;child=evento-2",
    ]);
  });

  it("diferencia históricos patrimoniais no índice local zero por vínculo", () => {
    const backup = base();
    backup.patrimonioEquipamentos.push(
      { idItem: "vinculo-1", historico: [{ id: "evento-1" }] },
      { idItem: "vinculo-2", historico: [{ id: "evento-2" }] },
    );
    const { data } = prepareImport(backup, sha);
    const records = data.tables.import_records.filter((item) => item.source_collection === "patrimonioEquipamentos.historico");
    expect(records.map((item) => item.source_index)).toEqual([0, 1]);
    expect(records.map((item) => item.original_id)).toEqual([
      "parent=vinculo-1;index=0;child=evento-1",
      "parent=vinculo-2;index=0;child=evento-2",
    ]);
  });

  it("não atualiza valores iguais e detecta diferenças reais com semântica NULL-safe", () => {
    const fields = ["name", "notes", "active"];
    expect(persistedValuesDiffer(
      { name: "CD", notes: null, active: false },
      { name: "CD", notes: null, active: false },
      fields,
    )).toBe(false);
    expect(persistedValuesDiffer(
      { name: "CD", notes: null, active: false },
      { name: "CD", notes: "alterado", active: false },
      fields,
    )).toBe(true);
    expect(persistedValuesDiffer(
      { name: "CD", notes: null, active: false },
      { name: "CD", notes: "", active: false },
      fields,
    )).toBe(true);
  });
});
