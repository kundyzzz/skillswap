-- US-12: request a hidden contact. Run once in Neon -> SQL Editor (and on any local skillswap_db).
CREATE TABLE IF NOT EXISTS contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message VARCHAR(200),
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    seen_by_sender BOOLEAN NOT NULL DEFAULT false,
    attempts INTEGER NOT NULL DEFAULT 1,
    UNIQUE (from_user, to_user),
    CHECK (from_user <> to_user)
);
