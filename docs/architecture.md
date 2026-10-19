# Arquitetura e organização do repositório

## Objetivo

Manter frontend, backend, banco de dados e documentação organizados em um monorepo simples. A estrutura deve favorecer leitura rápida por avaliadores e permitir que cada camada evolua sem misturar responsabilidades.

## Estrutura definida

```text
ps-autoU/
├── backend/                 # API Python; será criado na etapa de backend
│   ├── app/
│   │   ├── api/             # rotas HTTP
│   │   ├── core/            # configurações, autenticação e dependências
│   │   ├── models/          # modelos de persistência
│   │   ├── schemas/         # contratos e validação de dados
│   │   ├── services/        # regras de negócio e concorrência
│   │   ├── repositories/    # acesso ao banco
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # aplicação React; será criada posteriormente
├── database/
│   └── migrations/          # migrations e scripts exclusivos do banco
├── docs/                    # documentação do projeto
│   ├── requirements.md
│   ├── architecture.md
│   ├── api-contract.md
│   └── user-flows.md
├── README.md                # ponto de entrada do repositório
├── .gitignore               # será adicionado na configuração inicial
└── docker-compose.yml       # será adicionado na etapa de containerização
```

Diretórios ainda não criados não representam funcionalidades implementadas; são apenas a organização planejada para as próximas etapas.

## Persistência

O banco de dados escolhido é **PostgreSQL 14 ou superior**. A migration inicial está em `database/migrations/001_create_core_entities.sql` e cria:

- `users`, com os papéis `DRIVER` e `ANALYST`;
- `incidents`, incluindo categoria, criticidade, status e versão;
- `incident_history`, uma linha do tempo geral para mudanças de status e criticidade.

A migration também define validações, chaves estrangeiras, índices e triggers para `updated_at`.

## Concorrência

Alterações de status usarão controle otimista por versão. A API receberá a versão que o analista leu e fará uma atualização atômica condicionada a ela. Quando o incidente já tiver sido alterado, a API responderá `409 Conflict`, sem sobrescrever a mudança existente.

O histórico de status deverá ser inserido na mesma transação que a atualização do incidente.

## Docker

Docker será configurado depois que backend e frontend existirem. O arquivo `docker-compose.yml` ficará na raiz, pois coordenará todos os serviços:

- PostgreSQL;
- API Python;
- aplicação React, se o fluxo de desenvolvimento local exigir.

A pasta `database/` não conterá o Compose: ela guarda apenas migrations, seeds e scripts específicos do banco.

## Próximas etapas

1. Criar a estrutura inicial do backend e configurar o ambiente Python.
2. Configurar conexão com PostgreSQL e execução das migrations.
3. Implementar autenticação e autorização por papel.
4. Implementar incidentes, histórico e atualização concorrente.
5. Criar o frontend React a partir do contrato da API.
6. Adicionar Docker, testes, documentação de setup e deploy.
