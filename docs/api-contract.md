# Contrato mínimo da API

Base: `/api/v1`. Login e consulta do usuário autenticado já estão implementados;
as demais rotas permanecem planejadas.
JSON com campos camelCase e enums em inglês, traduzidos pelo front. IDs são UUIDs.
Datas ISO 8601 com fuso, retornadas em UTC (`Z`). Exceto login, todas as rotas
exigem `Authorization: Bearer <accessToken>`.

## Modelos de resposta

### Usuário

Usuário autenticado: `{ "id": "UUID", "name": "Lucas Costa", "email": "lucas@example.com", "role": "ANALYST" }`.
Papéis: `DRIVER` e `ANALYST`. Nunca retornar senha ou hash.
Referências a motorista, responsável e autor retornam somente `{ "id": "UUID", "name": "Nome" }`.

### Resumo do incidente

```json
{
  "id": "f304f33a-d404-462f-a5f4-47148f432ecc",
  "code": "INC-1048",
  "title": "Falha no sistema de freios",
  "category": "MECHANICAL_ISSUE",
  "severity": "HIGH",
  "status": "OPEN",
  "driver": { "id": "84a88464-026c-4c2c-80c0-681e42dca02e", "name": "Carlos Henrique" },
  "assignee": null,
  "truckPlate": "GHT-4J82",
  "location": "BR-116, km 214 · Curitiba, PR",
  "occurredAt": "2026-10-19T17:48:00Z",
  "reportedAt": "2026-10-19T17:50:00Z",
  "version": 1
}
```

`id` identifica o recurso nas URLs. `code` é único, imutável e gerado no servidor
por sequência concorrente segura: prefixo `INC-`, no mínimo quatro dígitos,
sem reutilização nem garantia de números consecutivos. Não substitui o UUID.
`assignee` é uma referência de usuário ou `null`.

### Incidente completo

Todos os campos do resumo, mais `description`, `routeCode` (string ou `null`),
`createdAt`, `updatedAt` e `history` (array, nunca `null`). Tempos relativos são
calculados no front a partir de `occurredAt`. `reportedAt` é o horário de registro
no servidor, distinto do horário informado da ocorrência.

### Histórico

Uma entrada agrupa os eventos da mesma operação pela versão do incidente:

```json
{
  "id": "9701c0e7-e8ce-4f65-9cc0-ab260caa157f",
  "version": 4,
  "author": { "id": "e94db901-9686-4ad0-a4e1-84b0affb95a9", "name": "Lucas Costa" },
  "createdAt": "2026-10-19T18:10:00Z",
  "changes": [
    { "type": "STATUS", "previousValue": "UNDER_INVESTIGATION", "newValue": "CLOSED" }
  ],
  "observation": "Assistência concluída. Veículo liberado."
}
```

- `id`: UUID de um evento representante da operação, escolhido de forma estável.
- `changes`: eventos `CREATED`, `STATUS`, `SEVERITY`, `ASSIGNEE` ou `REOPEN`.
  STATUS/SEVERITY/REOPEN usam `previousValue` e `newValue` com os respectivos enums.
  ASSIGNEE usa `previousAssignee` e `newAssignee` (referências; anterior pode ser `null`).
  CREATED contém somente `type`. O front transforma os eventos em textos traduzidos.
- `observation`: observação da operação ou justificativa de reabertura; `null`
  quando ausente. O evento OBSERVATION do banco aparece nesse campo, sem duplicação
  em `changes`. Operação só de observação tem `changes: []`.
- Criação gera entrada de versão 1 com autor real. Quando um analista registra
  para um motorista, o autor é o analista, não o motorista associado.
- Ordem por versão decrescente; eventos da mesma operação compartilham autor,
  horário e versão. Entradas são imutáveis e gravadas na transação da alteração.

## Autenticação

### `POST /auth/login`

Recebe `{ "email": "lucas@example.com", "password": "senha" }`.
Retorna `200` com `accessToken`, `tokenType: "Bearer"`, `expiresIn: 3600` (segundos)
e `user` no formato de usuário autenticado. Duração inicial do token: uma hora.
E-mail válido, até 255 caracteres, espaços externos removidos e comparação sem
diferenciar maiúsculas; cadastro/seed deve usar a mesma normalização. Senha
obrigatória, sem trim ou transformação.

Credenciais inválidas retornam `401`, sem revelar se o e-mail existe.
Não há cadastro público, refresh token ou revogação de token neste contrato.

### `GET /auth/me`

