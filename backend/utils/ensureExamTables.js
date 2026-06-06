const { query } = require('../config/database');

const ensureExamTables = async () => {
  await query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_type') THEN
        CREATE TYPE exam_type AS ENUM ('mid_term', 'end_of_term');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS grading_scales (
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

    INSERT INTO grading_scales (label, grade_name, min_score, max_score, remarks, color_code)
    SELECT * FROM (VALUES
      ('A', 'Exceptional', 80::NUMERIC(5,2), 100::NUMERIC(5,2), 'Exceptional performance', '#22c55e'),
      ('B', 'Outstanding', 65::NUMERIC(5,2), 79.99::NUMERIC(5,2), 'Outstanding performance', '#3b82f6'),
      ('C', 'Satisfactory', 50::NUMERIC(5,2), 64.99::NUMERIC(5,2), 'Average performance', '#f59e0b'),
      ('D', 'Basic', 30::NUMERIC(5,2), 49.99::NUMERIC(5,2), 'More effort needed', '#ef4444'),
      ('E', 'Elementary', 0::NUMERIC(5,2), 29.99::NUMERIC(5,2), 'Needs significant improvement', '#ff2c2c')
    ) AS defaults(label, grade_name, min_score, max_score, remarks, color_code)
    WHERE NOT EXISTS (SELECT 1 FROM grading_scales);

    CREATE TABLE IF NOT EXISTS exam_sessions (
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

    CREATE TABLE IF NOT EXISTS exam_results (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      stream_id UUID REFERENCES streams(id),
      exam_session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
      score NUMERIC(5,2),
      is_absent BOOLEAN DEFAULT FALSE,
      teacher_id UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (learner_id, subject_id, exam_session_id),
      CONSTRAINT check_exam_score CHECK (
        (score IS NULL AND is_absent = TRUE) OR
        (score IS NOT NULL AND score >= 0 AND score <= 100)
      )
    );

    CREATE TABLE IF NOT EXISTS final_results (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
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

    CREATE INDEX IF NOT EXISTS idx_grading_scales_active ON grading_scales(is_active);
    CREATE INDEX IF NOT EXISTS idx_exam_sessions_term ON exam_sessions(term_id);
    CREATE INDEX IF NOT EXISTS idx_exam_results_learner ON exam_results(learner_id);
    CREATE INDEX IF NOT EXISTS idx_exam_results_session ON exam_results(exam_session_id);
    CREATE INDEX IF NOT EXISTS idx_exam_results_stream ON exam_results(stream_id);
    CREATE INDEX IF NOT EXISTS idx_final_results_learner ON final_results(learner_id);
    CREATE INDEX IF NOT EXISTS idx_final_results_term ON final_results(term_id);
    CREATE INDEX IF NOT EXISTS idx_final_results_stream ON final_results(stream_id);

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_grading_scales_updated_at') THEN
        CREATE TRIGGER update_grading_scales_updated_at
          BEFORE UPDATE ON grading_scales
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_exam_sessions_updated_at') THEN
        CREATE TRIGGER update_exam_sessions_updated_at
          BEFORE UPDATE ON exam_sessions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_exam_results_updated_at') THEN
        CREATE TRIGGER update_exam_results_updated_at
          BEFORE UPDATE ON exam_results
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_final_results_updated_at') THEN
        CREATE TRIGGER update_final_results_updated_at
          BEFORE UPDATE ON final_results
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END $$;
  `);
};

module.exports = ensureExamTables;
