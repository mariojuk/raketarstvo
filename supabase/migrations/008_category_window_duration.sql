-- Vrijeme trajanja kategorije (prozor za ispaljivanje)

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS traka_window_seconds INT NOT NULL DEFAULT 1800,
  ADD COLUMN IF NOT EXISTS padobran_window_seconds INT NOT NULL DEFAULT 2700,
  ADD COLUMN IF NOT EXISTS traka_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS padobran_opened_at TIMESTAMPTZ;
