// Sincroniza los issues ABIERTOS de Redmine asignados al equipo trackeado
// (TRACKED_NAMES abajo) hacia la colección `tickets` de Firestore. Pensado
// para correr desde tu máquina (manual, o programado con el Programador de
// tareas de Windows / cron) — no depende del plan de Firebase ni de que la
// base de Redmine sea alcanzable desde internet, porque corre en tu red.
//
// Uso:
//   1. cp .env.example .env   y completá los valores (ver ese archivo).
//   2. npm install
//   3. npm run sync

import 'dotenv/config'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import mysql from 'mysql2/promise'
import { readFileSync } from 'node:fs'

/** Equipo cuyos tickets abiertos de Redmine se traen a ticBr. Para sumar o
 * sacar gente, editar esta lista (nombre y apellido, como figuran en
 * Redmine) y volver a correr el script. */
const TRACKED_NAMES = [
  'Raul Peralta',
  'Dina Insfran',
  'Angel Lenguaza',
  'Mario Cubelli',
  'Eduardo Avila',
  'Jorge Clarice',
  'Alcides Gonzalez',
]

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeStatus(name) {
  const v = normalizeText(name)
  if (!v) return 'abierto'
  if (v.includes('resuelt') || v.includes('resolved')) return 'resuelto'
  if (v.includes('cerrad') || v.includes('closed') || v.includes('rechaz') || v.includes('rejected'))
    return 'cerrado'
  if (v.includes('progres') || v.includes('curso')) return 'en_progreso'
  if (v.includes('feedback') || v.includes('pendient') || v.includes('espera') || v.includes('hold'))
    return 'bloqueado'
  return 'abierto'
}

function normalizePriority(name) {
  const v = normalizeText(name)
  if (v.includes('baja') || v.includes('low')) return 'baja'
  if (v.includes('alta') || v.includes('high')) return 'alta'
  if (v.includes('urgent') || v.includes('inmediat') || v.includes('critic')) return 'critica'
  return 'media'
}

