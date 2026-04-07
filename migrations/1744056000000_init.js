export const up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    CREATE TABLE hospitals (
      id       SERIAL PRIMARY KEY,
      name     TEXT NOT NULL,
      address  TEXT,
      city     TEXT NOT NULL,
      state    CHAR(2) NOT NULL,
      zip      CHAR(5) NOT NULL,
      zip4     CHAR(4),
      location GEOGRAPHY(POINT, 4326)
    );

    CREATE INDEX idx_hospitals_location  ON hospitals USING GIST(location);
    CREATE INDEX idx_hospitals_zip       ON hospitals(zip);
    CREATE INDEX idx_hospitals_name_trgm ON hospitals USING GIN(name gin_trgm_ops);
    CREATE UNIQUE INDEX idx_hospitals_upsert ON hospitals (name, COALESCE(address, ''), zip);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS hospitals;
    DROP EXTENSION IF EXISTS pg_trgm;
    DROP EXTENSION IF EXISTS postgis CASCADE;
  `);
};
