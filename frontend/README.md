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
├── hooks/            # estado e filtros da fila
├── interfaces/       # tipos dos incidentes
├── pages/
│   └── Incidentes/   # Index.tsx, cabeçalho, filtros e lista
├── routes/           # AppRouter.tsx e Routes.tsx
├── service/          # dados de exemplo; futura integração com a API
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

- `/incidentes`: central de incidentes.
- `/` e caminhos desconhecidos: redirecionam para `/incidentes`.

A navegação interna usa `Link` e `NavLink`. No deploy, o servidor deverá servir
`index.html` para as rotas da aplicação, permitindo abrir `/incidentes` diretamente.
O `IncidentProvider` mantém os incidentes locais compartilhados entre a central e
a navegação lateral.

## Executar

```bash
cd frontend
npm install
npm run dev
```

Abra o endereço exibido pelo Vite. Para gerar a versão de produção, use `npm run build`.

## Versão inicial

- Tela principal com identidade laranja e branca e layout responsivo.
- Fila diretamente após os filtros, agrupada em Alta, Média e Baixa, com contagens.
- Cards ativos de alta criticidade destacados por faixa, borda, ícone e texto.
- Exibição inicial de ativos; resolvidos e todos disponíveis pelo filtro de status.
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
- Inclusão imediata na fila e atualização da contagem lateral ao registrar.
- Navegação por teclado, fechamento dos painéis com Escape e retorno do foco.

Limpar filtros retorna à visão de incidentes ativos.

Os dados são exemplos locais, sem integração com API. Os novos registros ficam em
memória durante a sessão e são descartados ao recarregar a página. A seleção de
motorista usa cadastros de exemplo; a integração com usuários reais depende da API.
Login ainda não está disponível. A fonte IBM Plex Sans é carregada pelo
Google Fonts; o sistema usa uma fonte alternativa quando ela não está disponível.

Ao salvar, os filtros retornam à visão de ativos e a ordenação temporal volta para
mais recentes, mantendo a criticidade como prioridade. O formulário fica em
`components/incident/IncidentForm.tsx`, separado do modal e do estado da página.

## Atendimento local

O painel de detalhe permite assumir uma ocorrência não atribuída, alterar status e
criticidade e registrar a resolução, obrigatória para marcar como resolvido.
Assumir define o responsável como `Analista atual` e muda o status para andamento.
As alterações ficam no histórico geral, com autor, data e valores alterados.
Salvar atualiza a fila e seus filtros imediatamente; o painel permanece aberto.

Ocorrências resolvidas ficam somente para consulta. A ação explícita de reabrir
exige justificativa e retorna o status para Aberto, preservando o responsável.
A resolução anterior é preservada no histórico; o campo de resolução é limpo para
o novo atendimento. A reabertura incrementa a versão e usa a mesma verificação de
conflito. O bloqueio de edição também é aplicado pelo estado local.

O estado local compara a versão lida com a atual antes de salvar. Em caso de
divergência, mantém a edição e oferece recarregar os dados, descartando o rascunho.
Isso prepara a interface para o conflito da API; não implementa concorrência entre
sessões, autenticação ou exclusividade de atendimento. Tudo é descartado ao
recarregar a página.

O protótipo mantém os três status já usados na tela (Aberto, Andamento e Resolvido).
Antes da integração, será necessário alinhar esses rótulos aos quatro status
previstos no contrato e nos requisitos. Responsável e texto da resolução também
precisam ser incorporados ao contrato e ao banco se esse fluxo for mantido.

## Cenário de revisão visual

`service/mockIncidents.ts` fornece 100 ocorrências determinísticas, com diferentes
criticidades, status, títulos longos, motoristas e locais. Os tempos relativos usam
o instante fixo de demonstração de 19/10/2026 às 15h (UTC−3).

A visão inicial mostra apenas as ocorrências ativas; use status `Todos` para
exibir as 100. Os cards compactos mantêm títulos em uma linha, com reticências
quando necessário, e o tempo à direita. A localização fica nos detalhes da
ocorrência. A responsividade será refinada em outra etapa. Esse cenário permite revisar a
densidade no navegador, sem representar uma medição de tempo de triagem.
