# Estrutura Supabase — Fase 2

Esta pasta contém somente a proposta inicial de schema para revisão. A migration não foi executada e o aplicativo continua usando exclusivamente o `localStorage`.

## O que a migration cria

- Isolamento multiempresa por `organization_id`.
- Cadastros de construtoras, obras, contatos e configurações da organização.
- Tabelas comerciais em JSONB, preservando chaves dinâmicas.
- Atividades e itens individualizados sem obrigar atividades legadas a terem itens.
- Cadastro mestre, vínculos e históricos patrimoniais separados.
- Ajustes de configuração, substituições e eventos administrativos.
- Estoque e eventos de Kits Contrapeso.
- Tarefas e controle auditável para uma futura importação idempotente.

Todos os IDs vindos do aplicativo são `TEXT`. As entidades usam a organização junto ao ID original como chave. Campos como `idItemOrigem`, identidades `legado:*` e `patrimonio:*` são opacos e não recebem FK obrigatória.

Entidades importáveis mantêm colunas úteis para consulta e `raw_payload JSONB` como rede de segurança. `valoresCongelados` permanece integral em `activities.frozen_values`; tabelas e fallbacks comerciais também permanecem JSONB.

A precedência continua sendo responsabilidade da aplicação: valor congelado da atividade, tabela da obra, tabela da construtora, tabela padrão e, quando aplicável, `valoresServicos`/`valoresPadrao`. O schema não recalcula nem escolhe preços. Datas históricas do aplicativo permanecem em colunas `TEXT`; os campos `created_at`, `updated_at` e `imported_at` descrevem somente o ciclo da linha no banco.

## Segurança

RLS é habilitado em todas as tabelas, mas nenhuma política é criada. Sem políticas, os papéis `anon` e `authenticated` não têm acesso às linhas. Políticas por organização dependem da futura adoção de Supabase Auth e de uma associação explícita entre usuário e organização. Uma futura importação administrativa deverá ocorrer em ambiente confiável; `service_role` nunca deve ir para o frontend.

## O que não é criado

- Conexão do aplicativo ou credenciais.
- Dados reais ou organização inicial.
- Usuários ou substituição do login atual por Supabase Auth.
- Importador, sincronização, outbox ou `processed_mutations`.
- Realtime/publicação.
- Tabelas materializadas para Dashboard, relatórios, fechamento ou períodos financeiros.

`processed_mutations` fica para a fase que introduzir escrita offline/outbox, quando o formato da mutação e a chave de idempotência estiverem definidos. Realtime também fica pendente; candidatas ao piloto futuro são `activities`, `activity_equipment_items`, `tasks`, `construction_sites`, `constructors`, `commercial_tables`, `physical_equipment`, `unit_patrimony_bindings` e `equipment_config_adjustments`.

## Antes de executar

Revisar a migration no projeto Supabase de desenvolvimento, confirmar o identificador da organização inicial e definir o processo confiável de importação. Depois, validar as políticas de Auth/RLS antes de qualquer leitura pelo frontend.
