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
- [ ] Importador genérico de Excel/CSV para Century/ClickUp/Innovación (mapeo de columnas a mano)
- [ ] Integración automática con Redmine (Cloud Function)
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
```
