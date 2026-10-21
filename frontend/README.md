# Frontend — Logos

React, TypeScript, Vite e Tailwind CSS para a central de incidentes.
A estrutura segue o padrão do ControlaPET: páginas modularizadas, hooks por
domínio, contratos em interfaces e acesso HTTP em service.

## Executar

```bash
cd frontend
npm install
npm run dev
```

Configure `VITE_API_URL` conforme `.env.example` (padrão: `/api/v1`, no mesmo
domínio). O Vite encaminha `/api` ao backend local em `localhost:8000`.
Inicie o backend e configure a origem do Vite em
`FRONTEND_ORIGINS`. Para HTTP local, use `COOKIE_SECURE=false` no backend.
Administradores gerenciam contas operacionais em `/usuarios`. A primeira conta
ADMIN é criada pelo comando `python -m app.create_user --role ADMIN` no backend,
com os argumentos de nome e e-mail. O login redireciona cada cargo à sua área;
administradores não acessam o atendimento de incidentes.

`npm run build` verifica TypeScript e gera a versão de produção;
`npm run lint` executa a análise estática.

## Organização

```text
src/
├── components/
│   ├── layout/       # sidebar, menu da conta e estrutura compartilhada
│   ├── ui/           # campos, seleção, calendário, botões e modais
│   └── incident/     # cards, formulário e detalhes
├── hooks/            # autenticação, consultas, mutações e filtros
├── contexts/         # preferência de tema e provedor compartilhado
├── interfaces/       # contratos da API e tipos de apresentação
├── pages/
│   ├── Login/
│   └── Incidentes/   # coordenação, filtros, cabeçalho e lista
├── routes/           # roteador e proteção da sessão
├── service/          # fetch, React Query e tradução dos contratos
└── styles/           # Tailwind, tema e estilos globais
```

O tema fica em `@theme` de `styles/base.css`, com identidade laranja e branca.
A fonte IBM Plex Sans vem do Google Fonts, com alternativa local.
No deploy, configure fallback para `index.html` nas rotas do frontend.
O `vercel.json` da raiz já inclui esse fallback dentro do serviço frontend;
consulte [Deploy na Vercel](../docs/deploy.md).

## Tema

O seletor oferece claro, escuro e sistema na tela de login e em Tema no menu
da conta. O padrão acompanha o sistema, inclusive quando ele muda com a página
aberta. A preferência é salva em `localStorage` como `logos.theme` e sincronizada
entre abas; se o armazenamento estiver indisponível, a troca continua funcionando
na sessão atual. Esse valor contém somente a preferência visual.

`ThemeProvider` e `useTheme` compartilham a escolha. O atributo `data-theme` no
elemento raiz seleciona as cores semânticas de superfícies, textos, bordas e estados.
O HTML aplica o tema antes de carregar o React para evitar um clarão na abertura.

## Autenticação

`/login` usa `useLogin`. O backend define um cookie HttpOnly; o frontend envia
`credentials: include` e o cabeçalho `X-CSRF-Protection` nas alterações.
O token não é disponibilizado ao JavaScript. Login e logout limpam o cache.
`AuthRoute` consulta `/auth/me` para restaurar a sessão e proteger `/incidentes`.
Falhas de conexão oferecem nova tentativa; sessão ausente direciona ao login.
O menu da conta mostra o usuário real e permite sair.

## Fila e registro

Busca e ordenação permanecem visíveis. Analistas também selecionam responsável
(Todos, Meus atendimentos ou Sem responsável) diretamente na barra, com aplicação
imediata. O botão Filtros abre um painel abaixo dele com criticidade, categoria
e status. As escolhas do painel são aplicadas juntas
ao confirmar, reiniciando a paginação. Fechar descarta o rascunho. O botão mostra
a quantidade de filtros diferentes do padrão, sem contar busca e ordenação.
O painel acompanha o botão durante a rolagem, limita sua largura à tela e fecha
ao clicar fora ou pressionar Escape.

`useIncidents` coordena os filtros, com busca após 300 ms. Criticidade, categoria,
status e ordenação são enviados à API; mudanças voltam à primeira página.
Cada página contém até 100 incidentes, com navegação quando há mais resultados.
A ordenação do servidor prioriza criticidade e depois o horário escolhido.
O backend restringe motoristas aos próprios incidentes.

`incidentMapper.ts` traduz enums, referências e histórico. Cards exibem o código
público, título truncado e tempo relativo; os detalhes são consultados pelo UUID.
A interface apresenta carregamento, erro com nova tentativa e lista vazia.

O formulário registra na API, usa motoristas reais e vincula automaticamente
a conta autenticada quando o cargo é motorista. Após salvar, invalida a fila,
limpa os filtros e retorna à ordenação mais recente. Os campos validam data não
futura e limites de título (160), caminhão (10) e rota opcional (50 caracteres).

## Atendimento

A página `/quadro`, exclusiva de analistas, mostra incidentes ativos nas colunas
Sem responsável, Meus atendimentos e Com outros analistas. Cada coluna consulta
a API com seu filtro de atribuição, ordena por criticidade e horário e carrega
20 registros por vez conforme a rolagem, com contagem total e sem controles de
página. Os cards reutilizam o estilo da lista,
exibem o rótulo de criticidade e abrem os mesmos detalhes. Não há arrastar cards.
Em telas menores que 1100 px, um seletor mostra uma lista por vez (Sem responsável,
Meus ou Outros), preservando a rolagem e os registros carregados de cada coluna.
Em telas maiores, as três colunas aparecem lado a lado. A página ocupa a altura
da tela; somente as listas têm rolagem vertical.

Detalhes, responsável e histórico são consultados na API. Analistas podem assumir
ocorrências não atribuídas; apenas o responsável edita e transfere atendimentos
ativos. Fechado e Inconclusivo exigem observação. Qualquer analista pode reabrir
uma ocorrência encerrada com justificativa, assumindo sua responsabilidade.
Motoristas acessam somente a consulta. As regras também são impostas no backend.

`useIncidentAttendance` adapta as ações da interface aos hooks da API.
Requisições enviam a versão lida; conflitos HTTP 409 atualizam o cache com
`currentIncident` e exibem que a alteração não foi salva. A tela bloqueia o envio
enquanto consulta os dados atuais e depois permite uma nova tentativa manual com
a versão atualizada, preservando o rascunho. Não há reenvio automático.
Durante o envio, os campos são bloqueados. Sucessos atualizam a fila e o histórico.
Transferências consultam analistas reais, excluindo o usuário atual.
`ApiError` expõe status HTTP, código, erros de campo e ocorrência em conflito.

O contexto local e os mocks antigos foram removidos após concluir a integração.
Para popular o banco de desenvolvimento, consulte `app.seed_incidents` no backend.

## Telas menores

No celular, um cabeçalho compacto mantém o acesso ao início e ao menu da conta.
A busca e as ações se reorganizam em linhas; os filtros ficam no painel.
Seleções longas são truncadas no campo e aparecem completas na lista de opções. Os cards
distribuem título e metadados em linhas, mantendo o título truncado.
Modais têm margens menores e rolagem interna; detalhes e atendimento adaptam
as colunas ao espaço disponível. Em tablets, a navegação lateral usa ícones;
em telas grandes, apresenta também os textos.
