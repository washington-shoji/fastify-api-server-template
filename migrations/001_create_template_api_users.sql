-- Create template_api_users table
-- Note: id is generated at the application level using UUIDv7
CREATE TABLE IF NOT EXISTS template_api_users (
	id UUID PRIMARY KEY,
	user_name VARCHAR(255) NOT NULL UNIQUE,
	email VARCHAR(255) NOT NULL UNIQUE,
	password VARCHAR(255) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_template_api_users_email ON template_api_users(email);

-- Create index on user_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_template_api_users_user_name ON template_api_users(user_name);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_template_api_users_created_at ON template_api_users(created_at DESC);

