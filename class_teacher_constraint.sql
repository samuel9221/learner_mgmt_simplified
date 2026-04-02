-- Remove the check constraint from classes table
ALTER TABLE classes DROP CONSTRAINT IF EXISTS check_class_teacher_required;