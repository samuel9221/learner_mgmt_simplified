-- ============================================================================
-- SCHOOL MANAGEMENT SYSTEM - UGANDA NEW LOWER SECONDARY CURRICULUM (NLSC)
-- PostgreSQL Database Schema
-- Competency-Based Assessment System
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'teacher');
CREATE TYPE gender_type AS ENUM ('male', 'female');
CREATE TYPE learner_status AS ENUM ('active', 'repeated', 'transferred', 'completed');
CREATE TYPE term_number AS ENUM ('1', '2', '3');
CREATE TYPE promotion_status AS ENUM ('progressed', 'progressed_with_support', 'repeated', 'completed');

-- ============================================================================
-- USER MANAGEMENT & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    last_login TIMESTAMP
);

-- Index for authentication
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- ACADEMIC STRUCTURE
-- ============================================================================

-- Academic Years (Only Super Admin can create)
CREATE TABLE academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year_name VARCHAR(20) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_year_dates CHECK (end_date > start_date)
);

-- Create partial unique index to ensure only one current academic year
CREATE UNIQUE INDEX idx_only_one_current_academic_year 
ON academic_years (is_current) 
WHERE is_current = TRUE;
-- Terms (Max 3 per academic year)
CREATE TABLE terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    term_number term_number NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (academic_year_id, term_number),
    CONSTRAINT check_term_dates CHECK (end_date > start_date)
);

-- Index for current term lookup
CREATE INDEX idx_terms_current ON terms(is_current) WHERE is_current = TRUE;

-- ============================================================================
-- CLASSES & STREAMS
-- ============================================================================

CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    class_name VARCHAR(10) NOT NULL, -- S1, S2, S3, S4
    class_teacher_id UUID REFERENCES users(id),
    has_streams BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (academic_year_id, class_name),
    CONSTRAINT check_class_teacher_required CHECK (class_teacher_id IS NOT NULL)
);

CREATE TABLE streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    stream_name VARCHAR(10) NOT NULL, -- A, B, C, East, West, etc.
    stream_teacher_id UUID NOT NULL REFERENCES users(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (class_id, stream_name)
);

-- ============================================================================
-- SUBJECTS & CURRICULUM
-- ============================================================================

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_name VARCHAR(100) UNIQUE NOT NULL,
    subject_code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- ============================================================================
-- SUBJECT ASSIGNMENTS
-- ============================================================================

-- Subject Teacher Assignments (No subject without a teacher)
CREATE TABLE subject_teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (subject_id, class_id, stream_id, academic_year_id)
);

-- Index for teacher assignments
CREATE INDEX idx_subject_teachers_teacher ON subject_teachers(teacher_id);
CREATE INDEX idx_subject_teachers_class ON subject_teachers(class_id);

-- ============================================================================
-- LEARNERS
-- ============================================================================

CREATE TABLE learners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    gender gender_type NOT NULL,
    date_of_birth DATE,
    former_school VARCHAR(255),
    entry_year_id UUID NOT NULL REFERENCES academic_years(id),
    entry_class VARCHAR(10) NOT NULL, -- S1, S2, S3, S4
    status learner_status DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learner Class Enrollment (per academic year)
CREATE TABLE learner_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (learner_id, academic_year_id)
);

-- Index for enrollment queries
CREATE INDEX idx_learner_enrollments_learner ON learner_enrollments(learner_id);
CREATE INDEX idx_learner_enrollments_class ON learner_enrollments(class_id);
CREATE INDEX idx_learner_enrollments_stream ON learner_enrollments(stream_id);

-- ============================================================================
-- REPORT CARDS
-- ============================================================================

-- Report Card Master
CREATE TABLE report_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    class_teacher_remarks TEXT,
    head_teacher_remarks TEXT,
    promotion_recommendation promotion_status,
    days_present INTEGER,
    days_absent INTEGER,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (learner_id, term_id)
);

-- Report Card Subject Details
CREATE TABLE report_card_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_card_id UUID NOT NULL REFERENCES report_cards(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    overall_score NUMERIC(5,2),
    teacher_remarks TEXT,
    strengths TEXT,
    areas_for_improvement TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (report_card_id, subject_id)
);

