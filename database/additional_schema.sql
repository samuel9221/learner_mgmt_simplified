-- 1. Subject Papers
CREATE TABLE subject_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    paper_number INTEGER NOT NULL,
    paper_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subject_id, paper_number)
);

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