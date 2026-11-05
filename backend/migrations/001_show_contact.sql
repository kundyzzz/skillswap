-- US-11: "Show my contact" switch. Run once on an existing skillswap_db.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_contact BOOLEAN NOT NULL DEFAULT false;
