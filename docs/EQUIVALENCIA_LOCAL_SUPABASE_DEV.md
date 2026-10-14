# Equivalência funcional Local legado → Supabase DEV

Data-base: 14/10/2026. Revisão 2. Código-base: d733c327a6082abe7166b1fc37f85a0ac9067d8f e alterações locais preservadas. Projeto de destino: ldamjmjcgjmujiougcrs, organização cd-locacoes.

Este documento é o acompanhamento obrigatório das próximas fases. Cada entrega deve atualizar as linhas afetadas com commit, migration, evidência de teste, data e limitações. Não marcar um módulo inteiro equivalente porque apenas sua tabela foi importada ou uma RPC passou em testes.

## Escopo e evidência

Revisão 1: análise estática dos componentes, repositórios, utilitários, SQL e testes existentes. Revisão 2: implementação e testes locais da camada de leitura e Agenda, conforme seção final. Sem consultas remotas, migrations ou escrita de dados nesta fase. As 884 atividades e os dois lançamentos fictícios são informação confirmada pelo responsável, não recontagem desta análise. Esses lançamentos devem ser preservados; não há autorização para excluí-los ou liberá-los.

Resultados anteriores: 624 testes offline aprovados, 167 testes SQL ignorados e build aprovado na publicação da ordenação. Há ensaios PostgreSQL anteriores de locação, ACL, cadastro e concorrência; não representam cobertura de operações remotas ainda inexistentes. Estados de migrations seguem verificações anteriores: 080001, 130001 e 130002 instaladas; 080002 pendente. Não houve nova auditoria do catálogo remoto nesta revisão.

Legenda: **E** equivalência do recorte descrito; **P** parcial; **L** consumidor ainda local; **N** operação remota não implementada; **D** decisão de arquitetura pendente. Mais de um estado é possível. E não significa equivalência integral do módulo.

## Diagnóstico

Atualização fase 1: Atividades e Agenda agora compartilham um serviço de leitura em memória; detalhes e limites abaixo. Dashboard permanece Local identificado.

O projeto tem dois caminhos de persistência. atividadeRepository e os demais repositórios tradicionais são síncronos sobre localStorage. criarAtividadeSupabaseRepository é assíncrono e agora atende AtividadesRemotas e AgendaRemota por um provider compartilhado. Trocar a fonte em Atividades não troca a fonte global do aplicativo. Agenda passou a oferecer fonte explícita Local ou Supabase DEV; Dashboard, relatórios e documentos continuam dependentes de dados do navegador.

O formulário foi compartilhado visualmente, mas a RPC atual é propositalmente restrita: somente agendamento individualizado de Instalação/Somente aluguel. Ela fixa liberação nula, iniciado falso, flags financeiras falsas e valores zero. A prévia comercial remota não equivale a valores contratados/congelados. Não se deve remover esses bloqueios antes de implementar o ciclo completo de liberação e seus consumidores.

O servidor 130002 reconcilia ocupação pelo histórico e usa locks em seis tabelas; não reserva patrimônio por agendamento. Novos fluxos de liberação, edição e patrimônio precisam participar da mesma disciplina de concorrência. Validação apenas no formulário seria insuficiente.

## Matriz de acompanhamento

