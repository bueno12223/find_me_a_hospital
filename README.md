Tradeo offs

2. El conteo falta — y es un problema de contrato de API
Tu search y findWithinRadius devuelven rows pero no el total. Eso significa que el service (o peor, el route) no puede construir el meta.total que definiste en tu diseño de response. Tienes dos opciones:
Opción A — query separado (simple, correcto para este scope):
typescriptasync search(...): Promise<{ rows: Hospital[]; total: number }> {
  // Query de count con los mismos filtros
  const countSql = `SELECT COUNT(*) FROM hospitals WHERE ...`;
  const [data, count] = await Promise.all([
    query(sql, params),
    query(countSql, countParams)
  ]);
  return { rows: data.rows, total: parseInt(count.rows[0].count) };
}
Opción B — window function (una sola query, más elegante):
sqlSELECT id, name, city, state, zip,
       COUNT(*) OVER() AS total_count
FROM hospitals
WHERE ...
Para el timebox, Opción A es más legible y suficiente. Mencionas Opción B en el README como "lo que haría con más tiempo".

me fui por el A por mas tiempo


/////
"Con más tiempo extraería la instanciación a un contenedor de DI o al menos a un factory en el entry point, para facilitar el testing con mocks."

///
Documenta explícitamente que el índice existe porque el flujo de UI filtra por state primero. Esa frase conecta una decisión de infraestructura con una decisión de producto — es exactamente el tipo de razonamiento que diferencia a un tech lead de alguien que solo agrega índices por costumbre.

///
cambie total por returned en el reverse search, menos ambiguio

///
## Caching

Deliberately omitted for this scope. The primary bottleneck for geo queries 
is I/O and query planning, both addressed through PostGIS indexes (GIST, GIN). 

Cache would add value in two specific scenarios:
- High-frequency identical queries (e.g. /search?q=hospital&state=CA) 
  → Redis with short TTL on the query hash
- /hospitals/:id lookups for well-known records 
  → In-memory LRU cache at the service layer, no Redis needed

Both would be straightforward to add but introduce operational complexity 
that isn't justified at this dataset size.
