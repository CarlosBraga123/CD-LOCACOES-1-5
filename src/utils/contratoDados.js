export const CURRENT_SCHEMA_VERSION = 1;
export const BACKUP_APP = "CD_LOCACOES";

export const COLECOES_CENTRAIS = [
  "atividades",
  "construtoras",
  "obras",
  "equipamentosPatrimonio",
  "patrimonioEquipamentos",
  "substituicoesEquipamentos",
  "ajustesConfiguracaoEquipamentos",
  "controleKitContrapeso",
  "tarefas",
  "usuarios",
  "tabelaComercialPadrao",
  "valoresServicos",
  "valoresPadrao",
];

export const criarBackupVersionado = (
  dados,
  exportedAt = new Date().toISOString()
) => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  exportedAt,
  app: BACKUP_APP,
  ...(dados || {}),
});

export const obterVersaoBackup = (conteudo) =>
  conteudo?.schemaVersion === undefined ? 0 : Number(conteudo.schemaVersion);

export const validarEstruturaBackup = (conteudo) => {
  if (!conteudo || typeof conteudo !== "object" || Array.isArray(conteudo)) {
    throw new Error("O backup deve ser um objeto JSON válido.");
  }

  const versao = obterVersaoBackup(conteudo);
  if (!Number.isInteger(versao) || versao < 0) {
    throw new Error("O campo schemaVersion é inválido.");
  }
  if (versao > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Este backup usa a versão ${versao}, superior à versão suportada ${CURRENT_SCHEMA_VERSION}.`
    );
  }
  if (versao > 0 && conteudo.app && conteudo.app !== BACKUP_APP) {
    throw new Error("O arquivo não pertence ao aplicativo CD Locações.");
  }

  const chavesArray = [
    "atividades",
    "patrimonioEquipamentos",
    "equipamentosPatrimonio",
    "substituicoesEquipamentos",
    "ajustesConfiguracaoEquipamentos",
    "construtoras",
    "obras",
    "tarefas",
    "usuarios",
  ];
  chavesArray.forEach((chave) => {
    if (conteudo[chave] !== undefined && !Array.isArray(conteudo[chave])) {
      throw new Error(`O campo "${chave}" deve ser uma lista.`);
    }
  });

  if (
    conteudo.controleKitContrapeso !== undefined &&
    (typeof conteudo.controleKitContrapeso !== "object" ||
      conteudo.controleKitContrapeso === null ||
      Array.isArray(conteudo.controleKitContrapeso) ||
      !Array.isArray(conteudo.controleKitContrapeso.historico || []))
  ) {
    throw new Error(
      'O campo "controleKitContrapeso" deve ser uma estrutura de estoque válida.'
    );
  }

  ["pecasBalancinho", "pecasAncoragem"].forEach((chave) => {
    if (
      conteudo[chave] !== undefined &&
      (typeof conteudo[chave] !== "object" || conteudo[chave] === null)
    ) {
      throw new Error(`O campo "${chave}" deve ser uma estrutura de materiais válida.`);
    }
  });

  return { valido: true, versao, legado: versao === 0 };
};
