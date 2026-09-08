# ticBr

Sistema centralizado de seguimiento de trabajo: unifica tickets de Redmine, Century, ClickUp/Excel (PO) e Innovación en un solo lugar, sin perder de vista quién está asignado, qué tipo de trabajo es, y permitiendo agrupar tickets síntoma bajo un **caso raíz** con su solución de fondo.

Ver el detalle de objetivo, modelo de datos y alcance en [`docs/PROJECT_PROMPT.md`](docs/PROJECT_PROMPT.md).

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Firebase: Auth (Google), Firestore, Hosting

## Estado actual (MVP en progreso)

- [x] Estructura del proyecto
- [x] Modelo de datos (`src/lib/types.ts`)
- [x] Login con Google (Firebase Auth)
- [x] Dashboard con conteos por sistema / tipo / persona
- [x] Tabla unificada de tickets con filtros
- [x] Vista de casos raíz con tickets vinculados
- [x] Conectado a Firestore real (proyecto `ticbr-c97da`)
- [x] CRUD de tickets y casos raíz desde la UI (crear, editar, vincular ticket ↔ caso raíz)
- [x] Alta de personas para asignar tickets/responsables (manual + auto-registro al loguearte)
- [x] Importador de la planilla PO ("Seguimiento de Proyectos PO", hoja "Consolidado") — ver abajo
- [x] Filtros de Dashboard y Tickets (plataforma, sistema, tipo, estado, asignado) + alcance por Jefe TIC
- [x] Depurar personas (fusionar duplicados, borrar sin uso)
- [x] Gráficos (barras) en el Dashboard, botón "Mis tickets", tablero mensual con mes/historial
- [x] Sincronización automática con Redmine (Cloud Function) — ver abajo, pendiente de desplegar
- [ ] Importador genérico de Excel/CSV para Century/ClickUp/Innovación (mapeo de columnas a mano)
- [ ] Integración automática con ClickUp (Cloud Function)

## Setup local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Firebase

El proyecto ya usa Firebase `ticbr-c97da` (ver `.firebaserc`, commiteado — el project ID no es un dato sensible).

1. Copiá `.env.example` a `.env` y completá los valores con los datos de tu app web (Firebase console → Configuración del proyecto → General → Tus apps → SDK setup and configuration):
   ```bash
   cp .env.example .env
   ```
2. Habilitá **Authentication → Sign-in method → Google** en la consola, si todavía no está habilitado.

### 3. Desplegar las reglas de Firestore

