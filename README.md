# 🚀 FindMeHospital - Production-Grade Geo API

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-black?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Fastify-5-black?style=for-the-badge&logo=fastify" alt="Fastify" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PostGIS-GeoSpatial-15B06D?style=for-the-badge&logo=postgresql" alt="PostGIS" />
  <img src="https://img.shields.io/badge/TypeScript-Strict_Mode-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  
  <h3>High-Performance Hospital Registry API</h3>
  <p>A production-ready geospatial search API optimized for fuzzy-matching, proximity lookups, and minimal-latency autocomplete queries.</p>
</div>

<br />

## 📖 Table of Contents
1. [Setup & Configuration](#-setup--configuration)
2. [Architecture & Data Flow](#-architecture--data-flow)
3. [Key Technical Decisions](#-key-technical-decisions)
4. [API Contract & Endpoints](#-api-contract--endpoints)
5. [Known Limitations & Next Steps](#-known-limitations--next-steps)

---

## 🛠 Setup & Configuration

**Requirements:** `Docker Desktop` (o motor equivalente de contenedores para levantar Postgres+PostGIS) y `Node v20+`.

**Levantando el ecosistema local paso a paso:**

1. **Clonar e instalar dependencias:**
   ```bash
   pnpm install
   ```

2. **Levantar la Base de Datos con Docker:**
   ```bash
   docker compose up -d
   ```
   *(Esto descargará y arrancará el contenedor oficial `postgis/postgis` exponiendo el puerto 5432).*

3. **Ejecutar Migraciones:**
   ```bash
   pnpm run migrate:up
   ```
   *(Crea las tablas, activa las extensiones geoespaciales y construye los índices especializados).*

4. **Populemos la Base de Datos (Ingestión):**
   ```bash
   pnpm run dev:ingest
   ```
   *(Parsea e ingesta el dataset crudo en lotes de 1000 a la BD. Gracias al condicional `ON CONFLICT DO UPDATE`, este script es 100% idempotente y seguro de repetir).*

5. **Iniciar el servidor:**
   ```bash
   pnpm run dev
   ```

---

## 🏗 Architecture

| Capa | Elección | Justificación |
| :--- | :--- | :--- |
| **Runtime** | Node.js + TypeScript | Tipado estático asegurado desde el runtime hasta el cliente (TypeBox). |
| **Framework Web** | Fastify | Más rápido que Express, integra validación ultra-rápida nativa basada en JSON Schema (vía `ajv`), crucial para latencias mínimas. |
| **Base de Datos** | PostgreSQL + PostGIS | Ecosistema para queries geográficas nativas. Calcula distancias e índices espaciales a bajo nivel en la caché del motor. |
| **Migrations** | `node-pg-migrate` | Utilizado en vez de las herramientas de ORMs debido a su compatibilidad absoluta con comandos crudos (`CREATE EXTENSION pg_trgm`). |
| **Testing** | Vitest | Misma API de Jest pero para el ecosistema ESModules moderno (~850ms boot and test time). |
| **Logging** | Pino | Viene out-of-the-box con Fastify. Proporciona _structured logging_ JSON, fundamental para observabilidad (Datadog/Elastic). |

---

## 🏗 Arquitectura de Datos
TypeScript
{
  "id": "number",
  "name": "string",
  "address": "string | null",
  "city": "string",
  "state": "string (ISO 2-char)",
  "zip": "string (5-char)",
  "location": "Point (Geometry 4326)",
  "distance_meters": "number | optional"
}
### Estrategia de Indexación
Para que las búsquedas se sientan instantáneas, implementamos tres niveles de indexación:

- GIST (location): Permite búsquedas de radio y vecinos cercanos (KNN) en tiempo logarítmico.
- GIN con pg_trgm (name): Habilita el "fuzzy search" para el autocompletado, permitiendo errores tipográficos leves sin penalizar el rendimiento.
- Índice Compuesto (state, name): Optimización específica basada en el flujo de UI. Dado que el usuario filtra primero por Estado, este índice reduce el espacio de búsqueda drásticamente antes de aplicar el algoritmo de similitud de texto.

## Technical Decisions

### 1. Why not use Prisma or other ORMs?
Para una aplicación profundamente orientada a datos geoespaciales, la abstracción de queries es un lastre. Prisma tiene un soporte geoespacial primitivo, ignora casts implícitos de `PostGIS` (ej: `::geography`), y sus compiladores modifican a menudo los _Query Execution Plans_ invalidando los índices GIST. Decidimos usar SQL crudo (`pg-pool`) en la capa de Repository asegurando el 100% del control del query-planner en PostGIS.

### 2. Ingesta de Datos Idempotente
El script procesa lotes del dataset utilizando un insert de bloque:
**Decisión crítica:** La ingesta no inserta filas ciegamente. Tiene una cláusula `ON CONFLICT (name, address, zip) DO UPDATE`.
Esto hace al script **completamente idempotente**. Previene duplicados absolutos si corre en un CRON Job, permitiéndonos actualizar la data operativa contínuamente.

### 3. Estrategia de Testing (Focus en Critical Paths)
Hay **21 tests** activos divididos en integración y unitarios (Service, DB Repository & Rutas). No persiguiendo un 100% de cobertura forzoso, sino:
- **Enmascaramiento (500 Error Protection):** Comprobado unitariamente que el Central Error Handler intercepte crashes internos genéricos e inyecte `"An unexpected error occurred"` bloqueando la fuga de Stacktraces o detalles SQL hacia internet.
- **Dominios de Paginación Exactos:** Garantizando en tests unitarios que la paginación para `getReverse` NUNCA contenga la metadata `"total"`, por ser este engañoso en búsquedas de métrica K-Nearest Neighbor (dónde no hay universo definido, solo vecinos próximos).
- **Validación Rápida:** Forzamos a Fastify vía tests a interceptar coords fuera de [-90,90] en el milisengundo cero sin molestar a la base de datos. 

### 4. Caching
**Innecesario estructuralmente dadas las metas de volumen de la iteración.**
El cuello de I/O está resuelto con índices compuestos. Implementar Redis agregaría una complejidad infraestructural e invalidaciones de State difíciles de justificar. **Sin embargo**, si quisiéramos paliar una campaña viral imprevista, un Caché LRU In-Memory a la altura del Service o un middleware en NodeJS capturando un Hash MD5 de la query serían extremadamente triviales de enchufar la próxima semana.

---

## 📡 API Contract & Endpoints

### 1. `GET /api/v1/hospitals/search`
*Forward lookup para UI de Autocomplete.*
- **Uso:** `?q=general hospital&state=CA&limit=10&offset=0`
- **Query Estructural:**
```sql
SELECT * FROM hospitals
WHERE name ILIKE $1 OR city ILIKE $1 OR zip = $2
ORDER BY similarity(name, $3) DESC
LIMIT $4 OFFSET $5;
```

### 2. `GET /api/v1/hospitals/reverse`
*KNN estricto (K-Nearest Neighbors).* Omitimos intencionalmente `total` metadata en response ya que no existe restricción de universo.
- **Uso:** `?lat=34.0522&lng=-118.2437&limit=5`
- **Query Estructural:**
```sql
SELECT id, name, city, state, zip,
       ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance_meters
FROM hospitals
ORDER BY location <-> ST_MakePoint($1, $2)::geography
LIMIT $3;
```

### 3. `GET /api/v1/hospitals/radius`
*Cálculo Radial Esférico de Intersección Pura.*
- **Uso:** `?lat=34.05&lng=-118.24&distance=10&limit=20`
- **Query Estructural:**
```sql
SELECT *, ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance_meters
FROM hospitals
WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3 * 1000)
ORDER BY distance_meters
LIMIT $4;
```

---

## 🚀 Known Limitations & Next Steps

Con más tiempo o scope, esto mejoraría notablemente:

1. **Contenedores de Inyección de Dependencias (DI):** Hoy inyecto un Service en las Routings por default-argument. Con más tiempo enchufaría `Awilix` para poder mockear toda la capa I/O en microtests globales.
2. **Window Function Pagination:** Hoy los queries cuentan en paralelo con un `COUNT()`. Mudaríamos al uso de una _Window Expression analítica_ `COUNT(*) OVER() AS total_count` en PostGIS directamente extrayendo el `total` unificadamente en un único query.
3. **Protecciones Nativas:** Añadir Rate-Limiting para evadir DDoS trivial en un form público (usando el módulo rápido `@fastify/rate-limit`).
4. **Stress Testing Activo:** Cargar Artillería (Artillery) / K6 simulando spikes de 5,000 pings por segundo para refutar o darle soporte al postulado actual de de "La BD y el índice por sí solos nos escalan sin caché de Redis en esta fase de adopción".
