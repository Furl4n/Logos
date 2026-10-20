import { AppRouter } from './routes/AppRouter'
import IncidentProvider from './context/IncidentProvider'

export default function App() {
  return <IncidentProvider><AppRouter /></IncidentProvider>
}