| ID | Funcionalidade Local e regra existente | Estado DEV | Lacuna / critério para equivalência | Fonte principal |
|---|---|---|---|---|
| AUTH-01 | Login, sessão, logout e bloqueio por membership | E no recorte Auth | Teste contínuo de revogação/troca de usuário; não usar perfil local como autoridade | src/auth/authSession.js, AuthContext.jsx |
| AUTH-02 | Perfis e telas | P/D | Admin/Gestor no fluxo remoto; UI não oferece todos os fluxos Cliente/Funcionário. Definir matriz por operação, não copiar o antigo admin simulado | src/App.jsx, src/auth/authSession.js |
| AUTH-03 | Cadastro local de usuários | L/N | Usuarios.jsx não é tela ativa; não confundir lista local com administração Supabase Auth | src/components/Usuarios.jsx, App.jsx |
| CAD-01 | Listar/buscar construtoras e obras | P | Catálogo remoto básico no formulário; tela gerencial ainda local | ConstrutorasObras.jsx, formularioAtividadeRemoto.js |
| CAD-02 | Criar/editar/excluir construtora | L/N | Comando individual, conflitos, referências e exclusões com mesma proteção do Local | ConstrutorasObras.jsx, construtoraRepository.js |
| CAD-03 | Criar/editar/excluir obra e vínculo de construtora | L/N | Preservar IDs, vínculos históricos e bloqueios; não reconciliar nomes silenciosamente | ConstrutorasObras.jsx, obraRepository.js |
| CAD-04 | Endereços, CNPJ, contatos, telefone/WhatsApp | L/P | Tabelas podem conter importação; catálogo atual não carrega o conjunto necessário a telas/OS/contratos | ConstrutorasObras.jsx, site_contacts |
| COM-01 | Tabela padrão, por construtora e por obra | P/L | Leitura para prévia remota; tela de manutenção e gravação ainda locais | TabelaComercial.jsx, previaComercialRemota.js |
| COM-02 | Prioridade obra → construtora → padrão e fallback legado | P | Prévia reproduz prioridade sem ler fallback local; cobrir casos legados e ausência/ambiguidade sem inventar preço | FormularioAtividades.jsx, financeiroAtividades.js |
| COM-03 | Edição manual de valores e totais | L/N | Bloqueada no remoto; preservar mesmas condições e validação antes de habilitar | FormularioAtividades.jsx |
| COM-04 | Congelamento de valores e origem da tabela | L/N | Snapshot transacional na liberação, sem recálculo retroativo silencioso | montarValoresCongelados no formulário |
| PAT-01 | Cadastro mestre de patrimônio/tipo/situação | L/P | Catálogo remoto em leitura; criar/alterar/baixar ainda locais | ControlePatrimonios.jsx, equipamentosPatrimonio.js |
| PAT-02 | Inventário por categoria, obra, galpão, manutenção | L/P | Ocupação remota só no cadastro; tela de controle ainda local | ControlePatrimonios.jsx |
| PAT-03 | Patrimônio ocupado segundo histórico | E/P | Proteção no frontend/RPC de agendamento; falta integrar todos os escritores operacionais | disponibilidadeRemota.js, migration 130002 |
| PAT-04 | Informar patrimônio depois / provisório / pendências | L/N | RPC exige ID físico; falta ciclo servidor para unidade pendente e vínculo posterior sem perder origem | VincularPatrimonioModal.jsx, patrimoniosEquipamentos.js |
| PAT-05 | Trocar/desvincular número e manter identidade física | L/N | Vínculos e eventos importados não constituem comandos remotos | TrocaPatrimonioModal.jsx, vinculoPatrimonioRepository.js |
| PAT-06 | Substituição física e suas referências | L/N | Helper lê histórico; registrar substituição ainda não disponível remotamente | equipamentosPatrimonio.js, substituicaoEquipamentoRepository.js |
| PAT-07 | Ajustes de tamanho/ancoragem/contrapeso | L/N | Ler ajustes não equivale a cadastrá-los; preservar configuração histórica | ajustesConfiguracaoEquipamentos.js |
| PAT-08 | Histórico, reconciliação após salvar/editar/excluir | L/P | Servidor valida ocupação, mas não executa todo posProcessarPatrimonio do Local | reconciliacaoPatrimonial.js |
| PAT-09 | Exclusão segura do mestre | L/N | Local exige galpão e verifica uso; repetir atomicamente, sem cascata destrutiva | excluirEquipamentoPatrimonioSeguro |
| KIT-01 | Total de kits, ajustes de estoque, motivo/data | L/N | inventory/events existem como dependências; tela e ajuste continuam locais | controleKitContrapeso.js, ControlePatrimonios.jsx |
| KIT-02 | Entrada/saída de kits independente da base | L/P | Configuração de agendamento enviada; movimentação operacional remota ausente | locacaoFinanceira.js, counterweight_events |
| KIT-03 | Kit continua após remoção da base e recolhimento posterior | L/P | Reconstrução de relatório SQL preparada/instalada; falta ciclo de escrita e tela remota completa | locacaoFinanceira.js, RPC locação |
| AT-01 | Mesmo formulário, seletores e condições | E/P | Estrutura única; campos/ações remotos ainda limitados explicitamente | FormularioAtividades.jsx, CadastroAtividadeRemota.jsx |
| AT-02 | Listagem/busca/obra/paginação e ordenação | E no recorte | Snapshot completo, agendadas crescentes antes de liberadas decrescentes; empate estável | AtividadesRemotas.jsx, ordenacaoAtividadesRemotas.js |
| AT-03 | Instalação agendada com patrimônio conhecido | E no recorte | Admin/Gestor, UUID estável; não libera, cobra ou reserva | cadastroAgendadoRemoto.js, RPC cadastro |
| AT-04 | Somente aluguel agendado com patrimônio conhecido | E no recorte | Mesmas restrições; teste real entre dispositivos separado de cobertura unitária | RPC cadastro |
| AT-05 | Agendar sem reservar patrimônio | E no recorte atual | Agendamentos distintos do mesmo equipamento livre são permitidos; reserva não deve ser introduzida | migration 130002 |
| AT-06 | Agendar sem patrimônio identificado | N | Contrato de pendências é requisito de equivalência, não recurso a descartar | formularioAtividadeRemoto.js |
| AT-07 | Liberação / iniciado / data operacional | L/N | RPC atual rejeita liberação; implementar comando específico com efeitos integrais | CamposAgendamentoAtividade.jsx, formulário |
| AT-08 | Instalação e Somente aluguel liberados | L/N | Criar períodos, valores e histórico conforme flags e regra Local | regrasOperacao.js, locacaoFinanceira.js |
| AT-09 | Deslocamento (Balancinho) | L/N | Configurações antes/depois, origem individual; não reiniciar locação | formulário, regrasOperacao.js |
| AT-10 | Manutenção (Balancinho/Mini Grua) | L/N | Campos e eventual valor específico; não liberar base por inferência | regrasOperacao.js, financeiroAtividades.js |
| AT-11 | Remoção (ambos) | L/N | Encerramento inclusivo, quantidades e kit independente | locacaoFinanceira.js |
| AT-12 | Somente recolhimento (ambos) | L/N | Encerrar sem serviço faturável, tratar base/kit e legados | regrasOperacao.js, equipamentosAtivos.js |
| AT-13 | Ascensão (Mini Grua) | L/N | Preservar operação permitida e configurações, sem início comercial implícito | regrasOperacao.js |
| AT-14 | Quantidades e itens individuais / mini grua 500kg e 1T / elétrico e manual | P | Cadastro remoto individualizado básico; movimentações e legados completos faltam | prepararCadastroAgendado, unidadesEquipamentos.js |
| AT-15 | Editar agendada ou liberada | L/N/D | Mesma experiência; definir concorrência/versionamento e preservar efeito histórico sem inventar cancelamento | editar/salvar no formulário |
| AT-16 | Excluir atividade e reconciliar efeitos | L/N/D | Local remove e reconcilia coleção; remoto precisa recomposição transacional e autorização, não delete isolado | excluir/posProcessarPatrimonio |
| AT-17 | Falhas de rede, UUID, resultado incerto | P | Comando em memória, sem retry automático; falta consulta de status por UUID integrada e sobrevivência ao fechamento | cadastroAgendadoRemoto.js |
| AG-01 | Agenda semana/mês/dia e estados | P/E no calendário | Calendário original compartilhado com fonte explícita; HTML semanal equivalente testado, estados e datas preservados; homologação interativa mensal/iPhone pendente | Agenda.tsx, AgendaRemota.jsx |
| AG-02 | Exportação PDF da agenda | P | Mesmo exportador e DOM mensal recebem dados remotos; geração real de PDF/iPhone ainda não homologada | Agenda.tsx |
| DASH-01 | Recentes, agendados, pendências e indicadores | L | Mantido Local e identificado no App; tarefas e contexto financeiro/patrimonial completos não comprovados no leitor atual | Dashboard.jsx, App.jsx |
| DASH-02 | Faturamento mensal e contexto patrimonial | L | Precisa fontes comerciais e financeiras coerentes antes de declarar equivalência | Dashboard.jsx |
| OS-01 | Número automático da OS na liberação | L/N | Local calcula próximo por ano; remoto exige geração atômica preservando formato | utils/ordemServico.js |
| OS-02 | OS: descrição, materiais, OS campo, QR e assinatura | L/N | Componente existente; falta abrir via registro remoto e carregar dados completos | OrdemServico.jsx, OrdemServicoLayout.jsx |
| OS-03 | Exportar/compartilhar OS | L | Reutilizar PDF/imagem/compartilhamento e testar permissões/layout iOS | OrdemServico.jsx |
| CT-01 | Contratos Instalação/Somente aluguel, dados e condições | L/N | Mesmos templates; dados remotos completos e valores autorizados ausentes no fluxo | documentos/Contrato*.jsx, utils/contrato.js |
| CT-02 | Editar campos do documento e exportar PDF | L/D | Não pressupor que estado temporário do documento seja persistido no Local; decidir se precisa persistência só após inventário | documentos/Contrato.jsx |
| REL-01 | Relatório de serviços | L/P | Tela local; RPC Cliente existe, contrato restrito não substitui relatório gerencial financeiro | RelatorioServicos.jsx, relatorioServicos.js |
| REL-02 | Locações: períodos, identidades e saldos | L/P | RPC get_client_rental_report corrigida; tela gerencial ainda local e cálculo financeiro não é exposto pela RPC | RelatorioLocacao.jsx, locacaoFinanceira.js |
| REL-03 | Relatório financeiro por atividade/patrimônio | L | Serviços + locações, fallback e congelamento locais | RelatorioFinanceiro.jsx, patrimonioRelatorioFinanceiro.js |
| REL-04 | Equipamentos por obra e resumo por categoria | L | Deve usar o mesmo histórico remoto e ajustes/substituições | RelatorioEquipamentosObra.jsx |
| FIN-01 | Fechamento mensal por obra/construtora | L | Consolida serviços e períodos; não é prova de contas a receber/pagar | FechamentoMensal.jsx, fechamentoMensal.js |
| FIN-02 | Proporcionalidade, viradas e data inclusiva | P/L | Funções Local e SQL de períodos testadas; integração das telas e preços remotos faltante | locacaoFinanceira.js |
| TASK-01 | Tarefas, conclusão e responsáveis | L/N | tasks existe no schema, mas tarefaRepository grava lista local | ListaDeTarefas.jsx |
| CFG-01 | Peças/materiais para balancinho e ancoragem | L | Configurações e composição documental ainda locais | Configuracoes.jsx, pecasRepository.js |
| CFG-02 | Identidade da empresa/logo | L/D | Base compartilhada ou preferência local? Não mover assinatura/logo para Storage sem escopo e segurança | EmpresaHeader.jsx, empresaRepository.js |
| BK-01 | Exportar/restaurar backup JSON local | L/D | Importação atual substitui coleções locais; nunca conectá-la diretamente ao remoto | BackupImportacao.jsx, contratoDados.js |
| BK-02 | Backup PostgreSQL e restauração | P | Procedimento administrativo ensaiado; não corresponde ao botão de backup do usuário | evidências isoladas do CLI |
| SYNC-01 | Consulta PC/iPhone e refresh manual | E/P | Atividades e Agenda usam a mesma revisão em memória por sessão, refresh manual e sem persistência local; homologação real da Agenda entre dispositivos pendente | LeituraDevContext.jsx |
| SYNC-02 | Atualizações em tempo real / snapshots coerentes | P/D | Duas leituras completas iguais antes da publicação; mudanças observáveis rejeitadas. Sem Realtime ou garantia MVCC entre tabelas; RPC transacional futura só se exigida | leituraCompartilhadaDev.js |
| OFF-01 | Persistência local sem rede | L/P | localStorage persiste; Auth remoto pode bloquear telas sem revalidação; preservar dados não garante acesso offline | localStorageAdapter.js, authSession.js |
| OFF-02 | PWA/offline remoto, fila e reconciliação | N/D | Manifesto existe; não encontrado service worker/IndexedDB/outbox. Definir política, não presumir equivalência offline | public/manifest.webmanifest, main.jsx, vite.config.js |
| SEC-01 | RLS, ACL, organização e perfil no servidor | P | Já coberto nas RPCs existentes; cada novo comando precisa repetir autorização e isolamento | migrations 00400/00600/080001/130001/130002 |
| SEC-02 | Views de Funcionário | N/P | 080002 pendente; erro 42501 conhecido. Aplicação exige autorização própria e revisão da necessidade | migration 080002 |
| SEC-03 | Diagnóstico técnico | P | Leitura segura, sem teste INSERT na UI; ferramenta de diagnóstico não equivale a integração operacional | DiagnosticoSupabase.jsx |

