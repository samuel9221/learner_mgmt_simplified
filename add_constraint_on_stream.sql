-- Add constraint to streams table (optional)
ALTER TABLE streams 
ADD CONSTRAINT check_stream_teacher_assigned 
CHECK (stream_teacher_id IS NOT NULL);