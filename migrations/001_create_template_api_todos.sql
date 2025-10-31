-- Create template_api_todos table
-- Note: id is generated at the application level using UUIDv7
-- Note: user_id is also a UUID (from JWT payload)
CREATE TABLE IF NOT EXISTS template_api_todos (
	id UUID PRIMARY KEY,
	user_id UUID NOT NULL,
	title VARCHAR(255) NOT NULL,
	description TEXT,
	completed BOOLEAN DEFAULT FALSE NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_template_api_todos_created_at ON template_api_todos(created_at DESC);

-- Create index on completed for filtering
CREATE INDEX IF NOT EXISTS idx_template_api_todos_completed ON template_api_todos(completed);

-- Create index on user_id for filtering by user
CREATE INDEX IF NOT EXISTS idx_template_api_todos_user_id ON template_api_todos(user_id);

