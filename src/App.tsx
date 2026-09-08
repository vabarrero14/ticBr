import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { ImportPage } from './pages/ImportPage'
import { LoginPage } from './pages/LoginPage'
import { PeoplePage } from './pages/PeoplePage'
import { RootCausesPage } from './pages/RootCausesPage'
import { TicketsPage } from './pages/TicketsPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets"
        element={
          <ProtectedRoute>
            <Layout>
              <TicketsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/casos-raiz"
        element={
          <ProtectedRoute>
            <Layout>
              <RootCausesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/personas"
        element={
          <ProtectedRoute>
            <Layout>
              <PeoplePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/importar"
        element={
          <ProtectedRoute>
            <Layout>
              <ImportPage />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
