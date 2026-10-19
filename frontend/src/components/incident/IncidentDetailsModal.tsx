import type { Incident } from '../../interfaces/Incident'
import Modal from '../ui/Modal'

export default function IncidentDetailsModal({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const fields = [['Motorista', incident.driver], ['Caminhão', incident.plate], ['Localização', incident.location], ['Rota / entrega', incident.route], ['Categoria', incident.category], ['Registrado', incident.time]]
  return <Modal title={incident.title} caption={incident.id} onClose={onClose} sidePanel>
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted"><span className="rounded border border-line bg-canvas px-2 py-1">{incident.status === 'Em andamento' ? 'Andamento' : incident.status}</span><span>Criticidade {incident.severity.toLowerCase()}</span></div>
    <p className="my-7 text-sm leading-relaxed text-muted">{incident.description}</p>
    <dl>{fields.map(([label, value]) => <div key={label} className="grid grid-cols-[100px_1fr] gap-3 border-t border-line py-4 text-sm sm:grid-cols-[120px_1fr]"><dt className="text-muted">{label}</dt><dd>{value}</dd></div>)}</dl>
  </Modal>
}
