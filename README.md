# FindMeHospital

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-black?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Fastify-5-black?style=for-the-badge&logo=fastify" alt="Fastify" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PostGIS-GeoSpatial-15B06D?style=for-the-badge&logo=postgresql" alt="PostGIS" />
  <img src="https://img.shields.io/badge/TypeScript-Strict_Mode-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  
  <p>Production-Grade Geospatial Hospital Search API optimized for fuzzy-matching, proximity lookups, and minimal-latency autocomplete queries.</p>
  
  <p>
    <b>Live API:</b> <a href="https://yf52k32pqn.us-east-1.awsapprunner.com/docs">Swagger Documentation</a> 
    • 
    <b>Demo UI:</b> <a href="https://hospital-tactical-scan-339084358368.us-west1.run.app/">Live Web Preview</a>
  </p>
</div>

## Product Context
While the original technical assessment asked for a generic "address lookup API", designing an architecture without a concrete use-case often leads to speculative technical decisions. 

By giving the application a specific purpose **finding hospitals** the architectural requirements immediately snapped into focus. Knowing *exactly how* the API would be used by a real user interface dictated the query patterns (e.g., users naturally filter by state before searching text, driving the need for a composite index). This product first approach eliminated guesswork and anchored technical choices to practical decisions.

---

## Architecture & Stack Decisions
The service follows a strict three-layer separation: **Routes → Service → Repository**. following the clean architecture principles and the Fastify best practices.

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Fastify** | Schema-based request validation compiled at startup via AJV — critical for autocomplete latency. Express adds no equivalent. |
| **Database** | **PostgreSQL + PostGIS** | Native geospatial types, GIST index for KNN and radius queries, GIN + `pg_trgm` for fuzzy text search. All three are prerequisites for this domain. |
| **Query layer** | **Raw pg (no ORM)** | Prisma has no support for PostGIS geography casts (`::geography`) and its query planner often invalidates GIST indexes. Full SQL control is required here. |
| **Migrations** | **node-pg-migrate** | Runs raw DDL cleanly. Required for `CREATE EXTENSION pg_trgm` and PostGIS-specific index syntax that ORMs cannot express. |
| **Infrastructure** | **AWS App Runner + RDS** | Serverless container deployment connected to a managed PostgreSQL instance via a private VPC Connector. |
| **Logging** | **Pino** | Ships with Fastify. Structured JSON output, zero config, compatible with Datadog/Elastic. |
| **Testing** | **Vitest** | Native ESM support. ~850ms cold boot vs Jest's ~3s. Same API, faster feedback loop. |

---

## Setup & Configuration
### Prerequisites
Before running the application, you must have the following installed:
- Node.js 20+
- PostgreSQL 16+
- Docker
- pnpm

### Environment Variables
Theres 2 ways to run this application:

### A. Using Docker Compose
```bash
docker compose up --build
```

### B. Using Local Dev Mode
Set up the environment variables:
```bash
cp .env.example .env
```

Start the database:
```bash
docker compose up -d db
```

Run migrations:
```bash
pnpm run migrate:up
```

Ingest dataset:
```bash
pnpm run ingest
```

Start dev server:
```bash
pnpm run dev
```

---

## Data Model & Indexing Strategy
### Schema
```sql
id          SERIAL PRIMARY KEY
name        TEXT NOT NULL
address     TEXT
city        TEXT NOT NULL
state       CHAR(2) NOT NULL
zip         CHAR(5) NOT NULL
zip4        CHAR(4)
location    GEOGRAPHY(POINT, 4326)   -- PostGIS spatial column
```
*The `location` column uses **GEOGRAPHY** (spherical model) rather than **GEOMETRY** (planar). This ensures `ST_Distance` returns meters on the Earth's surface rather than Euclidean units — accurate globally, not just within a single UTM zone.*

---

## API Endpoints & Queries
### 1. `GET /search` (Fuzzy Autocomplete)
```sql
SELECT * FROM hospitals 
WHERE (name % $1 OR city % $1 OR zip = $2) AND state = $3 
ORDER BY similarity(name, $1) DESC 
LIMIT $4 OFFSET $5;
```
Uses similarity ranking (`%`) powered by the `pg_trgm` GIN index for extremely fast fuzzy text matching and typo tolerance, avoiding costly full table scans.

### 2. `GET /reverse` (KNN)
```sql
SELECT id, name, city, state, zip,
       ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance_meters
FROM hospitals
ORDER BY location <-> ST_MakePoint($1, $2)::geography
LIMIT $3;
```
Leverages the `<->` KNN (K-Nearest Neighbors) operator, which traverses the PostGIS GIST index to return the closest locations in `O(log n)` time without sorting the entire dataset.

### 3. `GET /radius` (Circular Containment)
```sql
SELECT *, ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters
FROM hospitals
WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
ORDER BY distance_meters ASC
LIMIT $4 OFFSET $5;
```
`ST_DWithin` uses the geometry bounding box along with the GIST index to strictly narrow down the candidate rows efficiently *before* performing precise spherical distance calculations.

### 4. `GET /:id` (Direct Lookup)
Standard primary key lookup. Retrieves the full record of a specific hospital by its ID.

---
### Index Strategy
| Index | Type | Columns | Purpose |
| :--- | :--- | :--- | :--- |
| `idx_hospitals_location` | GIST | `location` | Enables KNN proximity search (`<->`) and radius containment (`ST_DWithin`) in O(log n) — avoids full table scan on every geo query. |
| `idx_hospitals_name_trgm` | GIN + `pg_trgm` | `name` | Powers fuzzy autocomplete. Allows partial matches and minor typo tolerance without Elasticsearch. |
| `idx_hospitals_state_name` | B-Tree composite | `(state, name)` | UI-driven optimization: users filter by state first. This index eliminates irrelevant rows before the trigram scan runs, reducing the working set by ~96%. |

