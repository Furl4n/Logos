# Frontend — Logos

Interface em React, TypeScript, Vite e Tailwind CSS para a central de incidentes do analista.

## Organização

Segue o padrão de pastas do frontend do ControlaPET, com telas em `pages/Nome/Index.tsx`:

```text
src/
├── components/
│   ├── layout/       # estrutura compartilhada e navegação lateral
│   ├── ui/           # botão, ícones e modal acessível
│   └── incident/     # card, detalhes e formulário de registro
├── context/          # estado compartilhado dos incidentes locais
├── hooks/            # consultas e mutações da API; estado e filtros da fila local
├── interfaces/       # tipos da interface e contratos da API
├── pages/
│   └── Incidentes/   # Index.tsx, cabeçalho, filtros e lista
├── routes/           # AppRouter.tsx e Routes.tsx
├── service/          # cliente HTTP, sessão, cache e dados de exemplo
├── styles/           # base.css: Tailwind, tema e estilos globais
├── App.tsx
└── main.tsx
```

Os componentes usam classes utilitárias do Tailwind. As cores da marca e a fonte
ficam centralizadas no `@theme` de `src/styles/base.css`. A integração usa
`@tailwindcss/vite`, sem configuração PostCSS separada.

Assim como no Catálogo da referência, `Index.tsx` coordena o estado e os modais;
`IncidentHeader`, `IncidentToolbar` e `IncidentList` cuidam da
apresentação. Os cards e os detalhes ficam nos componentes do domínio.

## Rotas

`routes/Routes.tsx` declara as páginas com React Router e o layout compartilhado.
`routes/AppRouter.tsx` conecta o roteador à aplicação. `AppLayout` renderiza a
página ativa por meio de `Outlet`.

- `/login`: autenticação real com e-mail e senha; contas autenticadas seguem para a fila.
- `/incidentes`: página protegida, adaptada ao cargo retornado pela API.
- `/` e caminhos desconhecidos: redirecionam para `/login`.

A navegação interna usa `Link` e `NavLink`. No deploy, o servidor deverá servir
`index.html` para as rotas da aplicação, permitindo abrir `/incidentes` diretamente.
O `IncidentProvider` mantém os incidentes locais compartilhados entre a fila e
o painel de detalhes.

`AuthRoute` consulta `/auth/me` ao abrir a aplicação, apresenta carregamento ou
erro de conexão com opção de tentar novamente e exige sessão para acessar a fila.
O formulário usa `useLogin`; a barra lateral mostra o usuário real e permite sair.
Ainda não há cadastro público: crie uma conta com `python -m app.create_user` no
backend. Inicie a API e configure a origem do Vite em `FRONTEND_ORIGINS`.
Os incidentes e as ações de atendimento continuam locais até a próxima integração.

## Executar

```bash
cd frontend
npm install
npm run dev
```

Abra o endereço exibido pelo Vite. Para gerar a versão de produção, use `npm run build`.

## Hooks da API

Configure `VITE_API_URL` conforme `.env.example` (padrão: `http://localhost:8000/api/v1`).
O cliente HTTP usa `fetch`, e o React Query compartilha o cache pela aplicação,
seguindo a organização por domínio do ControlaPET.

- `useAuth.ts`: login, usuário autenticado e logout. A API define um cookie `HttpOnly`;
  login e logout limpam o cache para impedir reaproveitamento entre contas.
  O frontend envia cookies com `credentials: include` e o cabeçalho `X-CSRF-Protection`.
  A sessão é consultada em `/auth/me`; o token não é exposto ao JavaScript.
- `useUsers.ts`: motoristas e analistas; habilite as consultas apenas para analistas.
- `useIncidentApi.ts`: lista paginada, detalhes, criação, atualização, atribuição e reabertura.
  As mutações atualizam os detalhes e invalidam as listas. Conflitos HTTP 409
  atualizam o cache com `currentIncident` e continuam disponíveis como erro para a tela.
- `ApiError`: expõe `status`, `data.code`, erros de campos e a ocorrência em conflito.

Os tipos de transporte em `interfaces/Api.ts` preservam enums e UUIDs do backend.
Os tipos de apresentação em `Incident.ts` e os hooks locais continuam atendendo às
telas de demonstração. A próxima etapa é conectar essas telas aos novos hooks,
incluindo os estados de carregamento, erro, sessão expirada e paginação.

## Versão inicial

