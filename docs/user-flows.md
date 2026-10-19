# Fluxos e planejamento da interface

## Princípio de design

A central do analista usará uma **lista vertical de cards compactos**, e não
uma tabela. Esse formato mantém o contexto de cada ocorrência, favorece a
leitura sob pressão e se adapta naturalmente a telas menores.

Os cards serão ordenados por criticidade (Alta, Média, Baixa) e, dentro de cada
grupo, pelo incidente mais recente.

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
- Para analista, contém o seletor de novo status e ação de salvar.
- Para analista, permite reclassificar a criticidade com a versão atual do
  incidente; o novo valor reposiciona o card na fila.
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
- motorista, caminhão, localização e horário como contexto secundário;
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