Requiere [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`, `firebase login`):

```bash
firebase deploy --only firestore:rules
```

### 4. Correr en desarrollo

```bash
npm run dev
```

### 5. Build y deploy a Hosting

```bash
npm run build
firebase deploy --only hosting
```

## Modelo: plataforma vs sistema vs tipo

Tres conceptos que se solían mezclar bajo "sistema":

- **Plataforma** (`sourceSystem`): dónde se GESTIONA el ticket — Redmine,
  Century, ClickUp/Excel PO, Innovación. Es una lista cerrada.
- **Sistema** (`originSystem`): dónde OCURRE el incidente/trabajo — SAP,
  B-POS, Infraestructura, HW, etc. Texto libre (viene de la columna
  "Sistema" de la planilla PO cuando aplica).
- **Tipo** (`workType`): texto libre también. Para tickets de PO viene de la
  columna "TIPO PO/Adicional" (PO 2026, Adicional, INNO, TIC solución
  temporal…) tal cual, sin normalizar a una lista cerrada — esa columna suma
  valores nuevos con cada versión de la planilla. Al cargar un ticket a mano,
  el tipo se sugiere según la plataforma (Redmine → Operativo, Century →
  SAP, Innovación → Proyecto de Innovación) pero es editable.

## Importador de planilla PO

En **Importar** (`/importar`) se sube el Excel de "Seguimiento de Proyectos PO":

- Busca la hoja "Consolidado" (o la primera hoja que tenga columnas "Nro Pedido"
  y "Tarea" en alguna de sus primeras 15 filas) y detecta el encabezado por
  **nombre de columna**, no por letra fija — tolera que en futuras versiones de
  la planilla se agreguen filas/columnas arriba o se reordenen, mientras los
  nombres de columna se mantengan.
- Cada fila se convierte en un `Ticket` con `sourceSystem: 'clickup_po'`,
  `workType: 'proyecto_po'`, estado/prioridad normalizados, y todos los campos
  propios de PO (Century, Redmine TIC, Sistema, Pilar, Proyecto, Meta,
  documentaciones, etc.) en `ticket.po`. Las columnas con fecha por encabezado
  ("bitácora" de seguimiento semanal) se guardan como `ticket.log`.
- Dueño / Jefe TIC / Analista se auto-registran como `Person` si no existen
  (buscando por nombre, tolerante a tildes). Celdas con dos personas separadas
  por "/" se dividen en asignados individuales.
- Reimportar el mismo archivo (o una versión más nueva) **no duplica**: salta
  las filas cuyo `Nro Pedido` ya tiene un ticket creado.
- El parser vive en `src/lib/poImport/parseConsolidado.ts` (puro, sin Firebase)
  y la escritura a Firestore en `src/lib/firestore/importPo.ts`.

## Sincronización con Redmine

Una Cloud Function trae los **tickets abiertos** de Redmine asignados al
equipo trackeado (lista editable en `functions/src/redmineSync.ts` →
`TRACKED_NAMES`) y los sincroniza a `tickets` en Firestore
(`sourceSystem: 'redmine'`, `workType: 'Operativo'`). Corre cada 10 minutos
sola; hay también un botón **"Sincronizar Redmine ahora"** en `/importar`
para probarla sin esperar. Los que ya estaban sincronizados como abiertos y
se cerraron en Redmine se marcan `resuelto` automáticamente. Nunca pisa
`rootCauseId`, `tags` ni los campos de `board*` de un ticket que ya exista —
solo actualiza lo que viene de Redmine.

**Por qué es una Cloud Function y no una llamada directa desde el navegador:**
un React que corre en el navegador de cada usuario no puede tener la
contraseña de la base de datos en su código — cualquiera con las herramientas
de desarrollador la vería. La función vive del lado del servidor, con la
contraseña guardada como *secret* de Firebase (nunca en el repo ni en el
bundle del frontend).

### Requisitos antes de desplegarla

1. **Plan Blaze** (pago por uso) en el proyecto Firebase — las Cloud
   Functions no corren en el plan gratuito Spark porque necesitan salir a
   internet a un servidor externo. Consola de Firebase → ícono de engranaje →
   **Uso y facturación** → **Detalles y configuración** → **Modificar plan**.
   El uso que hace esta función (una consulta corta cada 10 minutos) entra
   cómodo en la capa gratuita del plan Blaze.
2. **Que el servidor `redminetic.bristol.com.py:3306` sea alcanzable desde
   Google Cloud.** Si solo acepta conexiones desde la red interna/VPN de la
   oficina, la función va a fallar con un timeout de conexión al primer
   intento — en ese caso hace falta un [Serverless VPC Access
   connector](https://firebase.google.com/docs/functions/networking) (IP de
   salida fija que tu equipo de infra pueda habilitar en el firewall) o una
   VPN entre Google Cloud y la red de Bristol. Es un paso de infraestructura
   aparte, no de código.

### Configurar las credenciales (una sola vez)

```bash
npx firebase-tools functions:secrets:set REDMINE_DB_USER
npx firebase-tools functions:secrets:set REDMINE_DB_PASSWORD
```

Cada comando pide el valor de forma interactiva (no queda en el historial de
la terminal). Quedan guardados en Secret Manager, no en el repo.

### Desplegar

```bash
npm --prefix functions install
npx firebase-tools deploy --only functions,firestore:indexes
```

(`firestore:indexes` porque la sincronización necesita un índice compuesto
sobre `tickets` para encontrar los que hay que cerrar — ya está declarado en
`firestore.indexes.json`.)

### Si la conexión falla

El mensaje de error del botón "Sincronizar Redmine ahora" (o los logs de la
función en la consola de Firebase → Functions → Logs) dice si el problema es
de conexión (`ETIMEDOUT`/`ECONNREFUSED` → red, ver punto 2 de arriba) o de
credenciales (`Access denied` → usuario/contraseña).

## Estructura

```
src/
  lib/
    types.ts          # modelo de datos (Ticket, RootCause, Person)
    firebase.ts        # inicialización de Firebase (Auth + Firestore)
    firestore/          # converters, colecciones tipadas y funciones CRUD
  hooks/
    useCollectionData.ts # suscripción en tiempo real a una colección
  context/
    AuthContext.tsx    # sesión y login con Google
  components/           # UI reutilizable (Layout, modales, tabla, filtros)
  pages/                 # Dashboard, Tickets, Casos raíz, Personas, Login

functions/               # Cloud Functions (sincronización con Redmine)
  src/
    index.ts              # triggers: programado (10 min) y manual (callable)
    redmineSync.ts         # conexión a MariaDB, matching y upsert a Firestore
```
