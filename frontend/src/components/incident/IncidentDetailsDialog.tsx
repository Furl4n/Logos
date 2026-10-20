import { useIncidentDetails } from '../../hooks/useIncidentApi'
import { toIncidentDetail } from '../../service/incidentMapper'
import IncidentDetailsModal from './IncidentDetailsModal'
import Modal from '../ui/Modal'

export default function IncidentDetailsDialog({ id, readOnly = false, onClose }: { id: string; readOnly?: boolean; onClose: () => void }) {
  const detail = useIncidentDetails(id)
  if (detail.data) return <IncidentDetailsModal incident={toIncidentDetail(detail.data)} readOnly={readOnly} onClose={onClose} />
  return <Modal title="Detalhes da ocorrência" sidePanel onClose={onClose}>
    {detail.isError ? <div role="alert"><p className="text-sm text-muted">Não foi possível carregar os detalhes.</p><button type="button" onClick={() => void detail.refetch()} className="mt-3 text-sm text-brand-dark underline">Tentar novamente</button></div> : <p role="status" className="text-sm text-muted">Carregando ocorrência…</p>}
  </Modal>
}
