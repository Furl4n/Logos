# Logos — Especificação de Requisitos

> Documento vivo do MVP para o case prático da AutoU.
> Última atualização: 21 de outubro de 2026.

## 1. Objetivo do produto

O **Logos** é uma central de resposta a incidentes para uma operação logística.
Ele deve permitir que analistas visualizem e priorizem rapidamente incidentes
de uma frota, filtrem a operação por exceção e atualizem o ciclo de vida de
cada ocorrência de forma segura.

O foco é um MVP de missão crítica: clareza sob pressão, integridade dos dados
e comportamento compreensível diante de rede instável ou atualizações
concorrentes.

## 2. Escopo do MVP

### Incluído

- API Python que persiste e gerencia incidentes.
- Interface React que consome a API.
- Autenticação por e-mail e senha, com os perfis motorista, analista e administrador.
- Gestão de contas operacionais pelo administrador: cadastro, listagem, desativação e reativação.
- Visualização de muitos incidentes (o seed deve conter pelo menos 100).
- Filtros por criticidade e categoria.
- Criação manual de incidente pela interface do motorista ou do analista.
- Consulta de detalhes de um incidente.
- Atualização do status de um incidente com proteção contra concorrência.
- Estados de carregamento, vazio, erro e atualização em andamento.
- Documentação de execução, arquitetura e deploy.

### Fora do escopo inicial

- Integração com WhatsApp, telemetria ou rastreadores dos caminhões.
- Notificações em tempo real.
- Gestão de frota, motoristas, rotas ou SLA.
- Exclusão de incidentes.
- Edição geral de todos os campos de um incidente depois de criado.

Esses itens podem ser citados como evoluções futuras, mas não devem gerar
telas, endpoints ou complexidade no MVP sem uma decisão posterior.

## 3. Perfis e cenário principal

**Analista da Central:** recebe informações de campo, identifica ocorrências
prioritárias, filtra a fila operacional, consulta detalhes e atualiza o status
do incidente sob pressão.

**Motorista:** cria incidentes associados à própria conta e acompanha somente
as suas ocorrências. Ele não altera o status operacional; essa decisão cabe ao
analista.

### Permissões por perfil

**Administrador:** possui acesso exclusivo à gestão em `/usuarios`, lista e busca contas,
cria motoristas e analistas, desativa ou reativa contas operacionais.
Também possui todas as permissões de analista, inclusive atendimento e quadro;
só altera atendimentos ativos dos quais é responsável. Contas administrativas são criadas pelo terminal.
Contas inativas não acessam a API, mesmo com sessão anterior; seus dados são
preservados. Analistas precisam transferir atendimentos ativos antes da desativação.

| Ação | Motorista | Analista |
|---|---:|---:|
| Criar incidente próprio | Sim | Sim, selecionando o motorista associado |
| Consultar incidentes próprios | Sim | Sim |
| Consultar todos os incidentes | Não | Sim |
| Filtrar incidentes acessíveis | Sim, somente os próprios | Sim, toda a operação |
| Alterar status, criticidade e adicionar observações | Não | Somente o responsável, em atendimento ativo |
| Assumir ocorrência sem responsável | Não | Sim |
| Transferir atendimento ativo | Não | Somente o responsável |
| Reabrir ocorrência encerrada | Não | Sim, com justificativa e assumindo a responsabilidade |

Fluxo principal:

1. O analista abre o painel e vê a fila priorizada.
2. Quando recebe uma ocorrência, ele registra manualmente o incidente pelo
   formulário da interface.
3. Ele filtra a fila por criticidade e/ou categoria quando necessário.
4. Ele abre um incidente para entender o contexto.
5. Ele atualiza o status da ocorrência.
6. O sistema confirma a atualização ou informa claramente um conflito ou erro.

## 4. Requisitos funcionais

