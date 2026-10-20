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
python -c 'import secrets; print(secrets.token_urlsafe(48))'
# Copie o valor gerado para JWT_SECRET_KEY no .env antes de usar o login.
python -m uvicorn app.main:app --reload
```

A documentação interativa fica em <http://127.0.0.1:8000/docs> e o contrato
OpenAPI em <http://127.0.0.1:8000/openapi.json>.

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
As rotas de autenticação já usam essa dependência.

## Autenticação

Defina uma chave aleatória de pelo menos 32 bytes em `JWT_SECRET_KEY` no `.env`.
O comando de geração acima produz uma chave adequada. A chave não é versionada;
trocar seu valor invalida os tokens anteriores.

- `POST /api/v1/auth/login`: recebe JSON com `email` e `password`; retorna o
  usuário público e `expiresIn: 3600`; define o cookie de sessão HttpOnly.
- `POST /api/v1/auth/logout`: remove o cookie e retorna 204.
- `GET /api/v1/auth/me`: usa o cookie de sessão e retorna
  o usuário atual consultado no banco, incluindo o perfil atualizado.

Senhas são armazenadas com hash Argon2. Tokens JWT usam HS256 e expiram em uma
hora. E-mails são normalizados com trim e minúsculas; senhas são preservadas
exatamente como digitadas. As respostas não incluem senha ou hash.
Não há cadastro público, refresh token nem revogação individual nesta etapa.

Crie usuários pelo terminal com a `.venv` ativa:

```bash
python -m app.create_user --name "Analista" --email analista@example.com --role ANALYST
python -m app.create_user --name "Motorista" --email motorista@example.com --role DRIVER
```

A senha é solicitada sem aparecer na tela e deve ter pelo menos oito caracteres.
O comando confirma a senha e rejeita e-mails duplicados; não altera usuários existentes.
Login e logout exigem `X-CSRF-Protection: 1`, assim como alterações autenticadas
por cookie. O navegador envia cookies com `credentials: include`.
Configure `FRONTEND_ORIGINS` como uma lista JSON de origens permitidas, sem curingas.
Em HTTP local, acrescente `COOKIE_SECURE=false` ao `.env`; o padrão é true para
produção HTTPS. Frontend e API devem estar no mesmo site (por exemplo,
`app.exemplo.com` e `api.exemplo.com`) para o cookie SameSite=Lax funcionar.
Bearer continua aceito para clientes externos, mas o login não expõe JWT em JSON.

## Listagem de incidentes

`GET /api/v1/incidents` exige autenticação. Analistas consultam toda a operação;
motoristas recebem apenas os próprios incidentes, com escopo imposto no servidor.

Filtros: `search`, `severity`, `category`, `status`, `timeOrder`, `page` e `pageSize`.
Os filtros combinam com AND. Por padrão, retorna incidentes ativos (OPEN e
UNDER_INVESTIGATION), primeira página com até 100 registros e horário decrescente.
A criticidade sempre vem antes do horário; UUID desempata registros com mesma data.
A busca ignora maiúsculas e espaços externos, tratando `%` e `_` como texto literal.
Parâmetros desconhecidos são rejeitados com `422`.

Resposta: `{ "items": [], "page": 1, "pageSize": 100, "total": 0 }`.
`items` contém os resumos, sem descrição ou histórico. `total` corresponde aos
registros autorizados após os filtros, antes da paginação.

Após atualizar o código, execute `python -m app.migrate` para aplicar a migration
`002`, que adiciona código público e suporte ao evento CREATED.

Para criar dados fictícios de desenvolvimento, use um motorista já cadastrado:

```bash
python -m app.seed_incidents --driver-email motorista@example.com
```

O comando insere 120 incidentes ativos com criticidades e categorias variadas,
incluindo o evento CREATED com o motorista como autor, na mesma transação.
Pode ajustar a quantidade com `--count`. A execução é explícita e não acontece
ao iniciar a aplicação; repeti-la para o mesmo motorista não duplica os exemplos.
Os títulos têm o prefixo `[Exemplo local]`.

## Criação, detalhes e seleção de motorista

- `GET /api/v1/users/drivers`: somente analistas; lista motoristas como `{ id, name }`,
  ordenados por nome e UUID, para preencher o formulário.
- `POST /api/v1/incidents`: registra a ocorrência e retorna `201` com o incidente
  completo e cabeçalho `Location`. Motorista omite `driverId`; analista deve
  informar o UUID de um motorista existente. Ambos podem escolher a criticidade.
- `GET /api/v1/incidents/{incidentId}`: retorna os detalhes e o histórico;
  motorista consulta apenas ocorrência própria e analista consulta qualquer uma.
  Ocorrência alheia ao motorista recebe o mesmo `404` de uma inexistente.

Exemplo de corpo para o motorista (analista acrescenta `driverId`):

```json
{
  "title": "Falha no sistema de freios",
  "description": "Veículo parado aguardando assistência.",
  "category": "MECHANICAL_ISSUE",
  "severity": "HIGH",
  "truckPlate": "ABC-1D23",
  "location": "BR-116, km 100",
  "occurredAt": "2026-01-01T10:00:00-03:00",
  "routeCode": "ENT-123"
}
```

`routeCode` é opcional; vazio vira `null`. Campos de texto têm espaços externos
removidos, placa é convertida para maiúsculas e datas precisam de fuso horário,
sem aceitar data futura. Status, responsável, código, versão e horários de registro
são definidos pelo servidor e não podem ser enviados no corpo.

Incidente e evento CREATED são gravados na mesma transação. O autor é quem
registrou, mesmo quando o analista cria para um motorista. A transação é confirmada
antes de enviar a resposta de sucesso; falha reverte a operação.

O histórico retorna versões decrescentes, com alterações agrupadas e observação
separada. A consulta de detalhes lê incidente e eventos no mesmo snapshot.

## Atendimento e concorrência

- `GET /api/v1/users/analysts`: consulta de analistas para transferência, com
  somente `{ id, name }`, restrita a analistas.
- `PATCH /api/v1/incidents/{incidentId}`: recebe `status`, `severity`, `version`
  e `observation` opcional. Somente o responsável altera um atendimento ativo.
- `PATCH /api/v1/incidents/{incidentId}/assignee`: recebe `analystId` e `version`.
  Sem responsável, o analista assume para si e o status passa a UNDER_INVESTIGATION.
  Com responsável, somente ele transfere para outro analista, mantendo o status.
- `POST /api/v1/incidents/{incidentId}/reopen`: recebe `reason` e `version`.
  Qualquer analista pode reabrir CLOSED ou INCONCLUSIVE, com justificativa. O
  status volta a OPEN e esse analista passa a ser o responsável.

CLOSED e INCONCLUSIVE encerram o atendimento e exigem uma nova observação.
Atualização comum e transferência são bloqueadas nesses estados. Observações
são acrescentadas ao histórico; nunca substituem as anteriores.

Toda mutação exige a versão inteira lida no incidente. A atualização é condicional
no PostgreSQL; somente uma operação com a mesma versão pode vencer. A operação
incrementa uma vez, mesmo quando produz vários eventos. Estado e histórico usam
a mesma transação; qualquer falha reverte ambos. Ao reenviar status e criticidade
atuais sem observação, a API retorna o estado sem alterar versão ou timestamps.

Versão desatualizada retorna `409`, `code: "VERSION_CONFLICT"` e `currentIncident`
com os detalhes atualizados. Esse retorno só é fornecido após verificar acesso
ao recurso. O frontend deverá preservar o rascunho e oferecer recarregar a
ocorrência antes de tentar novamente. Não há repetição automática da operação.

## Validação do backend

Com o PostgreSQL rodando, migration aplicada e `DATABASE_URL` configurada:

```bash
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
```

Os testes integram as rotas HTTP ao PostgreSQL, usam uma chave de teste e criam
usuários e incidentes temporários. Os testes comuns revertem sua transação.
Os testes concorrentes usam conexões independentes, confirmam seus próprios dados
temporários e depois removem apenas os UUIDs que criaram. Sequências podem ter
lacunas, inclusive após rollback.
Cobrem os dois perfis, normalização de e-mail, preservação da senha, erros de
validação, credenciais inválidas, tokens inválidos/expirados e autorização por perfil.
Também cobrem filtros, busca, paginação acima de 100 registros, desempate por UUID,
isolamento entre motoristas e o comando de dados de exemplo.
Criação e detalhes são validados para os dois perfis, incluindo autoria, campos
inválidos, agrupamento do histórico, seleção de motorista e rollback quando o
registro do histórico falha. Há também uma verificação de falha na finalização da
transação para garantir que a API não envie sucesso antecipadamente.
Atendimento é validado para os quatro status, permissões, fechamento com
observação, reabertura, transferência, no-op e rollback de histórico parcial.
Três cenários usam requisições HTTP simultâneas e conexões independentes:
dois analistas assumindo, duas abas adicionando observações e transferência
concorrente com uma atualização. Em cada um, uma operação vence e outra recebe
`409` com o mesmo estado da resposta vencedora.

## Organização

- `app/api`: rotas HTTP, reunidas no router com prefixo `/api/v1`.
- `app/core`: configurações e dependências compartilhadas.
- `app/models`: modelos de persistência.
- `app/schemas`: validação e formatos de entrada e saída.
- `app/services`: regras de negócio e concorrência.
- `app/repositories`: acesso ao banco de dados.
- `app/main.py`: criação e configuração da aplicação.

Integração com o frontend e deploy são as próximas etapas.
