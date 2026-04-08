import { query } from '../../config/db.js';
import { Hospital } from './hospital.schema.js';

const SELECT_COLS = `
  id, name, address, city, state, zip, zip4,
  ST_Y(location::geometry) AS latitude,
  ST_X(location::geometry) AS longitude
`;

export class HospitalRepository {

  async findById(id: number): Promise<Hospital | null> {
    const res = await query(`SELECT ${SELECT_COLS} FROM hospitals WHERE id = $1`, [id]);
    return res.rows[0] || null;
  }

  async search(
    q: string,
    state: string | undefined,
    limit: number,
    offset: number,
  ): Promise<{ rows: Hospital[]; total: number }> {
    let where = `WHERE (name ILIKE $1 OR address ILIKE $1 OR city ILIKE $1 OR zip = $2)`;
    const params: (string | number)[] = [`%${q}%`, q];

    if (state) {
      params.push(state.toUpperCase());
      where += ` AND state = $${params.length}`;
    }

    const whereParamsCount = params.length;
    params.push(q);
    const simIdx = params.length;

    const dataSql = `
      SELECT ${SELECT_COLS}
      FROM hospitals
      ${where}
      ORDER BY (
        similarity(name, $${simIdx}) * 2 + 
        similarity(COALESCE(address, ''), $${simIdx}) + 
        similarity(city, $${simIdx})
      ) DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countSql = `SELECT COUNT(*)::int AS total FROM hospitals ${where}`;

    const [dataRes, countRes] = await Promise.all([
      query(dataSql, [...params, limit, offset]),
      query(countSql, params.slice(0, whereParamsCount)),
    ]);

    return { rows: dataRes.rows, total: countRes.rows[0].total };
  }

  /**
   * Orders by proximity using the <-> operator (KNN via GIST index).
   * Avoid ST_Distance in ORDER BY — it forces a sequential scan.
   */
  async findReverse(lat: number, lng: number, limit: number): Promise<Hospital[]> {
    const sql = `
      SELECT ${SELECT_COLS},
             ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance_meters
      FROM hospitals
      ORDER BY location <-> ST_MakePoint($1, $2)::geography
      LIMIT $3
    `;
    const res = await query(sql, [lng, lat, limit]);
    return res.rows;
  }

  /**
   * ST_MakePoint expects (lng, lat) — note the parameter inversion from the public signature.
   * $3 is distance in km, converted to meters internally (* 1000).
  */
  async findWithinRadius(
    lat: number,
    lng: number,
    distanceKm: number,
    limit: number,
    offset: number,
  ): Promise<{ rows: Hospital[]; total: number }> {
    const point = `ST_MakePoint($1, $2)::geography`;
    const baseParams = [lng, lat, Number(distanceKm) * 1000];

    const dataSql = `
      SELECT ${SELECT_COLS},
             ST_Distance(location, ${point}) AS distance_meters
      FROM hospitals
      WHERE ST_DWithin(location, ${point}, $3)
      ORDER BY distance_meters
      LIMIT $4 OFFSET $5
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM hospitals
      WHERE ST_DWithin(location, ${point}, $3)
    `;

    const [dataRes, countRes] = await Promise.all([
      query(dataSql, [...baseParams, limit, offset]),
      query(countSql, baseParams),
    ]);

    return { rows: dataRes.rows, total: countRes.rows[0].total };
  }
}
