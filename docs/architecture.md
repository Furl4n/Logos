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

- `users`, com os papéis `DRIVER`, `ANALYST` e `ADMIN`, e indicador `is_active`;
- `incidents`, incluindo categoria, criticidade, status, versão e `analyst_id`
  opcional para o responsável atual;
- `incident_history`, uma linha do tempo geral para status, criticidade, atribuição,
  observações e reaberturas. Observações são novas linhas com autor e horário;
  atribuições guardam os responsáveis anterior e novo com chaves estrangeiras.

A migration também define validações, chaves estrangeiras e triggers para `updated_at`.
Os índices de consulta estão na migration `004_optimize_queries.sql`:
histórico por incidente/versão, motorista, responsável, fila ativa por prioridade,
categoria/status, busca parcial por trigramas e listagens de usuários ativos.
As chaves primárias e UNIQUE já cobrem consulta por UUID e login por e-mail.
Consulte [medições e decisões de performance](performance.md).

A migration `002_add_incident_code_and_creation_event.sql` adiciona código público
único gerado por sequência e suporte ao evento CREATED de versão 1. A migration
inicial já aplicada é preservada. Incidentes existentes recebem código, mas não
ganham um autor de criação presumido.

Uma atualização pode gerar vários eventos na mesma versão: por exemplo, encerramento
gera STATUS e OBSERVATION; reabertura gera REOPEN com justificativa e ASSIGNEE se
houver troca de responsável. A aplicação insere tudo na mesma transação e preserva
os eventos anteriores. Os papéis e as permissões são validados na camada de aplicação.

## Concorrência

Todas as alterações de atendimento usam controle otimista por versão, incluindo
observações, criticidade, atribuição e reabertura. A API recebe a versão lida e faz
`UPDATE ... WHERE id = ... AND version = ...`, incrementando a versão uma única
vez por operação. Se houver divergência, responde `409 Conflict` com o incidente
atual, sem sobrescrever a mudança existente.

Os eventos de histórico são inseridos na mesma transação da alteração, agrupados
por versão na resposta da API. O suporte ao código público e ao evento de criação
com autor está na migration `002`.

## Tema da interface

O frontend compartilha a preferência claro/escuro/sistema por contexto React.
As cores usam tokens semânticos CSS, alterados por `data-theme` no elemento raiz,
incluindo os conteúdos renderizados em portais. A preferência visual fica no
`localStorage`, independente da sessão de autenticação, e a opção sistema usa
`prefers-color-scheme`. O HTML define o tema inicial antes da montagem do React.

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
   operacionais podem ser criados pela página administrativa; contas ADMIN
   são criadas pelo terminal, sem cadastro público. A autenticação verifica
   o estado ativo da conta em cada requisição.
4. Listagem implementada com filtros, paginação e escopo por perfil. Ordenação
   por criticidade, horário e UUID, com total e página na mesma instrução SQL.
   Criação grava incidente e CREATED atomicamente. Detalhes incluem histórico
   agrupado por versão, com o mesmo escopo por perfil. A transação da requisição
   é confirmada antes de enviar a resposta HTTP. Atendimento implementado com
   assunção, transferência, atualização, observações e reabertura, usando versão
   e histórico atômico. Consultas auxiliares de motoristas e analistas disponíveis.
5. Frontend integrado à autenticação, listagem, filtros, registro e atendimento;
   dados locais e seletor temporário de perfil removidos.
6. Validar os fluxos completos no navegador; depois, expandir a containerização
   das aplicações e configurar o deploy.
