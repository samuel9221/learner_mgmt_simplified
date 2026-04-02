-- Drop the view if it exists
DROP VIEW IF EXISTS v_subject_stream_teacher_assignments;

-- Recreate the view with proper column references
CREATE VIEW v_subject_stream_teacher_assignments AS
SELECT 
    sst.id,
    s.subject_code,
    s.subject_name,
    st.stream_name,
    c.class_name,
    u.first_name || ' ' || u.last_name as teacher_name,
    u.email as teacher_email,
    sst.assigned_at,
    sst.subject_id,
    sst.stream_id,
    sst.teacher_id
FROM subject_stream_teachers sst
JOIN subjects s ON sst.subject_id = s.id
JOIN streams st ON sst.stream_id = st.id
JOIN classes c ON st.class_id = c.id
JOIN users u ON sst.teacher_id = u.id
ORDER BY c.class_name, st.stream_name, s.subject_name;