| ID | Requisito | Critério de aceite |
|---|---|---|
| RF-01 | Listar incidentes | O analista vê a lista de incidentes retornada pela API, ordenada para dar destaque à maior criticidade e, em seguida, aos mais recentes. |
| RF-02 | Exibir prioridade de forma imediata | Cada item apresenta título, categoria, status, veículo e horário da ocorrência; a criticidade é identificada pelo grupo com rótulo textual e pela faixa lateral, sem depender apenas de cor. |
| RF-03 | Filtrar por criticidade | Cada perfil pode selecionar Alta, Média ou Baixa, um valor por vez, dentro de seu escopo de consulta. |
| RF-04 | Filtrar por categoria | O analista pode filtrar pelas categorias previstas neste documento. |
| RF-05 | Combinar filtros | Ao aplicar criticidade e categoria, a lista mostra somente incidentes que atendem a todos os filtros ativos. |
| RF-06 | Consultar detalhes | Ao selecionar um incidente, o analista vê todos os dados disponíveis dele sem perder o contexto da fila. |
| RF-07 | Criar incidente manualmente | O motorista registra um incidente para si; o analista pode registrá-lo selecionando o motorista associado. Em ambos os casos, a API valida os campos obrigatórios e, após sucesso, o novo incidente fica visível na fila apropriada. |
| RF-08 | Alterar status | O analista pode mudar o status de um incidente para um dos status permitidos. A interface mostra a confirmação e reflete o estado retornado pela API. |
| RF-08A | Reclassificar criticidade | O analista pode alterar a criticidade após a triagem. A alteração usa a versão atual do incidente, fica registrada no histórico e atualiza sua posição na fila. |
| RF-09 | Tratar atualização concorrente | Toda atualização do atendimento envia a versão lida, inclusive observação, criticidade, atribuição e reabertura. Se houver divergência, a API rejeita sem sobrescrever dados e a interface oferece recarregar. |
| RF-10 | Informar carregamento | Durante uma busca ou atualização, a interface mantém feedback visual e evita ações duplicadas incompatíveis. |
| RF-11 | Informar ausência de dados | Sem incidentes — inicialmente ou após filtros — a interface explica o estado e permite limpar filtros quando aplicável. |
| RF-12 | Tratar falha de rede/API | Se uma operação falhar, a interface exibe mensagem clara, preserva os dados já carregados quando possível e permite nova tentativa. |
| RF-13 | Buscar e ordenar | Ambos os perfis podem buscar por título, código, motorista, placa e localização, filtrar por status e inverter a ordem temporal sem remover a precedência da criticidade. |
| RF-14 | Consultar além de 100 incidentes | A listagem é paginada, inicialmente com até 100 registros, e permite carregar as páginas seguintes sem limitar o total do sistema. |

## 5. Regras de negócio

### 5.1 Categorias permitidas

- `VEHICLE_ACCIDENT` — Acidente com veículo
- `INJURY_ACCIDENT` — Acidente com vítimas
- `UNUSUAL_WEATHER` — Condição climática atípica na pista
- `MECHANICAL_ISSUE` — Problema mecânico
- `ROAD_BLOCK` — Bloqueio de pista

### 5.2 Criticidades permitidas

- `HIGH` — Alta
- `MEDIUM` — Média
- `LOW` — Baixa

Na criação, o usuário seleciona a criticidade inicial independentemente da
categoria, pois ocorrências do mesmo tipo podem ter impactos operacionais
distintos. O analista pode reclassificar a criticidade após a triagem.

### 5.3 Status permitidos

- `OPEN` — Aberto
- `UNDER_INVESTIGATION` — Em investigação
- `CLOSED` — Fechado
- `INCONCLUSIVE` — Inconclusivo

Aberto e Em investigação são ativos. Fechado e Inconclusivo encerram o atendimento
e bloqueiam alterações. Somente o responsável pode alterar status, criticidade
ou adicionar observações a um atendimento ativo. O encerramento exige uma nova
observação com o resultado ou a justificativa de inconclusão.

Qualquer analista pode assumir uma ocorrência sem responsável; isso inicia a
investigação. O responsável pode transferir um atendimento ativo a outro analista.
Qualquer analista pode reabrir uma ocorrência encerrada com justificativa; ela
retorna para Aberto e passa a ser atribuída a quem reabriu. Assunção, transferência
e reabertura usam versão e ficam registradas no histórico geral.

