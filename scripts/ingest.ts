import fs from 'fs';
import csvParser from 'csv-parser';
import { pool } from '../src/config/db.js';

const BATCH_SIZE = 500;

interface CSVRow {
  NAME: string;
  ADDRESS: string;
  CITY: string;
  STATE: string;
  ZIP: string;
  ZIP4: string;
  LATITUDE: string;
  LONGITUDE: string;
}

interface Row {
  name: string;
  address: string | null;
  city: string;
  state: string;
  zip: string;
  zip4: string | null;
  lat: number;
  lng: number;
}

function sanitize(raw: CSVRow): Row | null {
  const name  = raw.NAME?.trim();
  const city  = raw.CITY?.trim();
  const state = raw.STATE?.trim().toUpperCase();

  if (!name || !city || !state || state.length !== 2) return null;

  const lat = parseFloat(raw.LATITUDE);
  const lng = parseFloat(raw.LONGITUDE);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const rawZip = raw.ZIP?.replace(/[^0-9]/g, '');
  if (!rawZip || rawZip.length < 5) return null;
  const zip = rawZip.substring(0, 5);

  const zip4Raw = raw.ZIP4?.trim();
  const zip4 =
    zip4Raw && zip4Raw !== 'NOT AVAILABLE'
      ? zip4Raw.replace(/[^0-9]/g, '').substring(0, 4) || null
      : null;

  const address = raw.ADDRESS?.trim() || null;

  return { name, address, city, state, zip, zip4, lat, lng };
}

async function flushBatch(rows: Row[]): Promise<{ inserted: number; failed: number }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `
      WITH data AS (
        SELECT
          UNNEST($1::text[])    AS name,
          UNNEST($2::text[])    AS address,
          UNNEST($3::text[])    AS city,
          UNNEST($4::text[])    AS state,
          UNNEST($5::text[])    AS zip,
          UNNEST($6::text[])    AS zip4,
          UNNEST($7::float8[])  AS lng,
          UNNEST($8::float8[])  AS lat
      )
      INSERT INTO hospitals (name, address, city, state, zip, zip4, location)
      SELECT
        name, address, city, state, zip, zip4,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
      FROM data
      ON CONFLICT (name, COALESCE(address, ''), zip)
      DO UPDATE SET
        city     = EXCLUDED.city,
        state    = EXCLUDED.state,
        zip4     = EXCLUDED.zip4,
        location = EXCLUDED.location
      `,
      [
        rows.map(r => r.name),
        rows.map(r => r.address),
        rows.map(r => r.city),
        rows.map(r => r.state),
        rows.map(r => r.zip),
        rows.map(r => r.zip4),
        rows.map(r => r.lng),
        rows.map(r => r.lat),
      ],
    );
    await client.query('COMMIT');
    return { inserted: rows.length, failed: 0 };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  ✗ Batch failed (${rows.length} rows):`, err);
    return { inserted: 0, failed: rows.length };
  } finally {
    client.release();
  }
}

async function ingest(filePath: string): Promise<void> {
  let buffer: Row[]    = [];
  let totalInserted    = 0;
  let totalSkipped     = 0;
  let totalFailed      = 0;
  let batchCount       = 0;

  const stream = fs.createReadStream(filePath).pipe(csvParser());

  for await (const raw of stream) {
    const row = sanitize(raw as CSVRow);
    if (!row) {
      totalSkipped++;
      continue;
    }

    buffer.push(row);

    if (buffer.length >= BATCH_SIZE) {
      const batch = buffer.splice(0, BATCH_SIZE);
      batchCount++;
      const { inserted, failed } = await flushBatch(batch);
      totalInserted += inserted;
      totalFailed   += failed;
      console.log(`  Batch ${batchCount}: ${inserted} inserted, ${failed} failed`);
    }
  }

  // Flush remaining rows
  if (buffer.length > 0) {
    batchCount++;
    const { inserted, failed } = await flushBatch(buffer);
    totalInserted += inserted;
    totalFailed   += failed;
    console.log(`  Batch ${batchCount} (final): ${inserted} inserted, ${failed} failed`);
  }

  await pool.end();

  console.log(`\nDone — ${batchCount} batch(es)`);
  console.log(`  ✓ Inserted : ${totalInserted}`);
  console.log(`  ~ Skipped  : ${totalSkipped}`);
  console.log(`  ✗ Failed   : ${totalFailed}`);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: pnpm db:seed <csv-file>');
  process.exit(1);
}

ingest(args[0]).catch(err => {
  console.error(err);
  process.exit(1);
});