Retorna `200` com usuário autenticado, restaurando a sessão e a visão da página
única `/incidentes`. Token ausente, inválido ou expirado retorna `401`.
Ao expirar, o front limpa a sessão e solicita login; sair remove o token local.
Sem revogação, tokens emitidos continuam válidos até expirar.

## Usuários

### `GET /users/drivers`

Somente analistas. Retorna `200` com array de referências `{ id, name }` de usuários
DRIVER para o formulário de registro, ordenado por nome e, no empate, ID.

### `GET /users/analysts`

Somente analistas. Mesmo formato, para usuários ANALYST, permitindo transferência.
Pode incluir o próprio usuário; o front o exclui das opções de transferência.
Listas auxiliares sem paginação no MVP; não são endpoints de gestão de usuários.

## Incidentes

### `GET /incidents`

Motoristas recebem somente os próprios; analistas recebem toda a operação.
Ambos podem filtrar, sempre dentro do escopo autorizado pelo servidor.

| Parâmetro | Valores / comportamento | Padrão |
|---|---|---|
| `search` | Busca parcial sem diferenciar maiúsculas em título, código, motorista, placa e localização; trim | Sem busca |
| `severity` | Um valor: `HIGH`, `MEDIUM` ou `LOW` | Todas |
| `category` | Um valor do enum de categorias | Todas |
| `status` | `ACTIVE`, `ALL` ou um dos quatro status | `ACTIVE` |
| `timeOrder` | `newest` ou `oldest`, por `occurredAt` | `newest` |
| `page` | Inteiro >= 1 | `1` |
| `pageSize` | Inteiro de 1 a 100 | `100` |

Filtros combinam com AND. ACTIVE significa OPEN ou UNDER_INVESTIGATION.
Não há multisseleção nem valores separados por vírgula: o front não os usa.
Não se aceita filtro `driverId` para ampliar o escopo do motorista.

Ordenação global antes da paginação: HIGH, MEDIUM, LOW; depois `occurredAt` na
direção pedida e UUID crescente para desempate. Ordem temporal nunca remove
a precedência da criticidade.

Retorna `200` com `{ "items": [], "page": 1, "pageSize": 100, "total": 0 }`,
onde `items` contém resumos e `total` conta registros autorizados após filtros,
antes da paginação. Sem resultados ou página além da última: `items: []`.
O front deverá permitir carregar mais páginas sem esconder registros além dos 100;
alterar filtro ou ordem reinicia a paginação. Cem é o tamanho inicial da página,
não limite do sistema. Descrição e histórico completos ficam fora da listagem.

### `POST /incidents`

Recebe `title`, `description`, `category`, `severity`, `truckPlate`, `location`,
`occurredAt`, `routeCode` opcional e `driverId` somente para analistas.

| Campo | Validação |
|---|---|
| `title` | Obrigatório, não vazio após trim, até 160 caracteres |
| `description`, `location` | Obrigatórios, não vazios após trim |
| `truckPlate` | Obrigatório, não vazio, até 10 caracteres; trim e maiúsculas; aceita identificador além de placa |
| `routeCode` | Opcional, até 50 caracteres após trim; omitido, `null` ou vazio vira `null` |
| `occurredAt` | Data válida com fuso, não futura em relação ao servidor |
| `driverId` | UUID de DRIVER existente, obrigatório para analista |

- Motorista é associado ao usuário autenticado; enviar `driverId` nesse perfil
  retorna `422`. A integração deve omitir esse campo, mesmo que o formulário local o use.
- Campos desconhecidos retornam `422`, inclusive status, responsável, código,
  versão e datas geradas pelo servidor. A mesma rejeição vale para os outros corpos e filtros.
- Servidor define OPEN, responsável nulo, versão 1, código, `reportedAt`,
  `createdAt` e `updatedAt`, e grava o evento de criação.
- Retorna `201` com incidente completo e `Location: /api/v1/incidents/{id}`.

Enums:

- Categoria: `VEHICLE_ACCIDENT`, `INJURY_ACCIDENT`, `UNUSUAL_WEATHER`, `MECHANICAL_ISSUE`, `ROAD_BLOCK`.
- Criticidade: `HIGH`, `MEDIUM`, `LOW`, escolhida pelo usuário sem derivação da categoria.
- Status: `OPEN`, `UNDER_INVESTIGATION`, `CLOSED`, `INCONCLUSIVE`.

### `GET /incidents/{incidentId}`

Retorna `200` com incidente completo. Motorista só acessa ocorrência própria;
analista acessa qualquer ocorrência. Incidente inexistente ou alheio ao motorista
retorna `404`, sem revelar sua existência.

### `PATCH /incidents/{incidentId}`

