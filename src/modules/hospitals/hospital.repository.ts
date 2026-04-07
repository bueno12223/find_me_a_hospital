import { query } from '../../config/db.js';
import { Hospital } from '../../types/hospital.js';

export class HospitalRepository {
  async findById(id: number): Promise<Hospital | null> {
    const res = await query('SELECT * FROM hospitals WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async search(q: string, state: string | undefined, limit: number, offset: number): Promise<Hospital[]> {
    let sql = `
      SELECT * FROM hospitals
      WHERE (name ILIKE $1 OR city ILIKE $1 OR zip = $2)
    `;
    const params: any[] = [`%${q}%`, q];

    if (state) {
      params.push(state);
      sql += ` AND state = $${params.length}`;
    }

    params.push(q);
    sql += ` ORDER BY similarity(name, $${params.length}) DESC`;

    params.push(limit);
    sql += ` LIMIT $${params.length}`;

    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const res = await query(sql, params);
    return res.rows;
  }

  async findReverse(lat: number, lng: number, limit: number): Promise<Hospital[]> {
    const sql = `
      SELECT id, name, address, city, state, zip, zip4,
             ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance_meters
      FROM hospitals
      ORDER BY location <-> ST_MakePoint($1, $2)::geography
      LIMIT $3
    `;
    const res = await query(sql, [lng, lat, limit]);
    return res.rows;
  }

  async findWithinRadius(lat: number, lng: number, distanceKm: number, limit: number, offset: number): Promise<Hospital[]> {
    const sql = `
      SELECT id, name, address, city, state, zip, zip4,
             ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance_meters
      FROM hospitals
      WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3 * 1000)
      ORDER BY distance_meters
      LIMIT $4 OFFSET $5
    `;
    const res = await query(sql, [lng, lat, distanceKm, limit, offset]);
    return res.rows;
  }
}
