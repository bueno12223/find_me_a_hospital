import fs from 'fs';
import csvParser from 'csv-parser';
import { pool } from '../src/config/db.js';

interface CSVRow {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: string;
  lng: string;
}

async function ingest(filePath: string) {
  const results: CSVRow[] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          for (const row of results) {
            const { name, address, city, state, zip, lat, lng } = row;
            if (!name || !city || !state || !zip || !lat || !lng) continue;

            const zipBase = zip.substring(0, 5);
            const zip4 = zip.length > 5 ? zip.substring(5).replace(/[^0-9]/g, '') : null;

            const query = `
              INSERT INTO hospitals (name, address, city, state, zip, zip4, location)
              VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography)
            `;
            await client.query(query, [name, address, city, state, zipBase, zip4, parseFloat(lng), parseFloat(lat)]);
          }

          await client.query('COMMIT');
          console.log(`Successfully ingested ${results.length} hospitals`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error('Error during ingestion, rolled back.', error);
        } finally {
          client.release();
          pool.end();
          resolve(true);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Please provide a CSV file path');
  process.exit(1);
}

ingest(args[0]).catch(console.error);
