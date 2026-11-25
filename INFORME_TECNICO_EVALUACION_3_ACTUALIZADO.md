# Plataforma Cívica Inteligente Reporta Puerto Montt: Informe Técnico de Implementación, Seguridad y Pruebas del Prototipo de Software

## Portada Académica Institucional

**ÁREA DE TECNOLOGÍAS DE LA INFORMACIÓN Y CIBERSEGURIDAD**  
**CARRERA DE INGENIERÍA EN INFORMÁTICA**  
**ASIGNATURA:** INGENIERÍA DE SOFTWARE (CÓDIGO TI3043)

# PLATAFORMA CÍVICA INTELIGENTE REPORTA PUERTO MONTT
### SISTEMA INTEGRADO DE REPORTE CIUDADANO GEOLOCALIZADO Y GESTIÓN MUNICIPAL

**INFORME TÉCNICO DE IMPLEMENTACIÓN, SEGURIDAD Y PRUEBAS DEL PROTOTIPO DE SOFTWARE**  
Evaluación Sumativa Unidad 3 — Ponderación: 35% de la Calificación Final

**Equipo de Ingeniería de Software:**
- Gabriel Godoy
- Jaime Aranda
- Antonio Benedetti
- Juan Pablo Villavicencio

**Docente Guía:** Prof. José Alfredo Jara

**Estándares Técnicos y Marco Normativo de Referencia:**  
ISO/IEC/IEEE 29148:2018 · Notación UML 2.5 · W3C WCAG 2.1 Nivel AA (controles parciales) · OWASP Top 10:2021 · Ley N° 18.695 · Ley N° 19.628 · Ley N° 21.719 · Ley N° 20.285 · Ley N° 21.663

**Identificación de Configuración y Control de Versiones:**  
Repositorio Oficial: <https://github.com/ElProductor/Reporta-Puerto-montt.git> · Paquete: `reporta-puerto-montt` · Versión: `1.0.0` (`package.json`)

**Localización y Fecha de Entrega:**  
Puerto Montt, Región de Los Lagos, República de Chile — Noviembre de 2026

---

## Índice General de Contenidos

