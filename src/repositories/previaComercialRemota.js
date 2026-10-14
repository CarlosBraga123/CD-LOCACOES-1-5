// Apenas leitura para exibição: não integra o comando de cadastro.
export function tabelaComercialRemota(catalogo, obraId) {
  const obra = catalogo.obras.find(o => o.id === obraId);
  if (!obra || !Array.isArray(catalogo.tabelasComerciais)) return null;
  const rows = catalogo.tabelasComerciais.filter(t => t.organization_id === 'cd-locacoes');
  for (const [scope, id] of [['CONSTRUCTION_SITE', obra.id], ['CONSTRUCTOR', obra.constructor_id], ['DEFAULT', null]]) {
    const matches = rows.filter(t => t.scope_type === scope && (scope === 'DEFAULT' || t.scope_id === id));
    if (matches.length > 1) return null;
    if (matches.length === 1) return {servicos: matches[0].services || {}, locacoes: matches[0].rentals || {}};
  }
  return null;
}