## Regras identificadas que devem ser preservadas

1. Formulário e regras de operação: Instalação e Somente aluguel iniciam locação quando liberadas; Remoção e Somente recolhimento encerram. Deslocamento é permitido para Balancinho; Ascensão para Mini Grua; Manutenção e demais operações conforme regrasOperacao.js. Flags explícitas têm precedência nos consumidores que as suportam; não substituir registros legados indiscriminadamente.
2. Não existe operação comercial independente de transferência. Remoção A e instalação B na mesma data são independentes; o dia de saída é inclusivo e pode integrar as duas obras. Cada entrada usa condições da respectiva obra. Substituição física não muda automaticamente a obra comercial.
3. locacaoFinanceira.js separa base e contrapeso, entradas/saídas individuais e registros legados. O cálculo proporcional usa mensal integral quando mesCompleto, caso contrário mensal × dias/30; não trocar o divisor por dias do mês. Calendário e limites determinam dias inclusivos. Não consolidar duas instalações apenas pelo mesmo patrimônio.
4. Tabela comercial: obra, depois construtora, depois padrão; fallback legado permanece onde o consumidor já o usa. Valores congelados prevalecem nas funções financeiras pertinentes. A prévia DEV não é snapshot contratual.
5. Manutenção é faturável em financeiroAtividades.js quando o valor efetivo é positivo; Somente aluguel e Somente recolhimento não geram serviço faturável. Não uniformizar essas exceções por conveniência de SQL.
6. Local lista agendadas por data crescente antes de liberadas decrescentes. Agenda usa data de liberação ou agendamento. São critérios diferentes, não um único sort global de criação.
7. OS local: formato OS + ano de dois dígitos + mês + sequência de quatro dígitos; maior sequência procurada nas OS do mesmo ano, não reiniciada a cada mês pelo algoritmo atual. Conservar esse comportamento e impedir duas sequências iguais entre dispositivos.
8. Exclusão de equipamento mestre exige situação de galpão e verificações de histórico. Exclusão de atividade local remove registro e recalcula patrimônio. Não introduzir cascata remota que apague histórico associado.

