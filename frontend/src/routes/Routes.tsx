import { createBrowserRouter, createRoutesFromElements, Navigate, Route } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import Incidentes from '../pages/Incidentes/Index'
import Login from '../pages/Login/Index'

export const routes = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<Login />} />
      <Route index element={<Navigate to="/login" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/incidentes" element={<Incidentes />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </>,
  ),
)
