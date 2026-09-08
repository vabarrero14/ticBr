# Prompt de desarrollo — Sistema centralizado de seguimiento de trabajo (ticBr)

> Copiá y pegá este prompt para arrancar (o retomar) el desarrollo del proyecto en una nueva sesión.

## Contexto

Trabajo con varios frentes en paralelo, cada uno con su propio sistema de gestión, y hoy no tengo forma de ver todo junto ni de saber si un problema puntual es en realidad la repetición de algo que ya pasó antes:

1. **Tickets diarios / gestión operativa** → Redmine.
2. **Tickets de Century** (plataforma propia de la consultora, temas SAP).
3. **Proyectos del PO** → ClickUp o Excel (sin estandarizar).
4. **Proyectos de innovación** → herramientas propias de esa gerencia, totalmente aparte.

Necesito centralizar todo esto en un solo lugar, sin perder el dato de **de qué sistema viene**, **qué tipo de trabajo es** y **quién está asignado**. Y lo más importante: quiero poder agrupar tickets que son síntomas de un mismo problema de fondo, para trabajar la **solución raíz** en vez de ir parcheando caso por caso.

## Objetivo del sistema

Construir una app web que:

1. **Centraliza** tickets/casos de las 4 fuentes (Redmine, Century, ClickUp/Excel PO, Innovación) en un modelo único, sin perder trazabilidad al sistema de origen.
2. **Clasifica** cada ítem por tipo de trabajo, sistema de origen, gerencia/área y persona(s) asignada(s).
3. Permite **vincular varios tickets a un mismo "Caso Raíz"**, para poder ver el historial de síntomas de un problema y su solución definitiva, distinguiendo "parche puntual" de "solución de fondo".
4. Da **visibilidad** (dashboard) de carga de trabajo por persona/sistema/tipo, y de problemas recurrentes sin causa raíz resuelta.

## Modelo de datos (Firestore)

### `tickets` (colección principal — vista unificada)
Cada documento representa un ítem de cualquiera de las 4 fuentes.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | id interno (autogenerado) |
| `sourceSystem` | enum | `redmine` \| `century` \| `clickup_po` \| `innovacion` |
| `sourceId` | string | id/número en el sistema original (ej: nº de ticket Redmine) |
| `sourceUrl` | string? | link directo al ticket original, si existe |
| `title` | string | |
| `description` | string | |
| `workType` | enum | `operativo` \| `sap` \| `proyecto_po` \| `innovacion` (extensible) |
| `status` | enum | `abierto` \| `en_progreso` \| `bloqueado` \| `resuelto` \| `cerrado` |
| `priority` | enum | `baja` \| `media` \| `alta` \| `critica` |
| `assignees` | array<personId> | puede haber más de una persona |
| `area` | string? | gerencia/equipo |
| `rootCauseId` | string? \| null | FK a `rootCauses` — null si aún no está vinculado |
| `createdAt`, `updatedAt`, `closedAt` | timestamp | |
| `tags` | array<string> | libre |
| `importedBatchId` | string? | referencia al import que lo trajo (si vino de Excel/CSV) |

### `rootCauses` (casos raíz)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `title` | string | nombre del problema de fondo |
| `description` | string | |
| `analysis` | string? | espacio libre para 5 whys / Ishikawa / lo que uses |
| `status` | enum | `identificado` \| `en_analisis` \| `en_solucion` \| `resuelto` |
| `owner` | personId | responsable de llevarlo a solución |
| `solution` | string? | solución definitiva aplicada |
| `linkedTicketsCount` | number | denormalizado, para detectar recurrencia de un vistazo |
| `firstSeenAt`, `resolvedAt` | timestamp | |

### `people`
`id`, `name`, `email`, `area`, `active`.

### `ticketEvents` (subcolección de `tickets`, opcional para MVP+1)
Timeline de cambios (status, reasignaciones, comentarios) — sirve tanto para auditoría como para alimentar el análisis de causa raíz más adelante.

