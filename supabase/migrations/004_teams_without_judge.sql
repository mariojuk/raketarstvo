-- Timovi se kreiraju bez suca; sudac se ne veze uz tim pri kreiranju

ALTER TABLE teams ALTER COLUMN judge_id DROP NOT NULL;
