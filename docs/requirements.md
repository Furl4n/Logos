# Logos — Especificação de Requisitos

> Documento vivo do MVP para o case prático da AutoU.
> Última atualização: 19 de outubro de 2026.

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
- Autenticação por e-mail e senha, com os perfis motorista e analista.
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

| Ação | Motorista | Analista |
|---|---:|---:|
| Criar incidente próprio | Sim | Sim, selecionando o motorista associado |
| Consultar incidentes próprios | Sim | Sim |
| Consultar todos os incidentes | Não | Sim |
| Filtrar a fila operacional | Não | Sim |
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
| RF-02 | Exibir prioridade de forma imediata | Cada item apresenta, no mínimo, título, criticidade, categoria, status, veículo e horário de registro; criticidade e status têm diferenciação visual que não depende apenas de cor. |
| RF-03 | Filtrar por criticidade | O analista pode filtrar por Alta, Média e Baixa, inclusive combinando mais de um valor, se essa interação for adotada no front. |
| RF-04 | Filtrar por categoria | O analista pode filtrar pelas categorias previstas neste documento. |
| RF-05 | Combinar filtros | Ao aplicar criticidade e categoria, a lista mostra somente incidentes que atendem a todos os filtros ativos. |
| RF-06 | Consultar detalhes | Ao selecionar um incidente, o analista vê todos os dados disponíveis dele sem perder o contexto da fila. |
| RF-07 | Criar incidente manualmente | O motorista registra um incidente para si; o analista pode registrá-lo selecionando o motorista associado. Em ambos os casos, a API valida os campos obrigatórios e, após sucesso, o novo incidente fica visível na fila apropriada. |
| RF-08 | Alterar status | O analista pode mudar o status de um incidente para um dos status permitidos. A interface mostra a confirmação e reflete o estado retornado pela API. |
| RF-08A | Reclassificar criticidade | O analista pode alterar a criticidade após a triagem. A alteração usa a versão atual do incidente, fica registrada no histórico e atualiza sua posição na fila. |
| RF-09 | Tratar atualização concorrente | A atualização de status envia a versão lida do incidente. Se ele tiver sido alterado por outro analista, a API rejeita a ação sem sobrescrever dados e a interface informa o conflito, oferecendo recarregar os dados. |
| RF-10 | Informar carregamento | Durante uma busca ou atualização, a interface mantém feedback visual e evita ações duplicadas incompatíveis. |
| RF-11 | Informar ausência de dados | Sem incidentes — inicialmente ou após filtros — a interface explica o estado e permite limpar filtros quando aplicável. |
| RF-12 | Tratar falha de rede/API | Se uma operação falhar, a interface exibe mensagem clara, preserva os dados já carregados quando possível e permite nova tentativa. |

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
recebe sua `version`; ao pedir mudança de status, ele deve reenviá-la. A API
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

## 8. Decisões pendentes antes da modelagem de entidades

1. Definir quais campos além dos obrigatórios do case descrevem um incidente
   (por exemplo, título, descrição, veículo, localização e horários).
2. Definir o formato da lista: tabela, cartões ou uma composição dos dois.
3. Definir se haverá filtro por status, apesar de ele não ser obrigatório.

## 9. Evolução futura opcional — abertura por WhatsApp

Após a conclusão e validação do MVP, pode ser avaliada uma integração de
WhatsApp para que o motorista relate um incidente pelo celular. Ela deve criar
o mesmo tipo de incidente usado pelo formulário do analista, passando pelas
mesmas validações e regras de persistência.

Essa evolução não faz parte da entrega obrigatória e não deve influenciar o
primeiro desenho de telas, endpoints ou infraestrutura. Se for implementada,
deve ser apresentada como diferencial e isolada do fluxo principal para não
comprometer a entrega.
