import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { ensurePersonForUser } from '../lib/firestore/people'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  logOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)

      if (firebaseUser) {
        // Modelo híbrido de personas: auto-registra a quien se loguea si
        // todavía no tiene un registro en `people` (ver ensurePersonForUser).
        ensurePersonForUser(firebaseUser).catch((err) => {
          console.error('No se pudo auto-registrar la persona:', err)
        })
      }
    })
    return unsubscribe
  }, [])

  async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider)
  }

  async function logOut() {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