-- Index for report queries
CREATE INDEX idx_report_cards_learner ON report_cards(learner_id);
CREATE INDEX idx_report_cards_term ON report_cards(term_id);

-- ============================================================================
-- REPORT TEMPLATES
-- ============================================================================

CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(100) UNIQUE NOT NULL,
    template_description TEXT,
    template_file_path VARCHAR(255), -- Path to template file
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SYSTEM CONFIGURATION
-- ============================================================================

CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default system configurations
INSERT INTO system_config (config_key, config_value, description) VALUES
    ('school_name', 'School Name', 'Official school name'),
    ('school_motto', 'School Motto', 'School motto'),
    ('school_address', 'School Address', 'Physical address'),
    ('school_phone', 'Phone Number', 'Contact phone'),
    ('school_email', 'Email Address', 'Contact email'),
    ('admission_number_prefix', 'STD', 'Prefix for admission numbers'),
    ('current_academic_year', '', 'Current academic year ID'),
    ('report_card_template', '', 'Default report card template ID');

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for audit queries
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academic_years_updated_at BEFORE UPDATE ON academic_years
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_terms_updated_at BEFORE UPDATE ON terms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streams_updated_at BEFORE UPDATE ON streams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learners_updated_at BEFORE UPDATE ON learners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_cards_updated_at BEFORE UPDATE ON report_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to ensure only one current academic year
CREATE OR REPLACE FUNCTION ensure_single_current_academic_year()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = TRUE THEN
        UPDATE academic_years SET is_current = FALSE WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_current_academic_year
    BEFORE INSERT OR UPDATE ON academic_years
    FOR EACH ROW
    WHEN (NEW.is_current = TRUE)
    EXECUTE FUNCTION ensure_single_current_academic_year();

-- Trigger to ensure only one current term per academic year
CREATE OR REPLACE FUNCTION ensure_single_current_term()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = TRUE THEN
        UPDATE terms 
        SET is_current = FALSE 
        WHERE academic_year_id = NEW.academic_year_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_current_term
    BEFORE INSERT OR UPDATE ON terms
    FOR EACH ROW
    WHEN (NEW.is_current = TRUE)
    EXECUTE FUNCTION ensure_single_current_term();


-- Trigger to prevent more than 3 terms per academic year
CREATE OR REPLACE FUNCTION validate_term_limit()
RETURNS TRIGGER AS $$
DECLARE
    term_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO term_count
    FROM terms
    WHERE academic_year_id = NEW.academic_year_id;
    
    IF term_count >= 3 THEN
        RAISE EXCEPTION 'Cannot create more than 3 terms per academic year';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_term_limit
    BEFORE INSERT ON terms
    FOR EACH ROW
    EXECUTE FUNCTION validate_term_limit();

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- View: Current Learner Enrollments
CREATE OR REPLACE VIEW v_current_enrollments AS
SELECT 
    l.id AS learner_id,
    l.admission_number,
    l.first_name,
    l.middle_name,
    l.last_name,
    l.gender,
    l.status,
    c.class_name,
    s.stream_name,
    ay.year_name,
    ay.id AS academic_year_id
FROM learners l
JOIN learner_enrollments le ON l.id = le.learner_id
JOIN classes c ON le.class_id = c.id
LEFT JOIN streams s ON le.stream_id = s.id
JOIN academic_years ay ON le.academic_year_id = ay.id
WHERE ay.is_current = TRUE AND l.status = 'active';

-- View: Teacher Assignments
CREATE OR REPLACE VIEW v_teacher_assignments AS
SELECT 
    u.id AS teacher_id,
    u.first_name || ' ' || u.last_name AS teacher_name,
    sub.subject_name,
    c.class_name,
    s.stream_name,
    ay.year_name
FROM subject_teachers st
JOIN users u ON st.teacher_id = u.id
JOIN subjects sub ON st.subject_id = sub.id
JOIN classes c ON st.class_id = c.id
LEFT JOIN streams s ON st.stream_id = s.id
JOIN academic_years ay ON st.academic_year_id = ay.id
WHERE ay.is_current = TRUE;