**Design rationale:** The composite `(state, name)` index was added to optimize the query performance for the autocomplete feature, as users typically filter by state first. By this way the query execution plan only does a trigram scan on the filtered rows of the state.

---

## Observability
- Structured JSON logging via Pino on every request (`method`, `url`, `statusCode`, `responseTime`).
- Error events logged with full `{ err }` serialization — stack traces captured as structured fields, not concatenated strings.
- Health endpoint at `GET /health` for load balancer integration.
- `/docs` (Swagger UI) serves as live API contract documentation.

## Error Handling
The error handler distinguishes three categories deliberately:

- **Schema validation errors (400)**: Fastify/AJV rejects malformed requests before the handler is called. Coordinates outside `[-90,90]` never reach the database.
- **Domain errors (4xx)**: The service layer throws typed `AppError` subclasses (`NotFoundError`, `ValidationError`). These map to specific status codes without HTTP knowledge in the service.
- **Unhandled errors (500)**: Stack traces are logged via Pino's structured `{ err }` serializer — compatible with log aggregators. The response body never leaks internals.

**Key distinction**: 4xx errors (client mistakes) are not logged as errors. Only 5xx events trigger error-level logs. This prevents alert fatigue in production monitoring.

---

## Data Ingestion Strategy
The ingestion script (`scripts/ingest.ts`) is designed for production-grade reliability, not just an initial load. It processes the raw CSV dataset into our geospatial schema cleanly.

- **Batch Processing**: Parses and inserts the dataset in batches of 500 rows. This keeps memory usage flat and prevents overwhelming the database connection.
- **Idempotency by Design**: Uses `ON CONFLICT (name, address, zip) DO UPDATE`. The script can be run 100 times safely—it will never create duplicate rows, making it perfect for automated CRON jobs.
---

## Testing Strategy
**21 tests** across unit and integration layers.

**Unit tests (service layer)**
- `getById` throws `NotFoundError` when repository returns null.
- `getRadius` throws `ValidationError` when distance ≤ 0.
- `getReverse` response never contains `meta.total` (KNN semantics).
- Error handler maps `AppError` to correct status codes.
- Error handler catches unhandled errors and blocks stacktrace leakage.

**Integration tests (routes via app.inject)**
- `GET /search` returns 400 when `q` is missing.
- `GET /reverse` returns 400 for coordinates outside valid range — Fastify intercepts, DB is never queried.
- `GET /:id` returns 404 with correct error shape for unknown ID.
- `GET /search` happy path returns paginated envelope with correct meta shape.

*The repository layer is mocked in unit tests using constructor injection with a default argument — no DI framework required, fully mockable in Vitest.*

## Caching
**Decision: Not implemented.** 
The primary bottleneck for geospatial queries is I/O and query planning — both addressed through PostGIS indexes. At this dataset size (~8,000 hospitals), the GIST and GIN indexes make queries fast enough that caching adds operational complexity without measurable latency benefit.

If traffic patterns changed, two approaches would be straightforward to add:
- Redis with short TTL keyed on the full query hash — High-frequency identical queries (e.g., `/search?q=hospital&state=CA`).
- In-process LRU cache at the service layer — no Redis needed — Single-record lookups (`/hospitals/:id`).

---

## Scalability & Bottlenecks
Under meaningful concurrent load, the primary bottleneck is the database — specifically the parallel `COUNT(*)` queries used for pagination. Identified bottlenecks in order of impact:

- `COUNT(*)` + data query run in parallel (`Promise.all`) but both hit the DB. Under high concurrency this doubles connection pool pressure.
- The `pg` connection pool (default: 10) is the first point of saturation. Tuning pool size to match Fargate vCPUs is the first lever.
- Node.js single-thread is not the bottleneck here — Fastify's async I/O handles concurrent requests well. CPU is idle while waiting on Postgres.

With more time:
- Replace parallel `COUNT` with window function (`COUNT(*) OVER()`) to eliminate the second query entirely.
- Add Artillery/k6 stress test to validate the 'indexes are enough without Redis' hypothesis under 5,000 req/s.

---

## Known Limitations & Next Steps
Deliberate scope decisions within the timebox:

- **Dependency injection**: Constructor injection with default arguments keeps the service testable without a DI container. With more time: Awilix for full IoC across all layers.
- **Window function pagination**: Currently uses parallel `COUNT(*)` + data query. Migrating to `COUNT(*) OVER()` eliminates the second round-trip.
- **Rate limiting**: `@fastify/rate-limit` would take ~30 minutes to add. Omitted to stay within scope.
- **max_distance_km on reverse**: The reverse endpoint accepts an optional cap to avoid returning a hospital 3,000km away as 'nearest'. The parameter is defined in the schema but not yet enforced in the repository WHERE clause.
- **Stress testing**: The cache decision ('indexes are sufficient') is a reasoned hypothesis, not a measured fact. Artillery/k6 benchmarks are the next validation step.

## Demo UI
A companion frontend built to demonstrate the API in context: [Live Web Preview](https://hospital-tactical-scan-339084358368.us-west1.run.app/)

- State selector → search by name, city, address or zip code
- Geolocation-based nearest X hospitals lookup
- Radius search with interactive km slider

*The UI lives in a separate repository and was not part of the assessment scope. It exists to validate the API contract end-to-end in a realistic usage scenario.*

---

<br />

<div align="center">
  <sub>Built for Jesus B.</sub>
</div>
