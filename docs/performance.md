# Consultas e índices

A migration `004_optimize_queries.sql` adiciona índices para as consultas usadas
pela interface. A validação foi feita no PostgreSQL 17 local do Docker; nenhuma
alteração foi aplicada automaticamente ao Neon de produção.

## Consultas

- Incidentes: total e página continuam na mesma instrução SQL e no mesmo snapshot.
  `filtered AS NOT MATERIALIZED` permite ao PostgreSQL planejar a contagem e a
  página separadamente, sem materializar todos os resumos. Os joins que recuperam
  nomes do motorista e responsável são feitos somente após LIMIT/OFFSET.
- Busca: separa candidatos encontrados no próprio incidente daqueles encontrados
  pelo nome do motorista. `UNION` deduplica os IDs antes da filtragem e paginação;
  o termo continua parametrizado e os curingas informados são tratados literalmente.
- Usuários: não executa `ILIKE '%%'` quando não há busca; situação é uma condição
  direta em `is_active`. Contagem e página agora usam uma única instrução e snapshot,
  preservando o total mesmo em página vazia. Offset é limitado ao BIGINT do PostgreSQL.

## Índices

| Índice | Consulta atendida |
|---|---|
| `incident_history_incident_version_idx` | Eventos de um incidente e ordem do histórico |
| `incidents_driver_idx` | Incidentes do motorista e busca pelo nome dele |
| `incidents_analyst_idx` | Responsável, transferências e verificação de atendimentos ativos |
| `incidents_active_priority_idx` | Fila ativa: criticidade, horário decrescente e UUID |
| `incidents_category_status_idx` | Categoria combinada com status |
| `incidents_search_idx` | Busca parcial em título, código, placa e localização |
| `users_search_idx` | Busca parcial em nome e e-mail |
| `users_status_name_idx` | Contas ativas/inativas, ordenadas por nome e UUID |
| `users_active_role_name_idx` | Listas auxiliares de motoristas e responsáveis ativos |

Os dois índices de busca usam GIN/`pg_trgm`. A migration exige permissão para
instalar essa extensão. Não duplica índices de chave primária ou e-mail único.

## Medição local — 21/10/2026

Comparação entre a consulta anterior e a otimizada com os novos índices, usando
`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`. Massa sintética em tabelas temporárias:
40.000 incidentes, 80.000 eventos e 5.000 usuários; `ANALYZE` executado antes das
medições. Foram usados quatro planos por cenário de listagem; valores abaixo
são medianas de Execution Time, sem transporte HTTP ou renderização.

| Cenário | Antes | Depois |
|---|---:|---:|
| Fila ativa, primeira página de 100 entre 20.000 ativos | 104,154 ms | 16,861 ms |
| Incidentes de um motorista, 9 resultados | 9,822 ms | 0,558 ms |
| Busca seletiva, 40 resultados | 193,470 ms | 3,254 ms |
| Categoria e status, 2.000 resultados | 21,550 ms | 12,021 ms |

Os planos otimizados usaram os índices de fila, motorista, categoria/status e
trigramas nos respectivos cenários. A massa temporária e seus índices foram
revertidos ao final; usuários e incidentes existentes não foram alterados.

Essas medições não são um teste de carga concorrente, nem uma promessa de
latência na Vercel/Neon. Distribuição dos dados, cache, concorrência e hardware
influenciam o resultado. Com poucas linhas, uma varredura sequencial pode ser
mais barata; não forçamos o uso de índices.

## Limites e operação

- COUNT exato continua tendo custo proporcional aos registros que atendem ao filtro.
- OFFSET ainda tem custo crescente em páginas profundas; cursor pode ser considerado
  quando houver volume que justifique mudar o contrato atual de paginação.
- O índice parcial da fila prioriza a ordenação padrão de mais recentes. Mais antigos
  e combinações alternativas podem precisar de ordenação adicional.
- Buscas muito curtas ou muito amplas podem ter pouco benefício com trigramas.
- Índices ocupam espaço e aumentam o custo de escrita; ampliar só após medir.
- A migration usa CREATE INDEX comum, compatível com o executor transacional.
  Em produção com muitas escritas, planeje uma janela, pois a construção bloqueia
  gravações. CREATE INDEX CONCURRENTLY exigiria execução fora da transação atual.
- Após importações grandes, execute ANALYZE nas tabelas envolvidas para atualizar
  as estatísticas do planejador. Preserve o autovacuum do PostgreSQL.

Referências: [materialização de CTEs](https://www.postgresql.org/docs/17/queries-with.html),
[pg_trgm](https://www.postgresql.org/docs/17/pgtrgm.html) e
[índices multicoluna](https://www.postgresql.org/docs/17/indexes-multicolumn.html).
