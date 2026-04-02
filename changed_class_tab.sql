-- Make created_by nullable (optional)
ALTER TABLE classes ALTER COLUMN created_by DROP NOT NULL;

-- Or if it's created_by_user_id
--ALTER TABLE classes ALTER COLUMN created_by_user_id DROP NOT NULL;