## Arquitetura proposta, sem implementação

Preservar componentes e utilitários; introduzir uma camada explícita de fonte operacional por sessão/organização, usada por todos os módulos. Componentes assíncronos recebem snapshot remoto adaptado ao mesmo modelo de domínio, com estados de carregamento/erro. Não substituir métodos síncronos listar/salvarTodos por chamadas remotas de mesmo nome: isso mascararia contratos e facilitaria sobrescrita de coleções.

Extrair gradualmente funções puras que hoje dependem implicitamente de getters locais. Passar atividades, tabelas, vínculos, ajustes e substituições explicitamente. Os caminhos remotos não podem usar getters locais opcionais nem fallback silencioso quando rede falhar. Manter o ramo legado intacto até homologação e cutover autorizado.

Reutilizar regras puras JS para UI, documentos e cálculos gerenciais. No servidor, validar invariantes transacionais, permissões, referências, disponibilidade, versões e idempotência. Não é seguro delegar validação financeira/patrimonial exclusivamente ao JS enviado pelo navegador. Quando uma regra precisar existir em SQL, tratá-la como tradução controlada, com fixtures e comparação diferencial contra o JS, não como nova regra independente.

Comandos por intenção: agendar, vincular pendência, liberar, editar e excluir, e comandos patrimoniais/comerciais específicos. Cada comando deve atualizar apenas o agregado envolvido e seus efeitos necessários em uma transação. UUID de comando e controle otimista da versão evitam duplicidade e perda de alteração. Timestamp sozinho precisa de contrato de comparação preciso; preferir versão explícita se ausência no schema exigir migration. Não enviar coleções completas nem confiar em source enviado pelo cliente como autorização.

