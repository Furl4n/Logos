import { createBrowserRouter, createRoutesFromElements, Navigate, Route } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import Incidentes from '../pages/Incidentes/Index'
import Login from '../pages/Login/Index'
import AuthRoute from './AuthRoute'

export const routes = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route element={<AuthRoute publicOnly />}>
        <Route path="/login" element={<Login />} />
      </Route>
      <Route index element={<Navigate to="/login" replace />} />
      <Route element={<AuthRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/incidentes" element={<Incidentes />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </>,
  ),
)
