import { describe, expect, it, vi } from "vitest"
import {
  buscarMembershipPropria,
  contarRegistros,
  criarPayloadTesteEscrita,
  erroRepresentaBloqueioEscrita,
  testarBloqueioEscrita,
} from "../diagnosticoSupabase"

describe("diagnosticoSupabase", () => {
  it("consulta somente a membership visível para a sessão", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [{ organization_id: "organizacao-ficticia", role: "auditor", active: true }],
      error: null,
    })
    const select = vi.fn(() => ({ limit }))
    const cliente = { from: vi.fn(() => ({ select })) }

    await expect(buscarMembershipPropria(cliente)).resolves.toEqual({
      organization_id: "organizacao-ficticia",
      role: "auditor",
      active: true,
    })
    expect(cliente.from).toHaveBeenCalledWith("organization_memberships")
    expect(select).toHaveBeenCalledWith("organization_id, role, active")
    expect(limit).toHaveBeenCalledWith(1)
  })

  it("retorna null quando nenhuma membership é visível", async () => {
    const cliente = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) })),
      })),
    }

    await expect(buscarMembershipPropria(cliente)).resolves.toBeNull()
  })

  it("obtém contagem exata sem baixar registros", async () => {
    const select = vi.fn().mockResolvedValue({ count: 7, error: null })
    const cliente = { from: vi.fn(() => ({ select })) }

    await expect(contarRegistros(cliente, "activities")).resolves.toBe(7)
    expect(select).toHaveBeenCalledWith("*", { count: "exact", head: true })
  })

  it("cria payload fictício sem alterar um registro existente", () => {
    expect(criarPayloadTesteEscrita("organizacao-ficticia", "diagnostico-id-ficticio")).toEqual({
      organization_id: "organizacao-ficticia",
      id: "diagnostico-id-ficticio",
      description: "DIAGNOSTICO SUPABASE - tentativa ficticia de escrita bloqueada",
      completed: false,
      source: "DIAGNOSTICO_SUPABASE_TEMPORARIO",
      raw_payload: { diagnostico: true, ficticio: true },
    })
  })

  it("reconhece apenas recusas de privilégio ou RLS como bloqueio esperado", () => {
    expect(erroRepresentaBloqueioEscrita({ code: "42501", message: "permission denied" })).toBe(true)
    expect(erroRepresentaBloqueioEscrita({ message: "new row violates row-level security policy" })).toBe(true)
    expect(erroRepresentaBloqueioEscrita({ message: "Failed to fetch" })).toBe(false)
  })

  it("não tenta limpeza quando a escrita é inesperadamente aceita", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const cliente = { from: vi.fn(() => ({ insert })) }

    const resultado = await testarBloqueioEscrita(
      cliente,
      "organizacao-ficticia",
      () => "diagnostico-id-ficticio",
    )

    expect(resultado.aceito).toBe(true)
    expect(resultado.bloqueado).toBe(false)
    expect(cliente.from).toHaveBeenCalledTimes(1)
    expect(cliente.from).toHaveBeenCalledWith("tasks")
    expect(insert).toHaveBeenCalledTimes(1)
  })
})