-- ============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================================

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_learners_admission ON learners(admission_number);
CREATE INDEX idx_learners_status ON learners(status);
CREATE INDEX idx_classes_academic_year ON classes(academic_year_id);
CREATE INDEX idx_subjects_active ON subjects(is_active);

-- ============================================================================
-- ADDITIONAL TABLE IN SCHEMA FOR SUBJECTS, TEACHERS, CLASS & STREAM HANDLING
-- ============================================================================

-- 1. Subject Papers
CREATE TABLE subject_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    paper_number INTEGER NOT NULL,
    paper_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subject_id, paper_number)
);

CREATE INDEX idx_subject_papers_subject_id ON subject_papers(subject_id);


-- 2. Subject-Stream-Teacher Assignment
CREATE TABLE subject_stream_teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    UNIQUE(subject_id, stream_id, teacher_id)
);

-- Constraint: Teacher can teach max 3 distinct subjects, max 2 in one stream.
-- Once at 3 subjects, the same teacher can still be assigned more streams for those subjects.
CREATE OR REPLACE FUNCTION check_teacher_subject_limit()
RETURNS TRIGGER AS $$
DECLARE
    excluded_assignment_id UUID;
    subject_count INTEGER;
    already_teaches_subject BOOLEAN;
    stream_subject_count INTEGER;
    already_teaches_subject_in_stream BOOLEAN;
BEGIN
    excluded_assignment_id := CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL END;

    SELECT
        COUNT(DISTINCT subject_id),
        COALESCE(BOOL_OR(subject_id = NEW.subject_id), FALSE)
    INTO subject_count, already_teaches_subject
    FROM subject_stream_teachers
    WHERE teacher_id = NEW.teacher_id
      AND (excluded_assignment_id IS NULL OR id <> excluded_assignment_id);

    IF NOT already_teaches_subject AND subject_count >= 3 THEN
        RAISE EXCEPTION 'Teacher cannot be assigned more than 3 subjects';
    END IF;

    SELECT
        COUNT(DISTINCT subject_id),
        COALESCE(BOOL_OR(subject_id = NEW.subject_id), FALSE)
    INTO stream_subject_count, already_teaches_subject_in_stream
    FROM subject_stream_teachers
    WHERE teacher_id = NEW.teacher_id
      AND stream_id = NEW.stream_id
      AND (excluded_assignment_id IS NULL OR id <> excluded_assignment_id);

    IF NOT already_teaches_subject_in_stream AND stream_subject_count >= 2 THEN
        RAISE EXCEPTION 'Teacher cannot teach more than 2 subjects in the same stream';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_teacher_subject_limit
BEFORE INSERT OR UPDATE OF teacher_id, subject_id, stream_id ON subject_stream_teachers
FOR EACH ROW EXECUTE FUNCTION check_teacher_subject_limit();

-- 3. Subject Combinations (for S5/S6)
CREATE TABLE subject_combinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combination_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    for_level VARCHAR(10) CHECK (for_level IN ('S5', 'S6', 'BOTH')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- 4. Combination Subjects Junction
CREATE TABLE combination_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combination_id UUID NOT NULL REFERENCES subject_combinations(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    is_compulsory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(combination_id, subject_id)
);

-- 5. Learner Subjects (what each learner is taking)
CREATE TABLE learner_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id),
    combination_id UUID REFERENCES subject_combinations(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(learner_id, subject_id, academic_year_id)
);


-- ============================================================================
-- ADDITIONAL SCHEMA FOR STREAM CONSTRAINT
-- ============================================================================
ALTER TABLE streams 
ADD CONSTRAINT check_stream_teacher_assigned 
CHECK (stream_teacher_id IS NOT NULL);

-- Make created_by nullable (optional)
ALTER TABLE classes ALTER COLUMN created_by DROP NOT NULL;

-- Remove the check constraint from classes table
ALTER TABLE classes DROP CONSTRAINT IF EXISTS check_class_teacher_required;


