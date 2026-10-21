import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentUser } from '../../hooks/useAuth'
import IncidentDetailsDialog from '../../components/incident/IncidentDetailsDialog'
import BoardColumn from './BoardColumn'

const columns = [
  { title: 'Sem responsável', label: 'Sem responsável', assignment: 'UNASSIGNED' },
  { title: 'Meus atendimentos', label: 'Meus', assignment: 'MINE' },
  { title: 'Com outros analistas', label: 'Outros', assignment: 'OTHERS' },
] as const

export default function Quadro() {
  const { data: user } = useCurrentUser()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeColumn, setActiveColumn] = useState<typeof columns[number]['assignment']>('UNASSIGNED')
  if (!user || user.role === 'DRIVER') return <Navigate to="/incidentes" replace />
  return <>
    <header className="mb-5 shrink-0">
      <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Quadro de atendimentos</h1>
    </header>
    <div role="group" aria-label="Visão do quadro" className="mb-3 grid shrink-0 grid-cols-[1.4fr_1fr_1fr] gap-1 rounded-lg border border-line bg-canvas p-1 min-[1100px]:hidden">
      {columns.map(column => <button key={column.assignment} type="button" aria-pressed={activeColumn === column.assignment} aria-controls={`board-${column.assignment}`} onClick={() => setActiveColumn(column.assignment)} className={`min-h-10 min-w-0 rounded-md px-2 py-2 text-sm font-medium ${activeColumn === column.assignment ? 'bg-surface text-brand-dark shadow-sm' : 'text-muted hover:bg-surface/60'}`}>{column.label}</button>)}
    </div>
    <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 min-[1100px]:grid-cols-3">
      {columns.map(column => <BoardColumn key={column.assignment} title={column.title} assignment={column.assignment} visible={activeColumn === column.assignment} onSelect={setSelectedId} />)}
    </div>
    {selectedId && <IncidentDetailsDialog id={selectedId} onClose={() => setSelectedId(null)} />}
  </>
}
