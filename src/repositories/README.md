# Repositórios locais

Esta camada centraliza o acesso ao `localStorage` sem alterar o formato dos dados. Nesta fase, `atividades`, `construtoras`, `obras` e `tarefas` continuam sendo armazenadas exclusivamente nas mesmas chaves locais já usadas pelo aplicativo. O `localStorage` ainda é a única fonte operacional e o Supabase não participa desta camada.

O `localStorageAdapter` trata leitura e escrita de JSON. Se uma chave não existir ou contiver JSON inválido, a leitura devolve o valor padrão informado e não modifica o conteúdo armazenado.

Os repositórios de domínio oferecem operações simples sobre listas. Regras operacionais, validações e decisões de interface permanecem nos componentes e utilitários existentes.

Para adicionar outra coleção, crie um módulo com nome de domínio que exporte uma instância de `criarRepositorioListaLocal` configurada com a chave já existente. Os consumidores devem importar esse módulo de domínio, sem acessar a fábrica ou informar chaves genéricas diretamente.
