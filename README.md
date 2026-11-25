# Reporta Puerto Montt

Plataforma cívica para reportes geolocalizados, conversación vecinal moderada y gestión municipal. Incluye un portal PWA instalable para la ciudadanía y una aplicación de escritorio Windows para funcionarios, conectados a una API local compilada desde TypeScript estricto.

## Aplicaciones y arquitectura fuente

- **Ciudadanía (`/app` — PWA React 19 + TypeScript estricto):** aplicación en `src/citizen/main.tsx` compilada con `esbuild` hacia `public/citizen.bundle.js`, con mapa y muro vecinal, asistente de 4 pasos, foto y video, comentarios moderados, apoyos, seguimiento, cuenta ciudadana e instalación PWA.
- **Municipalidad (`/admin` y Electron — TypeScript estricto):** lógica administrativa en `src/admin/main.ts` y capa térmica HTML5 Canvas en `src/admin/heatmap.ts` compiladas hacia `public/app.js` para `public/municipal.html`, junto con la aplicación de escritorio Windows (`desktop/main.cjs`, `desktop/preload.cjs`).
- **API local y dominio tipado (`src/server.ts`, `src/repository.ts`, `src/domain.ts`):** núcleo compilado hacia `build/` y arrancado por `server.js`, con interfaz `ReportRepository` (`JsonFileRepository` en `schemaVersion: 3`).

## Inicio rápido en Windows

Para iniciar desde el código, clona el repositorio oficial (<https://github.com/ElProductor/Reporta-Puerto-montt.git>), instala Node.js 20 o superior y ejecuta `Iniciar Reporta Puerto Montt.bat`, o desde PowerShell:

```powershell
git clone https://github.com/ElProductor/Reporta-Puerto-montt.git
cd Reporta-Puerto-montt
npm install
npm start
```

Abre `http://localhost:3001/app` para ciudadanía o `http://localhost:3001/admin` para el panel web municipal.

## Instalador descargable

El instalador Windows generado por `npm run desktop:dist` se guarda en `release-final/Reporta-Puerto-Montt-Admin-1.0.0-Setup.exe`. Al abrirse, inicia la API privada local y muestra la gestión municipal. La base de datos instalada se guarda en el perfil local de Windows (`userData`). Para uso multiusuario real entre ciudadanos y funcionarios se requiere alojamiento institucional HTTPS con base de datos SQL.

En desarrollo, inicia Electron con `npm run desktop`.

## Roles RBAC y gestión local de credenciales

El panel municipal (`/admin`) define tres roles con almacenamiento de contraseñas protegido mediante `bcryptjs` (costo `12`) en `data/db.json` (colección `staff`) y secreto criptográfico aleatorio por instalación en `.auth-secret`:

- `OPERADOR_MESA` (`mesa@reporta.local`): clasificación inicial, derivación y asignación por lotes.
- `INSPECTOR_DEPTO` (`inspector@reporta.local`): despacho `EN_TERRENO` y cierre técnico en su departamento.
- `ADMIN_MUNICIPAL` (`admin@reporta.local`): administración completa, moderación de comentarios y cola de verificación.

Por buenas prácticas de seguridad (`OWASP Top 10:2021`), este documento no incluye contraseñas en texto plano. Para generar o rotar una clave RBAC localmente con `bcryptjs` (costo 12):

```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync(process.argv[1], 12));" "<TU_CLAVE_LOCAL_SEGURA>"
```

## Funciones y controles

- Flujo ciudadano en cuatro pasos con validación territorial mediante polígono comunal aproximado (`PUERTO_MONTT_POLYGON` en `src/domain.ts`), RUT Módulo 11, validación de foto y video por firma binaria, límite de 5 MB y detección de duplicados a 25 m (Haversine).
- Muro vecinal público con comentarios sujetos a moderación, filtro de datos personales en comentarios y adhesión ciudadana sin duplicar apoyos (HMAC-SHA256 del RUT en `supporters`).
- Buzón privado de notificaciones dentro de la cuenta ciudadana, con aviso al recibir y cada vez que cambia el estado del caso. No envía correo SMTP ni Web Push.
- Seguimiento público por folio (sin PII) y seguimiento privado por RUT autenticado.
- Roles municipales (`OPERADOR_MESA`, `INSPECTOR_DEPTO`, `ADMIN_MUNICIPAL`), transiciones de estado, derivaciones/rechazos con justificación mínima de 20 caracteres, auditoría, cierre técnico con foto posterior e informe de al menos 50 caracteres (`validateCloseGate`), analítica `Chart.js` y capa térmica Canvas.
- Procesamiento por lotes: prevalidación del conjunto completo antes de mutar casos; selección inválida rechaza la operación entera.
- Electron con aislamiento de contexto (`contextIsolation: true`), `sandbox: true`, navegación externa bloqueada y permiso limitado a geolocalización. Secreto aleatorio local `.auth-secret` persistido por instalación (o `JWT_SECRET` ≥ 32 caracteres).
- Persistencia JSON relacional normalizada (`schemaVersion: 3`) en 10 tablas separadas por ID con reemplazo atómico vía archivo temporal y `rename`.
- Límite de 5 intentos de login por cuenta y origen en 15 minutos; CORS cerrado por defecto (`CORS_ORIGINS`).
- Feriados configurables en `data/feriados.json` (ver `feriados.example.json`) o `REPORTA_HOLIDAYS` para cálculo de días hábiles SLA (`workingDaysBetween`).

## Verificación

```powershell
npm run typecheck
npm test
npm run perf
```

- `npm run typecheck` valida en modo estricto (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) tanto las aplicaciones cliente/dominio (`tsconfig.json`) como el servidor/repositorio (`tsconfig.server.json`).
- `npm test` compila el backend y ambos bundles cliente antes de ejecutar **41 pruebas repetibles**: 31 HTTP (`CP-01` a `CP-31` en `tests/api.test.cjs`), 6 unitarias de dominio (`tests/domain.test.cjs`), 2 de accesibilidad CSS (`tests/accessibility.test.cjs`), 1 de ciclo de vida y aislamiento de `.auth-secret` (`tests/auth-secret.test.cjs`) y 1 de shell/caché offline (`tests/offline.test.cjs`).
- `npm run perf` ejecuta el benchmark local con 1,000 registros sintéticos, 50 clientes paralelos y 200 solicitudes `GET /api/reports`.
- Después de compilar Electron (`npm run desktop:dist`), `node tests/packaged-smoke.cjs` verifica el paquete generado. La comprobación manual en vivo se puede ejecutar con `./verify.ps1`.

## Alcance y pendientes para producción

- **Base de datos y servidor central:** la persistencia actual usa `JsonFileRepository` sobre `data/db.json` local por equipo; la operación multiusuario concurrente requiere implementar un adaptador SQL (PostgreSQL/Supabase con PostGIS y RLS) tras un servidor institucional HTTPS.
- **Integraciones externas y certificación:** no están integrados ClaveÚnica, correo SMTP ni Web Push; el polígono comunal implementado es una aproximación de vértices (no un shapefile oficial SUBDERE/IDE); el instalador `.exe` no está firmado digitalmente; y las comprobaciones locales no sustituyen auditoría WCAG 2.1 AA completa, pentest OWASP independiente ni medición real de KPIs municipales. Las teselas de `tile.openstreetmap.org` no se precargan offline por política de OpenStreetMap.
