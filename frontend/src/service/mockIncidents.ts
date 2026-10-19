import type { Incident } from "../interfaces/Incident"
import { analysts } from './mockAnalysts'

const initialIncidents: Incident[] = [
  { id: 'INC-1048', title: 'Falha no sistema de freios', driver: 'Carlos Henrique', plate: 'GHT-4J82', location: 'BR-116, km 214 · Curitiba, PR', occurredAt: "2026-10-19T14:48:00-03:00", time: 'há 12 min', severity: 'Alta', status: 'Aberto', category: 'Problema mecânico', description: 'Motorista identificou perda de pressão no sistema de freios. Veículo parado no acostamento, aguardando assistência mecânica.', route: 'RT-0284' },
  { id: 'INC-1047', title: 'Colisão na alça de acesso', driver: 'Marcos Oliveira', plate: 'FQP-8A19', location: 'BR-381, km 492 · Betim, MG', occurredAt: "2026-10-19T14:32:00-03:00", time: 'há 28 min', severity: 'Alta', status: 'Em investigação', category: 'Acidente com veículo', description: 'Colisão com outro veículo na alça de acesso. Área sinalizada e motorista em local seguro.', route: 'RT-0281' },
  { id: 'INC-1046', title: 'Interdição parcial da rodovia', driver: 'Ana Souza', plate: 'BWR-2C67', location: 'BR-101, km 115 · Itajaí, SC', occurredAt: "2026-10-19T14:15:00-03:00", time: 'há 45 min', severity: 'Média', status: 'Em investigação', category: 'Bloqueio de via', description: 'Obras causaram bloqueio de uma faixa. Motorista aguarda liberação para seguir a entrega.', route: 'RT-0279' },
  { id: 'INC-1045', title: 'Superaquecimento do motor', driver: 'José Roberto', plate: 'KLM-9D34', location: 'SP-330, km 87 · Campinas, SP', occurredAt: "2026-10-19T14:00:00-03:00", time: 'há 1 h', severity: 'Média', status: 'Aberto', category: 'Problema mecânico', description: 'Temperatura do motor acima do normal. Veículo estacionado em ponto de apoio para avaliação.', route: 'RT-0276' },
  { id: 'INC-1044', title: 'Chuva intensa no trecho', driver: 'Paulo Santos', plate: 'NXY-5E21', location: 'BR-376, km 662 · Guaratuba, PR', occurredAt: "2026-10-19T13:00:00-03:00", time: 'há 2 h', severity: 'Baixa', status: 'Fechado', category: 'Condição climática', description: 'Baixa visibilidade por chuva forte. Motorista reduziu a velocidade e informou possível atraso.', route: 'RT-0273' },
]

// Cenário determinístico de 100 ocorrências para revisar densidade, filtros e prioridade.
// Os tempos relativos usam o mesmo instante de referência dos exemplos iniciais.
const referenceTime = Date.parse('2026-10-19T15:00:00-03:00')
const drivers = ['Carlos Henrique', 'Marcos Oliveira', 'Ana Souza', 'José Roberto', 'Paulo Santos', 'Juliana Pereira', 'Ricardo Almeida', 'Fernanda Lima']
const locations = ['BR-116, km 214 · Curitiba, PR', 'BR-381, km 492 · Betim, MG', 'BR-101, km 115 · Itajaí, SC', 'SP-330, km 87 · Campinas, SP', 'BR-376, km 662 · Guaratuba, PR', 'BR-040, km 508 · Ribeirão das Neves, MG']
const scenarios: Pick<Incident, 'title' | 'category' | 'description'>[] = [
  { title: 'Falha no sistema de freios durante descida de serra com necessidade de assistência no local', category: 'Problema mecânico', description: 'Motorista relatou falha nos freios e imobilizou o veículo. Aguarda orientação da central e assistência no local.' },
  { title: 'Colisão entre veículos com motorista ferido e bloqueio da faixa de acesso ao terminal', category: 'Acidente com feridos', description: 'Motorista informou colisão com feridos. Serviços de emergência acionados; a central acompanha o atendimento.' },
  { title: 'Bloqueio da rodovia por queda de árvore', category: 'Bloqueio de via', description: 'Uma árvore bloqueia a passagem. Motorista está em local seguro aguardando orientação sobre desvio.' },
  { title: 'Pane elétrica com veículo parado no acostamento próximo à entrada do centro de distribuição', category: 'Problema mecânico', description: 'Veículo apresentou falha elétrica. Motorista sinalizou o acostamento e aguarda assistência.' },
  { title: 'Chuva forte e baixa visibilidade', category: 'Condição climática', description: 'Motorista relatou chuva intensa e reduziu a velocidade para seguir em segurança.' },
  { title: 'Colisão lateral durante manobra no pátio', category: 'Acidente com veículo', description: 'Colisão durante manobra de acesso ao pátio. Motorista aguarda avaliação dos danos.' },
]

const additionalIncidents = Array.from({ length: 95 }, (_, index): Incident => {
  const scenario = scenarios[index % scenarios.length]
  const minutesAgo = 125 + index * 7
  const hours = Math.floor(minutesAgo / 60)
  const minutes = minutesAgo % 60
  return {
    ...scenario,
    id: `INC-${1043 - index}`,
    driver: drivers[index % drivers.length],
    plate: `ABC-${String(1000 + index)}`,
    location: locations[(index * 5) % locations.length],
    occurredAt: new Date(referenceTime - minutesAgo * 60_000).toISOString(),
    time: `há ${hours} h${minutes ? ` ${minutes} min` : ''}`,
    severity: index % 5 === 0 ? 'Alta' : index % 5 < 3 ? 'Média' : 'Baixa',
    status: index % 7 === 0 ? 'Fechado' : index % 11 === 0 ? 'Inconclusivo' : index % 2 === 0 ? 'Aberto' : 'Em investigação',
    route: `RT-${String(270 - index).padStart(4, '0')}`,
  }
})

export const incidents: Incident[] = [...initialIncidents, ...additionalIncidents].map((incident, index) => ({
  ...incident,
  version: 1,
  analystId: incident.status === 'Aberto' ? undefined : analysts[index % analysts.length].id,
  history: [],
}))
