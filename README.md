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

O escopo, as entidades e a primeira migration do PostgreSQL estão definidos. Backend, frontend, Docker e deploy ainda serão implementados nas próximas etapas.
