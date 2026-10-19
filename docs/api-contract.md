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

### `PATCH /incidents/{incidentId}/status`

Disponível somente para analistas. Recebe o novo `status` e a `version` lida pelo cliente.

```json
{ "status": "UNDER_INVESTIGATION", "version": 4 }
```

A API atualiza apenas se a versão ainda for atual, incrementa a versão e grava o histórico na mesma transação. Retorna `200` no sucesso ou `409 Conflict` com o estado atual se outro analista alterou o incidente antes.

### `PATCH /incidents/{incidentId}/severity`

Disponível somente para analistas. Recebe a nova `severity` e a `version` lida pelo cliente. Reclassifica a prioridade após a triagem, incrementa a versão e grava o evento no histórico geral na mesma transação. Retorna `200` no sucesso ou `409 Conflict` quando a versão estiver desatualizada.

## Códigos de erro

| Código | Significado |
|---|---|
| `400` / `422` | Corpo, enum, filtro ou formato inválido. |
| `401` | Token ausente, expirado ou credenciais inválidas. |
| `403` | Usuário sem permissão para a ação. |
| `404` | Recurso inexistente ou não acessível ao motorista. |
| `409` | Versão desatualizada na mudança de status. |