function toIso(value) {
  if (!value) return undefined
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Falta ${name} en .env — copiá .env.example a .env y completalo.`)
    process.exit(1)
  }
  return value
}

async function main() {
  const credPath = requireEnv('GOOGLE_APPLICATION_CREDENTIALS')
  const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'))
  initializeApp({ credential: cert(serviceAccount) })
  const db = getFirestore()
  // A diferencia del SDK de cliente, el Admin SDK no ignora `undefined` por
  // default y tira error (ej: area/sourceUrl cuando el issue no tiene
  // proyecto asociado en Redmine).
  db.settings({ ignoreUndefinedProperties: true })

  const dbConfig = {
    host: requireEnv('REDMINE_DB_HOST'),
    port: Number(process.env.REDMINE_DB_PORT ?? '3306'),
    database: requireEnv('REDMINE_DB_NAME'),
    user: requireEnv('REDMINE_DB_USER'),
    password: requireEnv('REDMINE_DB_PASSWORD'),
  }

  console.log(`Conectando a ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}…`)
  const conn = await mysql.createConnection({ ...dbConfig, connectTimeout: 10_000 })
  console.log('Conectado. Sincronizando…')

  try {
    // 1. Matchear los nombres trackeados contra la tabla de usuarios de Redmine.
    //    Por palabras contenidas (no nombre exacto): en Redmine el firstname/
    //    lastname suele traer segundo nombre o segundo apellido (ej. "Dina Lea"
    //    "Insfran Gonzalez"), así que alcanza con que todas las palabras del
    //    nombre trackeado aparezcan en el nombre completo del usuario. Esto
    //    también evita falsos positivos por substring (ej. "avila" adentro de
    //    "Gavilan"), porque compara palabra completa, no substring.
    const [userRows] = await conn.query('SELECT id, firstname, lastname FROM users WHERE status = 1')
    const usersWithWords = userRows.map((row) => ({
      id: row.id,
      fullName: `${row.firstname} ${row.lastname}`,
      words: new Set(normalizeText(`${row.firstname} ${row.lastname}`).split(/\s+/).filter(Boolean)),
    }))

    const targetByNormName = new Map(TRACKED_NAMES.map((n) => [normalizeText(n), n]))
    const redmineIdByNormName = new Map()
    const unmatchedNames = []
    const ambiguousNames = []
    for (const target of TRACKED_NAMES) {
      const targetWords = normalizeText(target).split(/\s+/).filter(Boolean)
      const matches = usersWithWords.filter((u) => targetWords.every((w) => u.words.has(w)))
      if (matches.length === 1) {
        redmineIdByNormName.set(normalizeText(target), matches[0].id)
      } else if (matches.length === 0) {
        unmatchedNames.push(target)
      } else {
        ambiguousNames.push({ name: target, candidates: matches.map((m) => m.fullName) })
      }
    }
    const redmineIds = Array.from(redmineIdByNormName.values())

    if (unmatchedNames.length > 0) {
      console.warn('⚠ No se encontraron en Redmine:', unmatchedNames.join(', '))
    }
    if (ambiguousNames.length > 0) {
      console.warn('⚠ Nombre ambiguo (más de un usuario matchea, no se sincronizó ninguno):')
      for (const a of ambiguousNames) console.warn(`   "${a.name}" → ${a.candidates.join(' / ')}`)
    }
    if (redmineIds.length === 0) {
      console.log('Ningún nombre trackeado matcheó — nada para sincronizar.')
      return
    }

    // 2. Matchear/crear la Persona en Firestore para cada nombre encontrado.
    const peopleSnap = await db.collection('people').get()
    const personIdByNormName = new Map(peopleSnap.docs.map((d) => [normalizeText(d.get('name')), d.id]))
    const personIdByRedmineId = new Map()
    for (const [normName, redmineId] of redmineIdByNormName) {
      let personId = personIdByNormName.get(normName)
      if (!personId) {
        const ref = await db
          .collection('people')
          .add({ name: targetByNormName.get(normName), email: '', active: true })
        personId = ref.id
        personIdByNormName.set(normName, personId)
        console.log(`+ Persona nueva creada: ${targetByNormName.get(normName)}`)
      }
      personIdByRedmineId.set(redmineId, personId)
    }

    // 3. Issues abiertos asignados a esa gente.
    const placeholders = redmineIds.map(() => '?').join(',')
    const [issueRows] = await conn.query(
      `SELECT i.id, i.subject, i.description, i.assigned_to_id, i.created_on, i.updated_on,
              s.name AS status_name,
              e.name AS priority_name,
              p.name AS project_name,
              t.name AS tracker_name
       FROM issues i
       JOIN issue_statuses s ON s.id = i.status_id
       LEFT JOIN enumerations e ON e.id = i.priority_id
       LEFT JOIN projects p ON p.id = i.project_id
       LEFT JOIN trackers t ON t.id = i.tracker_id
       WHERE i.assigned_to_id IN (${placeholders}) AND s.is_closed = 0`,
      redmineIds,
    )

    const now = new Date().toISOString()
    const openSourceIds = new Set()
    let created = 0
    let updated = 0

    for (const row of issueRows) {
      const sourceId = `RM-${row.id}`
      openSourceIds.add(sourceId)
      const personId = personIdByRedmineId.get(row.assigned_to_id)

      const synced = {
        sourceSystem: 'redmine',
        sourceId,
        sourceUrl: `https://${dbConfig.host}/issues/${row.id}`,
        title: row.subject ?? sourceId,
        description: row.description ?? '',
        workType: 'Operativo',
        status: normalizeStatus(row.status_name),
        priority: normalizePriority(row.priority_name),
        assignees: personId ? [personId] : [],
        area: row.project_name ?? undefined,
        tags: [row.tracker_name].filter(Boolean),
        updatedAt: toIso(row.updated_on) ?? now,
      }

      const ref = db.collection('tickets').doc(`redmine-${row.id}`)
      const existing = await ref.get()
      if (existing.exists) {
        await ref.update(synced)
        updated++
      } else {
        await ref.set({
          ...synced,
          rootCauseId: null,
          createdAt: toIso(row.created_on) ?? now,
          importedBatchId: null,
          board: false,
        })
        created++
      }
    }

    // 4. Lo que ya estaba sincronizado como abierto y no vino esta vez -> se cerró en Redmine.
    const previouslyOpenSnap = await db
      .collection('tickets')
      .where('sourceSystem', '==', 'redmine')
      .where('status', 'in', ['abierto', 'en_progreso', 'bloqueado'])
      .get()

    let closedNow = 0
    for (const doc of previouslyOpenSnap.docs) {
      const sourceId = doc.get('sourceId')
      if (!openSourceIds.has(sourceId)) {
        closedNow++
        await doc.ref.update({ status: 'resuelto', updatedAt: now })
      }
    }

    console.log(
      `Listo. ${redmineIds.length}/${TRACKED_NAMES.length} personas matcheadas · ` +
        `${issueRows.length} issues abiertos (${created} nuevos, ${updated} actualizados) · ` +
        `${closedNow} marcados resueltos (ya no están abiertos en Redmine).`,
    )
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error('Error en la sincronización:', err.message ?? err)
  process.exit(1)
})
