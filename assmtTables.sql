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