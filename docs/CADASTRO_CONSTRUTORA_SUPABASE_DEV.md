# Cadastro de construtora no formulário compartilhado — Fase 2.2

Implementação local de 14/10/2026. **APTO para solicitar/realizar o primeiro teste controlado após autorização específica de cadastro real**, em navegador compatível e sessão Admin DEV. Nenhum cadastro remoto, consulta remota, migration, commit, push ou deploy foi executado nesta implementação. A instalação da 140001 é contexto previamente confirmado, não foi reexecutada. 080002 permanece fora do escopo.

## Fluxo implementado

ConstrutorasObrasLocal continua como apresentação única. Sem dadosRemotos, usa exatamente os repositórios Local, ID numérico e cópia comercial Local anteriores. Com dadosRemotos, um adaptador explícito permite somente Nova Construtora/Salvar nova. Todos os campos e validação obrigatória do nome são os mesmos do formulário original. Contatos de obras, tabelas comerciais, edição, exclusão, criação de obras e ações operacionais continuam bloqueados/inalterados no DEV. A tabela inicial é copiada transacionalmente pela RPC a partir do DEFAULT remoto, sem usar preços ou coleções Local como fallback.

construtoraSupabaseRepository cria um controlador com callbacks de Auth real, leitura compartilhada e armazenamento mínimo. Confere endpoint DEV, sessão não expirada, organização cd-locacoes, membership ativa e perfil Admin. A RPC permite Gestor por contrato do servidor, mas a interface/controlador desta tela não ampliam o acesso: permanecem Admin.

Ao montar a tela, apenas consulta eventual recibo pendente após Auth válido. Para nova intenção, gera UUID criptográfico uma vez, normaliza o comando com o preparador existente e preserva os metadados antes de chamar create_dev_constructor(jsonb). Não faz INSERT/UPDATE/upsert direto nem grava a construtora no localStorage. Trava síncrona busy impede duplo clique, inclusive antes do primeiro await. Web Locks protege a preservação entre abas; o servidor protege reenvios simultâneos do mesmo UUID.

Confirma organization_id/id/commercial_table_id/created na resposta e consulta o recibo mínimo get_dev_constructor_creation_receipt(uuid). Só declara sucesso após recibo CONCLUIDA. Reconhece a conclusão e atualiza a leitura compartilhada com preservarSnapshot:true; a lista permanece na fonte Supabase. Falha de atualização depois de confirmar cadastro é informada como lista pendente, sem sugerir novo cadastro.

O timeout do transporte é 15 segundos e não cancela a transação do servidor. Erro, timeout ou resposta incompatível preservam UUID/fingerprint e dados preenchidos, sem sucesso falso e sem fallback Local. O formulário permanece aberto na falha. Conferir tentativa usa apenas leitura. Se o recibo aparecer depois, confirma e atualiza lista sem reenviar. AUSENTE exige reentrada do conteúdo original e consulta get_dev_constructor_creation_status(jsonb) antes de um reenvio manual com o mesmo UUID. Payload diferente bloqueia. Não há reenvio automático.

Metadados no navegador continuam sendo apenas versão/project_ref/organização/user UUID/tentativa UUID/instante/fingerprint, sem formulário/preços/token/senha. Reconhecimento seguro é necessário para removê-los; se falhar, a conclusão permanece identificada e nova gravação bloqueada. Troca de sessão/organização/fonte invalida o controlador e descarta respostas antigas. O contexto compartilhado impede mostrar catálogo da identidade anterior. Durante atualização manual com snapshot preservado, o painel é ocultado e mantido montado para não descartar o rascunho em memória.

## Navegadores sem Web Locks

