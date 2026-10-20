# Backend Logos

Base da API em Python com FastAPI, Uvicorn, Pydantic Settings e acesso ao
PostgreSQL com Psycopg 3.

## Ambiente local

Use Python 3.14. Na raiz do repositório:

```bash
docker compose up -d --wait db
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
python -m app.migrate
python -m uvicorn app.main:app --reload
```

A documentação interativa fica em <http://127.0.0.1:8000/docs> e o contrato
OpenAPI em <http://127.0.0.1:8000/openapi.json>. Ainda não há rotas de negócio.

Se a criação do ambiente falhar por falta de `ensurepip` no Ubuntu/Debian,
instale o pacote `python3.14-venv` ou, se o pip do sistema já estiver disponível,
use esta alternativa antes de ativar o ambiente:

```bash
python3 -m venv --without-pip .venv
python3 -m pip --python .venv/bin/python install pip
```

Depois, siga os comandos de ativação e instalação acima.

`APP_NAME` define o nome exibido na documentação. Variáveis do processo têm
precedência sobre o arquivo `backend/.env`, que é opcional. Reinicie o servidor
ao alterar configurações. O ambiente virtual e arquivos `.env` não são versionados.

## PostgreSQL local com Docker

Instale o Docker Engine com o plugin Compose (ou Docker Desktop) antes de executar
os comandos. O Compose na raiz sobe apenas o banco; a API roda na `.venv`.

O serviço usa PostgreSQL 17, banco e usuário `logos`, senha local `logos_local`
e porta `5433`, publicada apenas no localhost (no container, `5432`). Essas credenciais são exclusivas
do desenvolvimento. `DATABASE_URL` no `backend/.env` deve corresponder a elas.
Se a porta estiver ocupada, altere a porta publicada no Compose e na URL.

Os dados ficam no volume `postgres_data`. Para parar sem apagar os dados,
execute na raiz:

```bash
docker compose down
```

Para conferir o serviço e acessar o banco:

```bash
docker compose ps
docker compose logs db
docker compose exec db psql -U logos -d logos
```

## Migrations e conexão

Com o banco saudável, execute `python -m app.migrate` dentro de `backend/`,
com a `.venv` ativa. O comando aplica os arquivos `NNN_nome.sql` de
`database/migrations/` em ordem, registra nome e checksum em `schema_migrations`
e ignora os já aplicados. Migrations aplicadas não devem ser editadas nem removidas;
use um novo arquivo para mudanças futuras e mantenha a numeração com três dígitos.

A execução usa uma transação e bloqueio para evitar aplicações concorrentes;
se qualquer migration falhar, o lote é revertido. Execute migrations explicitamente,
antes de iniciar a API; elas não rodam automaticamente ao subir o container ou a API.
Use um banco vazio na primeira execução: bancos inicializados manualmente não
são adotados pelo comando.

`app/core/database.py` centraliza a conexão, com timeout de cinco segundos.
A dependência `get_database` fornece uma conexão por requisição, confirma a
transação no sucesso e reverte em caso de erro, sempre fechando a conexão.
Ela será usada pelas rotas nas próximas etapas.

## Organização

- `app/api`: rotas HTTP, reunidas no router com prefixo `/api/v1`.
- `app/core`: configurações e dependências compartilhadas.
- `app/models`: modelos de persistência.
- `app/schemas`: validação e formatos de entrada e saída.
- `app/services`: regras de negócio e concorrência.
- `app/repositories`: acesso ao banco de dados.
- `app/main.py`: criação e configuração da aplicação.

A autenticação e as rotas de negócio serão implementadas nas próximas etapas.
Os ajustes de código público e evento CREATED previstos no contrato ainda estão
pendentes na migration inicial.
