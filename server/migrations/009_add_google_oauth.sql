-- Add OAuth columns to users table for Google authentication support
ALTER TABLE users
ADD COLUMN google_id VARCHAR(255),
ADD COLUMN oauth_provider VARCHAR(50),
ADD COLUMN profile_picture_url TEXT;

-- Make password_hash nullable (optional for OAuth users who don't set passwords)
ALTER TABLE users
ALTER COLUMN password_hash DROP NOT NULL;

-- Add unique constraint on google_id (can be null for non-OAuth users)
ALTER TABLE users
ADD CONSTRAINT unique_google_id UNIQUE (google_id);

-- Create indexes for faster lookups
CREATE INDEX idx_google_id ON users(google_id);
CREATE INDEX idx_oauth_provider ON users(oauth_provider);
