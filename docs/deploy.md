# Deploy — Vercel Services + PostgreSQL

## Ambiente publicado

- Aplicação: <https://logos-one-taupe.vercel.app/login>.
- Documentação da API: <https://logos-one-taupe.vercel.app/api/docs>.
- Banco: PostgreSQL 18 no Neon, branch `production`.
- Migrations `001` a `004` aplicadas em produção em 21/10/2026.

As contas públicas de avaliação estão no [README principal](../README.md).
Credenciais do banco, chave JWT e senha administrativa não são configurações
públicas de acesso. O estado do código publicado depende do último deploy da Vercel.

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
`/login`, `/incidentes`, `/quadro` e `/usuarios`; arquivos estáticos existentes continuam servidos
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
| `FRONTEND_ORIGINS` | `["https://logos-one-taupe.vercel.app"]` para a demonstração atual |
| `VITE_API_URL` | Opcional: `/api/v1` já é o padrão do código |

Ao usar outro domínio, atualize a origem correspondente. Para previews autenticados, inclua a origem exata do preview
no ambiente correspondente; não libere todos os domínios `vercel.app`.
Mudanças em variáveis `VITE_*` precisam de novo build. Não coloque credenciais
do banco nem a chave JWT em variáveis com esse prefixo.

O cookie HttpOnly usa Secure em HTTPS, SameSite=Lax e Path=/api/v1. As chamadas
do navegador enviam credenciais e `X-CSRF-Protection`; a origem precisa estar
na lista permitida, mesmo quando frontend e API compartilham o domínio.

## Preparar o banco

Neste ambiente, o repositório está vinculado ao Neon por `.neon` (ignorado pelo Git).
Em um novo clone, autentique a CLI e vincule o projeto Neon desejado antes de continuar.
Com a CLI autenticada, execute `neon deploy` na raiz para aplicar `neon.ts`
e gerar `.env.local` com `DATABASE_URL` e `DATABASE_URL_UNPOOLED`.
O backend lê somente `backend/.env`, configurado localmente para o Docker.
A `.env.local` da raiz guarda as conexões Neon e não é carregada automaticamente
pelo backend. Para acessar o Neon, forneça suas variáveis explicitamente no
processo; elas têm precedência sobre `backend/.env`. Para migrations remotas,
forneça também `DATABASE_URL_UNPOOLED`, usada como conexão direta quando disponível.

Mantenha as credenciais no arquivo ignorado e cadastre `DATABASE_URL`
separadamente na Vercel; `neon deploy` não configura as variáveis da Vercel.
O comando `npm run build` na raiz delega o build ao frontend.

Ao configurar um novo ambiente, mantenha o SSL da conexão fornecida pelo Neon.
Nenhum dado local é enviado automaticamente. Execute os comandos a partir de
`backend`, com o ambiente Python ativado. Para usar explicitamente a `.env.local`
do Neon, sem alterar `backend/.env`, execute:

```bash
python -m dotenv -f ../.env.local run -- python -m app.migrate
```

O executor usa `DATABASE_URL_UNPOOLED` nas migrations e `DATABASE_URL` na API.
Também é possível fornecer essas variáveis diretamente no ambiente do processo.
A CLI `python -m dotenv` vem da dependência python-dotenv usada por Pydantic Settings;
o comando acima pressupõe a `.env.local` gerada com as duas URLs do Neon.

Criação de usuários e seed são operações separadas, com o mesmo prefixo explícito
quando o destino é remoto. Não são necessários para atualizar um banco já populado.
As senhas simples das contas públicas servem exclusivamente à demonstração com
dados fictícios; não são um padrão para usuários de uma operação real.
As migrations não são executadas em requisições nem no
build dos serviços; isso evita que um preview altere o banco de produção.

### Índices em produção

A migration `004` cria nove índices e habilita `pg_trgm`. Usa CREATE INDEX comum
dentro da transação do executor; em bancos grandes, programe uma janela por causa
do bloqueio temporário de escritas. Não execute esse arquivo novamente à mão:
o comando de migrations já controla versões e checksums.
Detalhes e resultados locais estão em [performance](performance.md).

## Administração de usuários

A migration `003_add_user_administration.sql` adiciona `ADMIN` ao enum e mantém
todas as contas existentes ativas. Ela já foi aplicada ao ambiente publicado.
Crie a primeira conta administrativa a partir de `backend/`, no banco desejado:

```bash
python -m app.create_user --name "Administrador" --email admin@logos.com --role ADMIN
```

Esse comando sem prefixo usa o banco local de `backend/.env`. Para o Neon, use
`python -m dotenv -f ../.env.local run -- python -m app.create_user` com os mesmos
argumentos de nome, e-mail e cargo. O comando rejeita e-mails duplicados.

O comando solicita a senha sem exibi-la. Faça login para abrir `/usuarios`.
Não existe cadastro público de administradores nem senha administrativa padrão.
O administrador cadastra apenas motoristas e analistas. A desativação bloqueia
o acesso e mantém os dados; a reativação volta a permitir login.
Administradores também atendem incidentes e acessam o quadro, com as mesmas
restrições de responsável e versão dos analistas.

## Atualizar e validar

Publique o código pelo fluxo de Git/deploy da Vercel e aplique as migrations
pendentes explicitamente. Mudanças de variáveis exigem um novo deploy para valer
nas funções; parâmetros `VITE_*` também dependem de novo build do frontend.
Aplicar índices no banco não publica alterações no código das consultas.

Localmente, `npm run dev` na pasta `frontend` encaminha `/api` ao backend em
`localhost:8000`. Com os dois serviços em HTTP local, use `COOKIE_SECURE=false`
e autorize a origem do frontend no backend. Uma `VITE_API_URL` absoluta, se
configurada no `.env` local, continua tendo precedência sobre o padrão relativo.

Para exercitar o roteamento de Services, execute `vercel dev` na raiz, após
autenticar e vincular o projeto à Vercel. Configure a origem e o cookie para o
endereço HTTP local exibido pelo comando. Não substitua a URL relativa do
navegador por uma URL interna de binding.

Antes da entrega online, valide:

- Abrir e recarregar `/login`, `/incidentes`, `/quadro` e `/usuarios` nos perfis permitidos.
- Login, restauração de sessão, logout e acesso por perfil.
- `/api/docs` e `/api/openapi.json`, sem prefixo duplicado.
- `/api/v1/auth/me` sem sessão retorna 401, não HTML do frontend.
- Listagem, registro, atendimento, histórico e conflito entre analistas.
- Cadastro, filtros Ativas/Desativadas/Todas e bloqueio de acesso de contas inativas.

Referências: [Services](https://vercel.com/docs/services),
[roteamento](https://vercel.com/docs/services/routing),
[bindings](https://vercel.com/docs/services/bindings).