1. [Introducción y estado del proyecto](#1-introducción-y-estado-del-proyecto)  
   1.1 [Síntesis arquitectónica del sistema y objetivos operacionales vigentes](#11-síntesis-arquitectónica-del-sistema-y-objetivos-operacionales-vigentes)  
   1.2 [Insumos utilizados de la Evaluación 2 y línea base vinculante](#12-insumos-utilizados-de-la-evaluación-2-y-línea-base-vinculante)  
   1.3 [Control de cambios técnicos respecto a la arquitectura proyectada (`CAM-01` a `CAM-06`)](#13-control-de-cambios-técnicos-respecto-a-la-arquitectura-proyectada-cam-01-a-cam-06)
2. [Tecnologías, tendencias y entorno de desarrollo](#2-tecnologías-tendencias-y-entorno-de-desarrollo)  
   2.1 [Stack tecnológico real implementado y función estructural en el prototipo](#21-stack-tecnológico-real-implementado-y-función-estructural-en-el-prototipo)  
   2.2 [Análisis crítico de pertinencia: Cloud Computing, IaaS y SaaS en tecnología pública](#22-análisis-crítico-de-pertinencia-cloud-computing-iaas-y-saas-en-tecnología-pública)  
   2.3 [Requisitos de infraestructura y procedimiento de reproducción del entorno](#23-requisitos-de-infraestructura-y-procedimiento-de-reproducción-del-entorno)
3. [Arquitectura y estructura de la implementación](#3-arquitectura-y-estructura-de-la-implementación)  
   3.1 [Organización física del repositorio: módulos, archivos y dependencias](#31-organización-física-del-repositorio-módulos-archivos-y-dependencias)  
   3.2 [Auditoría frente al diseño UML de la Evaluación 2 y actualización selectiva en UML 2.5](#32-auditoría-frente-al-diseño-uml-de-la-evaluación-2-y-actualización-selectiva-en-uml-25)
4. [Construcción del prototipo y funcionalidades](#4-construcción-del-prototipo-y-funcionalidades)  
   4.1 [Módulos programados y cobertura de Casos de Uso (`CU-01` a `CU-09`)](#41-módulos-programados-y-cobertura-de-casos-de-uso-cu-01-a-cu-09)  
   4.2 [Evidencia de flujos funcionales ejecutables y código fuente real del repositorio](#42-evidencia-de-flujos-funcionales-ejecutables-y-código-fuente-real-del-repositorio)
5. [Datos e interfaces](#5-datos-e-interfaces)  
   5.1 [Interfaces desarrolladas, flujo de navegación, accesibilidad y métricas locales](#51-interfaces-desarrolladas-flujo-de-navegación-accesibilidad-y-métricas-locales)  
   5.2 [Estructura relacional normalizada (`schemaVersion: 3`), tablas y evidencia JSON](#52-estructura-relacional-normalizada-schemaversion-3-tablas-y-evidencia-json)
6. [Confidencialidad, normativa y seguridad](#6-confidencialidad-normativa-y-seguridad)  
   6.1 [Activos de datos tratados, riesgos de confidencialidad y marco jurídico chileno aplicable](#61-activos-de-datos-tratados-riesgos-de-confidencialidad-y-marco-jurídico-chileno-aplicable)  
   6.2 [Controles técnicos implementados y alineación con OWASP Top 10:2021](#62-controles-técnicos-implementados-y-alineación-con-owasp-top-102021)
7. [Plan de pruebas y casos ejecutados](#7-plan-de-pruebas-y-casos-ejecutados)  
   7.1 [Estrategia de verificación, ambiente de pruebas y datos sintéticos](#71-estrategia-de-verificación-ambiente-de-pruebas-y-datos-sintéticos)  
   7.2 [Registro maestro de casos de prueba automatizados (Tabla 7.1 — `CP-01` a `CP-32` y suites complementarias)](#72-registro-maestro-de-casos-de-prueba-automatizados-tabla-71--cp-01-a-cp-32-y-suites-complementarias)
8. [Defectos, endurecimiento técnico y nuevas pruebas](#8-defectos-endurecimiento-técnico-y-nuevas-pruebas)  
   8.1 [Registro de hallazgos y defectos corregidos en el prototipo (`HAL-01` a `HAL-10`)](#81-registro-de-hallazgos-y-defectos-corregidos-en-el-prototipo-hal-01-a-hal-10)  
   8.2 [Análisis de estabilidad transaccional y estado de preparación](#82-análisis-de-estabilidad-transaccional-y-estado-de-preparación)
9. [Trazabilidad y evaluación de cumplimiento](#9-trazabilidad-y-evaluación-de-cumplimiento)  
   9.1 [Matriz consolidada de trazabilidad real (`RF/RNF → Informe 2 / CU → Módulo → Prueba`)](#91-matriz-consolidada-de-trazabilidad-real-rfrnf--informe-2--cu--módulo--prueba)  
   9.2 [Trazabilidad de Reglas de Negocio (`RN-01` a `RN-08`) y evaluación honesta frente a la rúbrica](#92-trazabilidad-de-reglas-de-negocio-rn-01-a-rn-08-y-evaluación-honesta-frente-a-la-rúbrica)
10. [Limitaciones y trabajo pendiente](#10-limitaciones-y-trabajo-pendiente)  
    10.1 [Brechas externas / de producción pendientes](#101-brechas-externas--de-producción-pendientes)  
    10.2 [Plan de preparación para la defensa de la Evaluación 4 (25%)](#102-plan-de-preparación-para-la-defensa-de-la-evaluación-4-25)
11. [Conclusiones](#11-conclusiones)
12. [Referencias Bibliográficas, Normativas y Estándares Técnicos](#referencias-bibliográficas-normativas-y-estándares-técnicos)
13. [Anexos Técnicos](#anexos-técnicos-de-reproducción-evidencias-y-verificación)  
    - [Anexo A. Variables de entorno reales y configuración local de roles RBAC](#anexo-a-variables-de-entorno-reales-y-configuración-local-de-roles-rbac)  
    - [Anexo B. Catálogo y capturas reales de evidencias de ejecución](#anexo-b-catálogo-y-capturas-reales-de-evidencias-de-ejecución)  
    - [Anexo C. Lista de verificación honesta frente a la Guía de Evaluación 3](#anexo-c-lista-de-verificación-honesta-frente-a-la-guía-de-evaluación-3)  
    - [Anexo D. Hoja oficial de registro de calificación según Rúbrica Analítica TI3043](#anexo-d-hoja-oficial-de-registro-de-calificación-según-rúbrica-analítica-ti3043)

---

## 1. Introducción y estado del proyecto

### 1.1 Síntesis arquitectónica del sistema y objetivos operacionales vigentes

> **Síntesis Ejecutiva para Evaluación:** El prototipo `reporta-puerto-montt` (`v1.0.0`) implementa de punta a punta el **Portal Ciudadano PWA** (`/app` en React 19 + TS estricto), la **Consola Municipal** (`/admin` + instalador Windows Electron NSIS en TS estricto) y la **API HTTP + Dominio/Repository** (`node:http` + `JsonFileRepository` en `schemaVersion: 3`). Todo el código propio compila sin errores (`0` en `npm run typecheck`), aprueba **43/43** pruebas automatizadas (`npm test`), registra latencia local **P95 = 348,2 ms** (`npm run perf`), presenta **0 vulnerabilidades en dependencias de producción** (`npm audit --omit=dev`) y mantiene delimitadas con transparencia las integraciones externas pendientes para Fase 2 (PostgreSQL/Supabase, ClaveÚnica, SMTP/Push, shapefile oficial y auditoría externa).

El sistema **Reporta Puerto Montt** (`reporta-puerto-montt`, versión `1.0.0`) es una plataforma cívica local diseñada para canalizar reportes ciudadanos geolocalizados, conversación vecinal moderada y gestión municipal de incidencias en la comuna de Puerto Montt. Todo el código fuente propio de dominio, servidor, persistencia y ambos clientes se encuentra implementado en **TypeScript estricto** (`tsconfig.json` y `tsconfig.server.json`), organizado en tres subsistemas dentro de un único paquete Node.js:

1. **Portal Ciudadano Web / PWA (`/app`):** Aplicación React 19 escrita en TypeScript estricto (`src/citizen/main.tsx`), compilada con `esbuild` hacia `public/citizen.bundle.js` y servida desde `public/citizen.html` con soporte offline acotado mediante Service Worker (`public/sw.js`).
2. **Panel Municipal Web y de Escritorio Windows (`/admin` y Electron):** Lógica administrativa escrita en TypeScript estricto (`src/admin/main.ts` y capa térmica `src/admin/heatmap.ts`), compilada con `esbuild` hacia `public/app.js` para `public/municipal.html`, operando tanto en navegador como empaquetada en una aplicación de escritorio Electron (`desktop/main.cjs`, `desktop/preload.cjs`) con instalador Windows NSIS generado en `release-final/Reporta-Puerto-Montt-Admin-1.0.0-Setup.exe`.
3. **API Local, Dominio y Repository (`src/server.ts`, `src/repository.ts`, `src/domain.ts`):** Servidor HTTP nativo de Node.js (`node:http`) compilado hacia `build/` (arrancado desde el entrypoint `server.js`), que consume las reglas de negocio estrictas de `src/domain.ts` y abstrae el almacenamiento detrás de la interfaz `ReportRepository` (`JsonFileRepository` sobre `data/db.json` en `schemaVersion: 3`).

De acuerdo con la revisión documentada en `MATRIZ_RUBRICA.md`, **esta entrega implementa y verifica localmente todos los flujos funcionales y controles de código posibles en entorno autónomo (43/43 pruebas automatizadas aprobadas, benchmark local P95 = 348,2 ms y paquete Electron NSIS compilado)**, manteniendo absoluta transparencia respecto de las brechas que dependen de infraestructura o certificaciones externas: base de datos SQL multiusuario en servidor HTTPS institucional, SMTP/Web Push, ClaveÚnica, shapefile oficial comunal, firma digital del instalador, auditoría WCAG/pentest externa y medición real de KPIs municipales en terreno.

| ID Objetivo | Declaración del Objetivo Específico (Línea Base Informe 2) | Meta Cuantitativa Comprometida | Mecanismo Técnico Implementado en el Prototipo Actual | Estado Real Verificado |
| --- | --- | --- | --- | --- |
| **OBJ-01** | Incrementar la adopción digital ciudadana mediante una interfaz web inclusiva y guiada conforme a la Ley N° 20.500. | Tasa de adopción del 20% con flujo en ≤ 4 pasos bajo W3C WCAG 2.1 Nivel AA. | Portal PWA React 19 + TS estricto en `/app` (`src/citizen/main.tsx`) con asistente de 4 pasos, controles `min-height: 48px`, `:focus-visible`, `prefers-reduced-motion` y contraste ≥ 4,5:1 probado contra blanco. | **Parcial:** flujo de 4 pasos y controles automatizados de contraste/foco aprobados; pendiente auditoría WCAG AA completa y medición real de adopción del 20%. |
| **OBJ-02** | Disminuir el Tiempo Promedio de Respuesta (ART) municipal centralizando la recepción y despacho conforme al Art. 5° de la Ley N° 18.695. | Reducir el ART institucional a < 5,0 días hábiles. | Bandeja municipal unificada (`src/admin/main.ts` + `public/municipal.html`), asignación masiva atómica por lotes (`POST /api/admin/reports/batch`), cálculo de días hábiles (`workingDaysBetween` con feriados) y semáforo SLA. | **Parcial:** lógica de bandeja, lotes y SLA implementada y probada; el ART institucional real (< 5,0 días) **no ha sido medido** en operación municipal real. |
| **OBJ-03** | Garantizar la trazabilidad transaccional e interoperabilidad entre unidades municipales bajo ISO/IEC/IEEE 29148:2018 y Ley N° 21.180. | 100% de trazabilidad auditable en transiciones y derivaciones. | Tabla separada `events` e historial `history` en `schemaVersion: 3` (con transiciones cronológicas completas desde `seed()` y `audit()`), y máquina de estados en `src/domain.ts`. | **Implementado localmente:** trazabilidad auditada en JSON local (`CP-05`, `CP-23`, `CP-24`, `tests/seed.test.cjs`); sin inmutabilidad forense frente a acceso físico directo al equipo. |
| **OBJ-04** | Asegurar la efectividad real de las reparaciones en terreno previniendo cierres administrativos sin respaldo técnico (Ley N° 20.285). | Tasa de resolución mensual > 85,0% con evidencia verificada. | Barrera doble cliente (`closeCase` en `src/admin/main.ts`) y servidor (`POST /api/admin/reports/:id/close` + `validateCloseGate` en `src/domain.ts`) que exige `EN_TERRENO`, nota ≥ 50 caracteres y fotografía posterior válida por Magic Bytes. | **Parcial:** bloqueo técnico verificado en `CP-29` y `CP-30`; tasa de resolución mensual real (> 85,0%) no medida con datos municipales reales. |
| **OBJ-05** | Optimizar la asignación presupuestaria y de cuadrillas mediante inteligencia territorial y analítica. | Reducir en un 15% el costo operativo por incidencia. | Deduplicación Haversine a ≤ 25 m (`distanceMeters`), priorización logarítmica (`priorityFor`), gráficos `Chart.js` y capa térmica HTML5 Canvas (`createCanvasHeatmapLayer` en `src/admin/heatmap.ts`). | **Parcial:** analítica, mapa de calor Canvas y deduplicación implementados; reducción del 15% en costo operativo no acreditada en operación real. |

---

### 1.2 Insumos utilizados de la Evaluación 2 y línea base vinculante

Para construir y endurecer el prototipo se utilizaron como línea base los 16 Requerimientos Funcionales (`RF-01` a `RF-16`), los 10 Requerimientos No Funcionales (`RNF-01` a `RNF-10`), las 8 Reglas de Negocio (`RN-01` a `RN-08`), las 6 Restricciones de Diseño (`RES-01` a `RES-06`) y las decisiones arquitectónicas del Informe 2:

| Categoría de Insumo (Informe 2) | Identificadores Comprendidos | Síntesis de Especificación Utilizada (Secciones Informe 2) | Estado de Materialización Real en el Código |
| --- | --- | --- | --- |
| **Requerimientos Funcionales** | `RF-01` a `RF-16` *(SRS Sec. Requerimientos Funcionales)* | Asistente de 4 pasos, GPS/manual con polígono comunal, multimedia ≤ 5 MB, Haversine ≤ 25 m, mapa Leaflet, detalle Antes/Después, filtros, lotes atómicos, derivación, historial, cierre con foto + ≥ 50 chars, notificaciones, buscador folio/RUT, gráficos Chart.js, mapa de calor Canvas y RBAC. | **Implementados localmente / Parciales** (ver Sección 9.1). Pendientes externos: correo SMTP, Web Push, ClaveÚnica, shapefile oficial y servidor central multiusuario. |
| **Requerimientos No Funcionales** | `RNF-01` a `RNF-10` *(SRS Sec. RNF)* | Contraste/foco WCAG, P95 < 1.500 ms, diseño responsivo, privacidad + `bcryptjs` costo 12, atomicidad local, patrón Repository en 3FN, empaquetado `.exe`, cálculo SLA hábil, feedback UI y TypeScript estricto + tests. | **Código fuente 100% en TypeScript estricto** (`src/`); 43/43 tests aprobados; P95 local `348,2 ms`; `.exe` compilado (`release-final/`). Pendientes: DB SQL, firma digital y auditoría externa WCAG/pentest. |
| **Reglas de Negocio y Modelos UML** | `RN-01` a `RN-08` · UML `10.1`–`10.6` | RUT Módulo 11, radio ≤ 25 m, máquina de estados (`10.4`), cierre foto + ≥ 50 chars, justificación ≥ 20 chars, prioridad logarítmica, auditoría, SLA hábil; diagramas de Clases (`10.2`), Componentes (`10.5`) y Despliegue (`10.6`). | **100% codificadas y probadas** en `src/domain.ts` y `src/server.ts`; modelos UML/ER actualizados en Figuras `2.1`, `3.1`, `3.2` y `5.1`. |
| **Restricciones de Diseño** | `RES-01` a `RES-06` | Límite comunal Puerto Montt, dependencias Open Source (0 USD), separación ciudadano/municipal, ejecución local autónoma y esquema relacional normalizado. | **Respetadas:** polígono comunal aproximado (`PUERTO_MONTT_POLYGON`), costo 0 USD, apps separadas, interfaz `ReportRepository` lista para adaptador SQL en Fase 2. |

---

### 1.3 Control de cambios técnicos respecto a la arquitectura proyectada (`CAM-01` a `CAM-06`)

| ID Cambio | Componente Afectado | Proyección Conceptual Previa | Implementación Real en el Repositorio | Justificación Técnica del Cambio |
| --- | --- | --- | --- | --- |
| **CAM-01** | Estructura del proyecto (`package.json`) | Monorepo `npm workspaces` con 4 subpaquetes. | Paquete único Node.js (`package.json`) con separación lógica bajo `src/` (`domain.ts`, `repository.ts`, `server.ts`, `citizen/main.tsx`, `admin/main.ts`, `admin/heatmap.ts`), `public/` y `desktop/`. | Simplifica compilación (`npm run build:domain`), empaquetado Electron NSIS y reproducción determinista con `npm install && npm test`. |
| **CAM-02** | Backend HTTP (`src/server.ts`) y Persistencia (`src/repository.ts`) | Servidor Express + Zod + Multer + `write-file-atomic`. | Servidor HTTP nativo (`node:http`) compilado desde TypeScript estricto (`src/server.ts` → `build/server.js`, arrancado por `server.js`) y patrón `ReportRepository` (`JsonFileRepository`) con cola secuencial `writeQueue` y escritura atómica `${DB_FILE}.${process.pid}.tmp` + `rename`. | Minimiza dependencias en producción (solo `bcryptjs` en backend empaquetado), manteniendo tipado estricto y compatibilidad con adaptador PostgreSQL/Supabase futuro. |
| **CAM-03** | Autenticación ciudadana, sesiones y secretos (`src/server.ts`) | Formulario público sin cuenta previa y secreto fijo en `.env`. | Cuenta ciudadana obligatoria con `bcryptjs` costo 12; identidad derivada de la sesión; `supporters` guarda `rutHash` HMAC-SHA256; y `loadAuthSecret()` genera una clave aleatoria por instalación en `.auth-secret` si no se define `JWT_SECRET` (≥ 32 chars). | Impide suplantación de identidad (`CP-24`), evita RUTs en texto plano en adhesiones y elimina secretos compartidos (`tests/auth-secret.test.cjs`). |
| **CAM-04** | Migración integral a TypeScript estricto (`src/admin/*`, `src/server.ts`) | Panel municipal y servidor en JavaScript puro. | Migración completa de ambos subsistemas a TypeScript estricto (`tsconfig.json` y `tsconfig.server.json` con `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), compilando `public/app.js` y `build/server.js` sin alterar contratos de rutas ni pruebas. | Elimina el stack mixto en el código fuente manteniendo compatibilidad íntegra con `Electron`, `CP-03` y `tests/packaged-smoke.cjs`. |
| **CAM-05** | Geocercado Comunal y Mapa de Calor (`src/domain.ts`, `src/admin/heatmap.ts`) | BBox rectangular y marcadores circulares simples `L.circle`. | Polígono comunal aproximado de 13 vértices (`PUERTO_MONTT_POLYGON`) evaluado por Ray-Casting (`isPointInPolygon`) y capa térmica HTML5 Canvas (`createCanvasHeatmapLayer`) sobre Leaflet. | Excluye aguas abiertas y áreas cordilleranas fuera del límite comunal que el viejo rectángulo aceptaba (`CP-31`), y entrega visualización térmica continua ponderada por apoyos. |
| **CAM-06** | Empaquetado Electron (`desktop/main.cjs`, `desktop/preload.cjs`) | Cliente conectado a servidor externo. | `desktop/main.cjs` inicia `server.js` en `utilityProcess.fork` usando `app.getPath('userData')`, con `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, bloqueo de navegación externa y `package.json` incluyendo `build/` completo en `extraResources`. | Permite generar un instalador Windows NSIS autónomo (`Reporta-Puerto-Montt-Admin-1.0.0-Setup.exe`) verificado con `tests/packaged-smoke.cjs`. |

---

## 2. Tecnologías, tendencias y entorno de desarrollo

### 2.1 Stack tecnológico real implementado y función estructural en el prototipo

| Capa / Subsistema | Tecnología / Biblioteca Real | Versión en `package.json` | Función Real Implementada en el Código |
| --- | --- | --- | --- |
| **Lenguaje Base Integral** | TypeScript | `^5.9.3` | Compila con opciones estrictas (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `noUnusedLocals: true`, `noUnusedParameters: true`) la totalidad del código fuente propio (`src/domain.ts`, `src/repository.ts`, `src/server.ts`, `src/citizen/main.tsx`, `src/admin/main.ts`, `src/admin/heatmap.ts`). |
| **Portal Ciudadano (Frontend PWA)** | React + React DOM + esbuild | `^19.3.1` / `^0.28.2` | Renderiza la SPA/PWA ciudadana en `/app` (`src/citizen/main.tsx` → `public/citizen.bundle.js`) con mapa, muro vecinal, asistente en 4 pasos, cuenta ciudadana, notificaciones y seguimiento. |
| **Panel Municipal (Frontend Admin)** | HTML5 + CSS3 + TypeScript (`esbuild`) | — | Código fuente en `src/admin/main.ts` y `src/admin/heatmap.ts` compilado a `public/app.js` para `public/municipal.html` (`/admin` y ventana Electron). |
| **Estilizado y Soporte Offline** | CSS nativo + Service Worker | — | `public/styles.css`, `public/offline.css` y `public/citizen-react.css`; `public/sw.js` cachea shell local y hasta 40 respuestas públicas GET (≤ 1 MB c/u). |
| **Motor Cartográfico y Calor** | Leaflet + Leaflet.markercluster + Canvas Heatmap | `^1.9.4` / `^1.5.3` | Bibliotecas locales en `public/vendor/`; `createCanvasHeatmapLayer` (`src/admin/heatmap.ts`) dibuja gradiente térmico radial sobre `<canvas>` en Leaflet. |
| **Analítica y Visualización** | Chart.js | `^4.4.7` | Almacenado localmente en `public/vendor/chartjs/chart.umd.js`; genera gráficos doughnut y de barras en `#adminAnalytics`. |
| **Consola Municipal (Desktop)** | Electron + Electron Builder | `^45.3.3` / `^26.18.0` | `desktop/main.cjs` levanta el backend compilado en `utilityProcess` y abre `/admin` en `BrowserWindow` aislado; genera `release-final/Reporta-Puerto-Montt-Admin-1.0.0-Setup.exe`. |
| **Backend Local y Seguridad** | Node.js nativo (`node:http`, `node:crypto`, `node:fs`) + `bcryptjs` | Node `>=20`, `bcryptjs ^3.0.3` | `src/server.ts` → `build/server.js` expone endpoints REST `/api/*`, tokens HMAC-SHA256, `bcryptjs` costo 12, rate limit (bloqueo al 5.° fallo / 15 min), CORS allowlist e inspección de Magic Bytes. |
| **Pruebas Automatizadas** | Node Test Runner (`node --test`) + `tests/performance.cjs` + `tests/packaged-smoke.cjs` + `verify.ps1` | Integrado en Node.js | Ejecuta **43 pruebas repetibles** (`tests/*.test.cjs`), benchmark de 1.000 registros (`npm run perf`), smoke test sobre `release-final/win-unpacked/` y verificación en vivo con PowerShell. |

---

### 2.2 Análisis crítico de pertinencia: Cloud Computing, IaaS y SaaS en tecnología pública

- **IaaS (Infrastructure as a Service):** Provee máquinas virtuales, redes y discos (ej. AWS EC2, Azure VMs). Exige administrar sistema operativo, parches, cortafuegos y respaldo manual de base de datos, elevando el costo de operación municipal.
- **PaaS/BaaS + Entrega SaaS (Software as a Service):** Provee base de datos gestionada (ej. PostgreSQL/Supabase con PostGIS y Row Level Security) y servidor HTTPS institucional gestionado, permitiendo que ciudadanos operen desde celulares y funcionarios desde sus estaciones sin administrar servidores físicos.
- **Modelo Adoptado en este Prototipo:** Opera autónomamente en `127.0.0.1:3001` con `JsonFileRepository` (`data/db.json` o `userData` en Electron), manteniendo costo 0 USD (`RES-02`) y determinismo en evaluación. Al haber abstraído la persistencia detrás de la interfaz `ReportRepository` (`src/repository.ts`), la evolución a producción solo requiere implementar el adaptador SQL (`PostgresReportRepository`) y desplegar la API en un servidor HTTPS institucional, sin reescribir la lógica de negocio de `src/domain.ts`.

| Criterio de Evaluación | IaaS Puro (VM Linux/Windows) | SaaS / PaaS Institucional (Fase Producción) | Prototipo Local Actual (`127.0.0.1:3001` + `JsonFileRepository`) |
| --- | --- | --- | --- |
| **Costo mensual estimado (referencial)** | **~USD 40–80/mes** por VM + discos + snapshots + horas hombre de administración SO/parches. | **~USD 25–45/mes** en piloto comunal (Supabase Pro ~USD 25/mes + contenedor Node PaaS ~USD 7–20/mes). | **USD 0/mes**, sin servicios externos ni licencias pagas (`RES-02`). |
| **Multiusuario y escalabilidad** | Alta (manual): requiere configurar balanceador, backups y parches. | **Alta (gestionada):** ACID SQL + PostGIS/RLS, backups PITR y auto-escalado horizontal. | **Mononodo local:** archivo JSON por equipo (`P95 = 348,2 ms` local con `1.000` casos). |
| **Cartografía sin conexión** | Requiere servidor de teselas propio. | Requiere proveedor vectorial/raster autorizado. | Teselas `tile.openstreetmap.org` no se precargan offline (política OSM); sin red muestra pines sobre plano sin calles. |

![Figura 2.1: Comparativa de despliegue entre el entorno local autónomo actual (Evaluación 3) y la arquitectura Cloud/SaaS propuesta en Supabase/PostgreSQL (Fase 2).](fig2_1_despliegue_comparativo.png)

---

### 2.3 Requisitos de infraestructura y procedimiento de reproducción del entorno

| Componente | Requisito Verificado | Observación Técnica |
| --- | --- | --- |
| **Sistema Operativo** | Windows 10 / Windows 11 (64 bits) | Requerido para generar y ejecutar el instalador NSIS (`release-final/Reporta-Puerto-Montt-Admin-1.0.0-Setup.exe`). |
| **Runtime** | Node.js `>= 20` + `npm` | Definido en `package.json` (`"engines": { "node": ">=20" }`). Verificado en Node.js v24.12.0. |
| **Puertos Locales** | TCP `3001` (configurable vía `PORT`) | `src/server.ts` escucha en `127.0.0.1:3001` sirviendo API, `/app` y `/admin`. |

**Secuencia exacta de comandos verificada en el repositorio:**

```powershell
# 0. Clonar el repositorio oficial
git clone https://github.com/ElProductor/Reporta-Puerto-montt.git
cd Reporta-Puerto-montt

# 1. Instalar dependencias locales
npm install

# 2. Verificar tipado estricto TypeScript (cliente/dominio y servidor/repository)
npm run typecheck

# 3. Compilar dominio/servidor/bundles y ejecutar las 43 pruebas automatizadas
npm test

# 4. Ejecutar benchmark local de rendimiento (1.000 registros, 50 clientes paralelos)
npm run perf

# 5. Generar instalador Electron Windows (.exe) y validar paquete compilado
npm run desktop:dist
node tests/packaged-smoke.cjs

# 6. Iniciar servidor web/API (http://localhost:3001/app y http://localhost:3001/admin)
npm start
```

También se dispone del lanzador rápido [Iniciar Reporta Puerto Montt.bat](file:///c:/Users/juanp/Documents/Codex/2026-11-17/ne/outputs/reporta-puerto-montt-entrega-actualizada/Iniciar%20Reporta%20Puerto%20Montt.bat) para iniciar el servicio en Windows.

---

## 3. Arquitectura y estructura de la implementación

### 3.1 Organización física del repositorio: módulos, archivos y dependencias

```mermaid
flowchart LR
  subgraph Ciudadania["1. Portal Ciudadano PWA (/app · TS strict)"]
    C_HTML["public/citizen.html"]
    C_TSX["src/citizen/main.tsx (React 19 + TS strict)"]
    C_SW["public/sw.js (Cache Offline Acotado)"]
  end

  subgraph Municipal["2. Consola Municipal (/admin + Electron · TS strict)"]
    M_MAIN["desktop/main.cjs (Electron Main)"]
    M_PRE["desktop/preload.cjs (contextBridge)"]
    M_ADMIN["src/admin/main.ts + heatmap.ts -> public/app.js"]
  end

  subgraph Backend["3. Backend, Dominio y Repository (TS strict)"]
    S_TS["src/server.ts -> build/server.js"]
    D_TS["src/domain.ts -> build/domain.js"]
    R_TS["src/repository.ts -> build/repository.js"]
  end
```

**Inventario exacto de archivos fuente y artefactos compilados:**

| Ruta Física en el Repositorio | Tecnología / Formato | Responsabilidad Real |
| --- | --- | --- |
| `src/domain.ts` | TypeScript estricto | Estados (`REPORT_STATUSES`), límites y polígono comunal aproximado (`PUERTO_MONTT_BOUNDS`, `PUERTO_MONTT_POLYGON`, `isPointInPolygon`, `isWithinPuertoMontt`), transiciones (`isAllowedTransition`), justificación (`requiresJustification`), RUT Módulo 11 (`validateRutModulo11`), Haversine (`distanceMeters`), prioridad (`priorityFor`), días hábiles con feriados (`workingDaysBetween`) y compuerta de cierre (`validateCloseGate`). |
| `src/repository.ts` | TypeScript estricto | Define el contrato `ReportRepository`, las interfaces de las 10 tablas (`DatabaseState`) y la implementación `JsonFileRepository` (`schemaVersion: 3`, migración automática, `normalizedSnapshot`, escritura atómica `temp` + `rename` en `writeQueue` y calendario de feriados). |
| `src/server.ts` + `server.js` | TypeScript estricto → `build/server.js` | Servidor HTTP nativo (`node:http`) con entrypoint `server.js`: autenticación ciudadana y municipal (`bcryptjs` costo 12 + tokens HMAC-SHA256), `.auth-secret`, rate limit (bloqueo `429` al 5.° fallo / 15 min), CORS allowlist, Magic Bytes en fotos/videos, moderación, verificación manual, lotes atómicos y métricas. |
| `src/citizen/main.tsx` | React 19 + TSX estricto | Vistas `mapa`, `Muro vecinal` (`feed`), `reportar` (4 pasos con validación territorial `isWithinPuertoMontt`), `cuenta` (registro/login, revisión institucional y buzón de notificaciones) y `seguimiento` (folio o RUT autenticado); compilado a `public/citizen.bundle.js`. |
| `src/admin/main.ts`, `src/admin/heatmap.ts` | TypeScript estricto | Lógica del panel municipal (`/admin` en `public/municipal.html`): login RBAC sin botones ni claves demo en cliente, bandeja, selección/asignación por lotes, expediente, cierre técnico (enviando `photo` y `media`), gráficos `Chart.js`, moderación, cola de verificación y capa térmica HTML5 Canvas (`createCanvasHeatmapLayer`); compilado a `public/app.js`. |
| `src/types/browser-globals.d.ts`, `src/types/node-builtins.d.ts` | Declaraciones TS | Contratos estrictos sin `any` para APIs de navegador (`Leaflet`, `Chart`, `reportaDesktop`) y módulos nativos de Node.js (`node:http`, `node:fs`, `node:crypto`, `node:path`, `node:url`). |
| `desktop/main.cjs`, `desktop/preload.cjs` | Electron (CommonJS) | Lanza `server.js` en `utilityProcess.fork` con `REPORTA_DATA_DIR` aislado (`userData` al empaquetar), `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` y `window.reportaDesktop`. |
| `tests/*.test.cjs`, `tests/performance.cjs`, `tests/packaged-smoke.cjs`, `verify.ps1` | Node Test / PowerShell | 43 pruebas automatizadas (`api`, `seed`, `domain`, `accessibility`, `auth-secret`, `offline`), benchmark de 1.000 casos, smoke test de `release-final/win-unpacked/` y verificación en vivo PowerShell. |

---

### 3.2 Auditoría frente al diseño UML de la Evaluación 2 y actualización selectiva en UML 2.5

Frente al diseño base del Informe 2 (`Secciones 10.1` a `10.6`), permanecen invariantes el catálogo de Casos de Uso base (`10.1`) y los flujos de secuencia HTTP (`10.3`), mientras se actualizan selectivamente: (a) el **Modelo de Componentes y Despliegue (`10.5` / `10.6` → Figura 3.1 y Figura 2.1)** para reflejar la unificación integral en TypeScript estricto (`src/`), el patrón `ReportRepository` (`src/repository.ts`) y el empaquetado Electron NSIS (`release-final/`); y (b) el **Modelo de Clases/Datos y Máquina de Estados (`10.2` / `10.4` → Figura 3.2 y Diagrama ER Figura 5.1)** incorporando `citizens`, moderación vecinal, `notifications`, `verificationRequests` y validación territorial por polígono comunal. *(Nota de trazabilidad: los diagramas actualizados se generaron mediante scripts reproducibles a partir del código real; no se exportaron archivos desde herramienta CASE externa).*

```mermaid
flowchart TB
  subgraph DominioTS["Dominio Tipado (src/domain.ts)"]
    D1["PUERTO_MONTT_POLYGON + isPointInPolygon()"]
  end
  subgraph MaquinaEstados["Máquina de Estados Real"]
    EN_TERRENO -->|"POST /api/admin/reports/:id/close (validateCloseGate)"| RESUELTO
  end
```

---

## 4. Construcción del prototipo y funcionalidades

### 4.1 Módulos programados y cobertura de Casos de Uso (`CU-01` a `CU-09`)

| Caso de Uso | Archivos Reales Involucrados | Entradas Procesadas | Procesamiento y Reglas Aplicadas | Salidas y Errores Reales |
| --- | --- | --- | --- | --- |
| **CU-01 / CU-02:** Registro Geolocalizado y Deduplicación | `src/citizen/main.tsx`, `src/domain.ts`, `src/server.ts` | `lat`, `lng`, `category`, `description` (10–1.500 chars), `photo`, `media` (1–3 archivos, ≤ 5 MB), sesión ciudadana. | Verifica polígono comunal (`isWithinPuertoMontt`), RUT de sesión (`validateRutModulo11`), firma binaria (`validateMedia`) y duplicados activos a `<= 25` m (`distanceMeters`). | `201 Created` con folio `RPM-YYYY-XXXX` y notificación en buzón; `400` fuera de polígono (`CP-31`); `409` duplicado ≤ 25 m o doble apoyo. |
| **CU-03 / CU-04:** Mapa, Muro Vecinal, Filtros, Comentarios y Seguimiento | `src/citizen/main.tsx` (`MapView`, `ReportDetail`, `ReportSummary`), `src/server.ts` | Búsqueda texto, estado, folio, o sesión ciudadana para `POST /api/track`. | `publicReport()` suprime PII del reportante y notas internas; filtros reactivos `useMemo`; comentarios filtran emails/RUTs/teléfonos y entran como `PENDIENTE`. | Mapa Leaflet con pines cromáticos, muro vecinal con media, modal detalle Antes/Después, seguimiento por folio y por cuenta/RUT. |
| **CU-05 / CU-06 / CU-09:** Login RBAC, Lotes y Derivación | `public/municipal.html`, `src/admin/main.ts`, `src/server.ts`, `src/domain.ts` | Credenciales (`email`, `password`), lote `ids` (1–100), `status`, `department`, `comment`. | Verifica `bcryptjs` (12) + token HMAC; rate limit (bloqueo al 5.° fallo / 15 min); restringe `INSPECTOR_DEPTO` a su departamento; exige justificación ≥ 20 chars en `DERIVADO`/`RECHAZADO`; prevalida todo el lote antes de mutar y revierte ante fallo. | `200 OK` con actualización atómica y registros en `events` y `notifications`; `403`/`409`/`400`/`429` según regla violada. |
| **CU-07:** Cierre Técnico Verificado | `src/admin/main.ts` (`openAdminDetail`, `closeCase`), `src/domain.ts` (`validateCloseGate`), `src/server.ts` | `text` (≥ 50 chars), `crew`, `photo` posterior (`JPG`/`PNG`/`WebP`, ≤ 5 MB) y `media`. | Exige rol `INSPECTOR_DEPTO` o `ADMIN_MUNICIPAL`, estado `EN_TERRENO`, `validateCloseGate`, rechazo de datos de contacto/RUT y validación binaria de imagen (soporta payload con o sin `media` redundante, verificado en `CP-30`). | Transición a `RESUELTO`, cálculo de `workdays` con feriados, evento en `events` y notificación ciudadana. |
| **CU-08:** Analítica y Mapa de Calor Canvas | `src/admin/main.ts` (`renderMetrics`, `drawCharts`, `initHeat`), `src/admin/heatmap.ts`, `src/server.ts` | Reportes, `events` y feriados `HOLIDAYS`. | Calcula totales, abiertos, resueltos, tasa de resolución, promedio de días hábiles y puntos activos ponderados por `(supporters.length + 1)`. | Tarjetas KPI, 2 gráficos `Chart.js` y capa térmica radial HTML5 Canvas (`createCanvasHeatmapLayer`) con popups clicables. |
| **Extensión (Moderación y Verificación):** | `src/citizen/main.tsx`, `src/admin/main.ts`, `src/server.ts` | Comentarios vecinales y solicitudes `/api/citizens/verification-request`. | `ADMIN_MUNICIPAL` modera comentarios (`PATCH /api/admin/comments/:id`) y resuelve solicitudes de verificación (`PATCH /api/admin/verification-requests/:id`). | Comentarios publicados como `"Vecino/a"` y actualización de `identityVerified`. |

**Separación explícita de interfaces y flujos de acceso (Usuario Ciudadano vs. Administrador Municipal):**

| Dimensión | Interfaz de Usuarios — Portal Ciudadano PWA (`/app`) | Interfaz de Administrador — Consola Municipal (`/admin` / Electron) |
| --- | --- | --- |
| **Entrada y Autenticación** | Pestaña **Mi cuenta** (`citizen-login-card`): **Iniciar sesión** (correo + contraseña) y **Crear cuenta** (Nombre completo + **RUT validado con Módulo 11** + correo + contraseña). Endpoint `POST /api/citizens/login` y `POST /api/citizens/register`. | Pantalla **Gestión municipal** (`#loginForm`): **Acceso institucional RBAC** restringido por correo corporativo y contraseña (`OPERADOR_MESA`, `INSPECTOR_DEPTO`, `ADMIN_MUNICIPAL`), sin registro abierto. Endpoint `POST /api/auth/login`. |
| **Navegación y Secciones** | Barra superior de 5 secciones: **Mapa**, **Muro vecinal**, **Reportar** (asistente de 4 pasos), **Mi cuenta** y **Seguimiento**. | Barra institucional con subpestañas **Bandeja de reportes** (gestión individual y por lotes + cierre técnico) y **Analítica** (`Chart.js` + Mapa de calor Canvas + moderación). |
| **Evidencia Visual** | Anexo B, Subsección **B.2** (`Capturas B.3 a B.10`). | Anexo B, Subsección **B.3** (`Capturas B.11 a B.14`). |

---

### 4.2 Evidencia de flujos funcionales ejecutables y código fuente real del repositorio

#### Flujo Funcional 1: Validación Territorial por Polígono Comunal y Compuerta de Cierre (`src/domain.ts`)

```ts
// Archivo real: src/domain.ts (polígono comunal aproximado y ray-casting)
export function isPointInPolygon(point: Coordinates, polygon: readonly Coordinates[]): boolean {
  const count = polygon.length;
  if (count < 3) return false;
  let inside = false;
  for (let i = 0, j = count - 1; i < count; j = i++) {
    const vi = polygon[i];
    const vj = polygon[j];
    if (!vi || !vj) continue;
    const intersects = (vi.lat > point.lat) !== (vj.lat > point.lat)
      && point.lng < ((vj.lng - vi.lng) * (point.lat - vi.lat)) / (vj.lat - vi.lat) + vi.lng;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isWithinPuertoMontt(coordinates: Coordinates): boolean {
  const { lat, lng } = coordinates;
  if (
    !Number.isFinite(lat)
    || !Number.isFinite(lng)
    || lat < PUERTO_MONTT_BOUNDS.minLat
    || lat > PUERTO_MONTT_BOUNDS.maxLat
    || lng < PUERTO_MONTT_BOUNDS.minLng
    || lng > PUERTO_MONTT_BOUNDS.maxLng
  ) {
    return false;
  }
  return isPointInPolygon(coordinates, PUERTO_MONTT_POLYGON);
}
```

> **Evidencia de Ejecución Directa (Flujo 1):** Verificado en interfaz en vivo en la **Captura B.8** (asistente ciudadano de 4 pasos `/app`) y validado por pruebas automatizadas en `tests/domain.test.cjs` y `CP-31` (`tests/api.test.cjs`: rechazo HTTP `400` para coordenada `-41.63, -73.22` dentro del BBox antiguo pero fuera de `PUERTO_MONTT_POLYGON`).

#### Flujo Funcional 2: Cierre Técnico y Capa Térmica Canvas en Consola Municipal (`src/admin/main.ts` y `src/admin/heatmap.ts`)

```ts
// Archivo real: src/admin/main.ts (cierre técnico corregido con envío explícito de photo y media)
async function closeCase(id0: string): Promise<void> {
  const errEl = $('#closeError');
  if (errEl) errEl.textContent = '';
  const text = ($<HTMLTextAreaElement>('#closureText')?.value ?? '').trim();
  if (text.length < 50) {
    if (errEl) errEl.textContent = 'El informe debe tener al menos 50 caracteres.';
    return;
  }
  if (!closurePhotoData) {
    if (errEl) errEl.textContent = 'La foto posterior es obligatoria.';
    return;
  }
  try {
    await api(`/api/admin/reports/${id0}/close`, {
      method: 'POST',
      body: JSON.stringify({
        text,
        crew: $<HTMLInputElement>('#closureCrew')?.value ?? '',
        photo: closurePhotoData,
        media: [{ type: closurePhotoType, data: closurePhotoData }],
      }),
    });
    closurePhotoData = null;
    toast('Caso resuelto y notificación disponible en seguimiento.');
    const detailContainer = $('#adminDetail');
    if (detailContainer) detailContainer.innerHTML = '';
    await refreshAdmin();
    await reloadPublic();
  } catch (err) {
    if (errEl) errEl.textContent = err instanceof Error ? err.message : 'Error al cerrar el caso.';
  }
}
```

> **Evidencia de Ejecución Directa (Flujo 2):** Verificado visualmente en las **Capturas B.9** (modal Antes/Después en `/app`), **B.12** (bandeja por lotes, expediente auditado y formulario de cierre técnico verificado en `/admin`) y **B.13** (gráficos `Chart.js` + capa térmica Canvas sobre Puerto Montt), respaldado por `CP-29`, `CP-30` y `CP-32` en `tests/api.test.cjs`.

#### Flujo Funcional 3: Persistencia Desacoplada y Prevalidación Atómica (`src/repository.ts` y `src/server.ts`)

```ts
// Archivo real: src/repository.ts (contrato Repository y escritura atómica)
export interface ReportRepository {
  load(): DatabaseState;
  persist(state: DatabaseState): Promise<void>;
  loadHolidayCalendar(): Set<string>;
}

public persist(state: DatabaseState): Promise<void> {
  const snapshot = JSON.stringify(this.normalizedSnapshot(state), null, 2);
  this.writeQueue = this.writeQueue
    .catch(() => undefined)
    .then(async () => {
      const temp = `${this.dbFile}.${process.pid}.tmp`;
      await fs.promises.writeFile(temp, snapshot);
      await fs.promises.rename(temp, this.dbFile);
    });
  return this.writeQueue;
}
```

> **Evidencia de Ejecución Directa (Flujo 3):** Verificado en ejecución continua sobre consola real Windows PowerShell en las **Capturas B.1 y B.2** (`CP-05` persistencia normalizada en 10 tablas, `CP-21`..`CP-23` atomicidad y *rollback* en lotes sin mutaciones parciales y `tests/seed.test.cjs`) y en el **Diagrama ER (Figura 5.1)**.

---

## 5. Datos e interfaces

### 5.1 Interfaces desarrolladas, flujo de navegación, accesibilidad y métricas locales

1. **Portal Ciudadano (`/app`, React 19 + TS estricto):**
   - Cinco vistas (`Mapa`, `Muro vecinal`, `Reportar`, `Mi cuenta`, `Seguimiento`), estado de conexión (`En línea` / `Sin conexión`) e instalación PWA.
   - **Accesibilidad verificable (`tests/accessibility.test.cjs`):** contraste ≥ `4,5:1` contra blanco (`public/styles.css`), `:focus-visible` (`outline: 3px`), controles táctiles `min-height: 48px` y `@media (prefers-reduced-motion: reduce)` (`public/citizen-react.css`). **No cuenta con auditoría WCAG 2.1 AA completa independiente.**
2. **Panel Municipal (`/admin` y Electron, TypeScript estricto → `public/app.js`):**
   - Login RBAC, bandeja con filtros, selección múltiple por lotes, semáforo SLA hábil, expediente con transiciones y cierre técnico, gráficos `Chart.js`, capa térmica radial Canvas (`src/admin/heatmap.ts`), moderación de comentarios y verificación institucional.
3. **Rendimiento medido localmente en esta sesión (`tests/performance.cjs`):**
   - Ejecución de `npm run perf` sobre `build/server.js` con `1.000` registros sintéticos, `50` clientes paralelos y `200` solicitudes `GET /api/reports`: **P95 = 348,2 ms** y **media = 200,9 ms** (muy por debajo del umbral de `1.500 ms`, `pass: true`, ver Evidencia `EV-03` y **Captura B.2** en Anexo B). *Nota: corresponde a medición local sintética y no acredita 1.000 usuarios concurrentes ni red municipal real. Tampoco se han medido KPIs reales de operación municipal (ART, tasa mensual, adopción o ahorro).*

---

### 5.2 Estructura relacional normalizada (`schemaVersion: 3`), tablas y evidencia JSON

La clase `JsonFileRepository` (`src/repository.ts`) persiste `data/db.json` bajo `schemaVersion: 3` con **10 tablas normalizadas vinculadas por ID y llaves foráneas**: `reports`, `citizens`, `reporters` (tabla de migración heredada), `staff`, `supporters` (almacena únicamente `{ reportId, rutHash }` con `rutHash` HMAC-SHA256 de 64 hex), `events`, `reportComments`, `reportMedia`, `notifications` y `verificationRequests`.

**Justificación explícita de diseño relacional (3FN y desnormalizaciones controladas):**
- **`citizens` vs. `reporters` y llave foránea polimórfica en Fase 2 PostgreSQL:** Todos los reportes creados bajo el flujo vigente (`HAL-02`) enlazan `reports.reporterId` directamente con `citizens.id`, reservando la tabla `reporters` exclusivamente para casos heredados migrados desde `v1`/`v2` sin cuenta ciudadana previa (`legacy-<sha256>`). Aunque el repositorio JSON local resuelve `reporterId -> citizens.id | reporters.id` mediante búsqueda en memoria, el adaptador **`PostgresReportRepository` (Fase 2)** resolverá esta relación sin violar la integridad referencial SQL mediante **dos llaves foráneas anulables** (`citizen_id REFERENCES citizens(id)` y `legacy_reporter_id REFERENCES reporters(id)` con restricción `CHECK` de exclusión mutua) o mediante migración previa de registros heredados, y `reportMedia` adoptará clave primaria subrogada (`id UUID/SERIAL`) en PostgreSQL.
- **`verificationRequests` sin redundancia de PII:** `normalizedSnapshot()` persiste únicamente `id`, `folio` (`VER-YYYY-XXXX`), `citizenId`, `status`, `createdAt`, `reviewedBy`, `reviewedAt` y `reviewNote`. Al leer (`load()`), `rut`, `name` y `email` se resuelven por cruce con `citizens` mediante `citizenId`.
- **Atributos derivados vs. snapshots de lectura:** `notifications.folio` constituye un *snapshot* de lectura controlada para despachar el buzón ciudadano en `O(1)` sin hacer *join* contra `reports`, mientras que `closure.days` (`days`) se calcula dinámicamente en `publicReport()` a partir de `createdAt`, `closure.closedAt` y `HOLIDAYS`.

![Figura 5.1: Diagrama Entidad-Relación (ER) formal de schemaVersion: 3 con las 10 tablas normalizadas, llaves PK/FK y cardinalidades reales.](fig5_1_diagrama_er.png)

```json
{
  "schemaVersion": 3,
  "tables": {
    "reports": [
      {
        "id": "uuid-reporte",
        "folio": "RPM-2026-0051",
        "category": "Alumbrado público",
        "description": "Luminaria apagada y bache peligroso frente a Plaza de Armas de Puerto Montt.",
        "lat": -41.4678,
        "lng": -72.9402,
        "status": "RESUELTO",
        "department": "Operaciones",
        "createdAt": "2026-11-16T12:00:00.000Z",
        "updatedAt": "2026-11-19T12:00:00.000Z",
        "severity": 2,
        "closure": {
          "text": "Se reemplazó luminaria LED de 120 W, se normalizó acometida eléctrica y se repavimentó el bache colindante.",
          "crew": "Cuadrilla Alumbrado N° 2",
          "closedAt": "2026-11-19T12:00:00.000Z"
        },
        "reporterId": "uuid-ciudadano"
      }
    ],
    "citizens": [],
    "reporters": [],
    "staff": [],
    "supporters": [{ "reportId": "uuid-reporte", "rutHash": "64-hex-hmac-sha256" }],
    "events": [],
    "notifications": [],
    "reportComments": [],
    "reportMedia": [],
    "verificationRequests": []
  }
}
```

---

## 6. Confidencialidad, normativa y seguridad

### 6.1 Activos de datos tratados, riesgos de confidencialidad y marco jurídico chileno aplicable

El sistema separa tres clases de información: (1) **datos personales ciudadanos (PII)** en `citizens`/`reporters`, (2) **credenciales y auditoría municipal** en `staff`/`events`, y (3) **información pública urbana** en `publicReport()`. Esta arquitectura aplica el principio de minimización y reserva de la **Ley N° 19.628** y **Ley N° 21.719**, junto con el principio de divisibilidad de la **Ley N° 20.285** (publicando el avance, fotos antes/después e informe técnico sin exponer RUT, nombre ni contacto del vecino, y sanitizando comentarios del historial público con `publicHistoryComment`), en coherencia con la **Ley N° 21.663** y la **Ley N° 18.695**. *No sustituye un dictamen jurídico ni auditoría formal externa.*

---

### 6.2 Controles técnicos implementados y alineación con OWASP Top 10:2021

| Categoría OWASP Top 10:2021 | Amenaza en Reporta Puerto Montt | Control Real Implementado | Ubicación Verificable |
| --- | --- | --- | --- |
| **A01 – Broken Access Control** | Filtración de PII o ejecución de acciones fuera de rol/departamento. | `publicReport()` omite PII y notas internas; `auth(req, roles)` y `citizenAuth(req)` validan Bearer HMAC-SHA256; restricción departamental para `INSPECTOR_DEPTO`; creación de reportes restringida a sesión ciudadana. | `src/server.ts` |
| **A02 – Cryptographic Failures** | Claves débiles, secretos compartidos o RUTs en claro en apoyos. | `bcryptjs` costo 12 (con migración desde scrypt al login); secreto aleatorio por instalación en `.auth-secret` (rechaza `JWT_SECRET < 32` chars); `rutHash` HMAC-SHA256 en `supporters`. | `src/server.ts`, `src/repository.ts`, `tests/auth-secret.test.cjs` |
| **A03 – Injection / XSS** | Archivos falsificados o inyección HTML/PII. | Inspección binaria de Magic Bytes (JPG, PNG, WebP, MP4, WebM) en `validateMedia()` y `/close`; escape HTML `esc()` en `src/admin/main.ts` y escape JSX en React 19; rechazo de emails/RUTs/teléfonos en comentarios e informes. | `src/server.ts`, `src/admin/main.ts`, `src/citizen/main.tsx` |
| **A04 – Insecure Design** | Cierres falsos, duplicidad ≤ 25 m o suplantación en formulario. | `validateCloseGate` en TS; Haversine ≤ 25 m; identidad tomada de la sesión ciudadana (`CP-24`); polígono comunal `PUERTO_MONTT_POLYGON` (`CP-31`); retiro completo de accesos rápidos en cliente. | `src/domain.ts`, `src/server.ts`, `public/municipal.html` |
| **A05 – Security Misconfiguration** | CORS abierto, cabeceras permisivas o escape Electron. | CORS cerrado por defecto (`CORS_ORIGINS`); Electron con `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, bloqueo de ventanas/navegación externa y permiso limitado a `geolocation`. | `src/server.ts`, `desktop/main.cjs` |
| **A06 – Vulnerable and Outdated Components** | Dependencias con vulnerabilidades conocidas en runtime o empaquetado. | Ejecución periódica de `npm audit --omit=dev` con **`0` vulnerabilidades** en runtime (`7` paquetes); las `6` alertas moderadas de compilación se aíslan en `electron-builder` → `minimatch` fuera del servidor final. | `package.json`, `package-lock.json` |
| **A07 – Identification and Authentication Failures** | Fuerza bruta, exposición de credenciales demo en cliente o suplantación RBAC. | Eliminación de botones `"Accesos de demostración"` y contraseñas de `public/municipal.html` y `src/admin/main.ts` (`HAL-09`, `CP-32`); rate limit (`count >= 5` fallos / 15 min → `429`); tokens HMAC-SHA256 con expiración de 8 h y validación estricta de rol. | `src/server.ts`, `src/admin/main.ts`, `tests/api.test.cjs` (`CP-14`, `CP-27`, `CP-32`) |
| **A08 – Software and Data Integrity Failures** | Manipulación de dependencias o instalación no verificada de binarios. | Bloqueo determinista de árbol de paquetes vía `package-lock.json`, validación binaria de Magic Bytes y escritura atómica temporal + `rename`. *(Brecha declarada: el instalador NSIS `.exe` no cuenta con firma digital de código institucional).* | `package-lock.json`, `src/repository.ts`, `release-final/` |
| **A09 – Logging and Monitoring Failures** | Pérdida de trazabilidad o mutación parcial de lotes. | Tabla `events` e historial cronológico (`audit()` y `seed()`), prevalidación completa de lotes y rollback en memoria. *(Limitación: JSON local no ofrece inmutabilidad forense física).* | `src/server.ts`, `src/repository.ts`, `tests/seed.test.cjs` |
| **A10 – Server-Side Request Forgery (SSRF)** | Peticiones salientes inducidas desde entradas o URLs de usuarios. | **No aplica en superficie actual:** el servidor HTTP local (`src/server.ts`) nunca ejecuta `fetch`/peticiones salientes basadas en URLs ingresadas por ciudadanos o funcionarios; solo atiende rutas REST locales y valida payloads Base64 locales. | `src/server.ts` |

**Evidencia verificable de escaneo de vulnerabilidades y pruebas de seguridad ejecutadas:**

| Herramienta / Prueba Ejecutada | Alcance Real Auditado | Resultado Observado Verificado |
| --- | --- | --- |
| `npm audit --omit=dev --json` | Dependencias de **producción/runtime** (`7` dependencias resueltas alrededor de `bcryptjs`). | **`0` vulnerabilidades** (`critical: 0`, `high: 0`, `moderate: 0`, `low: 0`). |
| `npm audit --json` | Árbol completo (`323` dependencias incluyendo herramientas dev/empaquetado). | **`0` críticas, `0` altas, `6` moderadas** aisladas exclusivamente en la cadena de desarrollo `electron-builder` → `minimatch` (`GHSA-g3hv-75wg-m249`, `CWE-405`, sin impacto en runtime). |
| `tests/auth-secret.test.cjs` + `CP-11`, `CP-12`, `CP-15`, `CP-16`, `CP-18`, `CP-20`, `CP-24`, `CP-25`, `CP-27`, `CP-28`, `CP-32` | Secreto aleatorio `.auth-secret`, anti-PII en comentarios, rechazo anónimo `401`, aislamiento departamental `403`, CORS allowlist, rate limit `429` (`count >= 5`), ausencia de claves demo en `/app.js` y hashes `bcrypt` costo `12`. | **100% aprobadas** dentro de la suite automatizada (`npm test`, **43/43 pass**). |

> **Brecha declarada:** Las pruebas automatizadas locales y el escaneo de dependencias (`npm audit`) **no equivalen** a un escaneo dinámico DAST/SAST con **OWASP ZAP** o **SonarQube**, a un pentesting externo sobre infraestructura HTTPS productiva ni a una auditoría independiente WCAG 2.1 AA; asimismo, el instalador Windows en `release-final/` no posee firma digital de código institucional.

---

## 7. Plan de pruebas y casos ejecutados

### 7.1 Estrategia de verificación, ambiente de pruebas y datos sintéticos

Todas las verificaciones se ejecutaron en el entorno local Windows (Node.js v24.12.0) tras la última edición del código, utilizando datos sintéticos aislados en directorios temporales (`mkdtemp`) y compilando previamente `tsc` y `esbuild`:

- **`npm run typecheck`:** Aprobado con **0 errores** en `tsconfig.json` (portal ciudadano, panel municipal, capa térmica, dominio) y `tsconfig.server.json` (servidor HTTP, repositorio, dominio).
- **`npm test`:** **43/43 pruebas aprobadas** (`0` fallidas, `0` omitidas): **32** pruebas HTTP (`CP-01` a `CP-32` en `tests/api.test.cjs`), **6** unitarias de dominio (`tests/domain.test.cjs`), **2** de accesibilidad CSS (`tests/accessibility.test.cjs`), **1** de aislamiento criptográfico (`tests/auth-secret.test.cjs`), **1** de shell/caché offline (`tests/offline.test.cjs`) y **1** de semilla urbana e historial multi-evento (`tests/seed.test.cjs`).
- **`npm run perf`:** **Aprobado** (`P95 = 348,2 ms`, `media = 200,9 ms`, umbral `< 1.500 ms` sobre `1.000` registros y `50` clientes paralelos; Evidencia `EV-03`, Captura B.2).
- **`npm run desktop:dist` + `node tests/packaged-smoke.cjs`:** Instalador Windows generado en `release-final/Reporta-Puerto-Montt-Admin-1.0.0-Setup.exe`, ventana nativa verificada y smoke test empaquetado **aprobado** (Capturas B.2 y B.14).
- **`./verify.ps1`:** Ejecutado contra instancia local en puerto `3001`, con todas las aserciones PowerShell aprobadas (`12/12 PASS`, Captura B.2).

---

### 7.2 Registro maestro de casos de prueba automatizados (Tabla 7.1 — `CP-01` a `CP-32` y suites complementarias)

*(Estructura de 5 columnas conforme a la Tabla 5.2 de referencia de la Guía de Evaluación 3).*

> **Precondición general del banco de pruebas:** Antes de cada suite (`tests/*.test.cjs`), el proceso de prueba compila TypeScript estricto (`npm run build:domain`), inicia `build/server.js` sobre un directorio de datos temporal limpio (`mkdtemp`) sembrado con 50 reportes sintéticos urbanos en `schemaVersion: 3` (con historial cronológico acorde a cada estado en `seed()`), calendario de feriados configurado (`REPORTA_HOLIDAYS`) y clave aleatoria por instalación (`.auth-secret`), aislando las ejecuciones para garantizar repetibilidad determinista.

| ID / Requisito | Pasos y Datos de Entrada (`tests/api.test.cjs`) | Resultado Esperado | Resultado Observado | Estado / Evidencia |
| --- | --- | --- | --- | --- |
| **CP-01** / `RNF-08` | Invocar `GET /api/health` contra el servidor local iniciado. | HTTP `200 OK` con `{ ok: true }`. | Respuesta `ok: true` inmediata confirmando servicio activo. | **Aprobado** / `EV-02` |
| **CP-02** / `RF-01`, `RF-05` | Solicitar `GET /app`, `GET /citizen.bundle.js` y `GET /citizen-react.css`. | Entrega HTML PWA React 19 y bundle sin `app.js`. | HTML, bundle y CSS servidos (`200 OK`). | **Aprobado** / `EV-02`, `EV-04` |
| **CP-03** / `RF-08`, `RES-03` | Solicitar `GET /admin` y verificar carga de `/app.js`. | Entrega consola administrativa sin `citizenRoot`. | Interfaz municipal y script servidos (`200 OK`). | **Aprobado** / `EV-02`, `EV-05` |
| **CP-04** / `RF-01`, `RF-02` | Invocar `GET /api/meta`. | Catálogo `>= 6` categorías y límites (`minLat < maxLat`). | JSON con categorías y `PUERTO_MONTT_BOUNDS` (`200 OK`). | **Aprobado** / `EV-02` |
| **CP-05** / `RNF-06`, `RES-05` | Iniciar servidor con semilla limpia e inspeccionar `data/db.json`. | ≥ 50 reportes en `schemaVersion: 3` y `>= 50` eventos separados. | `db.json` creado con 50 reportes y 10 tablas normalizadas. | **Aprobado** / `EV-02` |
| **CP-06** / `RF-05`, `RF-07` | Invocar `GET /api/reports` y revisar estados retornados. | Lista pública excluye casos en estado `RECHAZADO`. | 0 reportes `RECHAZADO` en respuesta pública. | **Aprobado** / `EV-02` |
| **CP-07** / `RF-04`, `RN-02` | Enviar `POST /api/reports/duplicate` con coordenada y categoría activas. | Detección Haversine `<= 25 m` retornando el reporte activo. | Duplicado detectado (`200 OK`). | **Aprobado** / `EV-02` |
| **CP-08** / `RF-04`, `RNF-09` *(Neg.)* | Enviar `POST /api/reports/duplicate` con `{ lat: -41.4, lng: -72.9, category: 'invalid' }`. | Rechazo HTTP `400 Bad Request` por categoría inválida. | API responde `400` con mensaje de validación. | **Aprobado** / `EV-02` |
| **CP-09** / `RF-13`, `RNF-04` | Consultar `GET /api/reports/:folio` para un reporte existente. | Retorna detalle público sin `citizen` (ni RUT, nombre o email). | `report.citizen === undefined` (`200 OK`). | **Aprobado** / `EV-02` |
| **CP-10** / `RF-06` | Consultar `GET /api/reports/:folio/comments`. | HTTP `200 OK` con arreglo de comentarios publicados. | Lista de comentarios públicos entregada (`200 OK`). | **Aprobado** / `EV-02` |
| **CP-11** / `RNF-09` *(Neg.)* | Enviar `POST /api/reports/:folio/comments` con `{ text: 'no' }` autenticado. | Rechazo HTTP `400` por longitud `< 5` caracteres. | Comentario rechazado con estado `400`. | **Aprobado** / `EV-02` |
| **CP-12** / `RNF-04` *(Neg.)* | Enviar `POST /api/reports/:folio/comments` con `{ text: 'Contacta vecino@mail.com' }`. | Rechazo HTTP `400` por filtro anti-PII en comentarios. | Publicación bloqueada con estado `400`. | **Aprobado** / `EV-02` |
| **CP-13** / `RNF-04`, `RF-16` | Crear comentario seguro (`201`), moderar vía `PATCH /api/admin/comments/:id` (`PUBLICADO`) y leer público. | Comentario visible sin `citizenId` y autor `Vecino/a`. | Moderación `200 OK` y autor público igual a `Vecino/a`. | **Aprobado** / `EV-02` |
| **CP-14** / `RF-16` | Enviar `POST /api/auth/login` con credenciales locales válidas de `ADMIN_MUNICIPAL`. | HTTP `200 OK` con token Bearer y rol `ADMIN_MUNICIPAL`. | Token emitido y rol `ADMIN_MUNICIPAL` verificado. | **Aprobado** / `EV-02` |
| **CP-15** / `RF-16` *(Neg.)* | Enviar `POST /api/auth/login` con contraseña `'incorrecta'`. | Rechazo HTTP `401 Unauthorized`. | Servidor responde `401` ante clave errónea. | **Aprobado** / `EV-02` |
| **CP-16** / `RF-14`, `RF-16` *(Neg.)* | Invocar `GET /api/admin/metrics` sin cabecera `Authorization`. | Rechazo HTTP `401 Unauthorized`. | Acceso denegado con estado `401`. | **Aprobado** / `EV-02` |
| **CP-17** / `RF-14` | Invocar `GET /api/admin/metrics` con token de administrador. | HTTP `200 OK` con `total >= 50`. | Métricas entregadas con `total >= 50`. | **Aprobado** / `EV-02` |
| **CP-18** / `RF-08`, `RF-16` *(Neg.)* | Invocar `GET /api/admin/reports` de forma anónima. | Rechazo HTTP `401 Unauthorized`. | Petición bloqueada con código `401`. | **Aprobado** / `EV-02` |
| **CP-19** / `RF-08` | Invocar `GET /api/admin/reports` con token municipal válido. | HTTP `200 OK` retornando `>= 50` expedientes. | Bandeja administrativa recibida (`>= 50`). | **Aprobado** / `EV-02`, `EV-05` |
| **CP-20** / `RF-12`, `RF-13` *(Neg.)* | Invocar `POST /api/track`, `GET /api/admin/verification-requests` y `GET /api/citizens/notifications` sin token. | Rechazo HTTP `401 Unauthorized` en los 3 endpoints privados. | Los 3 endpoints rechazan acceso anónimo con `401`. | **Aprobado** / `EV-02`, `HAL-02` |
| **CP-21** / `RF-08`, `RNF-05` *(Neg.)* | Ejecutar `POST /api/admin/reports/batch` con `[idValido, 'missing-id']`. | HTTP `404` y **0 mutaciones** en el caso válido del lote. | Lote abortado (`404`); estado previo intacto en `db.json`. | **Aprobado** / `EV-02`, `HAL-05` |
| **CP-22** / `RN-03`, `RNF-05` *(Neg.)* | Ejecutar lote mezclando un caso `PENDIENTE` y uno `RESUELTO`. | HTTP `409 Conflict` y *rollback* total sin mutaciones. | Rechazo `409` verificado; el caso `PENDIENTE` no cambia. | **Aprobado** / `EV-02`, `HAL-05` |
| **CP-23** / `RF-08`, `RF-10` | Ejecutar lote válido de 2 reportes `PENDIENTE` hacia `EN_REVISION`. | HTTP `200 OK`, `updated: 2` y `+2` eventos en `events`. | Transición masiva atómica aplicada y auditada (`+2`). | **Aprobado** / `EV-02`, `HAL-05` |
| **CP-24** / `RF-01..04`, `RF-09`, `RF-12`, `RF-16` | RBAC depto. (`403`), creación anónima (`401`), fuera de límites (`400`), creación autenticada (`201`), notificaciones, apoyo (`200`), doble apoyo (`409`) y `rutHash`. | RBAC estricto, identidad tomada de la sesión ciudadana, buzón actualizado, bloqueo de doble apoyo y `rutHash` de 64 hex. | `403`, `401`, `400`, `201`, notificaciones leídas, apoyo `200` / `409` y `rutHash` de 64 chars en `supporters`. | **Aprobado** / `EV-02`, `HAL-02` |
| **CP-25** / `RNF-04` *(CORS)* | Enviar `GET /api/health` con `Origin: https://portal.example.test` vs. `https://evil.example`. | Permite origen en `CORS_ORIGINS` y omite header en origen no autorizado. | `access-control-allow-origin` emitido solo al origen autorizado. | **Aprobado** / `EV-02` |
| **CP-26** / `RNF-08`, `RN-08` | Consultar `GET /api/meta` y `GET /api/admin/metrics` con `REPORTA_HOLIDAYS='2026-11-17'`. | Descuenta feriados del cálculo de días hábiles (`averageWorkdays: 0`). | Feriado reconocido en `meta.holidays` y `averageWorkdays === 0`. | **Aprobado** / `EV-02`, `HAL-06` |
| **CP-27** / `RF-16` *(Fuerza Bruta)* | Realizar 6 intentos fallidos consecutivos en `POST /api/auth/login`. | Los 4 primeros fallos devuelven `401`; al alcanzar el 5.° fallo (`count >= 5`) y sucesivos bloquea con HTTP `429 Too Many Requests` durante 15 min. | 4 primeros fallos `401`; 5.° y 6.° intento devuelven HTTP `429`. | **Aprobado** / `EV-02` |
| **CP-28** / `RNF-04` *(Criptografía)* | Inspeccionar `staff` y `citizens` en `data/db.json`. | Todas las contraseñas almacenadas con `bcrypt` costo 12. | 100% de hashes cumplen `/^\$2[aby]\$12\$/`. | **Aprobado** / `EV-02` |
| **CP-29** / `RF-11`, `RN-04` *(Pos. y Neg.)* | Invocar `POST /api/admin/reports/:id/close` con nota corta (`400`), sin foto (`400`) y con foto JPEG + nota ≥ 50 chars (`200`). | Bloqueo estricto ante falta de foto o nota corta; `RESUELTO` al cumplir ambos. | Rechazos `400` verificados y cierre válido en `200 OK` (`RESUELTO`). | **Aprobado** / `EV-02`, `HAL-06` |
| **CP-30** / `RF-11`, `HAL-08` | Inspeccionar `/app.js` y enviar `POST /api/admin/reports/:id/close` solo con `photo` válida y nota ≥ 50 chars. | Sin `useManualCoords).onclick` roto; incluye `media` en bundle y servidor acepta `photo` sin `media` duplicado. | Bundle limpio y cierre completado a `RESUELTO` (`200 OK`). | **Aprobado** / `EV-02`, `EV-05`, `HAL-08` |
| **CP-31** / `RF-02`, `RES-01` *(Neg.)* | Consultar `GET /api/meta` y enviar `POST /api/reports` en `(-41.63, -73.22)` (dentro del BBox rectangular pero fuera de `PUERTO_MONTT_POLYGON`). | Polígono `>= 10` vértices expuesto y rechazo HTTP `400` por algoritmo *Ray-Casting*. | API rechaza la coordenada con estado `400` (`/límite comunal/`). | **Aprobado** / `EV-02`, `EV-04`, `HAL-07` |
| **CP-32** / `RF-15`, `RF-16`, `HAL-09` | Inspeccionar `/admin` y `/app.js` en busca de claves demo y consultar `metrics.heat`. | Sin atributos `data-demo` ni claves hardcodeadas; bundle expone `leaflet-heatmap-layer` + `createRadialGradient` y `metrics.heat` no vacío. | 0 credenciales expuestas en bundle y `metrics.heat` validado (`200 OK`). | **Aprobado** / `EV-02`, `EV-05`, `HAL-09` |

**Suites complementarias verificadas (11 pruebas unitarias/estáticas/semilla + rendimiento + paquete + PowerShell):**
- `tests/domain.test.cjs` (**6/6 aprobadas**): incluye validación de polígono comunal excluyendo mar abierto/cordillera dentro del viejo BBox.
- `tests/accessibility.test.cjs` (**2/2 aprobadas**), `tests/auth-secret.test.cjs` (**1/1 aprobada**), `tests/offline.test.cjs` (**1/1 aprobada**).
- `tests/seed.test.cjs` (**1/1 aprobada**): valida arranque limpio verificando que los 50 casos semilla quedan en tierra firme urbana dentro de `PUERTO_MONTT_POLYGON` y con trazabilidad cronológica multi-evento (`> 50` eventos en `events`).
- `tests/performance.cjs` (`P95 = 348,2 ms`, `media = 200,9 ms`), `tests/packaged-smoke.cjs` (**aprobado**) y `verify.ps1` (**12/12 PASS**).

---

## 8. Defectos, endurecimiento técnico y nuevas pruebas

### 8.1 Registro de hallazgos y defectos corregidos en el prototipo (`HAL-01` a `HAL-10`)

| ID | Severidad | Hallazgo / Defecto Detectado | Corrección Implementada en Código | Prueba / Reprueba | Estado |
| --- | --- | --- | --- | --- | --- |
| **HAL-01** | **Crítica** | Secreto de sesión compartido por defecto en entorno local. | `loadAuthSecret()` en `src/server.ts` genera `.auth-secret` aleatorio por instalación (`0o600`) o exige `JWT_SECRET >= 32` chars. | `tests/auth-secret.test.cjs` | **v1 · Cerrado** |
| **HAL-02** | **Crítica** | Reportes/apoyos sin sesión ciudadana obligatoria ni hashing de RUTs adherentes. | Sesión ciudadana obligatoria derivada del token; `supporters` almacena `rutHash` HMAC-SHA256 (`PII_HASH_SECRET`). | `CP-20`, `CP-24` | **v1 · Cerrado** |
| **HAL-03** | **Alta** | Persistencia JSON sin normalización relacional. | `JsonFileRepository` (`src/repository.ts`) con 10 tablas normalizadas (`schemaVersion: 3`) y escritura atómica temporal + `rename`. | `CP-05`, `CP-24` | **v1 · Cerrado** |
| **HAL-04** | **Alta** | Portal ciudadano sin PWA TS independiente ni buzón privado. | `src/citizen/main.tsx` (React 19 + TS estricto), buzón `/api/citizens/notifications` y `public/sw.js` con caché acotado. | `CP-02`, `CP-24`, `tests/offline.test.cjs` | **v1 · Cerrado** |
| **HAL-05** | **Alta** | Asignación por lotes sin prevalidación integral ni rollback. | Prevalidación del lote completo en `POST /api/admin/reports/batch` con rollback en memoria en caso de error. | `CP-21`, `CP-22`, `CP-23` | **v1 · Cerrado** |
| **HAL-06** | **Media** | SLA sin feriados configurables y validación parcial de medios. | Feriados configurables (`data/feriados.json` / `REPORTA_HOLIDAYS`), Magic Bytes en fotos/videos y `validateCloseGate`. | `CP-26`, `CP-29`, `verify.ps1` | **v1 · Cerrado** |
| **HAL-07** | **Alta** | Stack mixto JS/TS en servidor y panel `/admin`, BBox rectangular y mapa de calor básico con `L.circle`. | Migración completa de servidor (`src/server.ts`, `src/repository.ts`) y panel `/admin` (`src/admin/main.ts`, `src/admin/heatmap.ts`) a TypeScript estricto; polígono comunal aproximado (`PUERTO_MONTT_POLYGON`) y capa térmica radial Canvas. | `npm run typecheck`, `tests/domain.test.cjs`, `CP-31` | **v2 · Cerrado** |
| **HAL-08** | **Crítica** | **Defectos bloqueantes en UI `/admin`:** `$('#useManualCoords').onclick` lanzaba `TypeError` al cargar `municipal.html`, y `closeCase()` omitía el arreglo `media` exigido por `/close`. | Enlaces DOM seguros opcionales en `src/admin/main.ts` (`if (useManualCoords)`), envío explícito de `media` en `closeCase()`, y compatibilidad en `src/server.ts` (`/close`) para validar `b.photo` como imagen única cuando `b.media` no se envía aparte. | `CP-30`, `node --check public/app.js`, `packaged-smoke.cjs` | **v2 · Cerrado** |
| **HAL-09** | **Alta** | Exposición de botones `"Accesos de demostración"` y contraseñas RBAC en el bundle cliente `/app.js`. | Retiro íntegro de los botones `[data-demo]` y del diccionario `demoMap` desde `public/municipal.html` y `src/admin/main.ts`, junto al reemplazo del glifo `⌑` por SVG inline. | `CP-32`, `Captura B.11` | **v3 · Cerrado** |
| **HAL-10** | **Alta** | Semilla con historial único (`PENDIENTE`) en casos avanzados, puntos en mar/humedal y defectos visuales en UI `/app` y `/admin`. | Generación cronológica multi-evento en `seed()`, 8 puntos urbanos terrestres dentro de `PUERTO_MONTT_POLYGON`, controles Leaflet desplazados a derecha, espaciado de pasos en `/app`, modal comparativo Antes/Después y pluralización/contacto limpios en `/admin`. | `tests/seed.test.cjs`, `Capturas B.6–B.13` | **v3 · Cerrado** |

---

### 8.2 Análisis de estabilidad transaccional y estado de preparación

Tras las correcciones `HAL-07` a `HAL-10`, el prototipo compila íntegramente desde TypeScript estricto, aprueba las **43 pruebas automatizadas**, pasa `verify.ps1` y empaqueta correctamente el instalador Electron (`tests/packaged-smoke.cjs` aprobado). La única restricción estructural de persistencia en esta fase es que `JsonFileRepository` opera sobre un archivo JSON local por equipo y no reemplaza un motor transaccional SQL multiusuario en servidor remoto.

---

## 9. Trazabilidad y evaluación de cumplimiento

### 9.1 Matriz consolidada de trazabilidad real (`RF/RNF → Informe 2 / CU → Módulo → Prueba`)

**Denominador de Línea Base (`N = 26` requerimientos priorizados del Informe 2: `16` Funcionales + `10` No Funcionales):** **15** requisitos cuentan con **implementación local completa verificada** (`RF-01`, `RF-03`..`RF-09`, `RF-11`, `RF-13`..`RF-15`, `RNF-08`..`RNF-10` — `57,7%`), **2** se encuentran implementados con acote técnico externo (`RF-02` polígono aproximado y `RNF-07` `.exe` sin firma digital — `7,7%`), **9** en estado **Parcial / Medido localmente** por dependencias de producción (`RF-10`, `RF-12`, `RF-16`, `RNF-01`..`RNF-06` — `34,6%`), y **0** sin avance (`0%`). *(Criterio explícito: `15 + 2 + 9 = 26`; solo se declara "Implementado localmente" lo operable sin simulaciones críticas en ámbito local, transparentando las integraciones externas de Fase 2).*

| ID / Requisito | Origen Informe 2 / CU | Módulo / Archivo Real | Estado Real | Pruebas Asociadas | Brecha Externa / Observación |
| --- | --- | --- | --- | --- | --- |
| **RF-01** Reporte en 4 pasos | SRS RF-01 / `CU-01` | `src/citizen/main.tsx`, `src/server.ts` | **Implementado localmente** | `CP-02`, `CP-24` | Flujo en React 19 + TS estricto. |
| **RF-02** GPS y polígono comunal | SRS RF-02 / `CU-01` | `src/citizen/main.tsx`, `src/domain.ts` | **Implementado (aprox.)** | `CP-24`, `CP-31`, `domain.test.cjs` | Usa `PUERTO_MONTT_POLYGON` (pendiente shapefile oficial IDE/SUBDERE). |
| **RF-03** Multimedia ≤ 5 MB | SRS RF-03 / `CU-01` | `src/citizen/main.tsx`, `src/server.ts` | **Implementado localmente** | `CP-24`, `verify.ps1` | Fotos JPG/PNG/WebP + videos MP4/WebM validados por Magic Bytes. |
| **RF-04** Deduplicación ≤ 25 m | SRS RF-04 / `CU-02` | `src/domain.ts`, `src/server.ts`, `src/admin/main.ts` | **Implementado localmente** | `CP-07`, `CP-08`, `CP-24` | Bloquea duplicados ≤ 25 m (`409`); apoyo único con `rutHash`. |
| **RF-05** Mapa interactivo | SRS RF-05 / `CU-03` | `src/citizen/main.tsx`, `public/vendor/leaflet/` | **Implementado localmente** | `CP-02`, `offline.test.cjs` | Teselas OSM online; sin mapa detallado offline (política OSM). |
| **RF-06** Modal Antes/Después | SRS RF-06 / `CU-03` | `src/citizen/main.tsx`, `src/admin/main.ts` | **Implementado localmente** | `CP-09`, `CP-29`, `Captura B.9` | Muestra foto inicial, foto posterior e informe técnico. |
| **RF-07** Filtros mapa/muro | SRS RF-07 / `CU-03` | `src/citizen/main.tsx` (`useMemo`) | **Implementado localmente** | `CP-06` | Filtrado reactivo por texto y estado en memoria. |
| **RF-08** Bandeja y lotes atómicos | SRS RF-08 / `CU-05` | `public/municipal.html`, `src/admin/main.ts`, `src/server.ts` | **Implementado localmente** | `CP-21`..`CP-23`, `CP-30` | Prevalidación integral y rollback en memoria. |
| **RF-09** Derivación justificada | SRS RF-09 / `CU-06` | `src/admin/main.ts`, `src/server.ts`, `src/domain.ts` | **Implementado localmente** | `CP-24`, `domain.test.cjs` | Exige justificación ≥ 20 chars en `DERIVADO`/`RECHAZADO`. |
| **RF-10** Auditoría y privacidad | SRS RF-10 / `CU-05` | `src/server.ts` (`audit`, `seed`, `publicReport`) | **Parcial** | `CP-05`, `CP-09`, `CP-23`, `tests/seed.test.cjs` | Tabla `events` separada con trazabilidad multi-evento; JSON local sin inmutabilidad forense física. |
| **RF-11** Cierre verificado | SRS RF-11 / `CU-07` | `src/domain.ts`, `src/server.ts`, `src/admin/main.ts` | **Implementado localmente** | `CP-29`, `CP-30`, `domain.test.cjs` | Foto posterior + ≥ 50 chars + fix de `media` en UI. |
| **RF-12** Notificaciones vecinales | SRS RF-12 / `CU-04` | `src/server.ts`, `src/citizen/main.tsx` | **Parcial** | `CP-20`, `CP-24`, `Captura B.5` | Buzón privado persistido; SMTP y Web Push pendientes. |
| **RF-13** Buscador Folio / RUT | SRS RF-13 / `CU-04` | `src/citizen/main.tsx`, `src/server.ts` | **Implementado localmente** | `CP-09`, `CP-20`, `Captura B.10` | Folio público sin PII; consulta por RUT requiere sesión. |
| **RF-14** Dashboard Chart.js | SRS RF-14 / `CU-08` | `src/admin/main.ts` (`drawCharts`), `src/server.ts` | **Implementado localmente** | `CP-16`, `CP-17`, `CP-26`, `Captura B.13` | Gráficos locales; KPIs municipales reales no medidos. |
| **RF-15** Mapa de calor Canvas | SRS RF-15 / `CU-08` | `src/admin/heatmap.ts`, `src/admin/main.ts` | **Implementado localmente** | `CP-32`, `Captura B.13`, `packaged-smoke.cjs` | Capa térmica HTML5 Canvas con gradiente radial sobre Leaflet. |
| **RF-16** Auth y RBAC municipal | SRS RF-16 / `CU-09` | `src/server.ts`, `src/admin/main.ts` | **Parcial** | `CP-14`..`CP-19`, `CP-24`, `CP-28`, `CP-32` | RBAC por rol/depto y `bcryptjs`; verificación manual (sin ClaveÚnica). |
| **RNF-01** WCAG 2.1 AA | SRS RNF-01 / `CU-01..04` | `public/styles.css`, `public/citizen-react.css` | **Parcial** | `accessibility.test.cjs` | Contraste ≥ 4,5:1, foco y 48 px; falta auditoría WCAG externa. |
| **RNF-02** Latencia P95 < 1.500 ms | SRS RNF-02 / Transv. | `src/server.ts`, `tests/performance.cjs` | **Medido localmente** | `npm run perf`, `Captura B.2` | **P95 = 348,2 ms** (`media = 200,9 ms`, 1.000 casos, 50 clientes). |
| **RNF-03** Mobile-First | SRS RNF-03 / `CU-01..04` | `public/styles.css`, `public/citizen-react.css` | **Parcial** | `accessibility.test.cjs` | Diseño responsivo y objetivos táctiles ≥ 48 px. |
| **RNF-04** Privacidad y crypto | SRS RNF-04 / `CU-01..09` | `src/server.ts`, `src/repository.ts` | **Parcial** | `CP-09`, `CP-24`, `CP-28`, `CP-32`, `auth-secret.test.cjs`, `npm audit` | Controles activos y `0` vulns runtime; falta ZAP/pentest externo. |
| **RNF-05** Atomicidad local | SRS RNF-05 / `CU-05` | `src/repository.ts`, `src/server.ts` | **Parcial** | `CP-21`..`CP-23` | Escritura atómica local; no reemplaza motor SQL ACID remoto. |
| **RNF-06** Repository en 3FN | SRS RNF-06 / `UML 10.2` | `src/repository.ts` (`ReportRepository`) | **Parcial** | `CP-05`, `CP-24` | 10 tablas normalizadas (Figura 5.1); pendiente adaptador SQL. |
| **RNF-07** Ejecutable `.exe` | SRS RNF-07 / `UML 10.6` | `desktop/main.cjs`, `package.json` | **Implementado (sin firma)** | `npm run desktop:dist`, `packaged-smoke.cjs`, `Captura B.14` | NSIS compilado y probado; sin certificado de firma digital. |
| **RNF-08** SLA días hábiles | SRS RNF-08 / `CU-07` | `src/domain.ts`, `feriados.example.json` | **Implementado localmente** | `CP-26`, `domain.test.cjs` | Descuenta fines de semana y feriados configurables. |
| **RNF-09** Feedback UI | SRS RNF-09 / `CU-01..07` | `src/citizen/main.tsx`, `src/admin/main.ts` | **Implementado localmente** | `CP-11`, `CP-12`, `CP-29`, `CP-30` | Mensajes descriptivos inmediatos en cliente y servidor. |
| **RNF-10** TS estricto y tests | SRS RNF-10 / Transv. | `tsconfig*.json`, `src/`, `tests/` | **Implementado** | `npm run typecheck`, `npm test`, `Captura B.1` | **100% TS estricto** + 43/43 pruebas aprobadas. |

---

### 9.2 Trazabilidad de Reglas de Negocio (`RN-01` a `RN-08`) y evaluación honesta frente a la rúbrica

| ID Regla | Descripción de la Regla de Negocio | Implementación Real en Código | Casos de Prueba / Verificación |
| --- | --- | --- | --- |
| **RN-01** | Validación estricta de RUT chileno con dígito verificador Módulo 11 (rechaza secuencias repetidas y formatos inválidos) y límite comunal de Puerto Montt. | `validateRutModulo11()`, `isPointInPolygon()`, `isWithinPuertoMontt()` (`src/domain.ts`) y `POST /api/reports`, `POST /api/citizens/register` (`src/server.ts`). | `tests/domain.test.cjs`, `CP-24`, `CP-31`, `tests/seed.test.cjs` |
| **RN-02** | Detección de duplicidad por categoría igual dentro de un radio Haversine ≤ 25 m en casos activos (`409` al crear; apoyo único vía `rutHash` HMAC-SHA256). | `distanceMeters()`, `isActiveStatus()` (`src/domain.ts`) y `/api/reports/duplicate`, `/api/reports`, `/api/reports/:folio/support` (`src/server.ts`). | `tests/domain.test.cjs`, `CP-07`, `CP-08`, `CP-24` |
| **RN-03** | Máquina de estados dirigida y controlada por rol (`PENDIENTE` → `EN_REVISION` → `EN_TERRENO`/`DERIVADO` → `RESUELTO`; `DERIVADO` solo retorna a `EN_REVISION`; estados terminales inmutables). | `ALLOWED_TRANSITIONS`, `isAllowedTransition()` (`src/domain.ts`) y `/api/admin/reports/:id/transition`, `/api/admin/reports/batch` (`src/server.ts`). | `tests/domain.test.cjs`, `CP-21`, `CP-22`, `CP-23`, `CP-24` |
| **RN-04** | Compuerta obligatoria de cierre técnico: solo casos en `EN_TERRENO`, con nota técnica ≥ 50 caracteres y fotografía posterior validada por Magic Bytes (`JPG`/`PNG`/`WebP`, ≤ 5 MB). | `validateCloseGate()` (`src/domain.ts`), `validateMedia()` y `POST /api/admin/reports/:id/close` (`src/server.ts`), `closeCase()` (`src/admin/main.ts`). | `tests/domain.test.cjs`, `CP-29`, `CP-30` |
| **RN-05** | Toda transición hacia `DERIVADO` o `RECHAZADO` exige justificación escrita de al menos 20 caracteres (tanto individual como por lotes). | `requiresJustification()` (`src/domain.ts`) aplicado en `/transition` y `/batch` (`src/server.ts`). | `tests/domain.test.cjs`, `CP-23`, `CP-24` |
| **RN-06** | Priorización automática (`BAJA`, `MEDIA`, `ALTA`, `CRÍTICA`) en función de la severidad del reporte y el logaritmo de los apoyos vecinales. | `priorityFor(severity, supporterCount)` (`src/domain.ts`) usado en `publicReport()` (`src/server.ts`) y ordenamiento SLA de bandeja (`src/admin/main.ts`). | `tests/domain.test.cjs`, `CP-19` |
| **RN-07** | Trazabilidad auditable integral y privacidad pública: cada transición genera evento cronológico en `events`/`history` y `publicReport()` suprime PII y notas internas. | `audit()`, `seed()`, `publicReport()`, `publicHistoryComment()` (`src/server.ts`) y `JsonFileRepository.persist()` (`src/repository.ts`). | `CP-05`, `CP-09`, `CP-13`, `CP-23`, `tests/seed.test.cjs` |
| **RN-08** | Cálculo de antigüedad SLA y promedio de resolución exclusivamente en días hábiles, descontando fines de semana y feriados configurables (`data/feriados.json` / `REPORTA_HOLIDAYS`). | `workingDaysBetween()` (`src/domain.ts`), `loadHolidayCalendar()` (`src/repository.ts`), `workdays()` (`src/server.ts`, `src/admin/main.ts`). | `tests/domain.test.cjs`, `CP-26` |

Las 8 Reglas de Negocio (`RN-01` a `RN-08`) operan de extremo a extremo y se verifican en la suite automatizada. Con respecto a la rúbrica, tras cerrar todas las brechas de código, seguridad cliente y evidencias visuales reales (TS estricto integral, polígono comunal aproximado, capa térmica Canvas, patrón `ReportRepository`, retiro de accesos demo en `/app.js`, trazabilidad multi-evento en semilla, **43/43 tests**, benchmark **P95 = 348,2 ms** y empaquetado NSIS validado en ventana real de Windows), el prototipo logra **implementación completa en ámbito local**, manteniendo documentadas de forma transparente las brechas de producción que requieren infraestructura o entidades externas.

---

## 10. Limitaciones y trabajo pendiente

### 10.1 Brechas externas / de producción pendientes

1. **Adaptador SQL multiusuario (`PostgresReportRepository`) y servidor HTTPS institucional:** Reemplazar `JsonFileRepository` por PostgreSQL/Supabase con PostGIS y RLS para compartir datos en tiempo real entre celulares ciudadanos y estaciones municipales.
2. **Integración de correo SMTP, Web Push y ClaveÚnica:** Conectar despacho real de avisos y autenticación estatal OAuth 2.0 / OIDC en lugar de buzón local y cola manual de verificación.
3. **Shapefile oficial y cartografía offline autorizada:** Sustituir los vértices aproximados de `PUERTO_MONTT_POLYGON` por la cartografía oficial SUBDERE/IDE y habilitar un servidor de teselas propio o autorizado si se requiere mapa detallado sin Internet.
4. **Certificación externa y firma de código:** Adquirir certificado de firma digital para el instalador Windows `.exe`, realizar auditoría completa WCAG 2.1 AA, pentest OWASP independiente y medición de KPIs (`OBJ-01` a `OBJ-05`) durante piloto real en la municipalidad.

---

### 10.2 Plan de preparación para la defensa de la Evaluación 4 (25%)

1. **Verificación previa a la defensa:** Ejecutar `npm run typecheck`, `npm test`, `npm run perf` y `node tests/packaged-smoke.cjs` en el equipo de exposición.
2. **Carga de feriados locales:** Copiar `feriados.example.json` hacia `data/feriados.json` con el calendario vigente para demostrar `RN-08`.
3. **Guion de demostración en vivo sobre flujos reales:**
   - Portal ciudadano (`/app`): registro/login con RUT Módulo 11, rechazo de coordenada fuera de `PUERTO_MONTT_POLYGON` (ej. `-41.63, -73.22`), creación de reporte en 4 pasos, detección de duplicado ≤ 25 m, apoyo, modal Antes/Después y comentario moderado.
   - Panel municipal (`/admin` o `Reporta Puerto Montt Municipal.exe`): login autenticado como `ADMIN_MUNICIPAL` (sin botones ni contraseñas expuestas en el cliente), asignación atómica por lotes, moderación de comentario, verificación institucional, cierre técnico bloqueado si faltan foto o 50 caracteres y exitoso al completar ambos, gráficos `Chart.js`, capa térmica Canvas y notificación inmediata en cuenta ciudadana.

---

## 11. Conclusiones

1. **Unificación completa en TypeScript estricto y estabilidad verificada:** La migración de `src/server.ts`, `src/repository.ts`, `src/admin/main.ts` y `src/admin/heatmap.ts` unifica todo el código fuente bajo compilación estricta (`0` errores en `npm run typecheck`) y resuelve los defectos críticos detectados en `/admin`, respaldado por **43/43 pruebas aprobadas**, benchmark local de **P95 = 348,2 ms** y paquete Windows NSIS validado (`tests/packaged-smoke.cjs`).
2. **Seguridad práctica desde el diseño:** El sistema exige sesión ciudadana para reportar, anonimiza salidas públicas, protege adhesiones con `rutHash` HMAC-SHA256, genera secretos aleatorios por instalación (`.auth-secret`), usa `bcryptjs` costo 12, limita intentos de login (`429` desde el 5.° fallo), elimina claves demo del bundle cliente, valida Magic Bytes en imágenes/videos y aísla el proceso Renderer de Electron.
3. **Transparencia frente a la fase productiva:** Quedan claramente delimitadas las brechas dependientes de despliegue institucional y terceros (PostgreSQL/Supabase + PostGIS/RLS, HTTPS, SMTP/Push, ClaveÚnica, shapefile oficial, firma digital `.exe`, auditoría externa WCAG/OWASP y medición de KPIs en terreno).

---

## Referencias Bibliográficas, Normativas y Estándares Técnicos

1. Biblioteca del Congreso Nacional de Chile (BCN). (1999). *Ley N° 19.628 sobre Protección de la Vida Privada*.
2. Biblioteca del Congreso Nacional de Chile (BCN). (2006). *Ley N° 18.695 Orgánica Constitucional de Municipalidades*.
3. Biblioteca del Congreso Nacional de Chile (BCN). (2008). *Ley N° 20.285 sobre Acceso a la Información Pública*.
4. Biblioteca del Congreso Nacional de Chile (BCN). (2011). *Ley N° 20.500 sobre Asociaciones y Participación Ciudadana en la Gestión Pública*.
5. Biblioteca del Congreso Nacional de Chile (BCN). (2019). *Ley N° 21.180 sobre Transformación Digital del Estado*.
6. Biblioteca del Congreso Nacional de Chile (BCN). (2024). *Ley N° 21.663 Ley Marco de Ciberseguridad*.
7. Biblioteca del Congreso Nacional de Chile (BCN). (2024). *Ley N° 21.719 sobre Protección de los Datos Personales*.
8. ISO/IEC/IEEE. (2018). *ISO/IEC/IEEE 29148:2018 Systems and software engineering — Life cycle processes — Requirements engineering*.
9. Object Management Group (OMG). (2015). *OMG Unified Modeling Language (OMG UML) Specification, Version 2.5*.
10. OWASP Foundation. (2021). *OWASP Top 10:2021 — The Ten Most Critical Web Application Security Risks*.
11. W3C. (2018). *Web Content Accessibility Guidelines (WCAG) 2.1*.
12. Repositorio Oficial del Proyecto Reporta Puerto Montt (v1.0.0): <https://github.com/ElProductor/Reporta-Puerto-montt>.

---

## Anexos Técnicos de Reproducción, Evidencias y Verificación

### Anexo A. Variables de entorno reales y configuración local de roles RBAC

> **Política de confidencialidad y mitigación en cliente (`HAL-09`):** Siguiendo buenas prácticas de seguridad (`OWASP Top 10:2021` — A04 y A07), este documento entregable **omite contraseñas en texto plano** y el cliente `/admin` (`public/municipal.html`, `src/admin/main.ts` → `public/app.js`) **retiró completamente los antiguos botones de autocompletado "Accesos de demostración"**, los cuales existían solo durante pruebas tempranas de maqueta local y habrían dejado credenciales embebidas en el JavaScript del navegador (verificación automatizada en `CP-32`). Las credenciales locales de evaluación deben gestionarse directamente en el entorno local del servidor siguiendo el procedimiento descrito al pie de este anexo.

```ini
PORT=3001
REPORTA_DATA_DIR=./data
# Opcional (>= 32 chars). Si se omite, se genera un secreto aleatorio local en .auth-secret
JWT_SECRET=reemplazar_por_clave_aleatoria_de_al_menos_32_caracteres
PII_HASH_SECRET=reemplazar_por_clave_aleatoria_de_al_menos_32_caracteres
CORS_ORIGINS=
REPORTA_HOLIDAYS=2026-11-17
```

| Rol RBAC | Departamento | Cuenta Local | Permisos Reales en el Sistema |
| --- | --- | --- | --- |
| `OPERADOR_MESA` | Mesa de ayuda | `mesa@reporta.local` | Transiciones a `EN_REVISION`, `DERIVADO`, `RECHAZADO` y asignación por lotes. |
| `INSPECTOR_DEPTO` | Operaciones | `inspector@reporta.local` | Despacho `EN_TERRENO` y cierre técnico (`/close`) dentro de su departamento. |
| `ADMIN_MUNICIPAL` | Administración | `admin@reporta.local` | Acceso completo, moderación de comentarios y cola de verificación institucional. |

**Generación y rotación local de credenciales y secretos:**

1. **Inicialización automática de entorno local:** Al iniciar el servidor por primera vez (`npm start` o `Reporta Puerto Montt Municipal.exe`), la rutina `seed()` en `src/server.ts` crea la colección `staff` dentro de `data/db.json` (o `userData`) protegiendo cada clave con `bcryptjs` (factor de costo `12`), y genera un secreto criptográfico aleatorio por instalación en `.auth-secret` (permisos `0600`) cuando no se define `JWT_SECRET`.
2. **Generación de llaves criptográficas locales (`JWT_SECRET` / `PII_HASH_SECRET`):** Ejecuta localmente en PowerShell o Node.js antes de levantar el servidor:
```bash
node -e "const c=require('node:crypto'); console.log(c.randomBytes(32).toString('hex'));"
```
3. **Rotación o generación local de contraseñas RBAC con `bcryptjs` (costo 12):** Para definir tus propias claves de demostración o producción local sin almacenar texto plano, genera el hash e insértalo en el campo `passwordHash` del perfil correspondiente dentro de `staff` en `data/db.json` (o consulta `src/server.ts` únicamente en entorno local controlado):
```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync(process.argv[1], 12));" "<TU_CLAVE_LOCAL_SEGURA>"
```

---

### Anexo B. Catálogo y capturas reales de evidencias de ejecución

| ID Evidencia | Artefacto / Vista Verificada | Comando o Ruta | Resultado Verificado |
| --- | --- | --- | --- |
| **EV-01** | Compilación TypeScript estricta integral (`tsconfig.json` + `tsconfig.server.json`) | `npm run typecheck` | **0 errores (`ExitCode: 0`)** (Captura B.2) |
| **EV-02** | Suite de 43 pruebas automatizadas (`CP-01`..`CP-32` + 11 complementarias) | `npm test` | **43/43 aprobadas** (Captura B.1) |
| **EV-03** | Benchmark local de rendimiento (1.000 registros, 50 clientes paralelos) | `npm run perf` | **P95 = 348,2 ms** (`media = 200,9 ms`, `pass: true`, Captura B.2) |
| **EV-04** | **Interfaz de Usuarios** (`/app` — Login, Registro RUT, Mi cuenta, Mapa, Muro vecinal, Reportar, Modal Antes/Después y Seguimiento) | `src/citizen/main.tsx` | Verificado en `CP-02`, `CP-24`, `CP-31` (Subsección B.2: Capturas B.3 a B.10) |
| **EV-05** | **Interfaz de Administrador** (`/admin` — Login sin botones demo, Bandeja por lotes, Cierre Técnico, Chart.js y Mapa de Calor Canvas) | `public/municipal.html`, `src/admin/main.ts`, `src/admin/heatmap.ts` | Verificado en `CP-03`, `CP-14`..`CP-23`, `CP-30`, `CP-32` (Subsección B.3: Capturas B.11 a B.13) |
| **EV-06** | Verificación en vivo PowerShell | `./verify.ps1` | **12/12 aserciones PASS** (Captura B.2) |
| **EV-07** | Instalador Windows NSIS, smoke test y aplicación Electron en ejecución | `npm run desktop:dist` + `node tests/packaged-smoke.cjs` | **Instalador generado, smoke test aprobado y app Electron operativa** (Capturas B.2 y B.14) |

#### B.1 Verificación técnica en Windows PowerShell (`EV-01` a `EV-03`, `EV-06`, `EV-07`)

![Captura B.1 (EV-02 — Pruebas automatizadas): Captura real en Windows PowerShell (conhost.exe) ejecutando npm test completo con las 43 pruebas automatizadas aprobadas (0 fallidas, duración 3.274 ms).](ev01a_powershell_typecheck_test.png)

![Captura B.2 (EV-01 / EV-03 / EV-06 / EV-07 — Compilación, Rendimiento, Script PowerShell y Smoke Empaquetado): Ejecución real en Windows PowerShell de npm run typecheck (ExitCode 0), npm run perf (P95 = 348,2 ms, media = 200,9 ms), ./verify.ps1 (12/12 PASS) y node tests/packaged-smoke.cjs.](ev01b_powershell_perf_verify_smoke.png)

#### B.2 Interfaz de Usuarios — Portal Ciudadano PWA (`/app`, `EV-04`)

![Captura B.3 (EV-04a — Login de Usuario): Pantalla de inicio de sesión ciudadano (/app -> Mi cuenta -> Iniciar sesión) para vecinos registrados.](ev02_portal_login.png)

![Captura B.4 (EV-04b — Registro de Usuario): Formulario de creación de cuenta ciudadana (/app -> Mi cuenta -> Crear cuenta) con validación de RUT chileno Módulo 11.](ev02_portal_registro.png)

![Captura B.5 (EV-04c — Mi cuenta autenticado): Panel personal del ciudadano autenticado con estado de RUT verificado, solicitud de revisión municipal y bandeja de notificaciones.](ev02d_portal_mi_cuenta.png)

![Captura B.6 (EV-04d — Mapa comunal): Portal Ciudadano PWA React 19 (/app) mostrando los 50 casos geolocalizados sobre tierra firme urbana en OpenStreetMap, filtros por estado y controles de zoom en esquina superior derecha.](ev02_portal_ciudadano.png)

![Captura B.7 (EV-04e — Muro vecinal): Vista comunitaria Muro vecinal en /app con tarjetas de reportes activos, botón Apoyar, comentarios vecinales, enlace al mapa y seguimiento.](ev02c_portal_muro_vecinal.png)

![Captura B.8 (EV-04f — Reportar): Asistente ciudadano de 4 pasos en /app con pestañas espaciadas, mapa interactivo, captura GPS con ícono SVG y coordenadas validadas contra PUERTO_MONTT_POLYGON.](ev02b_portal_reportar.png)

![Captura B.9 (EV-04g — Modal Antes/Después y Cierre Técnico): Detalle completo de reporte resuelto (RPM-2026-0051) mostrando comparativa fotográfica Antes y Después, informe técnico municipal, cuadrilla e historia de atención en 4 pasos.](ev02f_modal_antes_despues.png)

![Captura B.10 (EV-04h — Seguimiento): Trazabilidad por folio público (RPM-2026-0051), consulta de reportes privados e historial completo del expediente.](ev02e_portal_seguimiento.png)

#### B.3 Interfaz de Administrador — Consola Municipal (`/admin` y App Desktop Electron, `EV-05` / `EV-07`)

![Captura B.11 (EV-05a — Login Institucional Administrador): Pantalla independiente de acceso municipal (/admin) con autenticación RBAC limpia sin botones ni credenciales de demostración en el cliente.](ev03a_admin_login.png)

![Captura B.12 (EV-05b — Bandeja por lotes y Cierre Técnico): Consola Municipal (/admin) mostrando pestañas completas, selección por lotes, expediente municipal con historial cronológico de 3 estados (Pendiente, En revisión, En terreno), contacto depurado y formulario de Cierre técnico verificado.](ev03_admin_bandeja_cierre.png)

![Captura B.13 (EV-05c — Analítica y Mapa de Calor): Vista de Analítica en /admin con conteo real de eventos auditados (> 50), gráficos Chart.js (estado y categoría) y capa térmica HTML5 Canvas activa sobre áreas urbanas terrestres de Puerto Montt.](ev04_admin_analitica_calor.png)

![Captura B.14 (EV-07 — Consola de Escritorio Electron Windows): Ventana nativa de Reporta Puerto Montt Municipal.exe ejecutándose sobre Windows 11 con aislamiento de proceso Renderer y backend Node.js compilado integrado.](ev07_electron_desktop.png)

---

### Anexo C. Lista de verificación honesta frente a la Guía de Evaluación 3

| Estado | Criterio Oficial de Evaluación (TI3043) | Situación Real Documentada |
| --- | --- | --- |
| ☑ | **1. Continuidad, alcance y trazabilidad** | Trazabilidad completa y transparente en `MATRIZ_RUBRICA.md` y Sección 9 (`CAM-01` a `CAM-06`, `RN-01` a `RN-08`). |
| ☑ | **2. Tecnologías, tendencias y entorno** | Stack real en `package.json`, análisis Cloud/IaaS/SaaS/Local y comandos reproducibles probados. |
| ☑ | **3. Arquitectura, interfaces y datos** | Arquitectura 100% en TypeScript estricto, patrón `ReportRepository` (`src/repository.ts`), `schemaVersion: 3` (10 tablas justificadas en 3FN), polígono aproximado y capa térmica Canvas. *(Pendiente adaptador PostgreSQL/Supabase productivo).* |
| ◐ | **4. Programación y funcionalidades** | Flujos locales completos, 14 capturas reales (incluyendo Antes/Después y Electron) y defectos críticos corregidos (`HAL-01` a `HAL-10`); pendientes integraciones externas (SMTP, Web Push, ClaveÚnica, shapefile oficial y mapa offline detallado). |
| ◐ | **5. Confidencialidad, normativa y OWASP** | Cobertura completa de OWASP Top 10:2021 (`A01`–`A10`), retiro de credenciales demo en cliente (`CP-32`), `bcryptjs` 12, `.auth-secret`, `rutHash`, Magic Bytes, CORS, rate limit (`429` al 5.° fallo), RBAC y minimización PII; pendiente auditoría WCAG/pentest externa y firma digital del `.exe`. |
| ☑ | **6. Diseño y ejecución de pruebas** | `npm run typecheck`, **43/43** tests (`npm test`), Tabla 7.1 de 5 columnas (`CP-01`..`CP-32` y `seed.test.cjs`), benchmark `npm run perf` (`348,2 ms` P95), `tests/packaged-smoke.cjs` y `./verify.ps1` aprobados. |
| ☑ | **7. Defectos, correcciones y validación** | Hallazgos y bloqueos críticos corregidos y re-probados (`HAL-01` a `HAL-10`), documentando con transparencia brechas de producción. |
| ☑ | **8. Calidad del informe y evidencias** | Informe `.md` y `.docx` en formato oficial INACAP alineados al 100% con código fuente, repositorio GitHub (`https://github.com/ElProductor/Reporta-Puerto-montt`) y capturas reales Windows/Chrome verificadas. |

---

### Anexo D. Hoja oficial de registro de calificación según Rúbrica Analítica TI3043

| Criterio de Evaluación (Rúbrica Analítica TI3043) | Destacado (100%) | Adecuado (75%) | En desarrollo (50%) | Insuficiente (0%) | Máximo | Obtenido |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Continuidad, alcance y trazabilidad | 10 pts | 7,5 pts | 5 pts | 0 pts | 10 | ________ |
| 2. Tecnologías, tendencias y entorno | 10 pts | 7,5 pts | 5 pts | 0 pts | 10 | ________ |
| 3. Arquitectura, interfaces y datos | 12 pts | 9 pts | 6 pts | 0 pts | 12 | ________ |
| 4. Programación y funcionalidades | 23 pts | 17,25 pts | 11,5 pts | 0 pts | 23 | ________ |
| 5. Confidencialidad, normativa y OWASP | 15 pts | 11,25 pts | 7,5 pts | 0 pts | 15 | ________ |
| 6. Diseño y ejecución de pruebas | 15 pts | 11,25 pts | 7,5 pts | 0 pts | 15 | ________ |
| 7. Defectos, correcciones y validación | 10 pts | 7,5 pts | 5 pts | 0 pts | 10 | ________ |
| 8. Calidad del informe y evidencias | 5 pts | 3,75 pts | 2,5 pts | 0 pts | 5 | ________ |
| **TOTAL** | **100 pts** | **75 pts** | **50 pts** | **0 pts** | **100** | ________ |

Observaciones y retroalimentación del docente: _____________________________________________