Revisar a ocupação única por identidade física e intervalo, incluindo legados pendentes: uma restrição simples de número de patrimônio ou estado administrativo não basta. Reutilizar inicialmente os locks existentes; reduzir granularidade somente quando todos os escritores aderirem ao mesmo protocolo e testes reais de concorrência provarem equivalência. Mesma data em duas obras não é automaticamente conflito: a ocupação precisa respeitar fechamento e reinício permitidos pelas regras confirmadas.

Para leitura consistente, validar se o volume atual permite snapshot transacional via RPC tipada/paginação com versão de leitura, ou cache invalidado por revisão. Hoje múltiplas chamadas não são um snapshot SQL único. Realtime é opção posterior de invalidação; não substitui verificação no servidor nem deve ser pré-requisito para a equivalência com atualização manual.

## Plano de implementação por dependências

### Fase 1 — Fonte operacional de leitura única e contratos de paridade

Entregar snapshot remoto tipado completo, preservando fonte Local explícita. Integrar primeiro Agenda e partes operacionais do Dashboard, junto dos catálogos e detalhes necessários à leitura. Não habilitar novas escritas/liberação. Inventariar todos os campos com mapeamento, tipo, nulidade, ID e consumidor; incluir vazio versus null, datas sem fuso, origem e itens pendentes. Definir interface das operações futuras e congelar exemplos do comportamento Local como oracle.

Arquivos: atividadeSupabaseRepository.js, atividadeRepository.js e repositórios de obra/construtora; Agenda.tsx, Dashboard.jsx, utils/pendenciasOperacionais.js e equipamentosAtivos.js. Tabelas: activities/items, constructors/sites/contacts, physical_equipment, bindings, adjustments, substitutions, commercial_tables; tasks só para indicadores de tarefas, sem misturar sua fonte. Dashboard financeiro só muda quando tiver snapshot comercial/financeiro completo e comparado; até lá sua dependência local deve permanecer explicitamente identificada, sem total misto.

Migrations: nenhuma obrigatória para adaptação de leitura se RLS/colunas existentes bastarem; possível RPC de snapshot consistente, sob proposta e revisão. Não aplicar 080002 por conveniência para Admin/Gestor.

Testes: paginação com mudança concorrente, nulos/vazios, IDs legados/UUID, ausência de rede sem fallback, organização/perfil, agendadas sem ocupação, dois dispositivos, filtros e navegação por UUID, mesmas agendas e indicadores operacionais para a mesma fixture. Aceite: lista, agenda e pendências mostram a mesma revisão e os dois lançamentos DEV; nenhuma escrita ou modificação de layout/regra.

Risco/rollback: fonte parcial pode misturar dados. Ativar por módulo e fonte explícita; voltar para leitura anterior por configuração sem copiar remoto para local ou apagar dados. Dependência: fornece contexto coerente para todo comando posterior.

### Fase 2 — Cadastros mestres, condições comerciais e parâmetros compartilhados

Entregar leitura/edição remotas de construtoras, obras, contatos, tabela padrão/escopos e cadastro físico, parâmetros de materiais/empresa conforme decisão de persistência. Reutilizar formulários atuais. Não reimportar as coleções existentes.

Arquivos: ConstrutorasObras.jsx, ControlePatrimonios.jsx, TabelaComercial.jsx, Configuracoes.jsx e respectivos repositórios/utilitários. Tabelas: constructors, construction_sites, site_contacts, commercial_tables, physical_equipment, equipment_admin_events, organization_settings, além de eventual armazenamento autorizado de recursos binários.

Migrations: RPCs de gravação individual e controle de versão/referências; adicionar só colunas/constraints que o inventário demonstrar ausentes. Preservar histórico 00500 e vínculos explícitos; não modificar migrations instaladas.

Testes: CRUD permitido/negado por perfil, órfãos, duplicidades e nomes iguais, obra com atividade existente, versão concorrente de tabela, edição por dois dispositivos, vínculo histórico divergente bloqueado, exclusão segura. Aceite: mesmos campos e preços por escopo, conflitos não sobrescrevem, IDs existentes preservados.

Risco/rollback: alterações de cadastros podem afetar períodos anteriores. Reversão da versão do código não desfaz dados; manter auditoria e recuperação pontual autorizada. Dependência: fornece referências e preços confiáveis à liberação.

### Fase 3 — Ciclo de agendamento completo e patrimônio pendente

Entregar todas as opções de agendamento existentes no Local, itens de origem/identidades, Informar patrimônio depois, vínculo posterior e edição/exclusão de agendadas sem efeito operacional. Usar o mesmo formulário, sem novo cadastro paralelo. Expor consulta de status por UUID e erro conhecido seguro; preservar tentativa em caso incerto.

Arquivos: formularioAtividadeRemoto.js, cadastroAgendadoRemoto.js, FormularioAtividades.jsx, VincularPatrimonioModal.jsx, TrocaPatrimonioModal.jsx. Tabelas: activities/items, bindings e eventos de auditoria pertinentes. Migrations: novas RPCs/contratos incrementais para pendência, vínculo e edição com versão; não afrouxar a RPC atual para aceitar identidade inventada.

Testes: todos os sete serviços e combinações permitidas, quantidade individual/legado, pendência resolvida/não resolvida, UUID idempotente, versão conflitante, comandos simultâneos, erro de rede e timeout após COMMIT, ausência de reserva/cobrança. Aceite: todos os agendamentos do Local persistem seus campos sem perdas e não mudam disponibilidade ou relatórios faturáveis.

