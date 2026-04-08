export const up = (pgm) => {
  pgm.sql(`
    CREATE INDEX idx_hospitals_state_name ON hospitals(state, name);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX idx_hospitals_state_name;
  `);
};
