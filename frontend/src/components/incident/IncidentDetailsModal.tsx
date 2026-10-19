import type { Incident } from '../../interfaces/Incident'
import Modal from '../ui/Modal'
import IncidentAttendance from './IncidentAttendance'

export default function IncidentDetailsModal({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const fields = [['Motorista', incident.driver], ['Caminhão', incident.plate], ['Localização', incident.location], ['Rota / entrega', incident.route], ['Categoria', incident.category], ['Registrado', incident.time]]
  return <Modal title={incident.title} caption={incident.id} onClose={onClose} sidePanel>
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted"><span className="rounded border border-line bg-canvas px-2 py-1">{incident.status === 'Em andamento' ? 'Andamento' : incident.status}</span><span>Criticidade {incident.severity.toLowerCase()}</span></div>
    <p className="my-3 text-sm leading-relaxed text-muted">{incident.description}</p>
    <dl>{fields.map(([label, value]) => <div key={label} className="grid grid-cols-[100px_1fr] gap-3 border-t border-line py-3 text-sm sm:grid-cols-[120px_1fr]"><dt className="text-muted">{label}</dt><dd>{value}</dd></div>)}</dl>
    <IncidentAttendance key={incident.id} incident={incident} />
    <section className="mt-6 border-t border-line pt-5" aria-labelledby="incident-history-title">
      <h3 id="incident-history-title" className="mb-4 text-base font-semibold text-ink">Histórico</h3>
      {incident.history?.length ? <ol className="space-y-4">{incident.history.map(entry => <li key={entry.id} className="border-l-2 border-brand/30 pl-3 text-sm">
        <p className="font-medium text-ink">{entry.user}</p>
        <time dateTime={entry.timestamp} className="text-sm text-muted">{new Date(entry.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>
        <ul className="mt-1 space-y-1 text-ink">{entry.changes.map((change, index) => <li key={index} className="whitespace-pre-wrap break-words">{change}</li>)}</ul>
      </li>)}</ol> : <p className="text-sm text-muted">Nenhuma alteração registrada para esta ocorrência.</p>}
    </section>
  </Modal>
}