Risco/rollback: perder origem impede remoções e relatórios posteriores. Bloquear operação incompatível até contrato completo; voltar UI à versão anterior sem desfazer comandos confirmados. Dependência: prepara liberação sem simplificar operações de origem.

### Fase 4 — Liberação operacional e razão patrimonial/financeira atômica

Entregar liberação de Instalação/Somente aluguel, Deslocamento/Manutenção/Ascensão, Remoção/Recolhimento, kits independentes, substituições, ajustes e edição/exclusão de liberadas com os efeitos do Local. Pode ser dividida em incrementos pequenos, mas não declarar ciclo completo até fechar entrada e saída de base e kit.

Arquivos: formulário, ControlePatrimonios e modais; regrasOperacao.js, reconciliacaoPatrimonial.js, equipamentosAtivos.js, locacaoFinanceira.js, financeiroAtividades.js, ordemServico.js. Tabelas: activities/items, physical_equipment, bindings, adjustments, substitutions, patrimony_events, equipment_admin_events, counterweight_inventory/events, commercial_tables e ledger de comandos/auditoria se necessário.

Migrations: comandos operacionais transacionais, snapshots financeiros, número OS atômico, versionamento e integridade dos eventos. Sem reescrever 080001 ou 130002; preservar relatórios/ACL. Direitos de edição/exclusão devem ser decididos antes do SQL se não estiverem formalizados por perfil.

Testes: concorrência entre liberar, editar, excluir, substituir e cadastrar; dois dispositivos com mesmo patrimônio; fechamento e reinstalação no mesmo dia; saídas inclusivas; vários itens e obras; ajuste retroativo; liberação repetida não cria segundo evento/OS/cobrança; kits permanecem e são recolhidos depois; falha entre efeitos provoca rollback completo. Aceite: mesmas atividades, estoque, pendências, valores congelados e períodos do oracle Local, sem dupla cobrança e sem reserva antecipada.

Risco/rollback: fase de maior impacto. Backup validado antes de cada implantação; captura das definições e contratos; janela controlada e verificação de invariantes. Falha antes de COMMIT é atômica; depois de COMMIT não apagar eventos nem compensar sem plano específico. Dependência: libera documentos e relatórios completos.

### Fase 5 — OS, contratos, relatórios e fechamento com fonte remota

Entregar os mesmos documentos, materiais, QR, assinatura, PDF/imagem/compartilhamento, relatórios de serviços/locação/equipamentos/financeiro, Dashboard financeiro e fechamento mensal. Reutilizar templates e funções; não tratar RPC Cliente sem valores como relatório financeiro gerencial.

Arquivos: OrdemServico*.jsx, documentos/Contrato*.jsx, Relatorio*.jsx, FechamentoMensal.jsx, Dashboard.jsx e utilitários respectivos. Tabelas: snapshot completo anterior, settings/contatos e valores congelados. Migrations: apenas endpoints de leitura/gravação documental realmente ausentes; eventual persistência de assinatura/arquivo exige escopo, ACL e política de armazenamento, pois o estado visual local não comprova persistência documental.

Testes: comparação diferencial de períodos, saldos anteriores/entradas/saídas/finais e totais, mês completo versus dias/30, fevereiro/bissexto e viradas de ano, patrimônio substituído, kit independente, filtros e IDs estáveis, manutenção faturável e valores congelados. Testar PDF/layout e compartilhamento real no iPhone e PC. Aceite: mesmo resultado para mesmo snapshot; divergências de arredondamento e calendário resolvidas por evidência do código, sem regra nova.

Risco/rollback: recálculo silencioso de histórico ou vazamento financeiro. Manter acesso gerencial distinto do contrato Cliente e comparar em leitura antes de trocar a fonte; reverter adaptador de leitura sem mudar dados. Dependência: prova end-to-end de operação e cobrança.

### Fase 6 — Tarefas, perfis, preferências e administração restantes

Entregar tarefas e os demais parâmetros compartilhados faltantes, experiência dos perfis autorizados e ferramentas de backup/importação compatíveis com a fonte. Arquivos: ListaDeTarefas, EmpresaHeader, Configuracoes, BackupImportacao, Auth/App. Tabelas: tasks, organization_settings, memberships e acesso de clientes; objetos de Auth administrados por mecanismo autorizado, nunca por service_role no frontend.

Migrations: RPCs/ACL para operações realmente necessárias; 080002 somente após autorização e testes específicos, não embutida noutra instalação. Testes de todos os perfis, organizações, isolamento de preferências, permissões de exportação e importação, ausência de sobrescrita global. Aceite: nenhuma tela operacional usa fonte local silenciosamente. Backup JSON continua explicitamente local até existir importação remota segura, sem reaplicar os 882 registros iniciais.

Risco/rollback: escalada de privilégio e restauração destrutiva. Autorizações específicas para admin de usuários/restauração; revogar endpoint novo com procedimento aprovado, sem alterar memberships existentes por conveniência. Dependência: cobertura total dos módulos antes do cutover definitivo.

### Fase 7 — Offline, conflitos e cutover definitivo

Offline é decisão prévia a ser tomada agora, ainda que implementação venha depois. Definir dados permitidos no dispositivo, comportamento com sessão expirada, comandos aceitos sem rede e regras de conflito. Não prometer liberação offline globalmente exclusiva quando dois dispositivos desconectados não podem coordenar o mesmo patrimônio.

