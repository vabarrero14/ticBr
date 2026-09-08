// Diagnóstico: busca en la tabla `users` de Redmine cualquier usuario cuyo
// nombre o apellido se parezca a los que no matchearon, SIN filtrar por
// status — así vemos si el problema es un apellido escrito distinto, un
// segundo nombre de por medio, o una cuenta inactiva/bloqueada.
//
// Uso: npm run debug-users

import 'dotenv/config'
import mysql from 'mysql2/promise'

// Apellidos de los 4 que no matchearon — ajustá si hace falta buscar otra cosa.
const SEARCH_TERMS = ['insfran', 'lenguaz', 'avila', 'clarice']

const STATUS_LABELS = { 1: 'activo', 2: 'registrado (sin activar)', 3: 'bloqueado' }

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Falta ${name} en .env`)
    process.exit(1)
  }
  return value
}

async function main() {
  const conn = await mysql.createConnection({
    host: requireEnv('REDMINE_DB_HOST'),
    port: Number(process.env.REDMINE_DB_PORT ?? '3306'),
    database: requireEnv('REDMINE_DB_NAME'),
    user: requireEnv('REDMINE_DB_USER'),
    password: requireEnv('REDMINE_DB_PASSWORD'),
    connectTimeout: 10_000,
  })

  try {
    for (const term of SEARCH_TERMS) {
      const [rows] = await conn.query(
        `SELECT id, login, firstname, lastname, status
         FROM users
         WHERE LOWER(firstname) LIKE ? OR LOWER(lastname) LIKE ?`,
        [`%${term}%`, `%${term}%`],
      )
      console.log(`\nBuscando "${term}":`)
      if (rows.length === 0) {
        console.log('  (sin resultados — no existe ningún usuario con ese apellido)')
      }
      for (const r of rows) {
        const status = STATUS_LABELS[r.status] ?? `status ${r.status}`
        console.log(`  id=${r.id} login=${r.login} "${r.firstname}" "${r.lastname}" — ${status}`)
      }
    }
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error('Error:', err.message ?? err)
  process.exit(1)
})
