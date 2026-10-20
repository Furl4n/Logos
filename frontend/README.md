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

Configure `VITE_API_URL` conforme `.env.example` (padrão:
`http://localhost:8000/api/v1`). Inicie o backend e configure a origem do Vite em
`FRONTEND_ORIGINS`. Para HTTP local, use `COOKIE_SECURE=false` no backend.
Contas são criadas pelo comando `python -m app.create_user` no backend.

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

## Autenticação

`/login` usa `useLogin`. O backend define um cookie HttpOnly; o frontend envia
`credentials: include` e o cabeçalho `X-CSRF-Protection` nas alterações.
O token não é disponibilizado ao JavaScript. Login e logout limpam o cache.
`AuthRoute` consulta `/auth/me` para restaurar a sessão e proteger `/incidentes`.
Falhas de conexão oferecem nova tentativa; sessão ausente direciona ao login.
O menu da conta mostra o usuário real e permite sair.

## Fila e registro

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
A responsividade será refinada em uma etapa posterior.
