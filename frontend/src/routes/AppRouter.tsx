import { RouterProvider } from 'react-router-dom'
import { routes } from './Routes'

export function AppRouter() {
  return <RouterProvider router={routes} />
}