Se autorizado, implementar cache por organização/usuário e outbox durável (por exemplo IndexedDB), com UUID, versão-base, estado confirmado/pendente/incerto e resolução explícita. Sem retry cego de operações não idempotentes; servidor é autoridade e valida disponibilidade no momento da confirmação. Realtime pode invalidar cache; não resolve conflitos offline.

Arquivos: camada de fonte/sincronização, Auth, infraestrutura PWA e repositórios; tabelas de revisão/comandos/auditoria se necessárias. Migrations: só após contrato de sincronização aprovado. Testes: perda antes/depois do COMMIT, app fechado, múltiplas abas, troca de usuário, cache isolado, reenvio dias depois, patrimônio ocupado enquanto offline, concorrência e falha parcial. Aceite: nenhum falso sucesso, dupla cobrança, perda silenciosa ou exposição de cache de outro usuário.

Cutover: inventário por dispositivo, comparação com remoto e decisão de mesclagem dos registros locais posteriores à importação; nunca upload automático de coleções. Preservar backup local e remoto, homologar módulo a módulo, remover dependências locais apenas em fase autorizada posterior. Rollback muda a fonte de forma explícita; não volta a escrever simultaneamente em duas fontes. Dependência: homologação final por dispositivo e perfil, sem exclusão dos fictícios nesta análise.

## Riscos e decisões para aprovação

| Risco | Evidência atual | Decisão / mitigação necessária |
|---|---|---|
| Dados divergentes entre módulos | Agenda/Dashboard/relatórios locais enquanto lista é remota | Fonte explícita e snapshot compartilhado, fase 1 |
| Sobrescrita de terceiros | salvarTodos substitui coleção no Local | Nunca mapear esse método para remoto; comandos individuais com versão |
| Dupla cobrança | Liberação/retry/reconciliação ainda sem contrato remoto completo | Efeitos únicos por comando; snapshots e períodos comparados; inclusão de kits |
| Dupla ocupação | Estado administrativo pode divergir do histórico | Validação histórica transacional em todos os escritores, não só RPC cadastro |
| Perda de vínculos | IDs legado, números, vazio/null e origem individual | Contrato tipado, IDs preservados; regressão do erro 23503 já corrigido |
| Mistura comercial | Prévia versus valores congelados | Separar exibição de compromisso financeiro; autorizar gravação só no ciclo operacional |
| Migração silenciosa de navegador | Dados locais preservados e ainda editáveis | Inventário por dispositivo antes do cutover; nenhum sincronizador automático |
| Offline conflitante | Sem outbox e autenticação depende de rede | Definir leitura/draft/confirmar online versus comando offline com conflito explícito |
| Locks e desempenho | 130002 serializa seis tabelas | Medir, limitar espera e testar concorrência antes de reduzir locks |
| Privilégios ampliados | RPCs definer e perfis incompletos | RLS+ACL+membership no servidor, helpers privados, testes por organização |
| Serviços gerenciados | Restauração app testada com ressalva Vault | Backup app não é recuperação integral de plataforma; plano de recuperação específico |

Perguntas que exigem decisão, apoiadas no código:

- Quais perfis devem poder editar/excluir atividade liberada, corrigir patrimônio e alterar tabela comercial? O Local antigo tinha admin simulado e não define autoridade segura multiusuário; não inventar matriz pela mera visibilidade dos botões.
- Precisa confirmar operações operacionais sem rede ou basta guardar rascunho e confirmar online? A segunda opção preserva exclusividade global mais facilmente, mas não deve ser adotada sem decisão sobre o requisito offline.
- Documentos gerados e assinaturas devem ser persistidos e compartilhados ou continuar como estado/exportação do componente, como ocorre hoje? Não adicionar arquivo remoto automaticamente.
- Qual é o inventário de alterações locais posteriores ao lote inicial em cada dispositivo? O código não permite concluir que tudo já está no remoto; os dois fictícios não resolvem a conciliação dos demais registros.

Não exigem pergunta de regra: instalação/saída inclusiva, duas obras no mesmo dia, kits independentes, ausência de reserva no agendamento, preços por obra e ausência de transferência comercial já estão definidos e devem ser preservados.

## Primeira entrega recomendada

Executar somente a fase 1 como próximo escopo: fonte remota explícita, contrato completo de leitura e integração de Agenda + indicadores operacionais do Dashboard. Antes de liberar qualquer atividade, concluir as dependências de cadastro/comercial, pendências e comandos atômicos. Assim se corrige a base compartilhada que todos os módulos usarão, em vez de habilitar botões isolados que produzem dados incompletos.

## Registro de atualização

| Revisão | Estado | Evidência | Próxima ação |
|---|---|---|---|
| 1 — 14/10/2026 | Inventário estático e plano; sem implantação | Código/SQL/testes existentes; 884 registros informados pelo responsável | Aprovar fase 1 e decisões de perfis/offline/documentos/cutover |
| 2 — 14/10/2026 | Camada compartilhada + Agenda implementadas localmente; Dashboard Local explícito | 645 testes aprovados, 167 SQL ignorados; homologação no PC informada pelo responsável; iPhone pendente | Homologar iPhone/PDF e comprovar contratos restantes do Dashboard |

