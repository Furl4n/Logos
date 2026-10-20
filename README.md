# Logos

MVP de uma central de resposta a incidentes para uma operação logística, desenvolvido para o case prático da AutoU.

O produto conecta motoristas, que registram e acompanham os próprios incidentes, a analistas, que priorizam a fila operacional e conduzem as alterações de status.

## Documentação

- [Requisitos do MVP](docs/requirements.md)
- [Arquitetura e organização do repositório](docs/architecture.md)
- [Fluxos e planejamento da interface](docs/user-flows.md)
- [Contrato mínimo da API](docs/api-contract.md)
- [Migration inicial do PostgreSQL](database/migrations/001_create_core_entities.sql)

## Estado atual

O frontend possui as telas e os fluxos locais com dados de exemplo. O backend
tem a estrutura inicial em Python/FastAPI, conexão com PostgreSQL e comando de
migrations. O banco local roda com Docker Compose. Autenticação, integração com
o frontend e deploy são as próximas etapas.

Veja como executar cada aplicação em [frontend](frontend/README.md) e
[backend](backend/README.md).