--altering the subjects table to add new columns for compulsory status, subsidiary status, and applicable levels.
ALTER TABLE subjects 
ADD COLUMN is_compulsory BOOLEAN DEFAULT FALSE,
ADD COLUMN is_subsidiary BOOLEAN DEFAULT FALSE,
ADD COLUMN applicable_levels VARCHAR(50)[] DEFAULT ARRAY['S1','S2','S3','S4','S5','S6'];

-- Add combination_code column to subject_combinations table
ALTER TABLE subject_combinations 
ADD COLUMN combination_code VARCHAR(20) UNIQUE NOT NULL DEFAULT '';

-- Remove the default after adding
ALTER TABLE subject_combinations 
ALTER COLUMN combination_code DROP DEFAULT;

-- Add comment
COMMENT ON COLUMN subject_combinations.combination_code IS 'Short code for the combination (e.g., PCM, PCB, HEL)';

--combination toggle button
ALTER TABLE subject_combinations 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;


--ADDED NEW COLUMN COLUMN
ALTER TABLE subject_combinations
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'subject_combinations'
ORDER BY ordinal_position;

-- Create index for faster queries
CREATE INDEX idx_subjects_is_compulsory ON subjects(is_compulsory);
CREATE INDEX idx_subjects_is_subsidiary ON subjects(is_subsidiary);


-- ============================================================================
-- ADDED MORE COLUMNS TO LEARNERS TABLE
-- ============================================================================

-- Added guardian and contact columns
ALTER TABLE learners 
ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS guardian_email VARCHAR(100),
ADD COLUMN IF NOT EXISTS guardian_relationship VARCHAR(50),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS email VARCHAR(100),
ADD COLUMN IF NOT EXISTS address TEXT;

-- Added medical columns
ALTER TABLE learners 
ADD COLUMN IF NOT EXISTS medical_conditions TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5);

-- Added other useful columns
ALTER TABLE learners 
ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) DEFAULT 'Ugandan',
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- ADDED MORE COLUMNS TO LEARNER_ENROLLMENTS TABLE
-- ============================================================================

-- Added status column
ALTER TABLE learner_enrollments 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
CHECK (status IN ('active', 'completed', 'withdrawn'));

-- ============================================================================
-- ADDED MORE COLUMNS TO LEARNER_SUBJECTS TABLE
-- ============================================================================

-- Added columns to track compulsory vs optional
ALTER TABLE learner_subjects 
ADD COLUMN IF NOT EXISTS is_compulsory BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES users(id);

-- Added unique constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_learner_subject_year'
    ) THEN
        ALTER TABLE learner_subjects 
        ADD CONSTRAINT unique_learner_subject_year 
        UNIQUE(learner_id, subject_id, academic_year_id);
    END IF;
END $$;


-- ============================================================================
-- STEP 1: PATCH report_card_subjects (remove achievement_level ENUM column)
-- ============================================================================

ALTER TABLE report_card_subjects
    DROP COLUMN IF EXISTS overall_achievement,
    ADD COLUMN IF NOT EXISTS grade VARCHAR(5),
    ADD COLUMN IF NOT EXISTS mid_term_score NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS end_term_score NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS final_score NUMERIC(5,2);

-- ============================================================================
-- STEP 2: CREATE NEW TABLES
-- ============================================================================

-- 1. Grading Scales (admin configurable)
CREATE TABLE grading_scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label VARCHAR(5) NOT NULL,
    grade_name VARCHAR(50) NOT NULL,
    min_score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) NOT NULL,
    remarks TEXT,
    color_code VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_grading_score_range CHECK (
        min_score >= 0 AND max_score <= 100 AND min_score < max_score
    )
);

-- Default grading scale
INSERT INTO grading_scales (label, grade_name, min_score, max_score, remarks, color_code) VALUES
    ('A', 'Exceptional',        80,  100,  'Exceptional performance',        '#22c55e'),
    ('B', 'Outstanding',        65,  79.99,'Outstanding performance',      '#3b82f6'),
    ('C', 'Satisfactory',       50,  64.99,'Average performance',            '#f59e0b'),
    ('D', 'Basic',      		30,  49.99,'More effort needed',  '#ef4444'),
	('E', 'Elementary',       0,  29.99,'Needs significant improvement',  '#ff2c2c');

