# Deploy — Vercel Services + PostgreSQL

## Serviços e rotas

Importe o repositório completo em um projeto com preset **Services**, usando a
raiz `./`. O `vercel.json` constrói cada aplicação na sua própria pasta:

| Serviço | Pasta | Framework | Acesso público |
|---|---|---|---|
| `backend` | `backend` | FastAPI, entrada `app.main:app` | `/api/*` |
| `frontend` | `frontend` | Vite, saída `dist` | Demais caminhos |

O caminho original é preservado: `/api/v1/incidents` chega ao FastAPI como
`/api/v1/incidents`. Não se adiciona nem se remove outro `/api`. A documentação
da API fica em `/api/docs`, `/api/redoc` e `/api/openapi.json`.
O fallback do frontend para `index.html` permite abrir e recarregar diretamente
`/login`, `/incidentes` e `/quadro`; arquivos estáticos existentes continuam servidos
pelo Vite/CDN. URLs de API inválidas continuam retornando o 404 do backend.

Não há bindings: o frontend é estático e o `fetch` executa no navegador, acessando
a rota pública `/api/v1` no mesmo domínio. Bindings são para chamadas internas
entre funções em runtime; não ficam disponíveis no build do Vite nem no navegador.
O backend acessa PostgreSQL externo por `DATABASE_URL`; o banco não é um serviço
dentro da Vercel e não deve receber rewrite público.

## Variáveis na Vercel

Cadastre em Settings → Environment Variables, para os ambientes que utilizar:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL do Neon com SSL, preferencialmente com pooling para a API |
| `JWT_SECRET_KEY` | Chave aleatória exclusiva do ambiente, com pelo menos 32 caracteres |
| `COOKIE_SECURE` | `true` |
| `FRONTEND_ORIGINS` | JSON com a origem pública exata, por exemplo `["https://seu-projeto.vercel.app"]` |
| `VITE_API_URL` | `/api/v1` (também é o padrão do código) |

Use a URL efetivamente atribuída pela Vercel. Não suponha que `logos.vercel.app`
esteja disponível. Para previews autenticados, inclua a origem exata do preview
no ambiente correspondente; não libere todos os domínios `vercel.app`.
Mudanças em variáveis `VITE_*` precisam de novo build. Não coloque credenciais
do banco nem a chave JWT em variáveis com esse prefixo.

O cookie HttpOnly usa Secure em HTTPS, SameSite=Lax e Path=/api/v1. As chamadas
do navegador enviam credenciais e `X-CSRF-Protection`; a origem precisa estar
na lista permitida, mesmo quando frontend e API compartilham o domínio.

## Preparar o banco

O repositório está vinculado ao Neon por `.neon` (ignorado pelo Git).
Com a CLI autenticada, execute `neon deploy` na raiz para aplicar `neon.ts`
e gerar `.env.local` com `DATABASE_URL` e `DATABASE_URL_UNPOOLED`.
O backend lê primeiro `backend/.env` e depois a `.env.local` da raiz;
variáveis do processo têm precedência sobre ambos. Enquanto esse arquivo
estiver presente, os comandos locais usam o banco Neon vinculado, inclusive
se `backend/.env` ainda apontar para o Docker. Para voltar ao banco local,
mova `.env.local` para fora do repositório ou forneça `DATABASE_URL`
explicitamente no processo. Confira também `DATABASE_URL_UNPOOLED` antes
de executar migrations: elas usam essa conexão direta quando disponível.

Mantenha as credenciais no arquivo ignorado e cadastre `DATABASE_URL`
separadamente na Vercel; `neon deploy` não configura as variáveis da Vercel.
O comando `npm run build` na raiz delega o build ao frontend.

Crie o projeto PostgreSQL no Neon e mantenha o SSL da string fornecida. Nenhum
dado local é enviado automaticamente. Execute os comandos a partir de `backend`,
com o ambiente Python ativado e `DATABASE_URL` apontando explicitamente para o
banco remoto. Para migrations, use a conexão direta (sem pooling) do Neon.

```bash
python -m app.migrate
python -m app.create_user --name "Analista" --email analista@logos.com --role ANALYST
python -m app.create_user --name "Motorista" --email motorista@logos.com --role DRIVER
python -m app.seed_incidents --driver-email motorista@logos.com --count 120
```

Os comandos de usuário pedem uma senha de pelo menos oito caracteres sem exibi-la.
Não use `analista`/`motorista` como senhas de produção. Use somente dados fictícios
na demonstração e disponibilize as contas de avaliação no README da entrega.
Depois dos comandos, restaure a configuração local antes de trabalhar no banco
de desenvolvimento. As migrations não são executadas em requisições nem no
build dos serviços; isso evita que um preview altere o banco de produção.

## Validação

Localmente, `npm run dev` na pasta `frontend` encaminha `/api` ao backend em
`localhost:8000`. Com os dois serviços em HTTP local, use `COOKIE_SECURE=false`
e autorize a origem do frontend no backend. Uma `VITE_API_URL` absoluta, se
configurada no `.env` local, continua tendo precedência sobre o padrão relativo.

Para exercitar o roteamento de Services, execute `vercel dev` na raiz, após
autenticar e vincular o projeto à Vercel. Configure a origem e o cookie para o
endereço HTTP local exibido pelo comando. Não substitua a URL relativa do
navegador por uma URL interna de binding.

Antes da entrega online, valide:

- Abrir e recarregar `/login`, `/incidentes` e `/quadro`.
- Login, restauração de sessão, logout e acesso por perfil.
- `/api/docs` e `/api/openapi.json`, sem prefixo duplicado.
- `/api/v1/auth/me` sem sessão retorna 401, não HTML do frontend.
- Listagem, registro, atendimento, histórico e conflito entre analistas.

Referências: [Services](https://vercel.com/docs/services),
[roteamento](https://vercel.com/docs/services/routing),
[bindings](https://vercel.com/docs/services/bindings).
