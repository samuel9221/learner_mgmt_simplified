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
CREATE TYPE achievement_level AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE promotion_status AS ENUM ('progressed', 'progressed_with_support', 'repeated', 'completed');
CREATE TYPE assessment_status AS ENUM ('pending', 'approved', 'locked');

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
-- COMPETENCY GRADING CONFIGURATION
-- ============================================================================

-- Achievement Levels (Configurable descriptors)
CREATE TABLE achievement_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level_code achievement_level UNIQUE NOT NULL,
    level_name VARCHAR(50) NOT NULL, -- e.g., "Exceeds Expectations"
    description TEXT,
    min_score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_score_range CHECK (min_score >= 0 AND max_score <= 100 AND min_score < max_score)
);

-- Default achievement levels
INSERT INTO achievement_levels (level_code, level_name, description, min_score, max_score) VALUES
    ('A', 'Exceeds Expectations', 'Level 4: Learner demonstrates outstanding mastery', 80, 100),
    ('B', 'Meets Expectations', 'Level 3: Learner demonstrates adequate mastery', 65, 79.99),
    ('C', 'Approaching Expectations', 'Level 2: Learner demonstrates developing mastery', 50, 64.99),
    ('D', 'Below Expectations', 'Level 1: Learner requires significant support', 0, 49.99);

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

-- Competency Areas (per subject)
CREATE TABLE competency_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    competency_name VARCHAR(255) NOT NULL,
    description TEXT,
    order_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (subject_id, competency_name)
);

-- Learning Outcomes (per competency)
CREATE TABLE learning_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competency_area_id UUID NOT NULL REFERENCES competency_areas(id) ON DELETE CASCADE,
    outcome_description TEXT NOT NULL,
    order_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indicators (per learning outcome)
CREATE TABLE indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learning_outcome_id UUID NOT NULL REFERENCES learning_outcomes(id) ON DELETE CASCADE,
    indicator_description TEXT NOT NULL,
    order_number INTEGER NOT NULL,
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
-- ASSESSMENT CONFIGURATION
-- ============================================================================

-- Assessment Components (per subject, per term)
CREATE TABLE assessment_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    component_name VARCHAR(100) NOT NULL, -- e.g., "Continuous Assessment", "Project Work", "End of Term"
    component_code VARCHAR(20) NOT NULL,
    weight_percentage NUMERIC(5,2) NOT NULL, -- Must total 100% per subject per term
    max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (subject_id, term_id, component_code),
    CONSTRAINT check_weight CHECK (weight_percentage > 0 AND weight_percentage <= 100),
    CONSTRAINT check_max_score CHECK (max_score > 0)
);

-- Index for assessment queries
CREATE INDEX idx_assessment_components_subject_term ON assessment_components(subject_id, term_id);

-- ============================================================================
-- ASSESSMENTS & SCORES
-- ============================================================================

-- Assessment Records
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES assessment_components(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    score NUMERIC(5,2),
    is_absent BOOLEAN DEFAULT FALSE,
    is_not_done BOOLEAN DEFAULT FALSE, -- Allows report generation even if assessment missing
    teacher_id UUID NOT NULL REFERENCES users(id),
    status assessment_status DEFAULT 'pending',
    remarks TEXT,
    assessed_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (learner_id, component_id, term_id),
    CONSTRAINT check_score_valid CHECK (
        (score IS NULL AND (is_absent = TRUE OR is_not_done = TRUE)) OR
        (score IS NOT NULL AND score >= 0)
    )
);

-- Competency Assessments (per learner, per competency, per term)
CREATE TABLE competency_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    competency_area_id UUID NOT NULL REFERENCES competency_areas(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    achievement_level achievement_level NOT NULL,
    overall_score NUMERIC(5,2), -- Calculated from assessments
    teacher_observation TEXT,
    teacher_id UUID NOT NULL REFERENCES users(id),
    assessed_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (learner_id, competency_area_id, term_id)
);

-- Index for assessment queries
CREATE INDEX idx_assessments_learner_term ON assessments(learner_id, term_id);
CREATE INDEX idx_assessments_subject ON assessments(subject_id);
CREATE INDEX idx_competency_assessments_learner ON competency_assessments(learner_id);

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
    overall_achievement achievement_level NOT NULL,
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
    ('allow_assessment_editing', 'true', 'Allow teachers to edit submitted assessments');

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

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
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

-- Trigger to validate assessment component weights total 100%
CREATE OR REPLACE FUNCTION validate_assessment_weights()
RETURNS TRIGGER AS $$
DECLARE
    total_weight NUMERIC;