-- 2. Exam Sessions (Mid Term / End of Term per term)
CREATE TYPE exam_type AS ENUM ('mid_term', 'end_of_term');

CREATE TABLE exam_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    exam_type exam_type NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (term_id, exam_type)
);

-- 3. Exam Results (individual scores per learner per subject)
CREATE TABLE exam_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    stream_id UUID REFERENCES streams(id),
    exam_session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
      paper_number INTEGER,
      score NUMERIC(5,2),
      is_absent BOOLEAN DEFAULT FALSE,
      teacher_id UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT check_exam_score CHECK (
        (score IS NULL AND is_absent = TRUE) OR
        (score IS NOT NULL AND score >= 0 AND score <= 100)
      )
    );

ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS paper_number INTEGER;
ALTER TABLE exam_results DROP CONSTRAINT IF EXISTS exam_results_learner_id_subject_id_exam_session_id_key;
ALTER TABLE exam_results ADD CONSTRAINT exam_results_unique_paper UNIQUE (learner_id, subject_id, exam_session_id, paper_number);
    stream_id UUID REFERENCES streams(id),
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    mid_term_score NUMERIC(5,2),
    end_term_score NUMERIC(5,2),
    final_score NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN mid_term_score IS NOT NULL AND end_term_score IS NOT NULL
            THEN ROUND((mid_term_score * 0.40) + (end_term_score * 0.60), 2)
            ELSE NULL
        END
    ) STORED,
    grade VARCHAR(5),
    remarks TEXT,
    stream_rank INTEGER,
    class_rank INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (learner_id, subject_id, term_id)
);

-- ============================================================================
-- STEP 3: INDEXES
-- ============================================================================

CREATE INDEX idx_grading_scales_active ON grading_scales(is_active);
CREATE INDEX idx_exam_sessions_term ON exam_sessions(term_id);
CREATE INDEX idx_exam_results_learner ON exam_results(learner_id);
CREATE INDEX idx_exam_results_session ON exam_results(exam_session_id);
CREATE INDEX idx_exam_results_stream ON exam_results(stream_id);
CREATE INDEX idx_final_results_learner ON final_results(learner_id);
CREATE INDEX idx_final_results_term ON final_results(term_id);
CREATE INDEX idx_final_results_stream ON final_results(stream_id);

-- ============================================================================
-- STEP 4: TRIGGERS (updated_at)
-- ============================================================================

CREATE TRIGGER update_grading_scales_updated_at
    BEFORE UPDATE ON grading_scales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_sessions_updated_at
    BEFORE UPDATE ON exam_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_results_updated_at
    BEFORE UPDATE ON exam_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_final_results_updated_at
    BEFORE UPDATE ON final_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
-- on columns
COMMENT ON COLUMN subjects.is_compulsory IS 'For S1-S4: If true, all students must take this subject. If false, it is optional.';
COMMENT ON COLUMN subjects.applicable_levels IS 'Array of levels where this subject is offered (S1, S2, S3, S4, S5, S6)';
COMMENT ON COLUMN subjects.is_subsidiary IS 'For S5-S6: If true, this is a subsidiary subject (GP, ICT, Sub Math)';
COMMENT ON COLUMN subject_combinations.is_active IS 'Whether this combination is currently active/available for selection';

--on tables
COMMENT ON TABLE users IS 'System users: Super Admin, Admin, Teachers';
COMMENT ON TABLE academic_years IS 'Academic years - isolated data per year';
COMMENT ON TABLE terms IS 'Terms within academic years - max 3 per year';
COMMENT ON TABLE classes IS 'Classes (S1-S4) - must have class teacher';
COMMENT ON TABLE streams IS 'Streams within classes - each must have teacher';
COMMENT ON TABLE subjects IS 'Subjects - cannot exist without subject teacher';
COMMENT ON TABLE learners IS 'Students - do not have login accounts';
COMMENT ON TABLE report_cards IS 'Generated report cards per learner per term';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================