As observações são entradas imutáveis no histórico geral, com autor e horário;
uma atualização não substitui textos anteriores. Analistas consultam todas as
ocorrências; motoristas consultam somente as próprias, sem editar o atendimento.

### 5.4 Priorização padrão da fila

1. Criticidade: Alta, Média, Baixa.
2. Dentro da mesma criticidade: incidente mais recente primeiro.

A visão inicial mostra somente ativos. Fechado e Inconclusivo continuam
consultáveis pelos filtros de status ou pela opção Todos.

### 5.5 Concorrência

Cada incidente possui uma versão inteira. Ao ler um incidente, o frontend
recebe sua `version`; em toda atualização do atendimento, ele deve reenviá-la. A API
só atualiza se a versão recebida for a atual, incrementa-a após sucesso e
responde `409 Conflict` caso exista divergência. Nenhuma atualização deve ser perdida silenciosamente.

## 6. Requisitos não funcionais

| ID | Requisito | Critério de aceite |
|---|---|---|
| RNF-01 | Usabilidade | A finalidade da aplicação, a prioridade e os filtros são compreensíveis sem instruções externas. |
| RNF-02 | Responsividade | A interface é utilizável em telas pequenas e grandes, sem esconder ações essenciais. |
| RNF-03 | Acessibilidade básica | Controles possuem rótulos; foco de teclado é visível; informação crítica não é comunicada exclusivamente por cor. |
| RNF-04 | Validação | A API rejeita campos inválidos com respostas de erro consistentes e não persiste dados parciais. |
| RNF-05 | Resiliência | Falhas temporárias e lentidão não deixam a interface em estado ambíguo ou travado. |
| RNF-06 | Segurança básica | A API valida entrada, limita CORS aos ambientes necessários e não expõe segredos no repositório. |
| RNF-07 | Qualidade | Código modular, nomes claros, README de setup e decisões de arquitetura justificadas. |

## 7. Entregáveis do processo seletivo

- Repositório público com frontend, backend, instruções de setup e arquitetura.
- Vídeo público de até cinco minutos, demonstrando integração, estados de
  interface, filtros e segurança básica da API.
- Aplicação acessível online por link público.
- Links enviados exclusivamente pela plataforma de recrutamento até o prazo do
  e-mail de confirmação.

## 8. Decisões consolidadas e estado atual

- Página complementar `/quadro`, para analistas e administradores, para visualizar incidentes
  ativos por atribuição: Sem responsável, Meus atendimentos e Com outros analistas.
  Cada coluna tem contagem, carregamento ao rolar e prioridade por criticidade; os cards abrem
  os detalhes existentes, sem interação de arrastar.

- Uma página `/incidentes`, adaptada ao perfil autenticado, com cards agrupados
  por criticidade, busca e ordem temporal visíveis. Criticidade, categoria e status
  ficam no painel de filtros; analistas também podem selecionar Todos, Meus
  atendimentos ou Sem responsável diretamente na barra. O painel aplica as escolhas na confirmação
  e o botão indica a quantidade de filtros diferentes do padrão.
- Registro com título, descrição, motorista, caminhão, localização, categoria,
  criticidade, data da ocorrência e código opcional de rota/entrega.
- UUID identifica o recurso; código público `INC-...` identifica o chamado visualmente.
- Contratos e validações estão em `api-contract.md`. Backend e frontend já usam
  a API para autenticação, paginação, estados de rede, registro e atendimento.
- A migration precisa contemplar o código público e o evento de criação no
  histórico, preservando a autoria sem campo extra no incidente.

## 9. Evolução futura opcional — abertura por WhatsApp

Após a conclusão e validação do MVP, pode ser avaliada uma integração de
WhatsApp para que o motorista relate um incidente pelo celular. Ela deve criar
o mesmo tipo de incidente usado pelo formulário do analista, passando pelas
mesmas validações e regras de persistência.

Essa evolução não faz parte da entrega obrigatória e não deve influenciar o
primeiro desenho de telas, endpoints ou infraestrutura. Se for implementada,
deve ser apresentada como diferencial e isolada do fluxo principal para não
comprometer a entrega.
