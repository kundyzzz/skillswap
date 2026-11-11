-- US-12: a declined request can be sent once more after 3 days (2 attempts in total).
-- Run once in Neon -> SQL Editor (and locally), after 003 and 004.
ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 1;
