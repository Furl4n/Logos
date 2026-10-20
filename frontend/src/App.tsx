import { AppRouter } from './routes/AppRouter'
import IncidentProvider from './context/IncidentProvider'
import DemoProfileProvider from './context/DemoProfileProvider'

export default function App() {
  return <DemoProfileProvider><IncidentProvider><AppRouter /></IncidentProvider></DemoProfileProvider>
}
