# Logos

MVP de uma central de resposta a incidentes para uma operação logística, desenvolvido para o case prático da AutoU.

O produto conecta motoristas, que registram e acompanham os próprios incidentes, a analistas, que priorizam a fila operacional e conduzem as alterações de status.

## Demonstração online

Acesse [Logos](https://logos-one-taupe.vercel.app/login), sem instalação local.

| Perfil | E-mail | Senha |
|---|---|---|
| Analista | `analista1@logos.com` | `analista` |
| Analista | `analista2@logos.com` | `analista` |
| Motorista | `motorista1@logos.com` | `motorista` |
| Motorista | `motorista2@logos.com` | `motorista` |

Essas contas e os dados são exclusivos da demonstração. Analistas visualizam toda
a fila; motoristas consultam somente os próprios incidentes. Use os dois analistas
em navegadores ou perfis distintos para demonstrar disputa por uma ocorrência.
Somente o responsável altera um atendimento ativo; alterações com versão antiga
são rejeitadas sem sobrescrever dados. Contas administrativas são provisionadas
separadamente, conforme as [instruções de deploy](docs/deploy.md).

## Execução local

Pré-requisitos: Python 3.14, Node.js 22.20 ou superior e Docker com Compose.
O Docker executa apenas o PostgreSQL 17; backend e frontend rodam no computador.

1. Siga o [setup do backend](backend/README.md): suba o banco, instale dependências,
   configure `backend/.env`, aplique as migrations e crie as contas locais.
2. Em outro terminal, siga o [setup do frontend](frontend/README.md) e abra
   `http://localhost:5173`.

As contas online não são copiadas para o Docker. O backend local lê apenas
`backend/.env`; a `.env.local` da raiz guarda conexões do Neon para uso explícito.
Variáveis do processo têm precedência sobre o arquivo local.

## Documentação

- [Requisitos do MVP](docs/requirements.md)
- [Arquitetura e organização do repositório](docs/architecture.md)
- [Fluxos e planejamento da interface](docs/user-flows.md)
- [Contrato mínimo da API](docs/api-contract.md)
- [Deploy na Vercel](docs/deploy.md)
- [Consultas, índices e medições](docs/performance.md)
- [Migrations do PostgreSQL](database/migrations)

## Estado atual

O frontend React está integrado à API e inclui lista, quadro de atendimentos e
temas claro/escuro. O backend tem a estrutura em Python/FastAPI, conexão com PostgreSQL, comando de migrations
e autenticação com JWT. Incidentes possuem listagem com filtros e paginação,
criação e detalhes com histórico, respeitando o acesso por perfil. O atendimento
inclui atribuição, transferência, status, criticidade, observações e reabertura,
com controle de concorrência por versão. O banco local roda com Docker Compose.
Administradores possuem uma área exclusiva para listar, criar, desativar e
reativar motoristas e analistas, preservando incidentes e histórico.
O primeiro administrador é criado pelo terminal; veja [instruções de deploy](docs/deploy.md).
O deploy usa Vercel Services para frontend e backend no mesmo domínio, com
PostgreSQL no Neon. A aplicação está publicada e as migrations `001` a `004`
foram aplicadas no banco de produção. Os índices não substituem o deploy do
código: alterações na API precisam ser enviadas ao repositório remoto e publicadas.

## Validação

A suíte do backend integra as rotas HTTP ao PostgreSQL e inclui testes de
concorrência com conexões independentes. Última execução local: **78 testes
aprovados**. Os comandos estão no [README do backend](backend/README.md).
O frontend possui verificação TypeScript/build e lint, conforme seu README.

As medições de consultas usaram 40 mil incidentes sintéticos em tabelas temporárias;
não representam latência HTTP nem teste de carga da Vercel. Veja a metodologia
em [performance](docs/performance.md).

## Limites e entrega

- O sistema registra, consulta e atualiza incidentes, mas não implementa exclusão
  nem edição geral dos dados após o registro. Essa decisão deve ser apresentada
  explicitamente, pois o enunciado menciona CRUD.
- A demonstração foi populada com 50 incidentes fictícios. O cenário visual com
  100 ativos ainda precisa ser preparado e validado; há seed local de 120 registros.
- Ainda é necessário publicar o vídeo técnico de até cinco minutos e reunir
  os links públicos em uma pasta para enviar pela plataforma de recrutamento.
- O checklist completo de entrega está nos [requisitos](docs/requirements.md).