Na revisão 1 somente este documento foi criado; implementação local da revisão 2 descrita abaixo. Nenhuma migration ou registro remoto alterado. Sem commit, push ou deploy.

## Revisão 2 — Fase 1: camada de leitura e Agenda

Implementado localmente em 14/10/2026, sem implantação:

- Serviço leituraCompartilhadaDev.js sobre o repositório Supabase existente, com snapshot compartilhado em memória, revisão e horário; sem acesso a localStorage ou escrita de banco.
- Provider LeituraDevContext.jsx integrado sob AuthProvider. AtividadesRemotas e AgendaRemota usam o mesmo serviço/revisão. Consultas em andamento são canceladas/descartadas ao trocar identidade; logout, organização/perfil inválidos e inatividade retiram o snapshot. Cada carregamento mantém a revalidação de Auth/membership do repositório.
- Leitura em duas passagens completas e comparação antes de publicar. Paginação de 884 atividades validada duas vezes; alteração concorrente observada rejeita a publicação. Não há snapshot transacional entre requisições HTTP: duas passagens iguais não provam ausência de toda alteração intermediária/ABA ou mudança imediatamente posterior. Essa garantia estrita depende de proposta futura de RPC de leitura, não implementada nesta fase.
- AgendaConteudo é o calendário original: semana/mês, navegação, status, nomes, datas e exportador PDF preservados. O ramo Local chama exatamente os repositórios anteriores; o remoto recebe dados explícitos e não usa getters locais. Só foram acrescentados seletor de fonte e avisos de leitura. Nenhuma edição, liberação, exclusão ou movimento remoto habilitado.
- Datas inválidas/ausentes e catálogos incompletos geram avisos; o calendário mantém o tratamento original, sem inventar datas, obras, preços ou status. Atividades sem data válida não têm posicionamento confiável. Nomes históricos remotos são o único fallback permitido para o catálogo de obras.
- Ordem dentro do dia continua sendo a ordem recebida pela Agenda, pois o Local não aplica sort no calendário; origem remota é ordenada por ID para paginação. Não é possível recuperar uma ordem de inserção específica do array de outro navegador sem metadados correspondentes. A ordenação própria da tela de Atividades continua preservada.
- Dashboard não foi integrado. Ele exige tarefas, fallbacks valoresServicos/valoresPadrao, tabela padrão, detalhes de obras, dados patrimoniais e funções de faturamento/pendências. O catálogo atual fornece nomes/IDs e prévia comercial, não comprova todos esses contratos. Continua integralmente Local com aviso explícito; não se fabricaram indicadores zerados nem totais mistos.

### Arquivos da revisão 2

Alterados: src/main.jsx, src/App.jsx (avisos de fonte), src/components/Agenda.tsx, src/components/AtividadesRemotas.jsx, src/repositories/__tests__/atividadeSupabaseRepository.test.js, este documento.

Criados: src/data/LeituraDevContext.jsx; src/repositories/leituraCompartilhadaDev.js; src/components/AgendaRemota.jsx; src/repositories/__tests__/leituraCompartilhadaDev.test.js; src/repositories/__tests__/agendaCompartilhada.test.jsx.

Não alterados nesta fase: Dashboard.jsx, formulários de cadastro, RPCs/migrations, repositórios locais, banco remoto, demais alterações locais pendentes.

### Evidência e aceite

Suíte npm test -- --threads=false: 645 aprovados, 167 SQL ignorados, zero reprovados na primeira execução completa. Inclui equivalência de HTML do calendário semanal com os mesmos dados, datas de agendamento/liberação e três estados, ausência de getters locais no remoto, erro/negação sem calendário falso, revisão compartilhada, trocas de usuário, logout, última consulta vence, rede sem fallback, paginação 884 registros e rejeição de mudança concorrente. Execução final: os mesmos 645 testes aprovados, 167 SQL ignorados e zero reprovados; npm run build e git diff --check aprovados. Build em pasta temporária, sem publicação; avisos existentes de Browserslist/bundle.

Não houve nova conexão Supabase, testes reais de RLS PostgreSQL ou execução no iPhone nesta fase. Testes de permissões atuais são simulados; a segurança SQL depende das RPCs/RLS já instaladas e ensaiadas anteriormente. Homologação visual no computador confirmada pelo responsável antes deste commit: ACR / Marina em 13/10/2026 e ACR / Gran Tower em 14/10/2026, com calendário original preservado. Essa evidência foi fornecida pelo responsável; não houve consulta remota pelo executor. Homologação no iPhone e exportação PDF real continuam pendentes.

Parecer do recorte: APTO para homologação local da camada de leitura e Agenda; fase 1 completa permanece parcial porque Dashboard e snapshot transacional estrito não foram entregues. Não é necessária mudança de banco para o recorte implementado.

Próximo passo: conferir Agenda Local versus DEV com os mesmos dados, semana/mês e PDF no navegador; depois homologar iPhone/PC sob autorização de publicação. Para Dashboard, inventariar e comprovar tasks, parâmetros financeiros, metadados comerciais e contexto patrimonial antes de qualquer adaptação. Se for exigida leitura SQL atomicamente consistente, propor RPC somente leitura e testes de concorrência antes de sua implementação, sem afrouxar guards.
