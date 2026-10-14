import { describe, expect, it } from "vitest"
import { mesclarObraEditada } from "../cadastrosObras"
import { mesclarConstrutoraEditada } from "../construtoras"

describe("identidades estruturais em edições cadastrais", () => {
  it("renomear uma construtora preserva seu ID", () => {
    const original = { id: "constructor-fixture", nome: "Nome Anterior" }
    const editada = mesclarConstrutoraEditada({
      registroExistente: original,
      dadosEditados: { id: "id-injetado-ignorado", nome: "Nome Atual" },
      tabelaComercial: {},
    })

    expect(editada).toMatchObject({ id: "constructor-fixture", nome: "Nome Atual" })
  })

  it("renomear uma obra preserva seu ID e o vínculo com a construtora", () => {
    const original = {
      id: "site-fixture",
      nome: "Obra Anterior",
      construtoraId: "constructor-fixture",
    }
    const editada = mesclarObraEditada({
      registroExistente: original,
      dadosEditados: { id: "id-injetado-ignorado", nome: "Obra Atual" },
      construtoraId: "constructor-fixture",
      tabelaComercial: {},
    })

    expect(editada).toMatchObject({
      id: "site-fixture",
      nome: "Obra Atual",
      construtoraId: "constructor-fixture",
    })
  })

  it("atividades históricas permanecem ligadas à obra pelo ID após renomeação", () => {
    const atividade = { id: "activity-fixture", obraId: "site-fixture", obra: "Nome Histórico" }
    const obraEditada = mesclarObraEditada({
      registroExistente: { id: "site-fixture", nome: "Nome Histórico", construtoraId: "constructor-fixture" },
      dadosEditados: { nome: "Nome Atual" },
      construtoraId: "constructor-fixture",
      tabelaComercial: {},
    })

    expect(atividade.obraId).toBe(obraEditada.id)
    expect(atividade.obra).toBe("Nome Histórico")
  })
})