Somente o analista responsável, em atendimento ativo. Recebe `status` e `severity`
obrigatórios (valores atuais podem ser reenviados), `version` obrigatória e
`observation` opcional. Não altera os demais dados do incidente.

```json
{ "status": "UNDER_INVESTIGATION", "severity": "HIGH", "observation": "Assistência acionada.", "version": 4 }
```

Entre ativos, OPEN e UNDER_INVESTIGATION podem ser selecionados. Ambos podem passar
a CLOSED ou INCONCLUSIVE, exigindo uma nova observação não vazia.
Observação omitida, `null` ou vazia após trim equivale a ausente quando não há
encerramento. Para apenas adicionar observação, reenviar status e criticidade atuais.
Textos anteriores nunca são editados ou substituídos.

Sem mudança nem observação: `200` com estado atual, sem incrementar versão, alterar
`updatedAt` ou criar histórico; a versão ainda é validada. Encerrados bloqueiam
qualquer atualização comum, inclusive do responsável.

### `PATCH /incidents/{incidentId}/assignee`

Somente analistas. Recebe `{ "analystId": "UUID", "version": 4 }`.
Sem responsável, só o próprio analista assume; passa a UNDER_INVESTIGATION.
Com responsável, só ele transfere para outro ANALYST existente, mantendo o status.
Não permite desatribuição, transferência para si mesmo ou ação em encerrados.
Assunção registra atribuição e mudança de status, se houver, na mesma operação.

### `POST /incidents/{incidentId}/reopen`

Somente analistas. Recebe `{ "reason": "Motivo da reabertura", "version": 4 }`.
Motivo obrigatório e não vazio após trim. Qualquer analista pode reabrir CLOSED
ou INCONCLUSIVE: retorna a OPEN e assume o atendimento. Preserva o histórico,
grava REOPEN com justificativa e ASSIGNEE se houver mudança de responsável.
Não aceita reabrir atendimento ativo.

## Concorrência e respostas de atualização

PATCH geral, atribuição e reabertura exigem `version` inteira >= 1. Operação efetiva
incrementa uma vez, independentemente do número de eventos. Atualização condicional
e histórico são atômicos; falha reverte ambos. Sucesso retorna `200` com incidente completo.

Ordem de validação: autenticação e formato, acesso ao recurso, versão, permissão da
ação e regra de estado. Motoristas não podem usar rotas de atendimento: `403` para
ocorrência própria, `404` para alheia. Analista com versão anterior à transferência
recebe `409` e pode recarregar; com a versão atual, não ser responsável gera `403`.

Conflito: `409`, `detail` legível, `code: "VERSION_CONFLICT"` e `currentIncident`
no formato completo. Só devolver o estado a quem pode consultar a ocorrência.
O front preserva o rascunho e oferece recarregar explicitamente antes de nova tentativa.

## Erros

Formato: `{ "detail": "Mensagem legível.", "code": "VALIDATION_ERROR" }`.
Validação pode acrescentar `errors: [{ "field": "title", "message": "Informe o título." }]`.
O front usa `code`, não compara mensagens. Falhas internas não expõem SQL ou stack traces.

| HTTP | `code` | Uso |
|---|---|---|
| `400` | `INVALID_JSON` | JSON malformado |
| `401` | `INVALID_CREDENTIALS` / `UNAUTHENTICATED` | Login inválido / token ausente, inválido ou expirado |
| `403` | `FORBIDDEN` | Perfil ou responsável sem permissão |
| `404` | `NOT_FOUND` | Incidente inexistente ou inacessível ao motorista |
| `409` | `VERSION_CONFLICT` | Versão desatualizada em qualquer atualização do atendimento |
| `422` | `VALIDATION_ERROR` | Campos, parâmetros, enums ou UUIDs inválidos; usuário alvo inexistente ou com papel incorreto |
| `422` | `INVALID_STATE` | Alteração em encerrado, reabertura de ativo ou transferência para si mesmo |
| `500` | `INTERNAL_ERROR` | Falha inesperada, sem alteração parcial |

## Ajustes pendentes para integração

- Migration: acrescentar geração/persistência do código público e evento CREATED
  de versão 1. Os demais eventos continuam a partir da versão 2. A autoria fica
  no histórico geral, sem adicionar `createdByUserId` ao incidente.
- Front local: mapear nomes traduzidos, IDs de exemplo, `plate`, `route` e histórico
  textual para o contrato; UUID nas operações e código na apresentação.
- Integrar paginação, sessão real, estados de rede e erros. Remover o seletor de perfil.
- Não há endpoints de cadastro, exclusão, edição geral, histórico separado ou
  observações separadas: os fluxos atuais não os exigem.
