import type { CreateIncidentInput } from '../../interfaces/Incident'
import Modal from '../ui/Modal'
import IncidentForm from './IncidentForm'

export default function IncidentFormModal({ onSave, onClose }: { onSave: (input: CreateIncidentInput) => void; onClose: () => void }) {
  return <Modal title="Registrar incidente" onClose={onClose} wide>
    <IncidentForm onSave={onSave} onCancel={onClose} />
  </Modal>
}
