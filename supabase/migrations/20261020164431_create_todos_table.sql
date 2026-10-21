/*
# Create todos table (single-tenant, no auth)

1. New Tables
- `todos`
  - `id` (uuid, primary key)
  - `title` (text, not null) - the task text
  - `completed` (boolean, default false) - whether task is done
  - `priority` (text, default 'medium') - low, medium, or high
  - `created_at` (timestamptz) - creation timestamp
  - `completed_at` (timestamptz, nullable) - when marked complete
2. Security
- Enable RLS on `todos`.
- Allow anon + authenticated CRUD because the data is intentionally shared/public (no sign-in).
*/

CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_todos" ON todos;
CREATE POLICY "anon_select_todos" ON todos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_todos" ON todos;
CREATE POLICY "anon_insert_todos" ON todos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_todos" ON todos;
CREATE POLICY "anon_update_todos" ON todos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_todos" ON todos;
CREATE POLICY "anon_delete_todos" ON todos FOR DELETE
  TO anon, authenticated USING (true);
