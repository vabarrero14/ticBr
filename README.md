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
- [ ] Conectar a Firestore real (hoy usa datos mock en `src/lib/mockData.ts`)
- [ ] CRUD de tickets y casos raíz desde la UI
- [ ] Importador de Excel/CSV
- [ ] Integración automática con Redmine (Cloud Function)
- [ ] Integración automática con ClickUp (Cloud Function)

## Setup local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Firebase

1. En la [consola de Firebase](https://console.firebase.google.com/) de tu proyecto, andá a **Configuración del proyecto → General → Tus apps** y agregá una app web (o copiá la config de la que ya tengas).
2. Copiá `.env.example` a `.env` y completá los valores:
   ```bash
   cp .env.example .env
   ```
3. Habilitá **Authentication → Sign-in method → Google** en la consola.
4. Copiá `.firebaserc.example` a `.firebaserc` y poné tu project ID:
   ```bash
   cp .firebaserc.example .firebaserc
   ```

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

## Estructura

```
src/
  lib/
    types.ts        # modelo de datos (Ticket, RootCause, Person)
    mockData.ts      # datos de ejemplo (temporal, hasta conectar Firestore)
    firebase.ts      # inicialización de Firebase (Auth + Firestore)
  context/
    AuthContext.tsx  # sesión y login con Google
  components/        # UI reutilizable (Layout, tabla, filtros, stat cards)
  pages/              # Dashboard, Tickets, Casos raíz, Login
```
