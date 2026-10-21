# Fluxos e planejamento da interface

## Princípio de design

A central do analista usará uma **lista vertical de cards compactos**, e não
uma tabela. Esse formato mantém o contexto de cada ocorrência, favorece a
leitura sob pressão e se adapta naturalmente a telas menores.

Os cards serão ordenados por criticidade (Alta, Média, Baixa) e, dentro de cada
grupo, pelo incidente mais recente por padrão. O analista pode inverter a ordem
temporal dentro dos grupos. Os grupos têm cabeçalhos e contagens próprios.

A visão inicial mostra somente incidentes ativos. Os resolvidos e a visão de todos
ficam disponíveis no filtro de status. A fila aparece diretamente após os filtros,
com as ocorrências de alta criticidade no primeiro grupo. Limpar filtros retorna
à visão de ativos.

Os cards ativos de alta criticidade usam faixa e borda vermelhas, com fundo branco.
O cabeçalho do grupo identifica a criticidade por ícone e texto; não há selo vermelho
Alta após o título. Todos os títulos usam o mesmo tamanho, peso e cor padrão.
O tempo decorrido mantém destaque nos incidentes urgentes para
apoiar a triagem. A localização fica nos detalhes. Incidentes resolvidos não recebem
o tratamento de urgência.

## Telas

### Administração de usuários

- Gestão exclusiva de ADMIN em `/usuarios`, com a mesma sidebar, tema e componentes.
- Administradores também acessam Incidentes e Quadro, com as permissões de analista.
- Lista nome, e-mail, cargo e situação da conta; busca por nome/e-mail e paginação.
- Cadastro em modal com nome, e-mail, cargo operacional e senha.
- Desativação e reativação exigem confirmação. Contas administrativas não exibem essas ações.
- Desativação de analista com atendimento ativo mostra orientação para transferir os casos.
- Erros preservam o formulário; sucesso atualiza a lista e mostra confirmação.

### 1. Login

- Campos: e-mail e senha.
- Após sucesso, motoristas e analistas seguem para `/incidentes`; administradores,
  para `/usuarios`. As rotas validam o perfil também ao acessar pela URL.
- Exibe erro de credenciais sem revelar qual campo está incorreto.
- Sessão expirada exige novo login. Sair invalida a sessão no navegador e no backend.

### 2. Incidentes — visão do motorista

- Lista somente incidentes cujo motorista é o usuário autenticado.
- Botão de destaque para registrar um novo incidente.
- Cada card abre os detalhes e o histórico da ocorrência.
- O motorista acompanha o status, mas não o altera.
- Usa os mesmos filtros e ordenação da visão do analista, restritos aos próprios registros.
- É a mesma página e rota, sem item duplicado no menu.

### 3. Registro de incidente

Campos comuns:

- título;
- descrição;
- categoria;
- criticidade;
- placa ou identificador do caminhão;
- localização;
- código de rota ou entrega, opcional;
- data e horário da ocorrência.

Para o motorista, o vínculo é automático. Para o analista, há seleção de um
motorista cadastrado. Após sucesso, a aplicação confirma o registro e mostra o
incidente na lista correspondente.

### 4. Incidentes — visão do analista

- Lista todos os incidentes em cards compactos.
- Barra com busca, criticidade, categoria, status e ordenação temporal.
- Botão para limpar filtros ativos.
- Botão para registrar incidente em nome de um motorista.
- Clique no card abre um painel lateral no desktop ou uma tela/modal no mobile.
- Paginação de até 100 por página; reinicia na primeira página ao alterar filtros ou ordem.

### 5. Detalhe do incidente

- Mostra os dados completos e a linha do tempo de criação, status, criticidade,
  atribuição, observações e reaberturas, agrupadas por operação.
- Analistas consultam qualquer ocorrência; somente o responsável altera status,
  criticidade e adiciona observações em atendimentos ativos.
- Sem responsável, a ação Assumir ocorrência atribui ao analista e inicia a investigação.
- O responsável pode transferir o atendimento ativo para outro analista.
- Observações são novas entradas imutáveis no histórico, com autor e horário.
- Fechado e Inconclusivo encerram o atendimento e exigem uma nova observação.
- Encerrados permitem somente consulta e a ação Reabrir ocorrência: qualquer
  analista informa uma justificativa, assume a responsabilidade e retorna a Aberto.
- As ações usam a versão atual; mudanças de criticidade reposicionam o card na fila.
- Se há conflito de versão, informa que a alteração não foi salva, atualiza os
  dados atuais e permite uma nova tentativa manual sem reenviar o formulário.
- Para motorista, é somente leitura.

## Conteúdo do card de incidente

```text
Grupo: Alta — atenção imediata
Pneu estourado na pista  [Aberto]  INC-1048       há 8 min
João da Silva · ABC-1234 | Problema mecânico   Ocorrência >
```

Cada card deve ter:

- faixa lateral para criticidade, complementada pelo ícone e rótulo do grupo;
- badge textual para status; criticidades Média e Baixa também mantêm selo no card;
- título como informação de maior destaque;
- motorista, caminhão, categoria e horário como contexto secundário;
- foco de teclado visível e área inteira clicável;
- contraste suficiente sem depender somente da cor.

A localização fica somente nos detalhes. O UUID é usado nas operações e o código
público na apresentação. Títulos longos são truncados com reticências.

## Estados da interface

- **Carregando:** skeletons ou indicadores na lista e no detalhe.
- **Vazio:** mensagem específica para ausência de incidentes ou resultado sem
  correspondência aos filtros, com ação de limpar filtros quando aplicável.
- **Erro:** mensagem clara, manutenção dos dados já visíveis quando possível e
  botão de tentar novamente.
- **Atualizando status:** ação daquele incidente fica temporariamente
  desabilitada e exibe feedback de processamento.
- **Conflito:** ao receber `409 Conflict`, a interface informa que outro
  analista atualizou o incidente, atualiza a versão atual e permite uma nova
  tentativa manual, sem salvar nem reenviar automaticamente a tentativa anterior.

## Responsividade

- Desktop: filtros no topo, lista principal e painel de detalhe lateral.
- Mobile: filtros em painel recolhível; cards em largura total; detalhes em
  tela ou modal próprio.
