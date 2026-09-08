import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported as analyticsIsSupported } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
// ignoreUndefinedProperties: varios campos del modelo son opcionales
// (sourceUrl, area, analysis, solution…) y se envían como `undefined`
// cuando el formulario los deja vacíos.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true })
export const googleProvider = new GoogleAuthProvider()

// Analytics solo funciona en el browser y requiere measurementId — se inicializa
// de forma perezosa y silenciosa para no romper el build/tests en Node.
if (firebaseConfig.measurementId) {
  analyticsIsSupported()
    .then((supported) => {
      if (supported) getAnalytics(app)
    })
    .catch(() => {
      // ignorar: analytics es opcional, no debe romper la app
    })
}