### `importBatches`
Registro de cada carga manual (Excel/CSV) — quién la subió, cuándo, cuántas filas, de qué fuente.

## Reglas de negocio clave

- Un ticket puede existir **sin** `rootCauseId` (la mayoría, al principio).
- Un Caso Raíz agrupa **N tickets** (1:N). Si un ticket nuevo es síntoma de un problema ya identificado, se vincula al Caso Raíz existente en vez de crear uno nuevo → esto es lo que permite ver recurrencia.
- Alertar (o al menos listar) tickets **repetidos por título/tags/área similares sin Caso Raíz asociado** — son candidatos a "estamos parcheando en vez de resolver".
- El sistema de origen nunca se pierde: siempre se puede volver al ticket real en Redmine/Century/ClickUp.

## Ingesta de datos (por fuente, de más simple a más ambicioso)

1. **MVP — carga manual + import Excel/CSV**: formulario para cargar un ticket a mano, y un importador de Excel/CSV (mapeo de columnas configurable) para volcar exports de Century, ClickUp o planillas del PO/Innovación.
2. **Fase 2 — integración Redmine**: Redmine tiene API REST (`/issues.json` con API key) → Cloud Function programada (scheduler) que sincroniza tickets asignados a mi usuario/equipo.
3. **Fase 3 — integración ClickUp**: ClickUp también tiene API REST → mismo patrón que Redmine.
4. **Century / Innovación**: si no tienen API pública, quedan en import manual/CSV indefinidamente (o webhook si algún día se habilita).

## Vistas / features del frontend

1. **Dashboard general**: conteo de tickets por sistema, por tipo, por persona, por estado. Filtros combinables.
2. **Tabla unificada de tickets** (tipo bandeja): filtros por sistema/tipo/persona/área/estado, búsqueda por texto, link al ticket original.
3. **Vista de Casos Raíz**: lista de causas raíz con sus tickets vinculados, estado de la solución, y quién es responsable.
4. **Detalle de ticket**: toda la info + botón "vincular a caso raíz" (buscar existente o crear nuevo).
5. **Detalle de caso raíz**: descripción, análisis, solución, lista de tickets síntoma con fechas (para ver la recurrencia en el tiempo).
6. **Importador**: subir Excel/CSV, mapear columnas → previsualizar → confirmar carga.
7. **Alertas / "posibles parches"**: tickets similares recientes sin caso raíz vinculado.

## Stack técnico

- **Frontend**: React + Vite + TypeScript, React Router, TanStack Query + TanStack Table (o similar) para las tablas/filtros, UI con Tailwind + shadcn/ui.
- **Backend/infra**: Firebase — Firestore (datos), Firebase Auth (login con Google, restringido a mi cuenta/equipo), Cloud Functions (sync con Redmine/ClickUp, procesamiento de imports), Firebase Hosting (deploy).
- **Import de Excel**: SheetJS (`xlsx`) en el cliente o en una Cloud Function.

## Alcance del MVP (primer entregable)

1. Modelo de datos en Firestore (`tickets`, `rootCauses`, `people`).
2. Auth con Google (Firebase Auth) + reglas de seguridad de Firestore.
3. CRUD manual de tickets y de casos raíz desde la UI.
4. Vinculación de tickets a un caso raíz (crear nuevo o asociar a existente).
5. Tabla unificada con filtros básicos (sistema, tipo, persona, estado).
6. Importador de Excel/CSV con mapeo de columnas.
7. Dashboard simple con los conteos principales.

**Fuera del MVP** (fases siguientes): integración automática con Redmine/ClickUp, timeline de eventos por ticket, alertas automáticas de posibles duplicados/parches, reportes exportables.

## Pedido concreto para esta sesión

Arrancá por: **estructura del proyecto (Vite + React + TS + Firebase), configuración de Firestore con el modelo de datos de arriba, reglas de seguridad básicas, y la pantalla de login + tabla unificada de tickets con datos mock**, antes de meter mano a los imports o integraciones externas.
