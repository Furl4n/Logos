# Logos

MVP de uma central de resposta a incidentes para uma operação logística, desenvolvido para o case prático da AutoU.

O produto conecta motoristas, que registram e acompanham os próprios incidentes, a analistas, que priorizam a fila operacional e conduzem as alterações de status.

## Documentação

- [Requisitos do MVP](docs/requirements.md)
- [Arquitetura e organização do repositório](docs/architecture.md)
- [Fluxos e planejamento da interface](docs/user-flows.md)
- [Contrato mínimo da API](docs/api-contract.md)
- [Deploy na Vercel](docs/deploy.md)
- [Migration inicial do PostgreSQL](database/migrations/001_create_core_entities.sql)

## Estado atual

O frontend React está integrado à API e inclui lista, quadro de atendimentos e
temas claro/escuro. O backend tem a estrutura em Python/FastAPI, conexão com PostgreSQL, comando de migrations
e autenticação com JWT. Incidentes possuem listagem com filtros e paginação,
criação e detalhes com histórico, respeitando o acesso por perfil. O atendimento
inclui atribuição, transferência, status, criticidade, observações e reabertura,
com controle de concorrência por versão. O banco local roda com Docker Compose.
O deploy usa Vercel Services para frontend e backend no mesmo domínio, com
PostgreSQL externo. A configuração está no repositório; a publicação e a
validação online ainda precisam ser concluídas.

Veja como executar cada aplicação em [frontend](frontend/README.md) e
[backend](backend/README.md).