BEGIN
    SELECT COALESCE(SUM(weight_percentage), 0) INTO total_weight
    FROM assessment_components
    WHERE subject_id = NEW.subject_id 
    AND term_id = NEW.term_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
    
    IF (total_weight + NEW.weight_percentage) > 100 THEN
        RAISE EXCEPTION 'Total assessment weight cannot exceed 100%% for subject and term';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_assessment_weights
    BEFORE INSERT OR UPDATE ON assessment_components
    FOR EACH ROW
    EXECUTE FUNCTION validate_assessment_weights();

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

-- View: Learner Performance Summary
CREATE OR REPLACE VIEW v_learner_performance AS
SELECT 
    l.id AS learner_id,
    l.admission_number,
    l.first_name || ' ' || l.last_name AS learner_name,
    sub.subject_name,
    t.term_number,
    ca.achievement_level,
    ca.overall_score,
    ca.teacher_observation
FROM learners l
JOIN competency_assessments ca ON l.id = ca.learner_id
JOIN competency_areas comp ON ca.competency_area_id = comp.id
JOIN subjects sub ON comp.subject_id = sub.id
JOIN terms t ON ca.term_id = t.id
ORDER BY l.admission_number, sub.subject_name, t.term_number;

-- ============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================================

-- Function to calculate overall achievement level from score
CREATE OR REPLACE FUNCTION get_achievement_level(score NUMERIC)
RETURNS achievement_level AS $$
DECLARE
    level achievement_level;
BEGIN
    SELECT level_code INTO level
    FROM achievement_levels
    WHERE score >= min_score AND score <= max_score AND is_active = TRUE
    LIMIT 1;
    
    RETURN level;
END;
$$ LANGUAGE plpgsql;

-- Function to check if report can be generated
CREATE OR REPLACE FUNCTION can_generate_report(
    p_learner_id UUID,
    p_term_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    required_assessments INTEGER;
    completed_assessments INTEGER;
    missing_unmarked INTEGER;
BEGIN
    -- Get count of required assessment components for learner's subjects
    SELECT COUNT(DISTINCT ac.id) INTO required_assessments
    FROM assessment_components ac
    JOIN subject_teachers st ON ac.subject_id = st.subject_id
    JOIN learner_enrollments le ON st.class_id = le.class_id 
        AND (st.stream_id = le.stream_id OR st.stream_id IS NULL)
    WHERE le.learner_id = p_learner_id
    AND ac.term_id = p_term_id;
    
    -- Get count of completed assessments
    SELECT COUNT(*) INTO completed_assessments
    FROM assessments a
    WHERE a.learner_id = p_learner_id
    AND a.term_id = p_term_id
    AND (a.score IS NOT NULL OR a.is_not_done = TRUE OR a.is_absent = TRUE);
    
    -- Check for missing assessments that are not marked as "not done"
    SELECT COUNT(*) INTO missing_unmarked
    FROM assessment_components ac
    WHERE ac.term_id = p_term_id
    AND NOT EXISTS (
        SELECT 1 FROM assessments a
        WHERE a.component_id = ac.id
        AND a.learner_id = p_learner_id
    );
    
    -- Report can be generated if all assessments are accounted for
    RETURN (completed_assessments >= required_assessments) OR (missing_unmarked = 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_learners_admission ON learners(admission_number);
CREATE INDEX idx_learners_status ON learners(status);
CREATE INDEX idx_classes_academic_year ON classes(academic_year_id);
CREATE INDEX idx_subjects_active ON subjects(is_active);
CREATE INDEX idx_achievement_levels_active ON achievement_levels(is_active);

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

-- Constraint: Teacher can teach max 3 subjects
CREATE OR REPLACE FUNCTION check_teacher_subject_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(DISTINCT subject_id) 
        FROM subject_stream_teachers 
        WHERE teacher_id = NEW.teacher_id) >= 3 THEN
        RAISE EXCEPTION 'Teacher cannot be assigned more than 3 subjects';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_teacher_subject_limit
BEFORE INSERT ON subject_stream_teachers
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
-- ADDED SCORE COLUMN TO ASSESSMENT_COMPONENTS
-- ============================================================================

-- Add score column
ALTER TABLE assessment_components 
ADD COLUMN IF NOT EXISTS score NUMERIC DEFAULT 0;

-- Add constraint to ensure score is 0-3
ALTER TABLE assessment_components 
DROP CONSTRAINT IF EXISTS check_score_range;

ALTER TABLE assessment_components 
ADD CONSTRAINT check_score_range 
CHECK (score >= 0 AND score <= 3);

-- Add comment
COMMENT ON COLUMN assessment_components.score IS 'Score on scale of 3: 0=Not Assessed, 1=Beginning, 2=Developing, 3=Competent';


-- ============================================================================
-- SCHEMA ADJUSTMENTS BASED ON YOUR EXISTING STRUCTURE
-- ============================================================================

-- ============================================================================
-- 1. RENAME "indicators" to "competencies" (or keep as is)
-- ============================================================================
-- Your "indicators" table is actually the competencies table
-- We can either:
-- A) Rename it to "competencies" for clarity
-- B) Keep it as "indicators" and just use that name in code

