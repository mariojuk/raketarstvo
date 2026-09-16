-- Admin otvara/zatvara unos rezultata po kategoriji

ALTER TABLE competitions
  ADD COLUMN traka_open BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN padobran_open BOOLEAN NOT NULL DEFAULT false;
