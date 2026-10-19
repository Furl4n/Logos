import { createBrowserRouter, createRoutesFromElements, Navigate, Route } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import Incidentes from '../pages/Incidentes/Index'

export const routes = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppLayout />}>
      <Route index element={<Navigate to="/incidentes" replace />} />
      <Route path="/incidentes" element={<Incidentes />} />
      <Route path="*" element={<Navigate to="/incidentes" replace />} />
    </Route>,
  ),
)
