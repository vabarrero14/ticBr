import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function handleSignIn() {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError('No se pudo iniciar sesión. Probá de nuevo.')
      console.error(err)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <img src={logo} alt="Los BR" className="mx-auto h-24 w-24 object-contain" />
        <h1 className="mt-3 text-xl font-semibold text-slate-900">ticBr</h1>
        <p className="mt-1 text-sm text-slate-500">
          Seguimiento centralizado de tickets y casos raíz
        </p>

        <button
          onClick={handleSignIn}
          className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Ingresar con Google
        </button>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
