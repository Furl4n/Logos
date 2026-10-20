# Arquitetura e organização do repositório

## Objetivo

Manter frontend, backend, banco de dados e documentação organizados em um monorepo simples. A estrutura deve favorecer leitura rápida por avaliadores e permitir que cada camada evolua sem misturar responsabilidades.

## Estrutura definida

```text
ps-autoU/
├── backend/                 # API Python + FastAPI
│   ├── app/
│   │   ├── api/             # rotas HTTP
│   │   ├── core/            # configurações, autenticação e dependências
│   │   ├── models/          # modelos de persistência
│   │   ├── schemas/         # contratos e validação de dados
│   │   ├── services/        # regras de negócio e concorrência
│   │   ├── repositories/    # acesso ao banco
│   │   ├── main.py
│   │   └── migrate.py       # execução das migrations SQL
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # React + TypeScript + Vite + Tailwind CSS
│   └── src/
│       ├── components/      # layout, ui e componentes por domínio
│       ├── hooks/           # estado e lógica das telas
│       ├── interfaces/      # tipos e contratos
│       ├── pages/           # telas em Nome/Index.tsx
│       ├── routes/          # roteador, páginas e layout compartilhado
│       ├── service/         # dados de exemplo; futuramente acesso à API
│       └── styles/          # base do Tailwind e tema visual
├── database/
│   └── migrations/          # migrations e scripts exclusivos do banco
├── docs/                    # documentação do projeto
│   ├── requirements.md
│   ├── architecture.md
│   ├── api-contract.md
│   └── user-flows.md
├── README.md                # ponto de entrada do repositório
├── .gitignore               # ambientes locais e arquivos gerados
└── docker-compose.yml       # PostgreSQL local
```

Diretórios ainda não criados não representam funcionalidades implementadas; são apenas a organização planejada para as próximas etapas.

## Persistência

O banco de dados escolhido é **PostgreSQL 14 ou superior**. A migration inicial está em `database/migrations/001_create_core_entities.sql` e cria:

- `users`, com os papéis `DRIVER` e `ANALYST`;
- `incidents`, incluindo categoria, criticidade, status, versão e `analyst_id`
  opcional para o responsável atual;
- `incident_history`, uma linha do tempo geral para status, criticidade, atribuição,
  observações e reaberturas. Observações são novas linhas com autor e horário;
  atribuições guardam os responsáveis anterior e novo com chaves estrangeiras.

A migration também define validações, chaves estrangeiras e triggers para `updated_at`.
Índices adicionais ficam para uma etapa posterior.

Uma atualização pode gerar vários eventos na mesma versão: por exemplo, encerramento
gera STATUS e OBSERVATION; reabertura gera REOPEN com justificativa e ASSIGNEE se
houver troca de responsável. A aplicação insere tudo na mesma transação e preserva
os eventos anteriores. Os papéis e as permissões são validados na camada de aplicação.

## Concorrência

Todas as alterações de atendimento usarão controle otimista por versão, incluindo observações, criticidade, atribuição e reabertura. A API receberá a versão lida e fará uma atualização atômica condicionada a ela. Se houver divergência, responderá `409 Conflict`, sem sobrescrever a mudança existente.

Os eventos de histórico serão inseridos na mesma transação da alteração, agrupados por versão na resposta da API. O contrato prevê código público e evento de criação com autor; esses dois pontos ainda precisam ser incorporados à migration inicial.

## Docker

O arquivo `docker-compose.yml` fica na raiz e atualmente executa o PostgreSQL 17
local, com healthcheck, porta restrita ao localhost e volume persistente.
Backend e frontend continuam executados localmente fora do Docker.
Sua containerização poderá ser adicionada depois.

A pasta `database/` não conterá o Compose: ela guarda apenas migrations, seeds e scripts específicos do banco.

## Próximas etapas

1. Estrutura inicial e ambiente Python configurados com FastAPI, Uvicorn e Pydantic Settings.
2. Conexão PostgreSQL configurada com Psycopg 3 e `DATABASE_URL`. O comando
   `python -m app.migrate` aplica os arquivos SQL e registra checksums no banco,
   em transação e com bloqueio contra execuções simultâneas.
3. Login e consulta do usuário autenticado implementados com JWT de uma hora,
   hash Argon2 e dependências de autenticação/autorização por papel. Usuários
   são criados por comando administrativo, sem cadastro público.
4. Implementar incidentes, histórico e atualização concorrente.
5. Integrar o frontend React existente ao contrato da API, removendo os mocks e o seletor temporário de perfil.
6. Adicionar Docker, testes, documentação de setup e deploy.