-- Option A: Rename (recommended for clarity)
ALTER TABLE indicators RENAME TO competencies;

-- If you renamed it, also rename the foreign key column in assessment_components
-- (Skip this if you want to keep "indicators" name)

-- ============================================================================
-- 2. ADD MISSING COLUMNS TO ASSESSMENT_COMPONENTS
-- ============================================================================

-- Add competency_id (links to indicators/competencies)
ALTER TABLE assessment_components 
ADD COLUMN IF NOT EXISTS competency_id UUID REFERENCES competencies(id) ON DELETE CASCADE;

-- Add assessment_id (links back to parent assessment)
ALTER TABLE assessment_components 
ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE;

-- Add academic_year_id for historical tracking
ALTER TABLE assessment_components 
ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id);

-- Add stream_id to know which class was assessed
ALTER TABLE assessment_components 
ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES streams(id);

-- Rename component_id to make it clearer (optional)
-- component_id seems to reference the assessment itself, so this might be redundant with assessment_id

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessment_components_competency ON assessment_components(competency_id);
CREATE INDEX IF NOT EXISTS idx_assessment_components_assessment ON assessment_components(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_components_stream ON assessment_components(stream_id);

-- ============================================================================
-- 3. ADD MISSING COLUMNS TO ASSESSMENTS
-- ============================================================================

-- Add stream_id (which class is being assessed)
ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES streams(id);

-- Add academic_year_id
ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id);

-- Add assessment_type to distinguish competency-based vs EOT exams
ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50) DEFAULT 'competency'
CHECK (assessment_type IN ('competency', 'eot', 'both'));

-- Add competency_area_id (optional: if assessing entire area)
ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS competency_area_id UUID REFERENCES competency_areas(id);

-- Ensure status column exists with proper type
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assessments' AND column_name = 'status'
    ) THEN
        ALTER TABLE assessments 
        ADD COLUMN status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'locked'));
    END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_assessments_stream ON assessments(stream_id);
CREATE INDEX IF NOT EXISTS idx_assessments_academic_year ON assessments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(assessment_type);

-- ============================================================================
-- 4. CREATE ASSESSMENT_COMPETENCIES JUNCTION TABLE
-- ============================================================================
-- This links which specific competencies are being assessed in an assessment

CREATE TABLE IF NOT EXISTS assessment_competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    weight INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_assessment_competency UNIQUE(assessment_id, competency_id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_competencies_assessment ON assessment_competencies(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_competencies_competency ON assessment_competencies(competency_id);

COMMENT ON TABLE assessment_competencies IS 'Links assessments to specific competencies being assessed';

-- ============================================================================
-- 5. ADD EOT (End of Term) EXAMS SUPPORT
-- ============================================================================

-- Create separate table for EOT exam scores (or use assessment_components with NULL competency_id)
-- Option A: Use existing assessment_components with competency_id = NULL for EOT

-- Add constraint to allow NULL competency_id for EOT exams
ALTER TABLE assessment_components 
DROP CONSTRAINT IF EXISTS check_competency_for_type;

-- No constraint needed - NULL competency_id means it's an EOT score

-- ============================================================================
-- 6. ADD COMMENTS FOR CLARITY
-- ============================================================================

COMMENT ON COLUMN assessments.assessment_type IS 'Type: competency (regular assessment), eot (end of term exam), both (combined report)';
COMMENT ON COLUMN assessment_components.competency_id IS 'Links to specific competency being assessed. NULL for EOT exams.';
COMMENT ON COLUMN assessment_components.score IS 'Score on scale of 3 (or EOT raw score before conversion)';

-- ============================================================================
-- VERIFY FINAL STRUCTURE
-- ============================================================================

-- Check competencies table (renamed from indicators)
SELECT 'competencies' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'competencies'
ORDER BY ordinal_position;

-- Check assessments table
SELECT 'assessments' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'assessments'
ORDER BY ordinal_position;

-- Check assessment_components table
SELECT 'assessment_components' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'assessment_components'
ORDER BY ordinal_position;

-- Check assessment_competencies table
SELECT 'assessment_competencies' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'assessment_competencies'
ORDER BY ordinal_position;

-- Check achievement_levels table
SELECT 'achievement_levels' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'achievement_levels'
ORDER BY ordinal_position;


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
COMMENT ON TABLE competency_areas IS 'NLSC competency areas per subject';
COMMENT ON TABLE learning_outcomes IS 'Learning outcomes per competency';
COMMENT ON TABLE indicators IS 'Performance indicators per learning outcome';
COMMENT ON TABLE assessments IS 'Individual assessment scores';
COMMENT ON TABLE competency_assessments IS 'Overall competency achievement levels';
COMMENT ON TABLE report_cards IS 'Generated report cards per learner per term';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================