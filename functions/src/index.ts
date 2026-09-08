import { initializeApp } from 'firebase-admin/app'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { defineSecret, defineString } from 'firebase-functions/params'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { syncRedmineIssues } from './redmineSync.js'

initializeApp()

// No sensibles: host/puerto/nombre de base. Se pueden pisar con
// `firebase functions:config` o variables de entorno si hiciera falta,
// pero el default ya apunta al Redmine de Bristol.
const REDMINE_DB_HOST = defineString('REDMINE_DB_HOST', {
  default: 'redminetic.bristol.com.py',
})
const REDMINE_DB_PORT = defineString('REDMINE_DB_PORT', { default: '3306' })
const REDMINE_DB_NAME = defineString('REDMINE_DB_NAME', { default: 'bitnami_redmine' })

// Sensibles: usuario y contraseña van como secrets de Firebase, nunca en
// código ni en el bundle del frontend. Setearlos con:
//   npx firebase-tools functions:secrets:set REDMINE_DB_USER
//   npx firebase-tools functions:secrets:set REDMINE_DB_PASSWORD
const REDMINE_DB_USER = defineSecret('REDMINE_DB_USER')
const REDMINE_DB_PASSWORD = defineSecret('REDMINE_DB_PASSWORD')

function dbConfig() {
  return {
    host: REDMINE_DB_HOST.value(),
    port: Number(REDMINE_DB_PORT.value()),
    database: REDMINE_DB_NAME.value(),
    user: REDMINE_DB_USER.value(),
    password: REDMINE_DB_PASSWORD.value(),
  }
}

/** Corre cada 10 minutos. Trae los issues abiertos de Redmine del equipo
 * trackeado (ver TRACKED_NAMES en redmineSync.ts) a la colección `tickets`. */
export const syncRedmineScheduled = onSchedule(
  {
    schedule: 'every 10 minutes',
    secrets: [REDMINE_DB_USER, REDMINE_DB_PASSWORD],
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async () => {
    const result = await syncRedmineIssues(dbConfig())
    logger.info('Redmine sync (programado) completado', result)
    if (result.unmatchedNames.length > 0) {
      logger.warn('Nombres sin matchear en Redmine', result.unmatchedNames)
    }
  },
)

/**
 * Igual que la anterior pero invocable a demanda (para probar sin esperar
 * el schedule) — cualquier usuario logueado en ticBr puede llamarla, mismo
 * criterio que el resto de la app. Se puede invocar desde la pestaña
 * "Functions" de la consola de Firebase o con el SDK cliente
 * (httpsCallable(functions, 'syncRedmineNow')()).
 */
export const syncRedmineNow = onCall(
  { secrets: [REDMINE_DB_USER, REDMINE_DB_PASSWORD], timeoutSeconds: 120, memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Hay que estar logueado.')
    }
    const result = await syncRedmineIssues(dbConfig())
    logger.info('Redmine sync (manual) completado', { by: request.auth.token.email, ...result })
    return result
  },
)
