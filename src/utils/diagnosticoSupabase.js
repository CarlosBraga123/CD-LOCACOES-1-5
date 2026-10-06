export const TABELAS_DIAGNOSTICO = [
  "constructors",
  "construction_sites",
  "activities",
  "physical_equipment",
]

export async function buscarMembershipPropria(cliente) {
  const { data, error } = await cliente
    .from("organization_memberships")
    .select("organization_id, role, active")
    .limit(1)

  if (error) throw error
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

export async function contarRegistros(cliente, tabela) {
  const { count, error } = await cliente
    .from(tabela)
    .select("*", { count: "exact", head: true })

  if (error) throw error
  return count ?? 0
}

export function criarPayloadTesteEscrita(organizationId, id) {
  return {
    organization_id: organizationId,
    id,
    description: "DIAGNOSTICO SUPABASE - tentativa ficticia de escrita bloqueada",
    completed: false,
    source: "DIAGNOSTICO_SUPABASE_TEMPORARIO",
    raw_payload: {
      diagnostico: true,
      ficticio: true,
    },
  }
}

export function erroRepresentaBloqueioEscrita(error) {
  const codigo = String(error?.code || "")
  const mensagem = String(error?.message || "").toLowerCase()

  return codigo === "42501"
    || mensagem.includes("permission denied")
    || mensagem.includes("row-level security")
}

export async function testarBloqueioEscrita(cliente, organizationId, criarId) {
  const id = criarId()
  const payload = criarPayloadTesteEscrita(organizationId, id)
  const { error } = await cliente.from("tasks").insert(payload)

  if (!error) {
    return { bloqueado: false, aceito: true, payload }
  }

  return {
    bloqueado: erroRepresentaBloqueioEscrita(error),
    aceito: false,
    error,
    payload,
  }
}
