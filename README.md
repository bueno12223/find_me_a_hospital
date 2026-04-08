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