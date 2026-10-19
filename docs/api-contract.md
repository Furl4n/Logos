# Contrato mínimo da API

Base: `/api/v1`. A API usa JSON, UUIDs, datas ISO 8601 e token Bearer. Erros usam `{ "detail": "mensagem legível" }`.

## Autenticação

### `POST /auth/login`

Recebe `email` e `password`; devolve `accessToken` e o usuário autenticado (`id`, `name`, `email`, `role`). Retorna `401` para credenciais inválidas.

### `GET /auth/me`

Devolve o usuário do token atual para restaurar a sessão e definir a área por perfil.

## Usuários

### `GET /users/drivers`

Disponível somente para analistas. Retorna motoristas para seleção ao criar incidente em nome de alguém.

### `GET /users/analysts`

Disponível somente para analistas. Retorna analistas elegíveis para receber uma transferência.

## Incidentes

### `GET /incidents`

Lista até 100 incidentes ordenados por criticidade e data. Motoristas recebem apenas os próprios; analistas recebem toda a operação. Para analistas, aceita `severity=HIGH,MEDIUM` e `category=MECHANICAL_ISSUE,ROAD_BLOCK`.

Cada item fornece dados suficientes para o card: id, título, categoria, criticidade, status, motorista, caminhão, localização e horários.

### `POST /incidents`

Cria um incidente com `title`, `description`, `category`, `severity`, `truckPlate`, `location`, `routeCode` opcional e `occurredAt`.

- Para motorista, a API associa o incidente ao usuário autenticado.
- Para analista, `driverId` é obrigatório e deve ser um motorista existente.
- A API define `status` como `OPEN`, `reportedAt`, timestamps e `version` como `1`.
- Retorna `201 Created` com o incidente completo.

### `GET /incidents/{incidentId}`

Retorna dados completos e `history`, em ordem decrescente de data. Motorista só acessa ocorrência própria; analista acessa qualquer ocorrência.

### `PATCH /incidents/{incidentId}`

Disponível somente para o analista responsável, com atendimento ativo. Recebe
`status`, `severity`, uma nova `observation` opcional e a `version` lida pelo cliente.
Atualiza os campos e adiciona a observação ao histórico na mesma transação, sem
editar entradas anteriores. Fechado (`CLOSED`) e Inconclusivo (`INCONCLUSIVE`)
encerram o atendimento e exigem uma nova observação.

```json
{ "status": "UNDER_INVESTIGATION", "severity": "HIGH", "observation": "Assistência acionada.", "version": 4 }
```

A API atualiza apenas se a versão ainda for atual, incrementa a versão e grava o histórico na mesma transação. Retorna `200` no sucesso ou `409 Conflict` com o estado atual se outro analista alterou o incidente antes.

### `PATCH /incidents/{incidentId}/assignee`

Recebe `analystId` e `version`. Sem responsável, somente o próprio analista pode
assumir; a ocorrência passa a `UNDER_INVESTIGATION`. Com responsável, somente ele
pode transferir a outro analista. Só aceita atendimentos ativos; incrementa a
versão e registra a atribuição no histórico geral atomicamente.

### `POST /incidents/{incidentId}/reopen`

Recebe `reason` obrigatório e `version`. Qualquer analista pode reabrir Fechado ou
Inconclusivo; retorna para `OPEN` e atribui a quem reabriu. Preserva todo o histórico
e grava justificativa, status e responsável na mesma transação, incrementando a versão.

Todas as mutações retornam o incidente atualizado no sucesso, `409` se a versão
divergir e `403` por falta de permissão. São contratos planejados para integrar as
ações locais do frontend; as rotas ainda não estão implementadas.

## Códigos de erro

| Código | Significado |
|---|---|
| `400` / `422` | Corpo, enum, filtro ou formato inválido. |
| `401` | Token ausente, expirado ou credenciais inválidas. |
| `403` | Usuário sem permissão para a ação. |
| `404` | Recurso inexistente ou não acessível ao motorista. |
| `409` | Versão desatualizada na mudança de status. |