- Tela principal com identidade laranja e branca e layout responsivo.
- Fila diretamente após os filtros, agrupada em Alta, Média e Baixa, com contagens.
- Cards ativos de alta criticidade destacados por faixa, borda, ícone e texto.
- Exibição inicial de ativos; Fechado, Inconclusivo e Todos disponíveis pelo filtro de status.
- Busca por título, código, motorista, placa e localização.
- Filtros combináveis por criticidade, categoria e status; ação para limpar filtros.
- Criticidade sempre prioritária: Alta, Média e Baixa. Dentro de cada grupo,
  ordenação por data da ocorrência: mais recentes (padrão) ou mais antigos,
  mantida ao limpar filtros.
- Estado sem resultados e painel de consulta da ocorrência.
- Modal de registro com seleção de motorista cadastrado, categoria, criticidade,
  data e hora, título, descrição, caminhão, localização e rota opcional.
- Validação de campos obrigatórios, data não futura e limites de título (160),
  identificador do caminhão (10) e rota (50 caracteres).
- Inclusão imediata na fila ao registrar.
- Navegação por teclado, fechamento dos painéis com Escape e retorno do foco.

Limpar filtros retorna à visão de incidentes ativos.

Os dados são exemplos locais, sem integração com API. Os novos registros ficam em
memória durante a sessão e são descartados ao recarregar a página. A seleção de
motorista usa cadastros de exemplo; a integração com usuários reais depende da API.
A tela de login ainda não autentica; os links de demonstração permitem revisar os dois perfis. A fonte IBM Plex Sans é carregada pelo
Google Fonts; o sistema usa uma fonte alternativa quando ela não está disponível.

Ao salvar, os filtros retornam à visão de ativos e a ordenação temporal volta para
mais recentes, mantendo a criticidade como prioridade. O formulário fica em
`components/incident/IncidentForm.tsx`, separado do modal e do estado da página.

## Atendimento local

O painel de detalhe permite assumir uma ocorrência não atribuída. A sessão de
exemplo usa Lucas Costa (`service/mockAnalysts.ts`); assumir atribui a ele e muda
o status para Em investigação. Apenas o responsável edita status e criticidade,
adiciona observações ou transfere o atendimento ativo para outro analista.
As observações são entradas imutáveis do histórico geral, com autor e horário;
o campo fica vazio após salvar para receber uma nova entrada.
Salvar atualiza a fila e seus filtros imediatamente; o painel permanece aberto.

Aberto e Em investigação são ativos; Fechado e Inconclusivo encerram o atendimento
e exigem uma nova observação. Encerrados ficam somente para consulta, com ação de
reabrir disponível para qualquer analista: exige justificativa, retorna para Aberto
e atribui a ocorrência a quem reabriu. As entradas anteriores permanecem intactas.
Essas regras também são aplicadas pelo estado local, não somente pelos componentes.

O estado local compara a versão lida com a atual antes de salvar. Em caso de
divergência, mantém a edição e oferece recarregar os dados, descartando o rascunho.
Isso prepara a interface para o conflito da API; não implementa concorrência entre
sessões ou autenticação real. Tudo é descartado ao
recarregar a página.

O protótipo usa os quatro status previstos nos requisitos. A migration inicial já
prevê responsável e entradas de observação no histórico geral. A integração ainda
deve implementar autenticação, autorização no backend e a
persistência efetiva desses dados.

## Área do motorista

A página `/incidentes` usa o perfil do `DemoProfileProvider` para adaptar a lista,
os filtros e os modais. No perfil motorista, limita a consulta por `driverId` do
motorista de exemplo (`currentDriver`, Carlos Henrique).
O formulário já vincula esse motorista, sem permitir selecionar outro. Novos
registros identificam o motorista como autor do histórico e aparecem também na
central do analista enquanto a sessão local estiver aberta.

Os detalhes mostram responsável e histórico somente para consulta, sem assumir,
transferir, editar ou reabrir. O estado local também rejeita alterações de atendimento
nesse perfil e vincula os registros ao motorista atual.

O perfil pode ser escolhido nos links da demonstração do login ou no seletor
temporário do menu lateral expandido. Alternar o perfil limpa filtros e fecha modais,
mas mantém os incidentes na memória. Não há página ou item de menu duplicado.
As rotas ainda são públicas; esse estado de demonstração não substitui a autenticação
e a autorização que deverão existir no backend.

## Cenário de revisão visual

`service/mockIncidents.ts` fornece 100 ocorrências determinísticas, com diferentes
criticidades, status, títulos longos, motoristas e locais. Os tempos relativos usam
o instante fixo de demonstração de 19/10/2026 às 15h (UTC−3).

A visão inicial mostra apenas as ocorrências ativas; use status `Todos` para
exibir as 100. Os cards compactos mantêm títulos em uma linha, com reticências
quando necessário, e o tempo à direita. A localização fica nos detalhes da
ocorrência. A responsividade será refinada em outra etapa. Esse cenário permite revisar a
densidade no navegador, sem representar uma medição de tempo de triagem.
