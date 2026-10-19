import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom'

export const routes = createBrowserRouter(
  createRoutesFromElements(
    <Route path="*" element={<main className="p-6 text-ink">Logos — frontend configurado.</main>} />,
  ),
)
