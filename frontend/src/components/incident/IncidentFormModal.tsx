import type { CreateIncidentInput } from '../../interfaces/Incident'
import Modal from '../ui/Modal'
import IncidentForm from './IncidentForm'

export default function IncidentFormModal({ onSave, onClose, driverId }: { onSave: (input: CreateIncidentInput) => void | Promise<void>; onClose: () => void; driverId?: string }) {
  return <Modal title="Registrar incidente" onClose={onClose} wide>
    <IncidentForm onSave={onSave} onCancel={onClose} driverId={driverId} />
  </Modal>
}