Sem Web Locks ou Web Crypto, a tela mostra aviso e bloqueia a criação/Salvar. Não troca silenciosamente para Local, não usa lock por localStorage vulnerável a corrida e não gera outra tentativa. Consulta de recibo existente ainda pode comprovar conclusão; metadados ficam preservados e nova escrita bloqueada se não puderem ser reconhecidos com segurança. Homologar suporte real no PC/iPhone; em HTTP de rede local as APIs de contexto seguro podem estar indisponíveis. Não desativar proteções para contornar isso.

## Validação e arquivos

Arquivos funcionais: src/components/ConstrutorasObras.jsx; src/components/ConstrutorasObrasRemotas.jsx; src/repositories/construtoraSupabaseRepository.js; src/repositories/recuperacaoConstrutoraRemota.js (acesso somente leitura ao UUID preservado).

Testes novos: construtoraSupabaseRepository.test.js (17 cenários) e cadastroConstrutoraFormulario.test.jsx (seis cenários de handlers reais do formulário). cadastrosRemotos.test.jsx atualizado para o adaptador explícito e painel oculto durante refresh, mantendo testes de isolamento. Regressões existentes de apresentação compartilhada e 26 testes de recuperação preservados.

Suíte geral: 759 aprovados, zero reprovados, 219 PostgreSQL ignorados por desenho do comando normal. Não foram reexecutados testes PostgreSQL ou banco remoto: SQL não mudou, e nenhuma segurança real remota foi declarada validada por esses mocks. Build aprovado, com avisos anteriores de bundle/Browserslist/imports. Diff --check aprovado. As primeiras seis falhas do teste de handlers eram captura do runtime JSX automático; ajustado o teste, todos passaram. Um teste antigo proibia qualquer referência a localStorage/Repository no wrapper; foi atualizado para proibir os repositórios Local, permitindo somente os metadados de recuperação aprovados.

## Conferência visual no PC — sem gravar nesta etapa

1. Executar npm run dev e abrir o endereço localhost informado pelo Vite. Usar o ambiente DEV já configurado e login Admin real; não alterar variáveis de Produção.
2. Abrir Construtoras/Obras e selecionar Supabase DEV. Em Gestão, conferir Nova Construtora e o aviso da fonte. A consulta inicial deve concluir antes de habilitar Salvar.
3. Abrir Nova Construtora: conferir mesmos campos/grades do Local, ativa inicialmente marcada, nome obrigatório, dados comerciais não editáveis e ações de obras/editar/excluir bloqueadas. Nesta etapa, não clicar Salvar com dados reais/fictícios: esse botão já chama a RPC real.
4. Voltar ao Local e conferir visual/formulário anteriores. Não testar gravações Local com dados reais durante a conferência.
5. Depois de autorização para o primeiro cadastro DEV, usar uma intenção fictícia claramente identificada. Esperar confirmação e atualização da lista antes de trocar de dispositivo. Conferir via leitura um novo UUID, uma cópia comercial e um recibo, sem mudanças em obras/atividades. Baseline esperado se nenhuma outra operação ocorrer: 25 construtoras, 35 obras, 884 atividades, 61 tabelas comerciais. No segundo dispositivo, atualizar manualmente a fonte DEV.
6. Em erro/timeout, não iniciar outro cadastro nem limpar dados do navegador; usar Conferir tentativa. Depois de reabrir, não se espera reconstrução automática do formulário (não é persistido): a tentativa é reconhecida por recibo ou exige reentrada idêntica para reenvio. Se houver conflito/integridade divergente/metadados antigos, solicitar auditoria.

## Pendências

Homologação visual local, primeiro JWT/PostgREST real com gravação autorizada e conferência de PC/iPhone ainda não ocorreram nesta etapa. Metadados são locais ao navegador; limpar armazenamento ou usar outro dispositivo não recupera automaticamente a intenção. Nomes/CNPJs iguais em UUIDs diferentes continuam permitidos como no Local; não iniciar outra intenção para contornar incerteza. RPC/ACL/RLS seguem sendo a autoridade final, independentemente dos bloqueios frontend. Edição/exclusão e cadastro de obras não foram habilitados.
