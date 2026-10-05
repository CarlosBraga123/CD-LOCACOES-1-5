# Repositórios locais

Esta camada centraliza o acesso ao `localStorage` sem alterar chaves, formatos ou regras de negócio. Nesta fase o `localStorage` continua sendo a única fonte operacional. Não há leitura ou escrita no Supabase, IndexedDB, fila, sincronização ou duplicação de persistência.

## Repositórios disponíveis

- Coleções: `atividadeRepository`, `construtoraRepository`, `obraRepository` e `tarefaRepository`.
- Patrimônio: `equipamentoPatrimonioRepository`, `vinculoPatrimonioRepository`, `ajusteConfiguracaoEquipamentoRepository`, `substituicaoEquipamentoRepository` e `controleKitContrapesoRepository`.
- Comercial: `tabelaComercialRepository`, `valoresServicosRepository` e `valoresPadraoRepository`.
- Configurações: `pecasBalancinhoRepository`, `pecasAncoragemRepository`, `empresaNomeRepository` e `empresaLogoRepository`.

O `localStorageAdapter` preserva JSON ou texto bruto conforme o contrato histórico de cada chave. Chave ausente ou JSON inválido devolve o padrão informado sem modificar o armazenamento. Os repositórios não mantêm cache: cada leitura consulta novamente o `localStorage`.

Os snapshots brutos existem somente para preservar rollbacks locais já usados por operações com múltiplas coleções. Eles não criam transações nem alteram a ordem das gravações.

## Exceções intencionais

- `BackupImportacao.jsx` acessa diretamente todas as chaves do contrato de backup para exportação e restauração fiel.
- `usuarios` permanece direto por pertencer à autenticação existente.
- `usuarioLogado`, `atividadeParaLocalizar`, `atividadeParaEditar` e `ultimoBackup` permanecem diretos por serem sessão ou estado transitório.

Regras operacionais, financeiras, patrimoniais e decisões de interface permanecem nos componentes e utilitários existentes. Novos consumidores de um domínio já migrado devem importar o repositório correspondente, sem informar chaves genéricas diretamente.
