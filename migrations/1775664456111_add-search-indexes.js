export const up = (pgm) => {
  pgm.sql(`
    CREATE INDEX idx_hospitals_address_trgm ON hospitals USING GIN(address gin_trgm_ops);
    CREATE INDEX idx_hospitals_city_trgm ON hospitals USING GIN(city gin_trgm_ops);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX idx_hospitals_address_trgm;
    DROP INDEX idx_hospitals_city_trgm;
  `);
};
