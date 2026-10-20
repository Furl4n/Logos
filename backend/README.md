# Backend Logos

Base da API em Python com FastAPI, Uvicorn e configuração por variáveis de
ambiente usando Pydantic Settings.

## Ambiente local

Use Python 3.14. Na raiz do repositório:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
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

## Organização

- `app/api`: rotas HTTP, reunidas no router com prefixo `/api/v1`.
- `app/core`: configurações e dependências compartilhadas.
- `app/models`: modelos de persistência.
- `app/schemas`: validação e formatos de entrada e saída.
- `app/services`: regras de negócio e concorrência.
- `app/repositories`: acesso ao banco de dados.
- `app/main.py`: criação e configuração da aplicação.

A conexão com PostgreSQL, execução de migrations e autenticação serão
implementadas nas próximas etapas. As migrations permanecem em
`../database/migrations/`.
