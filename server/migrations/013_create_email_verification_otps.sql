CREATE TABLE IF NOT EXISTS email_verification_otps (
  email VARCHAR(255) NOT NULL,
  purpose VARCHAR(32) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (email, purpose),
  CONSTRAINT email_verification_otps_purpose_check
    CHECK (purpose IN ('registration', 'email_change'))
);

CREATE INDEX IF NOT EXISTS idx_email_verification_otps_user_id
  ON email_verification_otps (user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_otps_expires_at
  ON email_verification_otps (expires_at);
