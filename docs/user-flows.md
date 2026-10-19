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

Os cards ativos de alta criticidade usam faixa vermelha forte, fundo suave,
ícone de alerta e rótulo textual. Título e tempo decorrido têm destaque para
apoiar a triagem. A localização fica nos detalhes. Incidentes resolvidos não recebem
o tratamento de urgência.

## Telas

### 1. Login

- Campos: e-mail e senha.
- Após sucesso, motorista segue para `Meus incidentes`; analista segue para a
  `Central de incidentes`.
- Exibe erro de credenciais sem revelar qual campo está incorreto.

### 2. Meus incidentes — motorista

- Lista somente incidentes cujo motorista é o usuário autenticado.
- Botão de destaque para registrar um novo incidente.
- Cada card abre os detalhes e o histórico da ocorrência.
- O motorista acompanha o status, mas não o altera.

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

### 4. Central de incidentes — analista

- Lista todos os incidentes em cards compactos.
- Barra de filtros por criticidade e categoria.
- Botão para limpar filtros ativos.
- Botão para registrar incidente em nome de um motorista.
- Clique no card abre um painel lateral no desktop ou uma tela/modal no mobile.

### 5. Detalhe do incidente

- Mostra os dados completos e a linha do tempo de mudanças de status.
- Analistas consultam qualquer ocorrência; somente o responsável altera status,
  criticidade e adiciona observações em atendimentos ativos.
- Sem responsável, a ação Assumir ocorrência atribui ao analista e inicia a investigação.
- O responsável pode transferir o atendimento ativo para outro analista.
- Observações são novas entradas imutáveis no histórico, com autor e horário.
- Fechado e Inconclusivo encerram o atendimento e exigem uma nova observação.
- Encerrados permitem somente consulta e a ação Reabrir ocorrência: qualquer
  analista informa uma justificativa, assume a responsabilidade e retorna a Aberto.
- As ações usam a versão atual; mudanças de criticidade reposicionam o card na fila.
- Para motorista, é somente leitura.

## Conteúdo do card de incidente

```text
[ALTA] [ABERTO]
Pneu estourado na pista
João da Silva · ABC-1234
BR-040, km 511 · há 8 min
Problema mecânico
```

Cada card deve ter:

- faixa lateral, ícone e rótulo textual para a criticidade;
- badge textual para status e categoria;
- título como informação de maior destaque;
- motorista, caminhão, categoria e horário como contexto secundário;
- foco de teclado visível e área inteira clicável;
- contraste suficiente sem depender somente da cor.

## Estados da interface

- **Carregando:** skeletons ou indicadores na lista e no detalhe.
- **Vazio:** mensagem específica para ausência de incidentes ou resultado sem
  correspondência aos filtros, com ação de limpar filtros quando aplicável.
- **Erro:** mensagem clara, manutenção dos dados já visíveis quando possível e
  botão de tentar novamente.
- **Atualizando status:** ação daquele incidente fica temporariamente
  desabilitada e exibe feedback de processamento.
- **Conflito:** ao receber `409 Conflict`, a interface informa que outro
  analista atualizou o incidente e oferece carregar a versão atual antes de
  uma nova tentativa.

## Responsividade

- Desktop: filtros no topo, lista principal e painel de detalhe lateral.
- Mobile: filtros em painel recolhível; cards em largura total; detalhes em
  tela ou modal próprio.
