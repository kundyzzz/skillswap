-- US-12: remembers whether the sender has already seen the answer to their contact request
-- (drives the badge on "Profile"). Run once in Neon -> SQL Editor, after 003.
ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS seen_by_sender BOOLEAN NOT NULL DEFAULT false;
