DROP TABLE IF EXISTS taxes CASCADE;

CREATE TABLE taxes (
  province VARCHAR(2) PRIMARY KEY NOT NULL,
  tax SMALLINT NOT NULL
);